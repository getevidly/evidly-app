/**
 * intelligence-bridge-proxy — Server-side proxy for intelligence bridge calls.
 *
 * The client calls this edge function instead of the external intelligence
 * webhook directly. This function holds the webhook secret server-side
 * (INTELLIGENCE_WEBHOOK_SECRET) so it never appears in the client bundle.
 *
 * Auth: Requires valid Supabase JWT (anon key + user session).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const bridgeUrl = Deno.env.get('INTELLIGENCE_BRIDGE_URL');
  const bridgeSecret = Deno.env.get('INTELLIGENCE_WEBHOOK_SECRET');

  if (!bridgeUrl) {
    // Intelligence bridge not configured — silent no-op
    return new Response(JSON.stringify({ ok: true, skipped: 'bridge_not_configured' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await req.json();

    const resp = await fetch(bridgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(bridgeSecret ? { 'x-evidly-bridge-secret': bridgeSecret } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    return new Response(JSON.stringify({ ok: resp.ok, status: resp.status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[intelligence-bridge-proxy] Error:', err);
    return new Response(JSON.stringify({ ok: false, error: 'proxy_error' }), {
      status: 200, // Don't expose errors to client
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
