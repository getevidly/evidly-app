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
 * generate-demo-template — Populates a staging demo org with 60 days of
 * realistic operational data across all EvidLY pillars.
 *
 * All generated rows are tagged with source = 'demo_template' so the
 * cleanup-demo-tour function can safely remove them later.
 *
 * Auth: Only EvidLY admin users (@getevidly.com).
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller } } = await userClient.auth.getUser();
  if (!caller?.email?.endsWith("@getevidly.com")) {
    return jsonResponse({ error: "Unauthorized — admin only" }, 403);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const {
    tour_id,
    org_id,
    industry_type,
    county,
    business_name,
    location_details,
  } = body as Record<string, string | object[]>;

  if (!tour_id || !org_id) {
    return jsonResponse({ error: "tour_id and org_id required" }, 400);
  }

  try {
    // Fetch locations for this org
    const { data: locations } = await supabase
      .from("locations")
      .select("id, name")
      .eq("organization_id", org_id);

    if (!locations?.length) {
      return jsonResponse({ error: "No locations found for org" }, 400);
    }

    // Fetch the demo user for this tour (for recorded_by / completed_by)
    const { data: tour } = await supabase
      .from("demo_tours")
      .select("demo_user_id")
      .eq("id", tour_id)
      .single();

    const demoUserId = tour?.demo_user_id;

    const now = new Date();
    const daysAgo = (n: number) =>
      new Date(now.getTime() - n * 86400000).toISOString();
    const daysFrom = (n: number) =>
      new Date(now.getTime() + n * 86400000).toISOString();

    for (const location of locations) {
      await generateLocationData(supabase, {
        org_id: org_id as string,
        location_id: location.id,
        location_name: location.name,
        industry_type: industry_type as string,
        county: county as string,
        business_name: business_name as string,
        demo_user_id: demoUserId,
        daysAgo,
        daysFrom,
      });
    }

    // Set tribal casino advisory mode if applicable
    if (industry_type === "tribal_casino") {
      await supabase
        .from("organizations")
        .update({
          food_safety_mode: "advisory",
          food_safety_authority:
            "Tribal Environmental Health Office (TEHO)",
          food_safety_advisory_text:
            "Food safety compliance for this property is governed by the " +
            "Tribal Environmental Health Office (TEHO) under tribal sovereignty. " +
            "EvidLY tracks operational compliance and fire safety in full. " +
            "Food safety intelligence specific to your tribe's food code " +
            "is in active development.",
        })
        .eq("id", org_id);
    }

    // Update tour status to active
    await supabase
      .from("demo_tours")
      .update({ status: "active", started_at: now.toISOString() })
      .eq("id", tour_id);

    return jsonResponse({ success: true, locations_processed: locations.length });
  } catch (err) {
    console.error("[generate-demo-template] Error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      500,
    );
  }
});

// ── Per-location data generator ─────────────────────────────────

interface LocationContext {
  org_id: string;
  location_id: string;
  location_name: string;
  industry_type: string;
  county: string;
  business_name: string;
  demo_user_id: string | null;
  daysAgo: (n: number) => string;
  daysFrom: (n: number) => string;
}

async function generateLocationData(
  supabase: ReturnType<typeof createClient>,
  ctx: LocationContext,
) {
  const SRC = "demo_template";

  // ── 1. TEMPERATURE LOGS (60 days × 4 units × ~1 reading/day) ──

  const equipment = [
    { name: "Walk-in Cooler", normalMin: 36, normalMax: 40, critHigh: 41 },
    { name: "Walk-in Freezer", normalMin: -5, normalMax: 5, critHigh: 10 },
    { name: "Hot Holding Unit", normalMin: 140, normalMax: 165, critHigh: 200 },
    { name: "Prep Cooler", normalMin: 38, normalMax: 41, critHigh: 41 },
  ];

  if (ctx.industry_type === "healthcare" || ctx.industry_type === "k12") {
    equipment.push({
      name: "Steam Table",
      normalMin: 145,
      normalMax: 165,
      critHigh: 200,
    });
  }

  const tempLogs: Record<string, unknown>[] = [];
  for (let day = 60; day >= 0; day--) {
    for (const unit of equipment) {
      const isDeviation = Math.random() < 0.05;
      const reading = isDeviation
        ? unit.critHigh + Math.random() * 8
        : unit.normalMin +
          Math.random() * (unit.normalMax - unit.normalMin);

      tempLogs.push({
        organization_id: ctx.org_id,
        location_id: ctx.location_id,
        equipment_name: unit.name,
        temperature: parseFloat(reading.toFixed(1)),
        unit: "F",
        recorded_by: ctx.demo_user_id,
        recorded_at: ctx.daysAgo(day),
        status: isDeviation ? "critical" : "normal",
        notes: isDeviation ? "Auto-flagged: out of range" : null,
        source: SRC,
      });
    }
  }

  // Batch insert temp_logs (100 at a time)
  for (let i = 0; i < tempLogs.length; i += 100) {
    await supabase.from("temp_logs").insert(tempLogs.slice(i, i + 100));
  }

  // ── 2. CHECKLISTS + COMPLETIONS ───────────────────────────────

  const checklistDefs = [
    { title: "Opening Checklist", frequency: "daily", category: "food_safety" },
    { title: "Closing Checklist", frequency: "daily", category: "food_safety" },
    { title: "Weekly Equipment Inspection", frequency: "weekly", category: "facility_safety" },
    { title: "Food Safety HACCP Check", frequency: "daily", category: "food_safety" },
  ];

  const createdChecklists: { id: string; title: string; frequency: string }[] = [];
  for (const def of checklistDefs) {
    const { data } = await supabase
      .from("checklists")
      .insert({
        organization_id: ctx.org_id,
        title: def.title,
        frequency: def.frequency,
        category: def.category,
        created_by: ctx.demo_user_id,
        source: SRC,
      })
      .select("id, title, frequency")
      .single();
    if (data) createdChecklists.push(data);
  }

  const completions: Record<string, unknown>[] = [];
  for (let day = 60; day >= 0; day--) {
    for (const cl of createdChecklists) {
      if (cl.frequency === "weekly" && day % 7 !== 0) continue;
      if (Math.random() < 0.05) continue; // 5% missed

      const itemsPassed = 18;
      const itemsFailed = Math.random() < 0.1 ? 1 : 0;
      completions.push({
        checklist_id: cl.id,
        location_id: ctx.location_id,
        completed_by: ctx.demo_user_id,
        completed_at: ctx.daysAgo(day),
        items_data: JSON.stringify(
          Array.from({ length: itemsPassed + itemsFailed }, (_, i) => ({
            item: `Check item ${i + 1}`,
            passed: i < itemsPassed,
          })),
        ),
        notes:
          itemsFailed > 0 ? "1 item flagged — corrective action created" : null,
        source: SRC,
      });
    }
  }

  for (let i = 0; i < completions.length; i += 100) {
    await supabase
      .from("checklist_completions")
      .insert(completions.slice(i, i + 100));
  }

  // ── 3. CORRECTIVE ACTIONS ─────────────────────────────────────

  const correctiveActions = [
    {
      title: "Walk-in cooler temperature deviation",
      description:
        "Walk-in cooler recorded 44\u00B0F during morning check. " +
        "Unit operating above 41\u00B0F threshold.",
      category: "food_safety",
      severity: "high",
      status: "completed",
      days_ago_created: 45,
      days_ago_resolved: 43,
      resolution:
        "Cooler thermostat adjusted. Temperature verified at 38\u00B0F " +
        "within 2 hours. Door seal inspected and confirmed intact.",
    },
    {
      title: "Pest control service overdue",
      description:
        "Monthly pest control service not completed on schedule. " +
        "Vendor has not responded to scheduling requests.",
      category: "operational",
      severity: "medium",
      status: "created",
      days_ago_created: 8,
      days_ago_resolved: null,
      resolution: null,
    },
    {
      title: "Ice machine sanitization overdue",
      description:
        "Ice machine cleaning and sanitization certificate expired. " +
        "Unit has not been serviced in 7 months.",
      category: "food_safety",
      severity: "high",
      status: "created",
      days_ago_created: 14,
      days_ago_resolved: null,
      resolution: null,
    },
    {
      title: "Employee food handler card expired",
      description:
        "Line cook certification expired. SB 476 requirement not met.",
      category: "food_safety",
      severity: "medium",
      status: "completed",
      days_ago_created: 30,
      days_ago_resolved: 25,
      resolution:
        "Employee completed online food handler course. " +
        "New card uploaded to document vault.",
    },
  ];

  for (const ca of correctiveActions) {
    await supabase.from("corrective_actions").insert({
      organization_id: ctx.org_id,
      location_id: ctx.location_id,
      title: ca.title,
      description: ca.description,
      category: ca.category,
      severity: ca.severity,
      status: ca.status,
      created_at: ctx.daysAgo(ca.days_ago_created),
      completed_at: ca.days_ago_resolved
        ? ctx.daysAgo(ca.days_ago_resolved)
        : null,
      source: SRC,
    });
  }

  // ── 4. VENDORS (copy from demo_vendor_profiles) ───────────────

  const { data: vendorProfiles } = await supabase
    .from("demo_vendor_profiles")
    .select("*")
    .contains("industry_types", [ctx.industry_type]);

  const tourShort = ctx.org_id.slice(0, 8);

  for (const profile of vendorProfiles ?? []) {
    await supabase.from("vendors").insert({
      organization_id: ctx.org_id,
      company_name: profile.vendor_name,
      service_type: profile.vendor_type,
      contact_name: profile.contact_name,
      email: `demo-${tourShort}-${profile.vendor_type}@demo.getevidly.com`,
      phone: profile.contact_phone,
      status: profile.status === "at_risk" ? "inactive" : "active",
      notes: profile.notes,
      source: SRC,
    });
  }

  // ── 5. DOCUMENTS ──────────────────────────────────────────────

  const docs = [
    {
      title: `${ctx.county} County Environmental Health Permit`,
      category: "health_permit",
      expiration_date: ctx.daysFrom(185),
      status: "active",
    },
    {
      title: "HACCP Plan — Current Version",
      category: "haccp_plan",
      expiration_date: ctx.daysFrom(275),
      status: "active",
    },
    {
      title: "Food Safety Manager Certification — Maria Rodriguez",
      category: "food_safety_cert",
      expiration_date: ctx.daysFrom(1460),
      status: "active",
    },
    {
      title: "Food Handler Card — James Torres (EXPIRED)",
      category: "food_handler_card",
      expiration_date: ctx.daysAgo(5),
      status: "expired",
    },
    {
      title: "Business License",
      category: "business_license",
      expiration_date: ctx.daysFrom(185),
      status: "active",
    },
    {
      title: "Fire Inspection Certificate",
      category: "fire_inspection",
      expiration_date: ctx.daysFrom(275),
      status: "active",
    },
    {
      title: "Hood Cleaning Certificate — Cleaning Pros Plus",
      category: "vendor_certificate",
      expiration_date: ctx.daysFrom(45),
      status: "active",
    },
    {
      title: "Commercial General Liability — Pacific Kitchen Insurance",
      category: "insurance_certificate",
      expiration_date: ctx.daysFrom(335),
      status: "active",
    },
    {
      title: "Pest Control Service Report — ProShield",
      category: "vendor_certificate",
      expiration_date: ctx.daysAgo(5),
      status: "expired",
    },
    {
      title: "Grease Trap Pumping Manifest — Clean Water Solutions",
      category: "vendor_certificate",
      expiration_date: ctx.daysFrom(30),
      status: "active",
    },
  ];

  for (const doc of docs) {
    await supabase.from("documents").insert({
      organization_id: ctx.org_id,
      location_id: ctx.location_id,
      title: doc.title,
      category: doc.category,
      expiration_date: doc.expiration_date.split("T")[0],
      status: doc.status,
      uploaded_by: ctx.demo_user_id,
      source: SRC,
    });
  }

  // ── 6. INSURANCE RISK SCORE ───────────────────────────────────

  await supabase.from("insurance_risk_scores").insert({
    organization_id: ctx.org_id,
    location_id: ctx.location_id,
    overall_score: 71,
    risk_tier: "moderate",
    fire_risk_score: 82,
    food_safety_score: 74,
    documentation_score: 68,
    operational_score: 65,
    factor_scores: {
      fire_risk: 82,
      food_safety: 74,
      documentation: 68,
      operational: 65,
    },
    data_points: 240,
    computed_at: new Date().toISOString(),
    valid_until: ctx.daysFrom(30),
    source: SRC,
  });

  // ── 7. SB 1383 COMPLIANCE (if applicable) ─────────────────────

  const sb1383Types = [
    "sb1383_tier1",
    "sb1383_tier2",
    "restaurant",
    "hotel",
    "healthcare",
  ];
  if (sb1383Types.includes(ctx.industry_type)) {
    await supabase.from("sb1383_compliance").insert({
      organization_id: ctx.org_id,
      location_id: ctx.location_id,
      reporting_period: "Q2 2026",
      edible_food_recovery_lbs: 847,
      organic_waste_diverted_lbs: 1240,
      food_recovery_partner: "Valley Food Bank",
      food_recovery_agreement_on_file: true,
      generator_tier:
        ctx.industry_type === "sb1383_tier2" ? 2 : 1,
      source: SRC,
    });
  }
}

// ── Helpers ───────────────────────────────────────────────────

function getRandomStaffName(): string {
  const names = [
    "Maria Rodriguez",
    "James Torres",
    "Sarah Kim",
    "Carlos Mendez",
    "Jennifer Walsh",
    "David Park",
  ];
  return names[Math.floor(Math.random() * names.length)];
}
