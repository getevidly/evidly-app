import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
const corsHeaders = getCorsHeaders(null);

/**
 * enterprise-alert-rollup — DISABLED
 *
 * This function previously generated alerts from the enterprise_rollup_scores
 * table using manufactured 0-100 composite scores. Disabled as part of
 * Stage 1 manufactured-score removal.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  return new Response(
    JSON.stringify({ disabled: true, reason: "manufactured-score removal" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
