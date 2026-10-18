import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHandler,validateFields,validatePhoto,photoFilename,itineraryDetails} from '../supabase/functions/chennai-registration/handler.mjs';

test('browser submits through the website proxy before the generic API rewrite',()=>{
  const context = {window:{}};
  vm.runInNewContext(readFileSync(new URL('../assets/chennai-registration-config.js',import.meta.url),'utf8'),context);
  const endpoint = context.window.CHENNAI_REGISTRATION.endpoint;
  assert.equal(endpoint,'/api/chennai-registration');
  const config = JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
  const proxyIndex = config.rewrites.findIndex(route=>route.source===endpoint);
  assert.ok(proxyIndex>=0);
  assert.equal(config.rewrites[proxyIndex].destination,'https://vrmubjmgwlbypfwctwgq.supabase.co/functions/v1/chennai-registration');
  assert.ok(proxyIndex<config.rewrites.findIndex(route=>route.source==='/api/(.*)'));
});

test('JavaScript load failure leaves submit disabled and cannot send form fields in a GET URL',()=>{
  const html=readFileSync(new URL('../chennai-registration.html',import.meta.url),'utf8');
  assert.match(html,/<form[^>]+method="post"[^>]+action="\/api\/chennai-registration"/);
  assert.match(html,/<button[^>]+id="submit-button"[^>]+disabled/);
  const elements={'#registration':{querySelectorAll:()=>[]},'#status':{},'#submit-button':{},'#setup-notice':{hidden:true}};
  vm.runInNewContext(readFileSync(new URL('../assets/chennai-registration.js',import.meta.url),'utf8'),{window:{},document:{querySelector:selector=>elements[selector]}});
  assert.equal(elements['#submit-button'].disabled,true);assert.equal(elements['#setup-notice'].hidden,false);
});

function fixture() {
  const form = new FormData();
  const data = {request_id:'10000000-0000-4000-8000-000000000001',full_name:'QA Test Participant',date_of_birth:'1980-02-29',gender:'Female',mobile:'9000000000',district:'Mahbubnagar',role:'Principal',institution:'QA Test School',udise:'36000000000',meal:'Veg',beverage:'Tea',medical_declaration:'None',emergency_name:'QA Test Contact',emergency_relationship:'Family',emergency_phone:'9000000001',aadhaar_confirmation:'on',consent:'on'};
  for (const [key,value] of Object.entries(data)) form.set(key,value);
  form.append('food_restrictions','None');
  // Tiny synthetic PNG; no participant data or real portrait.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8WQAAAAASUVORK5CYII=','base64');
  form.set('photo',new Blob([png],{type:'image/png'}),'qa.png');
  form.set('aadhaar_card',new Blob(['%PDF-1.4 synthetic masked Aadhaar QA data'],{type:'application/pdf'}),'qa-masked.pdf');
  return form;
}
const request = form => new Request('https://example.test/register',{method:'POST',headers:{Origin:'https://www.edutripindia.com'},body:form});
test('school leaders and visitors register without UDISE or mandal',()=>{
  const form=fixture(); assert.equal(validateFields(form).district,'Mahbubnagar');
  form.delete('udise');assert.equal(validateFields(form).udise,null);
  form.set('role','Accompanying Visitor');assert.equal(validateFields(form).mandal,null);
});
test('invalid dates, contact numbers and missing consent are rejected',()=>{
  for (const [key,value] of [['date_of_birth','1980-02-30'],['date_of_birth','2099-01-01'],['mobile','123'],['consent','']]) {
    const form=fixture();form.set(key,value);assert.throws(()=>validateFields(form));
  }
});
test('a different WhatsApp number is collected only when requested and validated',()=>{
  const form=fixture(); form.set('whatsapp_phone','invalid');
  assert.equal(validateFields(form).whatsapp_phone,null);
  form.set('whatsapp_different','on'); assert.throws(()=>validateFields(form));
  form.set('whatsapp_phone','9000000002'); assert.equal(validateFields(form).whatsapp_phone,'9000000002');
  form.delete('whatsapp_phone'); assert.throws(()=>validateFields(form));
});
test('food None is exclusive and conditional declarations require details',()=>{
  const form=fixture();form.append('food_restrictions','Other');assert.throws(()=>validateFields(form));
  form.delete('food_restrictions');form.append('food_restrictions','Other');assert.throws(()=>validateFields(form));
  form.set('food_other','Sesame');form.set('medical_declaration','Yes');assert.throws(()=>validateFields(form));
  form.set('medical_details','QA instructions');assert.equal(validateFields(form).food_other,'Sesame');
});
test('spoofed and oversized photo files are rejected',()=>{
  assert.throws(()=>validatePhoto({type:'image/png',size:30},new Uint8Array(30)));
  assert.throws(()=>validatePhoto({type:'image/png',size:2097153},new Uint8Array(30)));
});
test('stores photo then record and replies with the matching itinerary',async()=>{
  const calls=[]; const handler=createHandler({url:'https://db.test',serviceKey:'server-only-test-key',fetcher:async(url,options)=>{
    calls.push({url,options});return url.includes('?id=')?Response.json([]):url.includes('/object/sign/')?Response.json({signedURL:'/object/sign/chennai-itineraries-2026/Revised_Itinerary_Chennai_Trip_Mahabubnagar.pdf?token=test'}):url.includes('/rest/')?Response.json([{registration_reference:'REGCHN0001'}],{status:201}):new Response(null,{status:201});
  }});
  const response=await handler(request(fixture()));assert.equal(response.status,201);
  const result=await response.json();assert.equal(result.reference,'REGCHN0001');assert.match(result.itinerary_url,/storage\/v1\/object\/sign\/chennai-itineraries-2026\/Revised_Itinerary_Chennai_Trip_Mahabubnagar\.pdf/);assert.equal(calls.length,5);
  assert.equal(JSON.parse(calls.find(call=>call.url.includes('/object/sign/')).options.body).expiresIn,2592000);
  const stored=JSON.parse(calls.find(call=>call.url.endsWith('/rest/v1/chennai_registrations_2026')).options.body);assert.match(stored.photo_path,/\.png$/);assert.match(stored.aadhaar_path,/QA_Test_Participant_Aadhaar_Masked\.pdf$/);assert.equal(stored.consent_version,'chennai-2026-v4');assert.equal(stored.photo,undefined);
});
test('retry returns original reference without another upload',async()=>{
  let count=0;const handler=createHandler({url:'https://db.test',serviceKey:'test',fetcher:async url=>{count++;return url.includes('?id=')?Response.json([{registration_reference:'REGCHN0001'}]):Response.json({signedURL:'/object/sign/chennai-itineraries-2026/file.pdf?token=test'});}});
  const response = await handler(request(fixture())); assert.equal(response.status,200); const result=await response.json();assert.equal(result.reference,'REGCHN0001');assert.match(result.itinerary_url,/file.pdf/);assert.equal(count,2);
});
test('database rejection removes uploaded photo and never reports success',async()=>{
  const calls=[];const handler=createHandler({url:'https://db.test',serviceKey:'test',fetcher:async(url,options)=>{
    calls.push({url,options});if(url.includes('?id='))return Response.json([]);if(url.includes('/object/sign/'))return Response.json({signedURL:'/object/sign/chennai-itineraries-2026/file.pdf?token=test'});return new Response(null,{status:options.method==='POST'&&url.includes('/rest/')?422:200});
  }});
  assert.equal((await handler(request(fixture()))).status,503);assert.equal(calls.at(-1).options.method,'DELETE');
});
test('disallowed origin and oversized payload stop before storage',async()=>{
  const handler=createHandler({url:'https://db.test',serviceKey:'test',fetcher:()=>{throw Error('Must not call storage');}});
  assert.equal((await handler(new Request('https://db.test',{method:'OPTIONS',headers:{Origin:'https://evil.test'}}))).status,403);
  const oversized=new Request('https://db.test',{method:'POST',headers:{'Content-Type':'multipart/form-data; boundary=qa'},body:new Blob([new Uint8Array(8500001)])});
  assert.equal((await handler(oversized)).status,413);
  const preflight=await handler(new Request('https://db.test',{method:'OPTIONS',headers:{Origin:'https://www.registrationpmshri.edutripindia.com'}}));
  assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'https://www.registrationpmshri.edutripindia.com');
});

test('photo filenames use participant names safely and preserve format',()=>{assert.equal(photoFilename('Raghavendra Prasad','jpg'),'Raghavendra_Photo.jpg');assert.equal(photoFilename('../ Unsafe','png'),'Participant_Photo.png');});
test('each district resolves to its revised itinerary PDF',()=>{
  const districts={Hyderabad:'Hyderabad',Sangareddy:'Sangareddy',Mahbubnagar:'Mahabubnagar','Medchal–Malkajgiri':'Medchal_Malkajgiri'};
  for(const [district,file] of Object.entries(districts)) assert.equal(itineraryDetails(district).itinerary_filename,`Revised_Itinerary_Chennai_Trip_${file}.pdf`);
  assert.throws(()=>itineraryDetails('Unknown'));
});

test('upstream failures identify their stage without logging participant data or keys',async()=>{
  for (const [failedPath,code] of [['?id=','DATABASE_LOOKUP'],['/object/chennai-passport-','PHOTO_UPLOAD'],['/object/chennai-masked-','AADHAAR_UPLOAD']]) {
    const logs=[];
    const handler=createHandler({url:'https://db.test',serviceKey:'NEVER_LOG_THIS_KEY',logger:{error:entry=>logs.push(JSON.parse(entry))},fetcher:async(url)=>{
      if(url.includes(failedPath))return new Response(null,{status:500});
      if(url.includes('?id='))return Response.json([]);
      if(url.includes('/object/sign/'))return Response.json({signedURL:'/object/sign/test.pdf?token=private'});
      return new Response(null,{status:201});
    }});
    const response=await handler(request(fixture()));
    assert.equal(response.status,503); assert.equal((await response.json()).code,code);
    assert.equal(logs[0].code,code);
    assert.doesNotMatch(JSON.stringify(logs),/QA Test Participant|9000000000|NEVER_LOG_THIS_KEY|private/);
  }
});

function memoryBackend({insertMode,signFails=false,cleanupFails=false,pathsFail=false,transientPhoto=false}={}) {
  const records=new Map(),objects=new Map(),calls=[],logs=[];
  let insertCalls=0,photoRetried=false;
  const fetcher=async(url,options={})=>{
    calls.push({url,options});
    if (url.includes('?id=')) {
      if (pathsFail&&url.includes('select=photo_path'))throw new TypeError('Lost cleanup lookup');
      const id=url.match(/id=eq\.([^&]+)/)[1];
      return Response.json(records.has(id)?[records.get(id)]:[]);
    }
    if(url.includes('/object/sign/'))return signFails?new Response(null,{status:503}):Response.json({signedURL:'/object/sign/chennai-itineraries-2026/test.pdf?token=test'});
    if(url.includes('/storage/')&&options.method==='POST') {
      objects.set(url,options.body);
      if(transientPhoto&&url.includes('/chennai-passport-')&&!photoRetried){photoRetried=true;throw new TypeError('Upload response lost');}
      return new Response(null,{status:201});
    }
    if(url.includes('/storage/')&&options.method==='DELETE') {
      if(cleanupFails)throw new TypeError('Cleanup offline');
      for(const prefix of JSON.parse(options.body).prefixes) objects.delete(`${url}/${prefix}`);
      return new Response(null,{status:200});
    }
    if(url.endsWith('/rest/v1/chennai_registrations_2026')&&options.method==='POST') {
      insertCalls++;
      const record=JSON.parse(options.body);
      if(insertMode==='unavailable')return new Response(null,{status:503});
      if(records.has(record.id))return new Response(null,{status:409});
      records.set(record.id,{...record,registration_reference:'REGCHNRECOVERED'});
      if(insertMode==='lost')throw new DOMException('Response lost after commit','TimeoutError');
      if(insertMode==='malformed')return new Response('truncated',{status:201});
      return Response.json([records.get(record.id)],{status:201});
    }
    throw new Error('Unexpected request');
  };
  return {records,objects,calls,logs,get insertCalls(){return insertCalls;},handler:createHandler({url:'https://db.test',serviceKey:'private',fetcher,pause:async()=>{},logger:{error:entry=>logs.push(JSON.parse(entry)),warn:entry=>logs.push(JSON.parse(entry))}})};
}

test('itinerary outages cannot block a saved registration or its retry',async()=>{
  const backend=memoryBackend({signFails:true});
  for(const expected of [201,200]) {
    const response=await backend.handler(request(fixture()));
    assert.equal(response.status,expected);
    const result=await response.json();assert.equal(result.reference,'REGCHNRECOVERED');assert.equal(result.itinerary_url,undefined);
  }
  assert.equal(backend.records.size,1);assert.equal(backend.insertCalls,1);assert.equal(backend.objects.size,2);
  assert.ok(backend.logs.some(log=>log.code==='ITINERARY_LINK'));
});

test('lost and malformed insert responses recover the committed reference without deleting its files',async()=>{
  for(const insertMode of ['lost','malformed']) {
    const backend=memoryBackend({insertMode});
    const response=await backend.handler(request(fixture()));
    assert.equal(response.status,200);assert.equal((await response.json()).reference,'REGCHNRECOVERED');
    assert.equal(backend.insertCalls,1);assert.equal(backend.records.size,1);assert.equal(backend.objects.size,2);
    assert.equal(backend.calls.filter(call=>call.options.method==='DELETE').length,0);
  }
});

test('uncertain database failures preserve uploaded files for safe reconciliation',async()=>{
  const backend=memoryBackend({insertMode:'unavailable'});
  assert.equal((await backend.handler(request(fixture()))).status,503);
  assert.equal(backend.records.size,0);assert.equal(backend.objects.size,2);
  assert.equal(backend.calls.filter(call=>call.options.method==='DELETE').length,0);
});

test('retrying an interrupted storage write uses the same attempt path and bytes',async()=>{
  const backend=memoryBackend({transientPhoto:true});
  assert.equal((await backend.handler(request(fixture()))).status,201);
  const photoCalls=backend.calls.filter(call=>call.options.method==='POST'&&call.url.includes('/object/chennai-passport-'));
  assert.equal(photoCalls.length,2);assert.equal(photoCalls[0].url,photoCalls[1].url);assert.equal(photoCalls[0].options.body,photoCalls[1].options.body);
  assert.equal(photoCalls[0].options.headers['x-upsert'],'true');assert.equal(backend.objects.size,2);
});

test('concurrent retries produce one registration and keep its referenced files',async()=>{
  for(const options of [{},{cleanupFails:true},{pathsFail:true}]) {
    const backend=memoryBackend(options);
    const responses=await Promise.all([backend.handler(request(fixture())),backend.handler(request(fixture()))]);
    for(const response of responses){assert.ok(response.ok);assert.equal((await response.json()).reference,'REGCHNRECOVERED');}
    assert.equal(backend.records.size,1);
    const saved=[...backend.records.values()][0];
    assert.ok(backend.objects.has(`https://db.test/storage/v1/object/chennai-passport-photos-2026/${saved.photo_path}`));
    assert.ok(backend.objects.has(`https://db.test/storage/v1/object/chennai-masked-aadhaar-2026/${saved.aadhaar_path}`));
  }
});

test('a retried registration uses the saved district for its itinerary',async()=>{
  const backend=memoryBackend();
  const first=fixture();first.set('district','Hyderabad');
  assert.equal((await backend.handler(request(first))).status,201);
  await backend.handler(request(fixture()));
  const signing=backend.calls.filter(call=>call.url.includes('/object/sign/'));
  assert.ok(signing.every(call=>call.url.includes('Hyderabad.pdf')));
});
