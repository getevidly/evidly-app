import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
let corsHeaders = getCorsHeaders(null);

/**
 * benchmark-quarterly-report — DISABLED
 *
 * This function previously compiled the EvidLY Compliance Index quarterly
 * report using manufactured scores from location_benchmark_ranks and
 * benchmark_snapshots tables. Disabled as part of Stage 1
 * manufactured-score removal (benchmark system shelved).
 */
Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ disabled: true, reason: "manufactured-score removal" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
