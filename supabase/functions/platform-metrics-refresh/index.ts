import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const today = new Date().toISOString().split("T")[0];

    // Count all-time totals (snapshots)
    const [tempResult, checklistResult, docsResult, correctiveResult, incidentResult, equipResult, orgResult, locResult] =
      await Promise.all([
        supabase.from("temperature_logs").select("*", { count: "exact", head: true }),
        supabase.from("checklist_completions").select("*", { count: "exact", head: true }),
        supabase.from("documents").select("*", { count: "exact", head: true }),
        supabase.from("corrective_actions").select("*", { count: "exact", head: true }),
        supabase.from("incidents").select("*", { count: "exact", head: true }),
        supabase.from("equipment").select("*", { count: "exact", head: true }),
        supabase.from("organizations").select("*", { count: "exact", head: true }),
        supabase.from("locations").select("*", { count: "exact", head: true }),
      ]);

    const tempLogs = tempResult.count || 0;
    const checklists = checklistResult.count || 0;
    const docs = docsResult.count || 0;
    const correctiveActions = correctiveResult.count || 0;
    const incidents = incidentResult.count || 0;
    const equipmentCount = equipResult.count || 0;
    const orgsCount = orgResult.count || 0;
    const locsCount = locResult.count || 0;

    // Computed metrics
    // Time saved: 8 min/temp log + 12 min/checklist + 20 min/doc + 25 min/corrective action
    const timeSavedMinutes =
      tempLogs * 8 + checklists * 12 + docs * 20 + correctiveActions * 25;
    const timeSavedHours = Math.round(timeSavedMinutes / 60);

    // Dollar saved: $28/hr labor + fine avoidance + insurance reduction
    const laborSavings = timeSavedHours * 28;
    const fineSavings = Math.round(correctiveActions * 500 * 0.15);
    const insuranceSavings = Math.round(locsCount * (200 / 12));
    const totalDollarsSaved = laborSavings + fineSavings + insuranceSavings;

    await supabase.from("platform_metrics_daily").upsert(
      {
        metric_date: today,
        temp_logs_count: tempLogs,
        checklists_count: checklists,
        docs_uploaded_count: docs,
        corrective_actions_count: correctiveActions,
        incidents_count: incidents,
        equipment_count: equipmentCount,
        organizations_count: orgsCount,
        locations_count: locsCount,
        time_saved_hours: timeSavedHours,
        money_saved_cents: totalDollarsSaved * 100,
      },
      { onConflict: "metric_date" }
    );

    // Update the v_platform_stats view data
    await supabase.from("admin_event_log").insert({
      level: "INFO",
      category: "metrics",
      message: `Platform metrics refreshed for ${today}: ${tempLogs} temps, ${checklists} checklists, ${docs} docs, ${timeSavedHours} hrs saved, $${totalDollarsSaved} saved`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        metrics: {
          temp_logs: tempLogs,
          checklists,
          documents: docs,
          corrective_actions: correctiveActions,
          incidents,
          equipment: equipmentCount,
          organizations: orgsCount,
          locations: locsCount,
          time_saved_hours: timeSavedHours,
          money_saved_dollars: totalDollarsSaved,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
