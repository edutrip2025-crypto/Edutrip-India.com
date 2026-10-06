import { createRemoteJWKSet, jwtVerify } from 'jose';
const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const url = Deno.env.get('SUPABASE_URL');
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const table = 'chennai_registrations_2026';
const bucket = 'chennai-passport-photos-2026';
const origins = ['https://app.edutripindia.com','http://localhost:1998'];
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`${url}${path}`, {...options, headers: {apikey:secret, Authorization:`Bearer ${secret}`, 'Content-Type':'application/json', ...options.headers}, signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error('Storage request failed');
  return response;
}
Deno.serve(async req => {
  const origin = req.headers.get('origin');
  const headers: Record<string,string> = {'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization,content-type,apikey'};
  if (origin && origins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status,headers});
  if (origin && !origins.includes(origin)) return reply({error:'Origin not allowed.'},403);
  if (req.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (req.method !== 'POST') return reply({error:'Method not allowed.'},405);
  let uid: string;
  try {
    const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) throw new Error('Missing token');
    const {payload} = await jwtVerify(token,jwks,{issuer:'https://securetoken.google.com/edutrip-web',audience:'edutrip-web',algorithms:['RS256']});
    if (!payload.sub || payload.sub.length > 128 || !payload.iat || payload.iat > Date.now()/1000) throw new Error('Invalid token');
    if (!['ops','superadmin'].includes(String(payload.role)) && payload.email !== 'founders@edutripindia.com') return reply({error:'Only authorised Ops and SuperAdmin staff can access registrations.'},403);
    uid = payload.sub;
  } catch { return reply({error:'Please sign in with your authorised Edutrip account.'},401); }
  try {
    if (Number(req.headers.get('content-length') || 0) > 4096) return reply({error:'Request too large.'},413);
    const body = await req.text(); if (body.length > 4096) return reply({error:'Request too large.'},413);
    const data = JSON.parse(body);
    if (data.action === 'list') {
      const records: unknown[] = [];
      for (let offset = 0; ; offset += 1000) {
        const page = await (await api(`/rest/v1/${table}?removed_at=is.null&select=*&order=created_at.desc,id.asc&limit=1000&offset=${offset}`)).json();
        records.push(...page); if (page.length < 1000) break;
      }
      return reply({records});
    }
    const get = async (id: string) => {
      if (!idPattern.test(id || '')) return null;
      return (await (await api(`/rest/v1/${table}?id=eq.${id}&removed_at=is.null&select=*`)).json())[0];
    };
    if (data.action === 'delete') {
      if (data.confirmed !== true || !idPattern.test(data.id || '')) return reply({error:'Select a registration and confirm deletion.'},400);
      const removed = await (await api(`/rest/v1/${table}?id=eq.${data.id}&removed_at=is.null`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({removed_at:new Date().toISOString(),removed_by:uid})})).json();
      if (!removed.length) return reply({error:'Registration is no longer active. Refresh the list.'},409);
      return reply({removedId:data.id});
    }
    if (data.action === 'prepare-photos') {
      const rows = await (await api(`/rest/v1/${table}?removed_at=is.null&select=id,full_name,photo_path&limit=1000`)).json();
      for (const row of rows) {
        if (!row.photo_path.startsWith(`${row.id}/`) || row.photo_path.includes('..')) throw new Error('Invalid photo path');
        if (row.photo_path.split('/').length === 3) continue;
        const extension = row.photo_path.endsWith('.png') ? 'png' : 'jpg';
        const first = row.full_name.normalize('NFKC').trim().split(/\s+/)[0].replace(/[^\p{L}\p{N}_-]/gu,'').slice(0,70) || 'Participant';
        const namedPath = `${row.id}/${crypto.randomUUID()}/${first}_Photo.${extension}`;
        // Copy before updating the row so interruption cannot lose the existing portrait.
        await api('/storage/v1/object/copy',{method:'POST',body:JSON.stringify({bucketId:bucket,sourceKey:row.photo_path,destinationKey:namedPath})});
        const updated = await (await api(`/rest/v1/${table}?id=eq.${row.id}&photo_path=eq.${encodeURIComponent(row.photo_path)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({photo_path:namedPath})})).json();
        if (updated.length) await api(`/storage/v1/object/${bucket}`,{method:'DELETE',body:JSON.stringify({prefixes:[row.photo_path]})});
        else await api(`/storage/v1/object/${bucket}`,{method:'DELETE',body:JSON.stringify({prefixes:[namedPath]})});
      }
      return reply({prepared:true});
    }
    if (data.action === 'photo') {
      const row = await get(data.id); if (!row) return reply({error:'Registration not found.'},404);
      if (!row.photo_path.startsWith(`${row.id}/`) || row.photo_path.includes('..')) throw new Error('Invalid photo path');
      const signed = await (await api(`/storage/v1/object/sign/${bucket}/${row.photo_path}`,{method:'POST',body:JSON.stringify({expiresIn:300})})).json();
      return reply({url:`${url}/storage/v1${signed.signedURL}`});
    }
    if (data.action === 'resolve') {
      if (data.confirmed !== true || data.removeId === data.keepId) return reply({error:'Select two different records and confirm removal.'},400);
      const [remove, keep] = await Promise.all([get(data.removeId),get(data.keepId)]);
      if (!remove || !keep) return reply({error:'One of the records is no longer active. Refresh and review again.'},409);
      const normalize = (s: string) => s.normalize('NFKC').trim().toLocaleLowerCase('en-IN').replace(/\s+/g,' ');
      if (remove.date_of_birth !== keep.date_of_birth || (normalize(remove.full_name) !== normalize(keep.full_name) && remove.mobile !== keep.mobile)) return reply({error:'These records do not match the duplicate criteria.'},400);
      // Atomically locks both rows and checks that the kept record is still active.
      const result = await (await api('/rest/v1/rpc/resolve_chennai_duplicate',{method:'POST',body:JSON.stringify({remove_id:remove.id,keep_id:keep.id,actor:uid})})).json();
      if (!result) return reply({error:'Records changed during review. Please refresh.'},409);
      return reply({removedId:remove.id});
    }
    return reply({error:'Unknown action.'},400);
  } catch { return reply({error:'Unable to process registration request. Please retry.'},503); }
});
