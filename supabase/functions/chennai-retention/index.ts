// JWT and custom-secret authenticated cleanup, restricted to explicitly expired records.
const AUTH_HASH = 'f4a7e577541d0ca33c6d7cefb78c1df2be4fbb482cb666808652a00c32aa8aed';
const bucket = 'chennai-passport-photos-2026';
const aadhaarBucket = 'chennai-masked-aadhaar-2026';
const table = 'chennai_registrations_2026';
const url = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`${url}${path}`,{...options,headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error('Cleanup storage request failed');
  return response;
}
Deno.serve(async req => {
  const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  if (req.method !== 'POST') return reply({error:'Method not allowed'},405);
  const token = req.headers.get('x-retention-secret') || '';
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)));
  const hash = Array.from(digest,b => b.toString(16).padStart(2,'0')).join('');
  let diff = 0; for (let i=0;i<AUTH_HASH.length;i++) diff |= AUTH_HASH.charCodeAt(i) ^ hash.charCodeAt(i);
  if (diff) return reply({error:'Unauthorised'},401);
  try {
    let removed = 0;
    for (;;) {
      const records = await (await api(`/rest/v1/${table}?expires_at=lte.${new Date().toISOString()}&select=id,photo_path,aadhaar_path&limit=100`)).json();
      if (!records.length) break;
      for (const record of records) {
        for (const path of [record.photo_path,record.aadhaar_path].filter(Boolean)) {
          if (!path.startsWith(`${record.id}/`) || path.includes('..')) throw new Error('Unexpected private-file path');
        }
      }
      const photos=records.map((r: {photo_path: string})=>r.photo_path).filter(Boolean);
      const aadhaar=records.map((r: {aadhaar_path: string})=>r.aadhaar_path).filter(Boolean);
      if (photos.length) await api(`/storage/v1/object/${bucket}`,{method:'DELETE',body:JSON.stringify({prefixes:photos})});
      if (aadhaar.length) await api(`/storage/v1/object/${aadhaarBucket}`,{method:'DELETE',body:JSON.stringify({prefixes:aadhaar})});
      const ids=records.map((r: {id: string})=>r.id);
      await api(`/rest/v1/${table}?id=in.(${ids.join(',')})&expires_at=lte.${new Date().toISOString()}`,{method:'DELETE'});
      removed+=records.length;
    }
    return reply({status:'complete',removed});
  } catch { return reply({error:'Retention cleanup incomplete; scheduled retry required.'},503); }
});
