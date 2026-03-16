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
    const body = await req.json().catch(() => ({}));
    const { orgId, billingEventId, triggerType } = body;
    const period = new Date().toISOString().slice(0, 7) + "-01"; // YYYY-MM-01

    // Get all active orgs (or just one if orgId provided)
    let orgQuery = supabase
      .from("organizations")
      .select("id, name, plan")
      .eq("is_demo", false);
    if (orgId) orgQuery = orgQuery.eq("id", orgId);
    const { data: orgs } = await orgQuery;

    let processed = 0;
    let skipped = 0;

    for (const org of orgs || []) {
      // Check if already processed this period
      const { data: existing } = await supabase
        .from("k2c_donations")
        .select("id")
        .eq("organization_id", org.id)
        .eq("donation_period", period)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // Count active locations for this org
      const { count: locCount } = await supabase
        .from("locations")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", org.id);

      if (!locCount || locCount === 0) {
        skipped++;
        continue;
      }

      // Get primary county for the org
      const { data: primaryLoc } = await supabase
        .from("locations")
        .select("county")
        .eq("organization_id", org.id)
        .limit(1)
        .maybeSingle();

      // Insert K2C donation — $10 per location, ~100 meals per location
      await supabase.from("k2c_donations").insert({
        organization_id: org.id,
        account_name: org.name,
        county: primaryLoc?.county || null,
        amount_cents: locCount * 1000,
        meals_count: locCount * 100,
        donation_period: period,
        billing_event_id: billingEventId || `auto_${period}_${org.id}`,
        auto_generated: true,
      });

      await supabase.from("admin_event_log").insert({
        level: "INFO",
        category: "k2c",
        message: `K2C donation recorded: ${org.name} — ${locCount} locations → $${locCount * 10} / ${locCount * 100} meals`,
        metadata: { orgId: org.id, locCount, period, triggerType: triggerType || "api" },
      });

      processed++;
    }

    return new Response(
      JSON.stringify({ success: true, processed, skipped, period }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
