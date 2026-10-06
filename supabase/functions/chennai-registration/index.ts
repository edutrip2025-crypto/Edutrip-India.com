import { createHandler } from './handler.mjs';
// The platform verifies the caller's JWT. The browser uses only the public anon JWT.
// This endpoint permits submissions only; it never returns participant records or photo URLs.
Deno.serve(createHandler({url:Deno.env.get('SUPABASE_URL'),serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}));
