// Custom authenticated, programme-scoped cleanup. Never executes before the retention deadline.
const DEADLINE = Date.parse('2026-11-30T18:30:00Z');
const AUTH_HASH = 'f4a7e577541d0ca33c6d7cefb78c1df2be4fbb482cb666808652a00c32aa8aed';
const bucket = 'chennai-passport-photos-2026';
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
  if (Date.now() < DEADLINE) return reply({status:'retention-period-active',removed:0});
  try {
    let removed = 0;
    for (;;) {
      const records = await (await api(`/rest/v1/${table}?expires_at=lte.${new Date().toISOString()}&select=id,photo_path&limit=100`)).json();
      if (!records.length) break;
      for (const record of records) {
        if (!record.photo_path.startsWith(`${record.id}/`) || record.photo_path.includes('..')) throw new Error('Unexpected photo path');
        // Photos first; failed storage deletion leaves the record available for a safe retry.
        await api(`/storage/v1/object/${bucket}`,{method:'DELETE',body:JSON.stringify({prefixes:[record.photo_path]})});
        await api(`/rest/v1/${table}?id=eq.${record.id}`,{method:'DELETE'});
        removed++;
      }
    }
    // The programme is now closed. Also remove photos left by interrupted submissions.
    const list = async (prefix: string) => {
      const all: {name: string; id: string | null}[] = [];
      for (let offset=0;;offset+=1000) {
        const page = await (await api(`/storage/v1/object/list/${bucket}`,{method:'POST',body:JSON.stringify({prefix,limit:1000,offset,sortBy:{column:'name',order:'asc'}})})).json();
        all.push(...page); if (page.length < 1000) break;
      }
      return all;
    };
    const folders = await list('');
    for (const folder of folders) {
      if (!/^[0-9a-f-]{36}$/i.test(folder.name) || folder.id) throw new Error('Unexpected bucket entry');
      const paths: string[] = [];
      const walk = async (prefix: string, depth: number) => {
        if (depth > 2) throw new Error('Unexpected photo folder depth');
        for (const entry of await list(prefix)) {
          if (entry.name.includes('/') || entry.name.includes('..')) throw new Error('Unexpected photo entry');
          const path = `${prefix}/${entry.name}`;
          if (entry.id) paths.push(path); else await walk(path, depth + 1);
        }
      };
      await walk(folder.name, 0);
      for (let i=0;i<paths.length;i+=100) await api(`/storage/v1/object/${bucket}`,{method:'DELETE',body:JSON.stringify({prefixes:paths.slice(i,i+100)})});
    }
    return reply({status:'complete',removed});
  } catch { return reply({error:'Retention cleanup incomplete; scheduled retry required.'},503); }
});
