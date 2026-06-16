import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

/**
 * correlation-engine — DISABLED
 *
 * Manufactured-score removal (Stage 1): all risk scoring output
 * (revenue_risk, cost_risk, liability_risk, operational_risk,
 * insurance_overall, insurance_tier) was manufactured. Function disabled
 * pending Stage 2 table cleanup.
 */
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ disabled: true, reason: "manufactured-score removal" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
