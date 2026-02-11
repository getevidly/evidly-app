/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Platform-specific OAuth endpoints
const PLATFORM_CONFIG: Record<string, { tokenUrl: string; clientIdEnv: string; clientSecretEnv: string }> = {
  toast: { tokenUrl: 'https://ws-api.toasttab.com/usermgmt/v1/oauth/token', clientIdEnv: 'TOAST_CLIENT_ID', clientSecretEnv: 'TOAST_CLIENT_SECRET' },
  square: { tokenUrl: 'https://connect.squareup.com/oauth2/token', clientIdEnv: 'SQUARE_CLIENT_ID', clientSecretEnv: 'SQUARE_CLIENT_SECRET' },
  quickbooks: { tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', clientIdEnv: 'QBO_CLIENT_ID', clientSecretEnv: 'QBO_CLIENT_SECRET' },
  xero: { tokenUrl: 'https://identity.xero.com/connect/token', clientIdEnv: 'XERO_CLIENT_ID', clientSecretEnv: 'XERO_CLIENT_SECRET' },
  google: { tokenUrl: 'https://oauth2.googleapis.com/token', clientIdEnv: 'GOOGLE_CLIENT_ID', clientSecretEnv: 'GOOGLE_CLIENT_SECRET' },
  gusto: { tokenUrl: 'https://api.gusto.com/oauth/token', clientIdEnv: 'GUSTO_CLIENT_ID', clientSecretEnv: 'GUSTO_CLIENT_SECRET' },
};

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // JSON: { platform, organization_id }
  const error = url.searchParams.get('error');

  if (error) {
    return new Response(JSON.stringify({ error: `OAuth error: ${error}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!code || !state) {
    return new Response(JSON.stringify({ error: 'Missing code or state' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  let parsed: { platform: string; organization_id: string };
  try {
    parsed = JSON.parse(atob(state));
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid state parameter' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const config = PLATFORM_CONFIG[parsed.platform];
  if (!config) {
    return new Response(JSON.stringify({ error: `Unsupported platform: ${parsed.platform}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Exchange code for tokens
  const tokenResp = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: Deno.env.get(config.clientIdEnv) || '',
      client_secret: Deno.env.get(config.clientSecretEnv) || '',
      redirect_uri: `${supabaseUrl}/functions/v1/integration-oauth-callback`,
    }),
  });

  const tokens = await tokenResp.json();

  if (!tokenResp.ok) {
    return new Response(JSON.stringify({ error: 'Token exchange failed', details: tokens }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }

  // Store integration connection
  await supabase.from('integrations').upsert({
    organization_id: parsed.organization_id,
    platform_slug: parsed.platform,
    platform_name: parsed.platform.charAt(0).toUpperCase() + parsed.platform.slice(1),
    status: 'connected',
    auth_data: { access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString() },
    connected_at: new Date().toISOString(),
  }, { onConflict: 'organization_id,platform_slug' });

  // Redirect to integration hub
  return new Response(null, {
    status: 302,
    headers: { Location: '/integrations?connected=' + parsed.platform },
  });
});
