const DISTRICTS = ['Hyderabad','Sangareddy','Mahbubnagar','Medchal–Malkajgiri'];
const ROLES = ['Headmaster / Headmistress','Principal','School Complex Headmaster','DEO / Department Official','Accompanying Visitor','Other'];
const FOOD = ['None','Onion','Garlic','Mushroom','Curd','Milk / dairy','Nuts / peanuts','Eggs','Wheat / gluten','Seafood','Soy','Other'];
const ORIGINS = ['https://www.edutripindia.com','https://edutripindia.com','https://www.registrationpmshri.edutripindia.com','http://localhost:304','http://127.0.0.1:304'];
const BUCKET = 'chennai-passport-photos-2026';
const AADHAAR_BUCKET = 'chennai-masked-aadhaar-2026';
const ITINERARY_BUCKET = 'chennai-itineraries-2026';
const ITINERARIES = {
  'Hyderabad': 'Revised_Itinerary_Chennai_Trip_Hyderabad.pdf',
  'Sangareddy': 'Revised_Itinerary_Chennai_Trip_Sangareddy.pdf',
  'Mahbubnagar': 'Revised_Itinerary_Chennai_Trip_Mahabubnagar.pdf',
  'Medchal–Malkajgiri': 'Revised_Itinerary_Chennai_Trip_Medchal_Malkajgiri.pdf',
};
const TABLE = 'chennai_registrations_2026';
const MAX_BODY = 8500000;
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0,10) !== dob || dob < '1900-01-01' || dob > today || dob > '2026-10-27') throw new InputError('Please enter a valid date of birth.');
  choice('gender',['Female','Male','Other','Prefer not to say']);
  for (const key of ['mobile','emergency_phone']) if (!/^[6-9][0-9]{9}$/.test(text(key,10,true))) throw new InputError('Please enter valid 10-digit mobile and emergency numbers.');
  if (form.get('whatsapp_different') === 'on') {
    if (!/^[6-9][0-9]{9}$/.test(text('whatsapp_phone',10,true))) throw new InputError('Please enter a valid 10-digit WhatsApp number.');
  } else record.whatsapp_phone = null;
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
  if (form.get('aadhaar_confirmation') !== 'on') throw new InputError('Please consent to Aadhaar use only for flight tickets and venue entry.');
  if (form.get('website')) throw new InputError('Unable to accept this submission.');
  return record;
}
export function validateAadhaar(file, bytes) {
  if (!file || !['application/pdf','image/jpeg','image/png'].includes(file.type) || file.size < 20 || file.size > 5242880) throw new InputError('Upload a masked Aadhaar copy as PDF, JPG or PNG, up to 5 MB.');
  const pdf = file.type === 'application/pdf' && new TextDecoder().decode(bytes.slice(0,5)) === '%PDF-';
  const png = file.type === 'image/png' && [137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n);
  const jpg = file.type === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!pdf && !png && !jpg) throw new InputError('The Aadhaar file does not match its file type. Please use a PDF, JPG or PNG file.');
  return file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg';
}
export function aadhaarFilename(name, extension) {
  const safe = name.normalize('NFKC').trim().replace(/\s+/g,'_').replace(/[^\p{L}\p{N}_-]/gu,'').slice(0,100) || 'Participant';
  return `${safe}_Aadhaar_Masked.${extension}`;
}
export function itineraryDetails(district) {
  const filename = ITINERARIES[district];
  if (!filename) throw new InputError('No itinerary is available for this district yet. Please contact Edutrip.');
  return {itinerary_filename:filename, path:filename};
}
export function validatePhoto(file, bytes) {
  if (!file || !['image/jpeg','image/png'].includes(file.type) || file.size < 20 || file.size > 2097152) throw new InputError('Upload a JPG or PNG photograph up to 2 MB.');
  const png = [137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n);
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if ((file.type === 'image/png' && !png) || (file.type === 'image/jpeg' && !jpg)) throw new InputError('The photo does not match its file type. Please use a JPG or PNG image.');
  return file.type === 'image/png' ? 'png' : 'jpg';
}
export function photoFilename(name, extension) {
  const first = name.normalize('NFKC').trim().split(/\s+/)[0].replace(/[^\p{L}\p{N}_-]/gu,'').slice(0,70) || 'Participant';
  return `${first}_Photo.${extension}`;
}
export function createHandler({url, serviceKey, fetcher = fetch, logger = console, pause = ms => new Promise(resolve => setTimeout(resolve,ms))}) {
  const headers = {apikey:serviceKey, Authorization:`Bearer ${serviceKey}`};
  const log = (level, data) => { try { logger[level]?.(JSON.stringify(data)); } catch { /* Logging must not affect registration. */ } };
  const api = async (path, options = {}, timeoutMs = 20000) => {
    const method = options.method || 'GET';
    const retryable = method === 'GET' || method === 'DELETE' || path.includes('/object/sign/') || options.headers?.['x-upsert'] === 'true';
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetcher(`${url}${path}`, {...options, headers:{...headers,...options.headers}, signal:AbortSignal.timeout(timeoutMs)});
        if (retryable && attempt === 0 && [429,500,502,503,504].includes(response.status)) {
          await response.body?.cancel(); await pause(250); continue;
        }
        return response;
      } catch (error) {
        if (!retryable || attempt > 0) throw error;
        await pause(250);
      }
    }
  };
  const signedItinerary = async district => {
    const details = itineraryDetails(district);
    const signed = await api(`/storage/v1/object/sign/${ITINERARY_BUCKET}/${encodeURIComponent(details.path)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:2592000,download:details.itinerary_filename})},5000);
    if (!signed.ok) throw new Error('Itinerary link failed');
    const data = await signed.json();
    const signedURL = data.signedURL || data.signedUrl;
    if (typeof signedURL !== 'string' || !signedURL) throw new Error('Itinerary link failed');
    const itineraryUrl = signedURL.startsWith('http') ? signedURL : `${url}${signedURL.startsWith('/storage/v1/') ? '' : '/storage/v1'}${signedURL.startsWith('/') ? signedURL : `/${signedURL}`}`;
    // Never send an unexpected host or protocol to the confirmation page.
    if (new URL(itineraryUrl).origin !== new URL(url).origin) throw new Error('Itinerary link failed');
    return {itinerary_filename:details.itinerary_filename,itinerary_url:itineraryUrl};
  };
  return async req => {
    const origin = req.headers.get('origin');
    const cors = {'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Vary':'Origin'};
    if (ORIGINS.includes(origin)) cors['Access-Control-Allow-Origin'] = origin;
    const reply = (data, status = 200, extraHeaders = {}) => new Response(JSON.stringify(data),{status,headers:{...cors,...extraHeaders}});
    if (origin && !ORIGINS.includes(origin)) return reply({error:'This registration form is not available on this website.'},403);
    if (req.method === 'OPTIONS') return new Response(null,{status:204,headers:cors});
    if (req.method !== 'POST') return reply({error:'Use the registration form to submit your details.'},405);
    if (Date.now() >= Date.parse('2026-11-28T18:30:00Z')) return reply({error:'Registration for this programme is closed.'},410);
    if (!url || !serviceKey) return reply({error:'Registration is temporarily unavailable. Please contact Edutrip.'},503);
    let uploadedPath, uploadedAadhaarPath, insertAttempted = false, definiteRejection = false;
    let stage = 'BODY_READ', requestId, district;
    const confirmed = async (reference, savedDistrict, status = 200) => {
      let itinerary = {};
      try { itinerary = await signedItinerary(savedDistrict); }
      catch { log('warn',{event:'chennai_itinerary_unavailable',code:'ITINERARY_LINK',request_id:requestId}); }
      return reply({reference,...itinerary},status);
    };
    const lookup = async () => {
      const response = await api(`/rest/v1/${TABLE}?id=eq.${requestId}&select=registration_reference,district`);
      if (!response.ok) throw new Error('Database lookup failed');
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('Database lookup failed');
      return rows[0];
    };
    const cleanup = async () => {
      for (const [bucket,path] of [[BUCKET,uploadedPath],[AADHAAR_BUCKET,uploadedAadhaarPath]]) {
        if (!path) continue;
        try {
          const response = await api(`/storage/v1/object/${bucket}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:[path]})});
          if (!response.ok) throw new Error('Cleanup failed');
        } catch { log('warn',{event:'chennai_upload_cleanup_pending',code:'CLEANUP',request_id:requestId}); }
      }
    };
    try {
      if (Number(req.headers.get('content-length') || 0) > MAX_BODY) return reply({error:'The files exceed the upload limit. Use a photo up to 2 MB and masked Aadhaar up to 5 MB.'},413);
      if (!req.headers.get('content-type')?.startsWith('multipart/form-data')) return reply({error:'Invalid form submission.'},400);
      const reader = req.body?.getReader(); if (!reader) throw new InputError('Empty submission.');
      const chunks = []; let size = 0;
      while (true) { const {done,value} = await reader.read(); if (done) break; size += value.length; if (size > MAX_BODY) { await reader.cancel(); return reply({error:'The files exceed the upload limit. Use a photo up to 2 MB and masked Aadhaar up to 5 MB.'},413); } chunks.push(value); }
      let form; try { form = await new Response(new Blob(chunks),{headers:{'Content-Type':req.headers.get('content-type')}}).formData(); } catch { throw new InputError('Invalid form submission.'); }
      const record = validateFields(form);
      requestId = record.id; district = record.district;
      const photo = form.get('photo');
      if (!photo || typeof photo.arrayBuffer !== 'function' || photo.size > 2097152) throw new InputError('Upload a JPG or PNG photograph up to 2 MB.');
      const bytes = new Uint8Array(await photo.arrayBuffer()); const extension = validatePhoto(photo,bytes);
      const aadhaar = form.get('aadhaar_card');
      if (!aadhaar || typeof aadhaar.arrayBuffer !== 'function' || aadhaar.size > 5242880) throw new InputError('Upload a masked Aadhaar copy as PDF, JPG or PNG, up to 5 MB.');
      const aadhaarBytes = new Uint8Array(await aadhaar.arrayBuffer()); const aadhaarExtension = validateAadhaar(aadhaar,aadhaarBytes);
      stage = 'DATABASE_LOOKUP';
      const previous = await lookup();
      if (previous?.registration_reference) return confirmed(previous.registration_reference,previous.district || district);
      // Retries of one request ID must not consume additional rate-limit slots.
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim(), now = Date.now();
      for (const [key,value] of limits) if (now - value.start > 600000) limits.delete(key);
      if (ip) {
        const entry = limits.get(ip) || {start:now,ids:new Set()};
        if (!entry.ids.has(requestId) && entry.ids.size >= 40) return reply({error:'Too many submissions. Please wait a few minutes before retrying.'},429,{'Retry-After':String(Math.max(1,Math.ceil((600000 - (now-entry.start))/1000)))});
        entry.ids.add(requestId); limits.set(ip,entry);
      }
      // Separate attempts have separate paths; a transport retry safely reuses its own path and bytes.
      uploadedPath = `${record.id}/${crypto.randomUUID()}/${photoFilename(record.full_name,extension)}`;
      stage = 'PHOTO_UPLOAD';
      const upload = await api(`/storage/v1/object/${BUCKET}/${uploadedPath}`,{method:'POST',headers:{'Content-Type':photo.type,'x-upsert':'true'},body:bytes});
      if (!upload.ok) throw new Error('Photo upload failed');
      record.photo_path = uploadedPath;
      uploadedAadhaarPath = `${record.id}/${crypto.randomUUID()}/${aadhaarFilename(record.full_name,aadhaarExtension)}`;
      stage = 'AADHAAR_UPLOAD';
      const aadhaarUpload = await api(`/storage/v1/object/${AADHAAR_BUCKET}/${uploadedAadhaarPath}`,{method:'POST',headers:{'Content-Type':aadhaar.type,'x-upsert':'true'},body:aadhaarBytes});
      if (!aadhaarUpload.ok) throw new Error('Aadhaar upload failed');
      record.aadhaar_path = uploadedAadhaarPath;
      record.consent_version = 'chennai-2026-v4';
      stage = 'DATABASE_SAVE'; insertAttempted = true;
      // Do not blindly retry an insert: a lost response may follow a committed write.
      const insert = await api(`/rest/v1/${TABLE}`,{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(record)});
      if (!insert.ok) {
        definiteRejection = insert.status >= 400 && insert.status < 500 && ![408,429].includes(insert.status);
        throw new Error('Database write failed');
      }
      const saved = (await insert.json())[0];
      if (!saved?.registration_reference) throw new Error('Database confirmation missing');
      return confirmed(saved.registration_reference,district,201);
    } catch (error) {
      if (insertAttempted) {
        try {
          const committed = await lookup();
          if (committed?.registration_reference) {
            // A concurrent attempt may own the committed files. Remove only this attempt's unused files.
            // Read the paths before cleanup so an ambiguous successful insert can never lose its files.
            try {
              const pathsResponse = await api(`/rest/v1/${TABLE}?id=eq.${requestId}&select=photo_path,aadhaar_path`);
              if (pathsResponse.ok) {
                const saved = (await pathsResponse.json())[0];
                if (saved) {
                  if (saved.photo_path === uploadedPath) uploadedPath = null;
                  if (saved.aadhaar_path === uploadedAadhaarPath) uploadedAadhaarPath = null;
                  await cleanup();
                }
              }
            } catch { log('warn',{event:'chennai_upload_cleanup_pending',code:'CLEANUP',request_id:requestId}); }
            return confirmed(committed.registration_reference,committed.district || district);
          }
        } catch { /* Preserve files while the result of an insert remains uncertain. */ }
      }
      if (!insertAttempted || definiteRejection) await cleanup();
      if (error instanceof InputError) return reply({error:error.message},400);
      log('error',{event:'chennai_registration_failure',code:stage,request_id:requestId,kind:['TimeoutError','AbortError'].includes(error?.name) ? 'timeout' : 'upstream'});
      return reply({error:'We could not confirm your submission. Your details remain in this form. Please retry or call Edutrip on 7989054712.',code:stage},503);
    }
  };
}
