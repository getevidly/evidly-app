/**
 * vendor-portal-reply — INBOUND-COMMS-05 (STUB)
 *
 * Placeholder for vendor portal in-app reply submission.
 * Accepts POST with { token, message } but returns 501.
 * Will be wired when the vendor portal reply UI is built.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { logger } from "../_shared/logger.ts";
import { PUBLIC_CORS_HEADERS } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: PUBLIC_CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...PUBLIC_CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  logger.info("[VENDOR-PORTAL-REPLY] Endpoint hit (stub — not implemented)");

  return new Response(
    JSON.stringify({ error: "Not implemented. Vendor portal reply is not yet available." }),
    { status: 501, headers: { ...PUBLIC_CORS_HEADERS, "Content-Type": "application/json" } }
  );
});
