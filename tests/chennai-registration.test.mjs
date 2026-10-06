import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,validateFields,validatePhoto} from '../supabase/functions/chennai-registration/handler.mjs';

function fixture() {
  const form = new FormData();
  const data = {request_id:'10000000-0000-4000-8000-000000000001',full_name:'QA Test Participant',date_of_birth:'1980-02-29',gender:'Female',mobile:'9000000000',district:'Medak',role:'Principal',institution:'QA Test School',udise:'36000000000',meal:'Veg',beverage:'Tea',medical_declaration:'None',emergency_name:'QA Test Contact',emergency_relationship:'Family',emergency_phone:'9000000001',consent:'on'};
  for (const [key,value] of Object.entries(data)) form.set(key,value);
  form.append('food_restrictions','None');
  // Tiny synthetic PNG; no participant data or real portrait.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8WQAAAAASUVORK5CYII=','base64');
  form.set('photo',new Blob([png],{type:'image/png'}),'qa.png');
  return form;
}
const request = form => new Request('https://example.test/register',{method:'POST',headers:{Origin:'https://www.edutripindia.com'},body:form});
test('school leaders and visitors register without UDISE or mandal',()=>{
  const form=fixture(); assert.equal(validateFields(form).district,'Medak');
  form.delete('udise');assert.equal(validateFields(form).udise,null);
  form.set('role','Accompanying Visitor');assert.equal(validateFields(form).mandal,null);
});
test('invalid dates, contact numbers and missing consent are rejected',()=>{
  for (const [key,value] of [['date_of_birth','1980-02-30'],['date_of_birth','2099-01-01'],['mobile','123'],['consent','']]) {
    const form=fixture();form.set(key,value);assert.throws(()=>validateFields(form));
  }
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
test('stores photo then record; reply exposes only registration reference',async()=>{
  const calls=[]; const handler=createHandler({url:'https://db.test',serviceKey:'server-only-test-key',fetcher:async(url,options)=>{
    calls.push({url,options});return url.includes('?id=')?Response.json([]):new Response(null,{status:201});
  }});
  const response=await handler(request(fixture()));assert.equal(response.status,201);
  assert.deepEqual(Object.keys(await response.json()),['reference']);assert.equal(calls.length,3);
  const stored=JSON.parse(calls[2].options.body);assert.match(stored.photo_path,/\.png$/);assert.equal(stored.consent_version,'chennai-2026-v2');assert.equal(stored.photo,undefined);
});
test('retry returns original reference without another upload',async()=>{
  let count=0;const handler=createHandler({url:'https://db.test',serviceKey:'test',fetcher:async()=>{count++;return Response.json([{id:'10000000-0000-4000-8000-000000000001'}]);}});
  assert.equal((await handler(request(fixture()))).status,200);assert.equal(count,1);
});
test('database rejection removes uploaded photo and never reports success',async()=>{
  const calls=[];const handler=createHandler({url:'https://db.test',serviceKey:'test',fetcher:async(url,options)=>{
    calls.push({url,options});if(url.includes('?id='))return Response.json([]);return new Response(null,{status:options.method==='POST'&&url.includes('/rest/')?500:200});
  }});
  assert.equal((await handler(request(fixture()))).status,503);assert.equal(calls.at(-1).options.method,'DELETE');
});
test('disallowed origin and oversized payload stop before storage',async()=>{
  const handler=createHandler({url:'https://db.test',serviceKey:'test',fetcher:()=>{throw Error('Must not call storage');}});
  assert.equal((await handler(new Request('https://db.test',{method:'OPTIONS',headers:{Origin:'https://evil.test'}}))).status,403);
  assert.equal((await handler(new Request('https://db.test',{method:'POST',headers:{'Content-Length':'3000000'}}))).status,413);
  const preflight=await handler(new Request('https://db.test',{method:'OPTIONS',headers:{Origin:'https://www.registrationpmshri.edutripindia.com'}}));
  assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'https://www.registrationpmshri.edutripindia.com');
});
