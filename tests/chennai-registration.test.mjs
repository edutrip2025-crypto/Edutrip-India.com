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
  assert.equal(JSON.parse(calls[1].options.body).expiresIn,2592000);
  const stored=JSON.parse(calls[4].options.body);assert.match(stored.photo_path,/\.png$/);assert.match(stored.aadhaar_path,/QA_Test_Participant_Aadhaar_Masked\.pdf$/);assert.equal(stored.consent_version,'chennai-2026-v4');assert.equal(stored.photo,undefined);
});
test('retry returns original reference without another upload',async()=>{
  let count=0;const handler=createHandler({url:'https://db.test',serviceKey:'test',fetcher:async url=>{count++;return url.includes('?id=')?Response.json([{registration_reference:'REGCHN0001'}]):Response.json({signedURL:'/object/sign/chennai-itineraries-2026/file.pdf?token=test'});}});
  const response = await handler(request(fixture())); assert.equal(response.status,200); const result=await response.json();assert.equal(result.reference,'REGCHN0001');assert.match(result.itinerary_url,/file.pdf/);assert.equal(count,2);
});
test('database rejection removes uploaded photo and never reports success',async()=>{
  const calls=[];const handler=createHandler({url:'https://db.test',serviceKey:'test',fetcher:async(url,options)=>{
    calls.push({url,options});if(url.includes('?id='))return Response.json([]);if(url.includes('/object/sign/'))return Response.json({signedURL:'/object/sign/chennai-itineraries-2026/file.pdf?token=test'});return new Response(null,{status:options.method==='POST'&&url.includes('/rest/')?500:200});
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
  for (const [failedPath,code] of [['?id=','DATABASE_LOOKUP'],['/object/sign/','ITINERARY_LINK'],['/object/chennai-passport-','PHOTO_UPLOAD'],['/object/chennai-masked-','AADHAAR_UPLOAD']]) {
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
