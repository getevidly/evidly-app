import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Scheduled daily at 02:00 UTC via cron: 0 2 * * *
// Recalculates eligibility for all orgs still in pending status within window.
// Catches day-15 forfeiture and day-60 forfeiture transitions for orgs
// that had no trigger activity (no inserts on monitored tables).

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all orgs with pending eligibility whose window hasn't been
    // expired for more than 1 day (grace for final transition)
    const { data: pendingOrgs, error: fetchError } = await supabase
      .from("risk_free_eligibility")
      .select("organization_id")
      .eq("overall_status", "pending")
      .gt("guarantee_window_end", new Date(Date.now() - 86400000).toISOString());

    if (fetchError) {
      console.error("Error fetching pending orgs:", fetchError.message);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const orgs = pendingOrgs || [];
    let recalculated = 0;
    let errors = 0;

    for (const row of orgs) {
      const { error: rpcError } = await supabase.rpc(
        "recalc_risk_free_eligibility",
        { p_org_id: row.organization_id }
      );

      if (rpcError) {
        console.error(
          `Recalc failed for org ${row.organization_id}:`,
          rpcError.message
        );
        errors++;
      } else {
        recalculated++;
      }
    }

    console.log(
      `Risk-free eligibility recalc complete: ${recalculated} orgs recalculated, ${errors} errors, ${orgs.length} total pending`
    );

    return new Response(
      JSON.stringify({
        recalculated,
        errors,
        total_pending: orgs.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Risk-free eligibility calc error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
