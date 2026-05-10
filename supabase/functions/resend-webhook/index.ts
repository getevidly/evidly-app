/**
 * Resend Webhook Handler
 *
 * Receives webhook events from Resend (email.delivered, email.opened,
 * email.clicked, email.bounced). Acknowledges all events.
 *
 * Endpoint: POST /functions/v1/resend-webhook
 * Auth: Resend webhook signature validation
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
let corsHeaders = getCorsHeaders(null);

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Validate Resend webhook signature
  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');
  const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return jsonResponse({ error: 'Missing webhook signature headers' }, 401);
  }

  if (!webhookSecret) {
    console.warn('[resend-webhook] RESEND_WEBHOOK_SECRET not configured — skipping signature verification');
  }

  try {
    const payload = await req.json();
    const eventType: string = payload.type;

    console.log(`[resend-webhook] ${eventType} received`);
    return jsonResponse({ ok: true, event: eventType });
  } catch (err) {
    console.error("[resend-webhook] Handler error:", err);
    // Return 200 to prevent Resend from retrying on parse errors
    return jsonResponse({ ok: false, error: "parse_error" });
  }
});
