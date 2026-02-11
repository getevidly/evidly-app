/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ALLOWED_SCOPES = [
  'read:locations', 'write:locations', 'read:compliance', 'write:compliance',
  'read:incidents', 'write:incidents', 'read:staff', 'write:staff',
  'read:analytics', 'read:reports', 'webhooks:manage', 'integrations:manage',
];

function generateAuthCode(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

function validateRedirectUri(registered: string, provided: string): boolean {
  try {
    const r = new URL(registered);
    const p = new URL(provided);
    return r.origin === p.origin && r.pathname === p.pathname;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    let clientId: string | null, redirectUri: string | null, responseType: string | null;
    let scope: string | null, state: string | null;
    let codeChallenge: string | null, codeChallengeMethod: string | null;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      clientId = url.searchParams.get('client_id');
      redirectUri = url.searchParams.get('redirect_uri');
      responseType = url.searchParams.get('response_type');
      scope = url.searchParams.get('scope');
      state = url.searchParams.get('state');
      codeChallenge = url.searchParams.get('code_challenge');
      codeChallengeMethod = url.searchParams.get('code_challenge_method');
    } else {
      const body = await req.json();
      clientId = body.client_id;
      redirectUri = body.redirect_uri;
      responseType = body.response_type;
      scope = body.scope;
      state = body.state;
      codeChallenge = body.code_challenge;
      codeChallengeMethod = body.code_challenge_method;
    }

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'invalid_request', error_description: 'client_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (responseType !== 'code') {
      return new Response(
        JSON.stringify({ error: 'unsupported_response_type', error_description: 'Only authorization code flow is supported' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: app, error: appError } = await supabase
      .from('api_oauth_applications')
      .select('id, org_id, name, redirect_uris, allowed_scopes, is_active')
      .eq('client_id', clientId)
      .single();

    if (appError || !app) {
      return new Response(
        JSON.stringify({ error: 'invalid_client', error_description: 'Unknown client_id' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!app.is_active) {
      return new Response(
        JSON.stringify({ error: 'invalid_client', error_description: 'Application is deactivated' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!redirectUri) {
      redirectUri = app.redirect_uris[0];
    } else {
      const valid = app.redirect_uris.some((uri: string) => validateRedirectUri(uri, redirectUri!));
      if (!valid) {
        return new Response(
          JSON.stringify({ error: 'invalid_request', error_description: 'redirect_uri does not match registered URIs' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const requestedScopes = scope ? scope.split(' ').filter(Boolean) : ['read:locations'];
    const invalidScopes = requestedScopes.filter(
      (s) => !ALLOWED_SCOPES.includes(s) || !app.allowed_scopes.includes(s)
    );

    if (invalidScopes.length > 0) {
      return new Response(
        JSON.stringify({ error: 'invalid_scope', error_description: 'Invalid scopes: ' + invalidScopes.join(', ') }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (codeChallenge && codeChallengeMethod !== 'S256') {
      return new Response(
        JSON.stringify({ error: 'invalid_request', error_description: 'Only S256 code_challenge_method is supported' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const authCode = generateAuthCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from('api_oauth_authorization_codes').insert({
      code: authCode, client_id: clientId, app_id: app.id, org_id: app.org_id,
      redirect_uri: redirectUri, scopes: requestedScopes,
      code_challenge: codeChallenge || null, code_challenge_method: codeChallengeMethod || null,
      state: state || null, expires_at: expiresAt, used: false,
    });

    if (insertError) {
      console.error('Failed to store auth code:', insertError);
      return new Response(
        JSON.stringify({ error: 'server_error', error_description: 'Failed to generate authorization code' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await supabase.from('api_audit_log').insert({
      event_type: 'oauth.authorize', app_id: app.id, org_id: app.org_id,
      metadata: { client_id: clientId, scopes: requestedScopes, redirect_uri: redirectUri, has_pkce: !!codeChallenge },
    });

    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', authCode);
    if (state) redirectUrl.searchParams.set('state', state);

    return new Response(
      JSON.stringify({ redirect_url: redirectUrl.toString(), code: authCode, state: state || null, expires_in: 600 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('OAuth authorize error:', err);
    return new Response(
      JSON.stringify({ error: 'server_error', error_description: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
