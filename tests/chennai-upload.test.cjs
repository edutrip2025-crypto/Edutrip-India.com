const test = require('node:test');
const assert = require('node:assert/strict');
const {createFileCache, submit, requestId} = require('../assets/chennai-registration-upload.js');
const diagnostics = require('../api/registration-diagnostics.js');

test('selected files stay readable even after the original file changes', async () => {
  let reads = 0, available = true;
  const file = {size:4,type:'application/pdf',arrayBuffer:async()=>{
    reads++; if (!available) throw new DOMException('File changed','NotReadableError');
    return new Uint8Array([1,2,3,4]).buffer;
  }};
  const cache = createFileCache();
  const selected = cache.read(file,'your masked Aadhaar copy','FILE_AADHAAR');
  const blob = await selected;
  available = false;
  await assert.rejects(file.arrayBuffer(), {name:'NotReadableError'});
  assert.equal(await cache.read(file,'your masked Aadhaar copy','FILE_AADHAAR'),blob);
  assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())],[1,2,3,4]);
  assert.equal(reads,2); // Selection read plus deliberately failed provider read; submit uses the copy.
});

test('unreadable files get a file-specific error instead of a connection error',async()=>{
  const file={size:4,type:'application/pdf',arrayBuffer:async()=>{throw new DOMException('provider private path','NotReadableError');}};
  await assert.rejects(createFileCache().read(file,'your masked Aadhaar copy','FILE_AADHAAR'),error=>{
    assert.equal(error.code,'FILE_AADHAAR'); assert.match(error.message,/select that file again/); assert.doesNotMatch(error.message,/private path/); return true;
  });
});

test('incomplete file reads are rejected',async()=>{
  await assert.rejects(createFileCache().read({size:10,type:'image/png',arrayBuffer:async()=>new ArrayBuffer(2)},'your photograph','FILE_PHOTO'),{code:'FILE_PHOTO'});
});

test('network retry reuses the same payload and request ID',async()=>{
  let calls=0, retries=0;
  const payload = new FormData(); payload.set('request_id','same-request');
  const result=await submit({endpoint:'/api/chennai-registration',publicKey:'public',payload,delay:async()=>{},onRetry:()=>retries++,fetcher:async(url,options)=>{
    assert.equal(options.body,payload); assert.equal(options.body.get('request_id'),'same-request');
    if (++calls===1) throw new TypeError('Failed to fetch');
    return Response.json({reference:'REGCHNTEST'});
  }});
  assert.equal(result.reference,'REGCHNTEST'); assert.equal(calls,2); assert.equal(retries,1);
});

test('repeated network failures stop after one retry and retain a specific code',async()=>{
  let calls=0;
  await assert.rejects(submit({payload:new FormData(),delay:async()=>{},fetcher:async()=>{calls++;throw new TypeError('Failed to fetch');}}),{code:'UPLOAD_CONNECTION'});
  assert.equal(calls,2);
});

test('timeouts and non-JSON proxy errors get useful errors',async()=>{
  await assert.rejects(submit({delay:async()=>{},fetcher:async()=>{throw new DOMException('timeout','TimeoutError');}}),{code:'UPLOAD_TIMEOUT'});
  await assert.rejects(submit({fetcher:async()=>new Response('<html>too big</html>',{status:413})}),error=>error.code==='UPLOAD_RESPONSE'&&error.status===413&&/too large/.test(error.message));
});

test('validation and server errors are not automatically submitted again',async()=>{
  let calls=0;
  await assert.rejects(submit({fetcher:async()=>{calls++;return Response.json({error:'Please check full name.'},{status:400});}}),{code:'UPLOAD_SERVER',status:400,message:'Please check full name.'});
  assert.equal(calls,1);
});

test('diagnostics logs only allowed metadata and excludes participant information',()=>{
  const original=console.warn, logs=[];
  console.warn=value=>logs.push(JSON.parse(value));
  const res={setHeader(){},status(code){this.code=code;return this;},end(){return this;}};
  try {
    diagnostics({method:'POST',headers:{origin:'https://www.edutripindia.com'},body:{request_id:'10000000-0000-4000-8000-000000000001',code:'FILE_AADHAAR',status:0,full_name:'PRIVATE NAME',message:'PRIVATE DOCUMENT'}},res);
    assert.equal(res.code,204);
    assert.deepEqual(Object.keys(logs[0]).sort(),['code','event','request_id','status']);
    assert.doesNotMatch(JSON.stringify(logs),/PRIVATE/);
    diagnostics({method:'POST',headers:{},body:{code:'raw private error'}},res);
    assert.equal(res.code,400); assert.equal(logs.length,1);
  } finally {console.warn=original;}
});

test('temporary server errors and interrupted confirmation responses are retried safely',async()=>{
  for (const failure of [()=>Response.json({error:'Temporary outage',code:'DATABASE_LOOKUP'},{status:503}),()=>new Response('<html>gateway error</html>',{status:502}),()=>Response.json(null),()=>new Response('truncated',{status:200})]) {
    let calls=0; const payload=new FormData(); payload.set('request_id','unchanged');
    const result=await submit({payload,delay:async()=>{},fetcher:async(_,options)=>{
      assert.equal(options.body,payload);
      return ++calls===1?failure():Response.json({reference:'REGCHNRECOVERED'});
    }});
    assert.equal(result.reference,'REGCHNRECOVERED'); assert.equal(calls,2);
  }
});

test('authorization, size, validation and long rate-limit errors are not retried',async()=>{
  for (const status of [400,401,403,413,429]) {
    let calls=0;
    await assert.rejects(submit({delay:async()=>{},fetcher:async()=>{calls++;return Response.json({error:'Please retry later'},{status,headers:{'Retry-After':'600'}});}}));
    assert.equal(calls,1);
  }
});

test('request and response-body timeouts release the upload instead of hanging',async()=>{
  for (const inBody of [false,true]) {
    await assert.rejects(submit({timeoutMs:5,delay:async()=>{},fetcher:async(_,options)=>{
      const blocked=()=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError'))));
      return inBody?{ok:true,status:200,json:blocked}:blocked();
    }}),{code:'UPLOAD_TIMEOUT'});
  }
});

test('file reads time out with a recoverable file-specific error',async()=>{
  await assert.rejects(createFileCache({readTimeoutMs:5}).read({size:100,type:'image/png',arrayBuffer:()=>new Promise(()=>{})},'your photograph','FILE_PHOTO'),{code:'FILE_PHOTO'});
});

test('files with missing phone-provided MIME types use their actual signatures',async()=>{
  for (const [type,bytes,code,expected] of [['',Buffer.from('%PDF-1.4 synthetic'),'FILE_AADHAAR','application/pdf'],['application/octet-stream',Buffer.from([137,80,78,71,13,10,26,10]),'FILE_PHOTO','image/png'],['',Buffer.from([255,216,255,0]),'FILE_PHOTO','image/jpeg']]) {
    const file={size:bytes.length,type,arrayBuffer:async()=>new Uint8Array(bytes).buffer};
    assert.equal((await createFileCache().read(file,'your file',code)).type,expected);
  }
  const pdf=Buffer.from('%PDF-1.4 synthetic');
  await assert.rejects(createFileCache().read({size:pdf.length,type:'',arrayBuffer:async()=>new Uint8Array(pdf).buffer},'your photograph','FILE_PHOTO'),{code:'FILE_PHOTO'});
});

test('older browsers can generate valid retry IDs without crypto.randomUUID',()=>{
  const {webcrypto}=require('node:crypto');
  const generated=requestId({getRandomValues:bytes=>webcrypto.getRandomValues(bytes)});
  assert.match(generated,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('busy-service retries respect short Retry-After delays and are staggered',async()=>{
  let calls=0,wait;
  await submit({delay:async ms=>{wait=ms;},fetcher:async()=>++calls===1?Response.json({error:'Busy'},{status:429,headers:{'Retry-After':'3'}}):Response.json({reference:'REGCHNRETRY'})});
  assert.equal(calls,2);assert.ok(wait>=3000&&wait<4000);
});
