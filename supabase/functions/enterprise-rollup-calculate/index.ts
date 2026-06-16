import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

/**
 * enterprise-rollup-calculate — DISABLED
 *
 * Manufactured-score removal (Stage 1): entire output was manufactured
 * org-level score rollups. Function disabled pending Stage 2 table cleanup.
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
