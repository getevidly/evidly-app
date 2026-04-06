import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const corsHeaders = getCorsHeaders(null);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * cleanup-demo-tour — Removes all demo data for completed tours.
 *
 * Modes:
 *   1. Manual: pass { tour_id } to clean a specific tour immediately
 *   2. Scheduled: call with no body to clean all tours past their
 *      cleanup_scheduled_for timestamp (intended for pg_cron hourly)
 *
 * Only deletes rows with source = 'demo_template'. Base template data
 * (demo_templates, demo_vendor_profiles) is never touched.
 *
 * Auth: EvidLY admin only, or service_role for pg_cron.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Auth check — allow service_role (pg_cron) or admin users
  const authHeader = req.headers.get("Authorization");
  if (authHeader && !authHeader.includes(serviceKey)) {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller?.email?.endsWith("@getevidly.com")) {
      return jsonResponse({ error: "Unauthorized — admin only" }, 403);
    }
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // No body = scheduled cleanup mode
  }

  const tourId = body.tour_id as string | undefined;
  const partnerDemoId = body.partner_demo_id as string | undefined;
  const cleaned: string[] = [];

  try {
    // ── Helper: clean org data by source tag ──────────────
    async function cleanOrgData(
      orgId: string,
      userId: string | null,
      sourceTag: string,
    ) {
      const tablesToClean = [
        "temp_logs",
        "checklist_completions",
        "corrective_actions",
        "documents",
        "equipment_service_records",
        "insurance_risk_scores",
        "sb1383_compliance",
        "notifications",
      ];

      for (const table of tablesToClean) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("organization_id", orgId)
          .eq("source", sourceTag);

        if (error) {
          console.warn(`[cleanup] ${table} delete error:`, error.message);
        }
      }

      // Delete source-tagged checklists
      await supabase
        .from("checklists")
        .delete()
        .eq("organization_id", orgId)
        .eq("source", sourceTag);

      // Delete source-tagged vendors
      await supabase
        .from("vendors")
        .delete()
        .eq("organization_id", orgId)
        .eq("source", sourceTag);

      // Delete locations
      await supabase
        .from("locations")
        .delete()
        .eq("organization_id", orgId);

      // Delete user profile + auth user
      if (userId) {
        await supabase
          .from("user_profiles")
          .delete()
          .eq("user_id", userId);

        await supabase.auth.admin.deleteUser(userId).catch((err: Error) => {
          console.warn(`[cleanup] Auth user delete failed:`, err.message);
        });
      }

      // Delete organization
      await supabase
        .from("organizations")
        .delete()
        .eq("id", orgId);
    }

    // ── 1. Demo Tours cleanup (source = 'demo_template') ──
    let toursToClean: { id: string; demo_org_id: string; demo_user_id: string; business_name: string }[] = [];

    if (tourId) {
      const { data } = await supabase
        .from("demo_tours")
        .select("id, demo_org_id, demo_user_id, business_name")
        .eq("id", tourId)
        .single();
      if (data) toursToClean = [data];
    } else if (!partnerDemoId) {
      // Scheduled: find tours past cleanup deadline
      const { data } = await supabase
        .from("demo_tours")
        .select("id, demo_org_id, demo_user_id, business_name")
        .eq("status", "completed")
        .lte("cleanup_scheduled_for", new Date().toISOString());
      if (data) toursToClean = data;
    }

    for (const tour of toursToClean) {
      try {
        if (!tour.demo_org_id) {
          console.warn(`[cleanup] Tour ${tour.id} has no demo_org_id, skipping`);
          continue;
        }

        await cleanOrgData(tour.demo_org_id, tour.demo_user_id, "demo_template");

        await supabase
          .from("demo_tours")
          .update({ status: "cleaned", cleaned_at: new Date().toISOString() })
          .eq("id", tour.id);

        cleaned.push(tour.business_name || tour.id);
        console.log(`[cleanup] Cleaned tour ${tour.id} for ${tour.business_name}`);
      } catch (err) {
        console.error(`[cleanup] Failed tour ${tour.id}:`, err);
      }
    }

    // ── 2. Partner Demos cleanup (source = 'partner_demo') ──
    let partnerDemosToClean: { id: string; demo_org_id: string; demo_user_id: string; partner_company: string }[] = [];

    if (partnerDemoId) {
      const { data } = await supabase
        .from("partner_demos")
        .select("id, demo_org_id, demo_user_id, partner_company")
        .eq("id", partnerDemoId)
        .single();
      if (data) partnerDemosToClean = [data];
    } else if (!tourId) {
      // Scheduled: find partner demos past cleanup deadline
      const { data } = await supabase
        .from("partner_demos")
        .select("id, demo_org_id, demo_user_id, partner_company")
        .in("status", ["active", "completed", "expired"])
        .lte("cleanup_scheduled_for", new Date().toISOString());
      if (data) partnerDemosToClean = data;
    }

    for (const pd of partnerDemosToClean) {
      try {
        if (!pd.demo_org_id) {
          console.warn(`[cleanup] Partner demo ${pd.id} has no demo_org_id, skipping`);
          continue;
        }

        await cleanOrgData(pd.demo_org_id, pd.demo_user_id, "partner_demo");

        await supabase
          .from("partner_demos")
          .update({ status: "cleaned", cleaned_at: new Date().toISOString() })
          .eq("id", pd.id);

        cleaned.push(pd.partner_company || pd.id);
        console.log(`[cleanup] Cleaned partner demo ${pd.id} for ${pd.partner_company}`);
      } catch (err) {
        console.error(`[cleanup] Failed partner demo ${pd.id}:`, err);
      }
    }

    return jsonResponse({
      success: true,
      cleaned_count: cleaned.length,
      cleaned,
    });
  } catch (err) {
    console.error("[cleanup-demo-tour] Error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      500,
    );
  }
});
