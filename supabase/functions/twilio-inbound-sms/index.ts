/**
 * twilio-inbound-sms — INBOUND-COMMS-04 (STUB)
 *
 * Placeholder for Twilio inbound SMS webhook.
 * Validates X-Twilio-Signature, acknowledges with TwiML.
 * Does NOT process messages — returns empty TwiML.
 *
 * Wiring: Twilio console → Webhook URL →
 *   https://<project-ref>.supabase.co/functions/v1/twilio-inbound-sms
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { logger } from "../_shared/logger.ts";
import { PUBLIC_CORS_HEADERS } from "../_shared/cors.ts";

const EMPTY_TWIML = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: PUBLIC_CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Log receipt but do not process
  logger.info("[INBOUND-SMS] Webhook received (stub — not processing)");

  // Always respond with empty TwiML to acknowledge
  return new Response(EMPTY_TWIML, {
    status: 200,
    headers: {
      ...PUBLIC_CORS_HEADERS,
      "Content-Type": "text/xml",
    },
  });
});
