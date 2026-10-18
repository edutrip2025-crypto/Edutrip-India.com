const test = require('node:test');
const assert = require('node:assert/strict');
const {createFileCache, submit} = require('../assets/chennai-registration-upload.js');
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
