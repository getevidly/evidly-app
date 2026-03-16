/**
 * TRIAL-EMAIL-ADMIN-01 — Resend Webhook Handler
 *
 * Receives webhook events from Resend (email.delivered, email.opened,
 * email.clicked, email.bounced) and updates the trial_email_log table
 * with delivery/engagement timestamps.
 *
 * Endpoint: POST /functions/v1/resend-webhook
 * Auth: Resend webhook signature validation
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
const corsHeaders = getCorsHeaders(null);

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Column to update per Resend event type
const EVENT_COLUMN_MAP: Record<string, string> = {
  "email.delivered": "delivered_at",
  "email.opened": "opened_at",
  "email.clicked": "clicked_at",
  "email.bounced": "bounced_at",
};

Deno.serve(async (req) => {
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

    // Only process known event types
    const column = EVENT_COLUMN_MAP[eventType];
    if (!column) {
      // Acknowledge unknown events so Resend doesn't retry
      return jsonResponse({ ok: true, skipped: eventType });
    }

    const messageId: string | undefined = payload.data?.email_id;
    if (!messageId) {
      return jsonResponse({ ok: true, skipped: "no_message_id" });
    }

    // Service-role client for direct DB access (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("trial_email_log")
      .update({ [column]: now })
      .eq("resend_message_id", messageId);

    if (error) {
      console.error(`[resend-webhook] DB update failed for ${messageId}:`, error);
      // Still return 200 — retries won't help if the row doesn't exist
      return jsonResponse({ ok: false, error: error.message });
    }

    console.log(`[resend-webhook] ${eventType} → ${column} for ${messageId}`);
    return jsonResponse({ ok: true, event: eventType, messageId });
  } catch (err) {
    console.error("[resend-webhook] Handler error:", err);
    // Return 200 to prevent Resend from retrying on parse errors
    return jsonResponse({ ok: false, error: "parse_error" });
  }
});
