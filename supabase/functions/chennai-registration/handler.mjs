const DISTRICTS = ['Hyderabad','Sangareddy','Medak','Medchal–Malkajgiri'];
const ROLES = ['Headmaster / Headmistress','Principal','School Complex Headmaster','DEO / Department Official','Accompanying Visitor','Other'];
const FOOD = ['None','Onion','Garlic','Mushroom','Curd','Milk / dairy','Nuts / peanuts','Eggs','Wheat / gluten','Seafood','Soy','Other'];
const ORIGINS = ['https://www.edutripindia.com','https://edutripindia.com','https://www.registrationpmshri.edutripindia.com','http://localhost:304','http://127.0.0.1:304'];
const BUCKET = 'chennai-passport-photos-2026';
const TABLE = 'chennai_registrations_2026';
const MAX_BODY = 2300000;
const limits = new Map();
class InputError extends Error {}
export function validateFields(form, today = new Date().toISOString().slice(0,10)) {
  const record = {};
  const text = (key, max, required = false) => {
    const raw = form.get(key);
    if (raw != null && typeof raw !== 'string') throw new InputError(`Invalid ${key}.`);
    const value = (raw || '').trim();
    if ((required && !value) || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new InputError(`Please check ${key.replaceAll('_',' ')}.`);
    record[key] = value || null; return value;
  };
  const choice = (key, values) => { const value = text(key, 100, true); if (!values.includes(value)) throw new InputError(`Please select a valid ${key.replaceAll('_',' ')}.`); return value; };
  const id = text('request_id',36,true);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new InputError('Invalid registration reference. Please reload the form.');
  record.id = id; delete record.request_id;
  text('full_name',150,true);
  const dob = text('date_of_birth',10,true);
  const parsedDate = new Date(`${dob}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0,10) !== dob || dob < '1900-01-01' || dob > today || dob > '2026-10-28') throw new InputError('Please enter a valid date of birth.');
  choice('gender',['Female','Male','Other','Prefer not to say']);
  for (const key of ['mobile','emergency_phone']) if (!/^[6-9][0-9]{9}$/.test(text(key,10,true))) throw new InputError('Please enter valid 10-digit mobile and emergency numbers.');
  const email = text('email',254); if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InputError('Please check your email address.');
  choice('district',DISTRICTS); const role = choice('role',ROLES);
  if (role === 'Other') text('role_other',120,true); else record.role_other = null;
  text('institution',200,true);
  // Legacy columns remain nullable for existing records; the form no longer collects these fields.
  record.udise = null; record.mandal = null;
  choice('meal',['Veg','Non Veg']); choice('beverage',['Tea','Coffee','Neither']);
  const foods = form.getAll('food_restrictions');
  if (!foods.length || foods.length > FOOD.length || foods.some(f => !FOOD.includes(f)) || new Set(foods).size !== foods.length || (foods.includes('None') && foods.length > 1)) throw new InputError('Select food restrictions or None.');
  record.food_restrictions = foods;
  if (foods.includes('Other')) text('food_other',500,true); else record.food_other = null;
  text('food_notes',1000);
  const medical = choice('medical_declaration',['None','Yes','Discuss privately']);
  if (medical === 'Yes') text('medical_details',1500,true); else record.medical_details = null;
  text('accessibility',1000); text('emergency_name',150,true); text('emergency_relationship',80,true);
  if (form.get('consent') !== 'on') throw new InputError('Please confirm the consent declaration.');
  if (form.get('website')) throw new InputError('Unable to accept this submission.');
  return record;
}
export function validatePhoto(file, bytes) {
  if (!file || !['image/jpeg','image/png'].includes(file.type) || file.size < 20 || file.size > 2097152) throw new InputError('Upload a JPG or PNG photograph up to 2 MB.');
  const png = [137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n);
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if ((file.type === 'image/png' && !png) || (file.type === 'image/jpeg' && !jpg)) throw new InputError('The photo does not match its file type. Please use a JPG or PNG image.');
  return file.type === 'image/png' ? 'png' : 'jpg';
}
export function createHandler({url, serviceKey, fetcher = fetch}) {
  const headers = {apikey:serviceKey, Authorization:`Bearer ${serviceKey}`};
  const api = (path, options = {}) => fetcher(`${url}${path}`, {...options, headers:{...headers,...options.headers}, signal:AbortSignal.timeout(20000)});
  return async req => {
    const origin = req.headers.get('origin');
    const cors = {'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Vary':'Origin'};
    if (ORIGINS.includes(origin)) cors['Access-Control-Allow-Origin'] = origin;
    const reply = (data, status = 200) => new Response(JSON.stringify(data),{status,headers:cors});
    if (origin && !ORIGINS.includes(origin)) return reply({error:'This registration form is not available on this website.'},403);
    if (req.method === 'OPTIONS') return new Response(null,{status:204,headers:cors});
    if (req.method !== 'POST') return reply({error:'Use the registration form to submit your details.'},405);
    if (!url || !serviceKey) return reply({error:'Registration is temporarily unavailable. Please contact Edutrip.'},503);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim();
    const now = Date.now();
    for (const [key,value] of limits) if (now - value.start > 600000) limits.delete(key);
    if (ip) { const entry = limits.get(ip) || {start:now,count:0}; entry.count++; limits.set(ip,entry); if (entry.count > 40) return reply({error:'Too many submissions. Please wait a few minutes before retrying.'},429); }
    let uploadedPath;
    try {
      if (Number(req.headers.get('content-length') || 0) > MAX_BODY) return reply({error:'Please upload a photo up to 2 MB.'},413);
      if (!req.headers.get('content-type')?.startsWith('multipart/form-data')) return reply({error:'Invalid form submission.'},400);
      const reader = req.body?.getReader(); if (!reader) throw new InputError('Empty submission.');
      const chunks = []; let size = 0;
      while (true) { const {done,value} = await reader.read(); if (done) break; size += value.length; if (size > MAX_BODY) { await reader.cancel(); return reply({error:'Please upload a photo up to 2 MB.'},413); } chunks.push(value); }
      let form; try { form = await new Response(new Blob(chunks),{headers:{'Content-Type':req.headers.get('content-type')}}).formData(); } catch { throw new InputError('Invalid form submission.'); }
      const record = validateFields(form);
      const photo = form.get('photo');
      if (!photo || typeof photo.arrayBuffer !== 'function' || photo.size > 2097152) throw new InputError('Upload a JPG or PNG photograph up to 2 MB.');
      const bytes = new Uint8Array(await photo.arrayBuffer()); const extension = validatePhoto(photo,bytes);
      const existing = await api(`/rest/v1/${TABLE}?id=eq.${record.id}&select=id`);
      if (!existing.ok) throw new Error('Database lookup failed');
      if ((await existing.json()).length) return reply({reference:record.id});
      // Each attempt gets its own photo path; a concurrent retry cannot overwrite another attempt's photo.
      uploadedPath = `${record.id}/${crypto.randomUUID()}.${extension}`;
      const upload = await api(`/storage/v1/object/${BUCKET}/${uploadedPath}`,{method:'POST',headers:{'Content-Type':photo.type,'x-upsert':'false'},body:bytes});
      if (!upload.ok) { uploadedPath = null; throw new Error('Photo upload failed'); }
      record.photo_path = uploadedPath;
      record.consent_version = 'chennai-2026-v1';
      const insert = await api(`/rest/v1/${TABLE}`,{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(record)});
      if (!insert.ok) {
        // A simultaneous retry may have committed the same request ID.
        const check = await api(`/rest/v1/${TABLE}?id=eq.${record.id}&select=id`);
        if (check.ok && (await check.json()).length) {
          await api(`/storage/v1/object/${BUCKET}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:[uploadedPath]})});
          uploadedPath = null; return reply({reference:record.id});
        }
        throw new Error('Database write failed');
      }
      uploadedPath = null;
      return reply({reference:record.id},201);
    } catch (error) {
      // If an insert timed out, keep the photo: the database may already reference it.
      // Definite rejected inserts are cleaned up; ambiguous failures are reconciled by the organiser.
      if (error.message === 'Database write failed' && uploadedPath) {
        try { await api(`/storage/v1/object/${BUCKET}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:[uploadedPath]})}); } catch { /* See operations guide for orphan reconciliation. */ }
      }
      if (error instanceof InputError) return reply({error:error.message},400);
      return reply({error:'We could not confirm your submission. Please retry or call Edutrip on 7989054712.'},503);
    }
  };
}
