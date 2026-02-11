/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const token = authHeader.slice(7);
  const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));

  const { data: tokenRecord, error } = await supabase
    .from('api_tokens')
    .select('*, api_applications(id, organization_id, status, rate_limit_tier, scopes)')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .single();

  if (error || !tokenRecord) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: 'Token expired' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const app = tokenRecord.api_applications;
  if (app.status !== 'active') {
    return new Response(JSON.stringify({ error: 'Application suspended or revoked' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  // Update last used timestamp
  await supabase.from('api_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', tokenRecord.id);

  return new Response(JSON.stringify({
    valid: true,
    application_id: app.id,
    organization_id: app.organization_id,
    scopes: tokenRecord.scopes,
    rate_limit_tier: app.rate_limit_tier,
  }), { headers: { 'Content-Type': 'application/json' } });
});
