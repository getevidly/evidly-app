// ============================================================
// intelligence-digest — Weekly digest compilation
// Triggered by pg_cron weekly Sunday 14:00 UTC (7am Pacific).
// Queries all active clients and triggers executive-correlate for each.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/claude.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Query all active clients
  const { data: clients } = await supabase
    .from("intelligence_clients")
    .select("id, app_org_id, name, plan_tier")
    .eq("active", true);

  let digestsGenerated = 0;
  let errorCount = 0;
  const results: Array<{ client_id: string; name: string; status: string; snapshot_id?: string }> = [];

  const correlateUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/executive-correlate";
  const authHeader = "Bearer " + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  for (const client of clients || []) {
    try {
      // Call executive-correlate for each client
      const resp = await fetch(correlateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify({
          client_id: client.id,
          snapshot_type: "weekly_review",
        }),
      });

      if (resp.ok) {
        const data = await resp.json();

        // Also create a digest record for tracking
        const periodEnd = new Date();
        const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Count insights delivered to this client in the period
        const { count } = await supabase
          .from("insight_deliveries")
          .select("id", { count: "exact", head: true })
          .eq("client_id", client.id)
          .gte("created_at", periodStart.toISOString())
          .lte("created_at", periodEnd.toISOString());

        // Get insight IDs for this period
        const { data: deliveries } = await supabase
          .from("insight_deliveries")
          .select("insight_id")
          .eq("client_id", client.id)
          .gte("created_at", periodStart.toISOString())
          .lte("created_at", periodEnd.toISOString())
          .limit(100);

        const insightIds = (deliveries || []).map((d: any) => d.insight_id);

        await supabase.from("intelligence_digests").insert({
          client_id: client.id,
          digest_type: "weekly",
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          insight_count: count || 0,
          insight_ids: insightIds,
          summary: `Weekly intelligence digest for ${client.name}. ${count || 0} insights delivered this period.`,
          sections: {
            snapshot_id: data.snapshot_id,
            share_token: data.share_token,
          },
          status: "compiled",
          sent_at: new Date().toISOString(),
        });

        digestsGenerated++;
        results.push({
          client_id: client.id,
          name: client.name,
          status: "success",
          snapshot_id: data.snapshot_id,
        });
      } else {
        const errText = await resp.text();
        errorCount++;
        results.push({
          client_id: client.id,
          name: client.name,
          status: `error: ${resp.status} — ${errText.substring(0, 200)}`,
        });
      }
    } catch (err: any) {
      errorCount++;
      results.push({
        client_id: client.id,
        name: client.name,
        status: `error: ${err.message}`,
      });
    }
  }

  return new Response(
    JSON.stringify({
      digests_generated: digestsGenerated,
      errors: errorCount,
      total_clients: clients?.length || 0,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
