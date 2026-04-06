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
 * generate-partner-demo — Populates a staging partner demo with
 * curated multi-location data tailored to each partner persona.
 *
 * All generated rows are tagged with source = 'partner_demo' so the
 * cleanup-demo-tour function can safely remove them later.
 *
 * Partner types: vendor, association, integration, carrier, tribal_casino
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
  const {
    data: { user: caller },
  } = await userClient.auth.getUser();
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

  const { demo_id, org_id, partner_type, partner_config } = body as {
    demo_id: string;
    org_id: string;
    partner_type: string;
    partner_config: Record<string, unknown>;
  };

  if (!demo_id || !org_id || !partner_type) {
    return jsonResponse(
      { error: "demo_id, org_id, and partner_type required" },
      400,
    );
  }

  try {
    const now = new Date();
    const daysAgo = (n: number) =>
      new Date(now.getTime() - n * 86400000).toISOString();
    const daysFrom = (n: number) =>
      new Date(now.getTime() + n * 86400000).toISOString();

    const ctx: GeneratorContext = {
      supabase,
      org_id,
      demo_id,
      partner_config,
      daysAgo,
      daysFrom,
      now,
    };

    let result: Record<string, unknown> = {};

    switch (partner_type) {
      case "vendor":
        result = await generateVendorDemo(ctx);
        break;
      case "association":
        result = await generateAssociationDemo(ctx);
        break;
      case "integration":
        result = await generateIntegrationDemo(ctx);
        break;
      case "carrier":
        result = await generateCarrierDemo(ctx);
        break;
      case "tribal_casino":
        result = await generateTribalCasinoDemo(ctx);
        break;
      default:
        return jsonResponse({ error: `Unknown partner_type: ${partner_type}` }, 400);
    }

    // Update partner demo status to active
    await supabase
      .from("partner_demos")
      .update({ status: "active", started_at: now.toISOString() })
      .eq("id", demo_id);

    return jsonResponse({ success: true, partner_type, ...result });
  } catch (err) {
    console.error("[generate-partner-demo] Error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      500,
    );
  }
});

// ── Types ─────────────────────────────────────────────────────

interface GeneratorContext {
  supabase: ReturnType<typeof createClient>;
  org_id: string;
  demo_id: string;
  partner_config: Record<string, unknown>;
  daysAgo: (n: number) => string;
  daysFrom: (n: number) => string;
  now: Date;
}

const SRC = "partner_demo";

// ── Shared helpers ────────────────────────────────────────────

async function createClientLocations(
  ctx: GeneratorContext,
  clients: { name: string; county: string; state?: string }[],
): Promise<{ id: string; name: string; county: string }[]> {
  const inserts = clients.map((c) => ({
    organization_id: ctx.org_id,
    name: c.name,
    city: c.county,
    state: c.state || "CA",
    status: "active",
    source: SRC,
  }));

  const { data, error } = await ctx.supabase
    .from("locations")
    .insert(inserts)
    .select("id, name, city");

  if (error) throw new Error(`Failed to create locations: ${error.message}`);
  return (data || []).map((d) => ({ id: d.id, name: d.name, county: d.city }));
}

async function generateLocationOpsData(
  ctx: GeneratorContext,
  locationId: string,
  demoUserId: string | null,
  days: number,
): Promise<void> {
  // Temperature logs
  const equipment = [
    { name: "Walk-in Cooler", normalMin: 36, normalMax: 40, critHigh: 41 },
    { name: "Walk-in Freezer", normalMin: -5, normalMax: 5, critHigh: 10 },
    { name: "Hot Holding Unit", normalMin: 140, normalMax: 165, critHigh: 200 },
  ];

  const tempLogs: Record<string, unknown>[] = [];
  for (let day = days; day >= 0; day--) {
    for (const unit of equipment) {
      const isDeviation = Math.random() < 0.05;
      const reading = isDeviation
        ? unit.critHigh + Math.random() * 8
        : unit.normalMin + Math.random() * (unit.normalMax - unit.normalMin);

      tempLogs.push({
        organization_id: ctx.org_id,
        location_id: locationId,
        equipment_name: unit.name,
        temperature: parseFloat(reading.toFixed(1)),
        unit: "F",
        recorded_by: demoUserId,
        recorded_at: ctx.daysAgo(day),
        status: isDeviation ? "critical" : "normal",
        source: SRC,
      });
    }
  }

  for (let i = 0; i < tempLogs.length; i += 100) {
    await ctx.supabase.from("temp_logs").insert(tempLogs.slice(i, i + 100));
  }

  // Checklists
  const checklistDefs = [
    { title: "Opening Checklist", frequency: "daily", category: "food_safety" },
    { title: "Closing Checklist", frequency: "daily", category: "food_safety" },
    {
      title: "Weekly Equipment Inspection",
      frequency: "weekly",
      category: "facility_safety",
    },
  ];

  const createdChecklists: { id: string; frequency: string }[] = [];
  for (const def of checklistDefs) {
    const { data } = await ctx.supabase
      .from("checklists")
      .insert({
        organization_id: ctx.org_id,
        title: def.title,
        frequency: def.frequency,
        category: def.category,
        created_by: demoUserId,
        source: SRC,
      })
      .select("id, frequency")
      .single();
    if (data) createdChecklists.push(data);
  }

  const completions: Record<string, unknown>[] = [];
  for (let day = days; day >= 0; day--) {
    for (const cl of createdChecklists) {
      if (cl.frequency === "weekly" && day % 7 !== 0) continue;
      if (Math.random() < 0.05) continue;

      completions.push({
        checklist_id: cl.id,
        location_id: locationId,
        completed_by: demoUserId,
        completed_at: ctx.daysAgo(day),
        items_data: JSON.stringify(
          Array.from({ length: 18 }, (_, i) => ({
            item: `Check item ${i + 1}`,
            passed: true,
          })),
        ),
        source: SRC,
      });
    }
  }

  for (let i = 0; i < completions.length; i += 100) {
    await ctx.supabase
      .from("checklist_completions")
      .insert(completions.slice(i, i + 100));
  }
}

async function seedVendors(
  ctx: GeneratorContext,
  industryType: string,
): Promise<void> {
  const { data: vendorProfiles } = await ctx.supabase
    .from("demo_vendor_profiles")
    .select("*")
    .contains("industry_types", [industryType]);

  const tourShort = ctx.org_id.slice(0, 8);
  for (const profile of vendorProfiles ?? []) {
    await ctx.supabase.from("vendors").insert({
      organization_id: ctx.org_id,
      company_name: profile.vendor_name,
      service_type: profile.vendor_type,
      contact_name: profile.contact_name,
      email: `partner-${tourShort}-${profile.vendor_type}@demo.getevidly.com`,
      phone: profile.contact_phone,
      status: profile.status === "at_risk" ? "inactive" : "active",
      notes: profile.notes,
      source: SRC,
    });
  }
}

async function seedInsuranceRiskScore(
  ctx: GeneratorContext,
  locationId: string,
  overrides?: Partial<{
    overall_score: number;
    risk_tier: string;
    fire_risk_score: number;
    food_safety_score: number;
    documentation_score: number;
    operational_score: number;
  }>,
): Promise<void> {
  const scores = {
    overall_score: overrides?.overall_score ?? 71,
    risk_tier: overrides?.risk_tier ?? "moderate",
    fire_risk_score: overrides?.fire_risk_score ?? 82,
    food_safety_score: overrides?.food_safety_score ?? 74,
    documentation_score: overrides?.documentation_score ?? 68,
    operational_score: overrides?.operational_score ?? 65,
  };

  await ctx.supabase.from("insurance_risk_scores").insert({
    organization_id: ctx.org_id,
    location_id: locationId,
    ...scores,
    factor_scores: {
      fire_risk: scores.fire_risk_score,
      food_safety: scores.food_safety_score,
      documentation: scores.documentation_score,
      operational: scores.operational_score,
    },
    data_points: 240,
    computed_at: ctx.now.toISOString(),
    valid_until: ctx.daysFrom(30),
    source: SRC,
  });
}

async function seedDocuments(
  ctx: GeneratorContext,
  locationId: string,
  county: string,
  demoUserId: string | null,
): Promise<void> {
  const docs = [
    {
      title: `${county} County Environmental Health Permit`,
      category: "health_permit",
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
  ];

  for (const doc of docs) {
    await ctx.supabase.from("documents").insert({
      organization_id: ctx.org_id,
      location_id: locationId,
      title: doc.title,
      category: doc.category,
      expiration_date: doc.expiration_date.split("T")[0],
      status: doc.status,
      uploaded_by: demoUserId,
      source: SRC,
    });
  }
}

// ══════════════════════════════════════════════════════════════
// 1. VENDOR DEMO
// ══════════════════════════════════════════════════════════════

async function generateVendorDemo(
  ctx: GeneratorContext,
): Promise<Record<string, unknown>> {
  const counties = ["Merced", "Fresno", "Stanislaus"];
  const clientNames = [
    { name: "Sal's Italian Kitchen — Merced", county: "Merced" },
    { name: "Dragon Palace — Fresno", county: "Fresno" },
    { name: "Valley Grill — Turlock", county: "Stanislaus" },
    { name: "The Copper Skillet — Clovis", county: "Fresno" },
    { name: "Taqueria El Sol — Atwater", county: "Merced" },
  ];

  const locations = await createClientLocations(ctx, clientNames);

  // Fetch demo user from partner_demos
  const { data: demoRecord } = await ctx.supabase
    .from("partner_demos")
    .select("demo_user_id")
    .eq("id", ctx.demo_id)
    .single();
  const demoUserId = demoRecord?.demo_user_id || null;

  // Generate 60 days ops data for each client location
  for (const loc of locations) {
    await generateLocationOpsData(ctx, loc.id, demoUserId, 60);
    await seedDocuments(ctx, loc.id, loc.county, demoUserId);
    await seedInsuranceRiskScore(ctx, loc.id);
  }

  // Vendor service records — 12 months × 10 service visits across clients
  const serviceRecords: Record<string, unknown>[] = [];
  for (let month = 12; month >= 1; month--) {
    const loc = locations[month % locations.length];
    serviceRecords.push({
      organization_id: ctx.org_id,
      location_id: loc.id,
      equipment_name: "Kitchen Exhaust System",
      service_type: "hood_cleaning",
      service_date: ctx.daysAgo(month * 30),
      next_service_date: ctx.daysAgo((month - 1) * 30),
      technician_name: "Samuel Haggerty",
      notes: `Monthly hood cleaning — ${loc.name}. NFPA 96 compliant.`,
      status: "completed",
      source: SRC,
    });
  }

  for (let i = 0; i < serviceRecords.length; i += 50) {
    await ctx.supabase
      .from("equipment_service_records")
      .insert(serviceRecords.slice(i, i + 50));
  }

  // Seed 11 PSE vendor profiles for each client
  await seedVendors(ctx, "restaurant");

  // Store vendor-specific data in partner_config
  await ctx.supabase
    .from("partner_demos")
    .update({
      partner_config: {
        ...(ctx.partner_config || {}),
        vendor_company: ctx.partner_config?.company_name || "Cleaning Pros Plus",
        service_types: ["hood_cleaning", "fire_suppression"],
        client_locations: locations.map((l) => ({
          id: l.id,
          name: l.name,
          county: l.county,
        })),
        vendor_connect_slots: {
          fresno: { total: 3, filled: 2, available: 1 },
          merced: { total: 3, filled: 1, available: 2 },
          stanislaus: { total: 3, filled: 1, available: 2 },
        },
        service_history_months: 12,
      },
    })
    .eq("id", ctx.demo_id);

  return { locations_created: locations.length, service_records: serviceRecords.length };
}

// ══════════════════════════════════════════════════════════════
// 2. ASSOCIATION DEMO
// ══════════════════════════════════════════════════════════════

async function generateAssociationDemo(
  ctx: GeneratorContext,
): Promise<Record<string, unknown>> {
  const memberOrgs = [
    { name: "Golden Wok Chinese — Merced", county: "Merced" },
    { name: "Sunshine Bakery — Fresno", county: "Fresno" },
    { name: "Trattoria Roma — Modesto", county: "Stanislaus" },
    { name: "Coastal Seafood Grill — San Diego", county: "San Diego" },
    { name: "La Cocina de Maria — Los Angeles", county: "Los Angeles" },
    { name: "Pho Street Kitchen — Fresno", county: "Fresno" },
    { name: "Valley Steakhouse — Merced", county: "Merced" },
    { name: "The Breakfast Spot — Modesto", county: "Stanislaus" },
    { name: "Harbor Fish Market — San Diego", county: "San Diego" },
    { name: "Taqueria Familia — Los Angeles", county: "Los Angeles" },
  ];

  const locations = await createClientLocations(ctx, memberOrgs);

  const { data: demoRecord } = await ctx.supabase
    .from("partner_demos")
    .select("demo_user_id")
    .eq("id", ctx.demo_id)
    .single();
  const demoUserId = demoRecord?.demo_user_id || null;

  // Generate 30 days ops data for each member
  for (const loc of locations) {
    await generateLocationOpsData(ctx, loc.id, demoUserId, 30);
    await seedDocuments(ctx, loc.id, loc.county, demoUserId);
    await seedInsuranceRiskScore(ctx, loc.id, {
      overall_score: 60 + Math.floor(Math.random() * 35),
      risk_tier: Math.random() > 0.3 ? "moderate" : "low",
    });
  }

  await seedVendors(ctx, "restaurant");

  // Store association-specific config
  const countyGroups: Record<string, string[]> = {};
  for (const loc of locations) {
    if (!countyGroups[loc.county]) countyGroups[loc.county] = [];
    countyGroups[loc.county].push(loc.name);
  }

  const memberCount = locations.length;
  await ctx.supabase
    .from("partner_demos")
    .update({
      partner_config: {
        ...(ctx.partner_config || {}),
        member_count: memberCount,
        county_coverage: countyGroups,
        k2c_monthly: memberCount * 10,
        k2c_annual: memberCount * 10 * 12,
        k2c_meals_per_month: memberCount * 10 * 3,
        member_locations: locations.map((l) => ({
          id: l.id,
          name: l.name,
          county: l.county,
        })),
        adoption_pipeline: {
          onboarded: Math.ceil(memberCount * 0.6),
          in_progress: Math.ceil(memberCount * 0.3),
          invited: Math.floor(memberCount * 0.1),
        },
      },
    })
    .eq("id", ctx.demo_id);

  return { members_created: locations.length };
}

// ══════════════════════════════════════════════════════════════
// 3. INTEGRATION DEMO
// ══════════════════════════════════════════════════════════════

async function generateIntegrationDemo(
  ctx: GeneratorContext,
): Promise<Record<string, unknown>> {
  const integrationType =
    (ctx.partner_config?.integration_type as string) || "toast";

  const customerNames: { name: string; county: string }[] = [
    { name: "The Rustic Table — Fresno", county: "Fresno" },
    { name: "Blue Moon Cafe — Merced", county: "Merced" },
    { name: "Sakura Sushi Bar — Clovis", county: "Fresno" },
    { name: "Mountain View BBQ — Modesto", county: "Stanislaus" },
  ];

  const locations = await createClientLocations(ctx, customerNames);

  const { data: demoRecord } = await ctx.supabase
    .from("partner_demos")
    .select("demo_user_id")
    .eq("id", ctx.demo_id)
    .single();
  const demoUserId = demoRecord?.demo_user_id || null;

  for (const loc of locations) {
    await generateLocationOpsData(ctx, loc.id, demoUserId, 30);
    await seedDocuments(ctx, loc.id, loc.county, demoUserId);
    await seedInsuranceRiskScore(ctx, loc.id);
  }

  await seedVendors(ctx, "restaurant");

  // Integration-type-specific mock data
  const integrationData: Record<string, unknown> = {
    integration_type: integrationType,
    joint_customers: locations.map((l) => ({
      id: l.id,
      name: l.name,
      county: l.county,
    })),
  };

  if (integrationType === "toast") {
    integrationData.pos_data = {
      daily_transactions: 145,
      avg_ticket: 28.5,
      food_waste_pct: 4.2,
      menu_items_tracked: 87,
    };
  } else if (integrationType === "dinehr") {
    integrationData.hr_data = {
      total_employees: 34,
      food_handler_certified: 28,
      certifications_expiring_30d: 3,
      training_completion_pct: 82,
    };
  } else if (integrationType === "next_insurance") {
    integrationData.insurance_data = {
      policies_bound: locations.length,
      avg_premium_reduction: 12,
      risk_data_points_shared: 240 * locations.length,
      claims_30d: 0,
    };
  } else if (integrationType === "cintas") {
    integrationData.uniform_data = {
      active_accounts: locations.length,
      weekly_service_value: 285,
      compliance_items: ["aprons", "chef_coats", "mats", "towels"],
    };
  }

  await ctx.supabase
    .from("partner_demos")
    .update({
      partner_config: {
        ...(ctx.partner_config || {}),
        ...integrationData,
      },
    })
    .eq("id", ctx.demo_id);

  return { customers_created: locations.length, integration_type: integrationType };
}

// ══════════════════════════════════════════════════════════════
// 4. CARRIER DEMO
// ══════════════════════════════════════════════════════════════

async function generateCarrierDemo(
  ctx: GeneratorContext,
): Promise<Record<string, unknown>> {
  const carrierClients = [
    { name: "Valley Bistro — Merced", county: "Merced" },
    { name: "La Hacienda — Fresno", county: "Fresno" },
    { name: "The Fire Pit BBQ — Modesto", county: "Stanislaus" },
    { name: "Pacific Rim Kitchen — Long Beach", county: "Los Angeles" },
    { name: "Casa de Tacos — Fresno", county: "Fresno" },
    { name: "Golden Dragon — Merced", county: "Merced" },
    { name: "Olive Garden Express — Turlock", county: "Stanislaus" },
    { name: "Seoul Kitchen — Los Angeles", county: "Los Angeles" },
    { name: "Harbor Grill — San Pedro", county: "Los Angeles" },
    { name: "Farm to Fork — Atwater", county: "Merced" },
  ];

  const locations = await createClientLocations(ctx, carrierClients);

  const { data: demoRecord } = await ctx.supabase
    .from("partner_demos")
    .select("demo_user_id")
    .eq("id", ctx.demo_id)
    .single();
  const demoUserId = demoRecord?.demo_user_id || null;

  // CIC 5-pillar risk profiles per location
  const cicProfiles = locations.map((loc, i) => {
    const baseScore = 55 + Math.floor(Math.random() * 40);
    const variance = () => Math.max(0, Math.min(100, baseScore + (Math.random() - 0.5) * 30));
    return {
      location_id: loc.id,
      location_name: loc.name,
      county: loc.county,
      p1_revenue: Math.round(variance()),
      p2_liability: Math.round(variance()),
      p3_cost: Math.round(variance()),
      p4_operational: Math.round(variance()),
      p5_workforce: Math.round(variance()),
      overall: baseScore,
      pse_verified: i < 7,
      pse_safeguards: {
        hood_cleaning: i < 8,
        fire_suppression: i < 6,
        fire_extinguisher: i < 9,
        pest_control: i < 5,
      },
    };
  });

  for (const loc of locations) {
    await generateLocationOpsData(ctx, loc.id, demoUserId, 60);
    await seedDocuments(ctx, loc.id, loc.county, demoUserId);

    const profile = cicProfiles.find((p) => p.location_id === loc.id);
    await seedInsuranceRiskScore(ctx, loc.id, {
      overall_score: profile?.overall ?? 71,
      risk_tier:
        (profile?.overall ?? 71) >= 80
          ? "low"
          : (profile?.overall ?? 71) >= 60
            ? "moderate"
            : "high",
      fire_risk_score: profile?.p2_liability ?? 75,
      food_safety_score: profile?.p4_operational ?? 70,
      documentation_score: profile?.p3_cost ?? 68,
      operational_score: profile?.p4_operational ?? 65,
    });
  }

  await seedVendors(ctx, "restaurant");

  // Store carrier-specific data
  await ctx.supabase
    .from("partner_demos")
    .update({
      partner_config: {
        ...(ctx.partner_config || {}),
        portfolio_locations: locations.map((l) => ({
          id: l.id,
          name: l.name,
          county: l.county,
        })),
        cic_profiles: cicProfiles,
        risk_distribution: {
          low: cicProfiles.filter((p) => p.overall >= 80).length,
          moderate: cicProfiles.filter((p) => p.overall >= 60 && p.overall < 80)
            .length,
          high: cicProfiles.filter((p) => p.overall < 60).length,
        },
        pse_summary: {
          fully_verified: cicProfiles.filter((p) => p.pse_verified).length,
          partial: cicProfiles.filter((p) => !p.pse_verified).length,
        },
        api_feed_sample: {
          endpoint: "/api/v1/carrier/risk-feed",
          format: "JSON",
          frequency: "daily",
          fields: [
            "location_id",
            "overall_score",
            "risk_tier",
            "pse_verified",
            "last_inspection_date",
          ],
        },
      },
    })
    .eq("id", ctx.demo_id);

  return {
    locations_created: locations.length,
    cic_profiles_generated: cicProfiles.length,
  };
}

// ══════════════════════════════════════════════════════════════
// 5. TRIBAL CASINO DEMO
// ══════════════════════════════════════════════════════════════

async function generateTribalCasinoDemo(
  ctx: GeneratorContext,
): Promise<Record<string, unknown>> {
  const outletCount = (ctx.partner_config?.outlet_count as number) || 5;
  const tribeName =
    (ctx.partner_config?.tribe_name as string) || "Table Mountain Rancheria";
  const casinoName =
    (ctx.partner_config?.casino_name as string) || "Eagle Mountain Casino";

  // Set tribal org flags
  await ctx.supabase
    .from("organizations")
    .update({
      is_tribal: true,
      food_safety_mode: "advisory",
      food_safety_authority: "Tribal Environmental Health Office (TEHO)",
      food_safety_advisory_text:
        `Food safety compliance for ${tribeName} is governed by the ` +
        "Tribal Environmental Health Office (TEHO) under tribal sovereignty. " +
        "EvidLY tracks fire safety and operational compliance in full. " +
        "Tribe-specific food safety intelligence is in active development.",
    })
    .eq("id", ctx.org_id);

  // Create outlet locations
  const defaultOutletNames = [
    "Main Buffet",
    "Steakhouse",
    "Sports Bar & Grill",
    "Poolside Cafe",
    "VIP Lounge Kitchen",
    "Late Night Diner",
    "Banquet Kitchen",
    "Employee Dining",
  ];

  const outlets = Array.from(
    { length: Math.min(outletCount, defaultOutletNames.length) },
    (_, i) => ({
      name: `${casinoName} — ${defaultOutletNames[i]}`,
      county: "Fresno",
    }),
  );

  const locations = await createClientLocations(ctx, outlets);

  const { data: demoRecord } = await ctx.supabase
    .from("partner_demos")
    .select("demo_user_id")
    .eq("id", ctx.demo_id)
    .single();
  const demoUserId = demoRecord?.demo_user_id || null;

  // 60 days operational data per outlet (fire safety fully populated)
  for (const loc of locations) {
    await generateLocationOpsData(ctx, loc.id, demoUserId, 60);
    await seedDocuments(ctx, loc.id, "Fresno", demoUserId);

    // Fire-focused insurance risk score
    await seedInsuranceRiskScore(ctx, loc.id, {
      overall_score: 78,
      risk_tier: "moderate",
      fire_risk_score: 88,
      food_safety_score: 0, // Advisory mode — no score
      documentation_score: 72,
      operational_score: 80,
    });
  }

  // Monthly hood cleaning records for each outlet
  const hoodRecords: Record<string, unknown>[] = [];
  for (const loc of locations) {
    for (let month = 12; month >= 1; month--) {
      hoodRecords.push({
        organization_id: ctx.org_id,
        location_id: loc.id,
        equipment_name: "Kitchen Exhaust System",
        service_type: "hood_cleaning",
        service_date: ctx.daysAgo(month * 30),
        next_service_date: ctx.daysAgo((month - 1) * 30),
        technician_name: "Samuel Haggerty",
        notes: `Monthly hood cleaning — NFPA 96 compliant. ${loc.name}`,
        status: "completed",
        source: SRC,
      });
    }
  }

  // Quarterly fire suppression inspections
  for (const loc of locations) {
    for (let q = 4; q >= 1; q--) {
      hoodRecords.push({
        organization_id: ctx.org_id,
        location_id: loc.id,
        equipment_name: "Fire Suppression System (UL-300)",
        service_type: "fire_suppression",
        service_date: ctx.daysAgo(q * 90),
        next_service_date: ctx.daysAgo((q - 1) * 90),
        technician_name: "Mike Torres",
        notes: `Quarterly suppression inspection — Ansul system certified. ${loc.name}`,
        status: "completed",
        source: SRC,
      });
    }
  }

  // Annual fire extinguisher inspections
  for (const loc of locations) {
    hoodRecords.push({
      organization_id: ctx.org_id,
      location_id: loc.id,
      equipment_name: "K-Class Fire Extinguisher",
      service_type: "fire_extinguisher",
      service_date: ctx.daysAgo(180),
      next_service_date: ctx.daysFrom(185),
      technician_name: "Rosa Mendez",
      notes: `Annual extinguisher inspection — K-class + ABC units. ${loc.name}`,
      status: "completed",
      source: SRC,
    });
  }

  for (let i = 0; i < hoodRecords.length; i += 50) {
    await ctx.supabase
      .from("equipment_service_records")
      .insert(hoodRecords.slice(i, i + 50));
  }

  // Seed 11 PSE vendor profiles
  await seedVendors(ctx, "tribal_casino");

  // Store tribal-specific config
  await ctx.supabase
    .from("partner_demos")
    .update({
      partner_config: {
        ...(ctx.partner_config || {}),
        tribe_name: tribeName,
        casino_name: casinoName,
        outlet_count: locations.length,
        outlets: locations.map((l) => ({ id: l.id, name: l.name })),
        sovereignty_type: "federally_recognized",
        food_safety_mode: "advisory",
        food_safety_authority: "TEHO",
        nigc_overlay: true,
        nigc_config: {
          gaming_floor_food: true,
          banquet_operations: true,
          employee_dining: true,
        },
        fire_compliance: {
          hood_cleaning_frequency: "monthly",
          suppression_frequency: "quarterly",
          extinguisher_frequency: "annual",
          total_service_records: hoodRecords.length,
        },
      },
    })
    .eq("id", ctx.demo_id);

  return {
    outlets_created: locations.length,
    fire_service_records: hoodRecords.length,
  };
}
