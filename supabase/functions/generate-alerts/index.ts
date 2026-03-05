import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface GeneratedAlert {
  organization_id: string;
  location_id: string;
  alert_type: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  recommended_action: string;
  related_id?: string;
  related_type?: string;
  data_points: Record<string, unknown>;
  status: "active";
}

// ── Supabase client (service role — no RLS) ───────────────────────────────────

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ── Check 1: Expiring Documents ───────────────────────────────────────────────
// HIGH: expires within 14 days, MEDIUM: within 30 days, LOW: within 60-90 days

async function checkExpiringDocuments(
  orgId: string
): Promise<GeneratedAlert[]> {
  const supabase = getSupabase();
  const alerts: GeneratedAlert[] = [];

  const now = new Date();
  const in90Days = new Date(
    now.getTime() + 90 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: docs } = await supabase
    .from("documents")
    .select("id, name, type, expiration_date, location_id")
    .eq("organization_id", orgId)
    .gte("expiration_date", now.toISOString())
    .lte("expiration_date", in90Days)
    .order("expiration_date", { ascending: true });

  for (const doc of docs || []) {
    const daysUntil = Math.ceil(
      (new Date(doc.expiration_date).getTime() - now.getTime()) /
        (24 * 60 * 60 * 1000)
    );
    const severity =
      daysUntil <= 14 ? "high" : daysUntil <= 30 ? "medium" : "low";
    alerts.push({
      organization_id: orgId,
      location_id: doc.location_id,
      alert_type: "document_expiring",
      severity,
      title: `${doc.name} expires in ${daysUntil} days`,
      description: `${doc.type} document "${doc.name}" expires on ${doc.expiration_date}.`,
      recommended_action: `Begin renewal process for ${doc.name}. Allow processing time.`,
      related_id: doc.id,
      related_type: "document",
      data_points: {
        expiration_date: doc.expiration_date,
        days_until: daysUntil,
      },
      status: "active",
    });
  }

  return alerts;
}

// ── Check 2: Overdue Vendor Services ──────────────────────────────────────────
// Compares last service date against the service cycle interval.

async function checkOverdueServices(orgId: string): Promise<GeneratedAlert[]> {
  const supabase = getSupabase();
  const alerts: GeneratedAlert[] = [];

  const { data: services } = await supabase
    .from("vendor_services")
    .select(
      "id, service_type, last_service_date, cycle_days, location_id, vendor_name"
    )
    .eq("organization_id", orgId);

  for (const svc of services || []) {
    if (!svc.last_service_date || !svc.cycle_days) continue;
    const daysSince = Math.floor(
      (Date.now() - new Date(svc.last_service_date).getTime()) /
        (24 * 60 * 60 * 1000)
    );
    const daysOverdue = daysSince - svc.cycle_days;
    if (daysOverdue > 0) {
      const severity =
        daysOverdue > 30 ? "high" : daysOverdue > 7 ? "medium" : "low";
      alerts.push({
        organization_id: orgId,
        location_id: svc.location_id,
        alert_type:
          svc.service_type === "hood_cleaning"
            ? "hood_cleaning_overdue"
            : "service_overdue",
        severity,
        title: `${svc.service_type} overdue by ${daysOverdue} days`,
        description: `${svc.service_type} is ${daysOverdue} days past the ${svc.cycle_days}-day cycle.`,
        recommended_action: `Contact ${svc.vendor_name || "vendor"} to schedule ${svc.service_type} immediately.`,
        related_id: svc.id,
        related_type: "vendor_service",
        data_points: {
          days_since: daysSince,
          cycle_days: svc.cycle_days,
          days_overdue: daysOverdue,
        },
        status: "active",
      });
    }
  }

  return alerts;
}

// ── Check 3: Temperature Trends ───────────────────────────────────────────────
// 7-day rolling average vs previous 7 days. Flag if avg increased by > 2°F.

async function checkTempTrends(orgId: string): Promise<GeneratedAlert[]> {
  const supabase = getSupabase();
  const alerts: GeneratedAlert[] = [];

  const fourteenDaysAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000
  ).toISOString();
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: logs } = await supabase
    .from("temp_logs")
    .select("id, equipment_name, temperature, recorded_at, location_id")
    .eq("organization_id", orgId)
    .gte("recorded_at", fourteenDaysAgo)
    .order("recorded_at", { ascending: true });

  if (!logs || logs.length === 0) return alerts;

  // Group by equipment + location
  const groups: Record<
    string,
    { recent: number[]; previous: number[]; location_id: string }
  > = {};
  for (const log of logs) {
    const key = `${log.location_id}:${log.equipment_name}`;
    if (!groups[key])
      groups[key] = { recent: [], previous: [], location_id: log.location_id };
    if (log.recorded_at >= sevenDaysAgo) {
      groups[key].recent.push(log.temperature);
    } else {
      groups[key].previous.push(log.temperature);
    }
  }

  for (const [key, group] of Object.entries(groups)) {
    if (group.recent.length < 3 || group.previous.length < 3) continue;
    const recentAvg =
      group.recent.reduce((s, v) => s + v, 0) / group.recent.length;
    const previousAvg =
      group.previous.reduce((s, v) => s + v, 0) / group.previous.length;
    const delta = recentAvg - previousAvg;

    if (delta > 2) {
      const equipName = key.split(":")[1];
      alerts.push({
        organization_id: orgId,
        location_id: group.location_id,
        alert_type: "temp_trend_rising",
        severity: delta > 4 ? "high" : "medium",
        title: `${equipName} temperature trending up +${delta.toFixed(1)}\u00B0F`,
        description: `7-day average is ${recentAvg.toFixed(1)}\u00B0F vs ${previousAvg.toFixed(1)}\u00B0F prior week.`,
        recommended_action: `Check ${equipName} — verify door seals, compressor, and defrost cycle.`,
        data_points: {
          recent_avg: recentAvg,
          previous_avg: previousAvg,
          delta,
        },
        status: "active",
      });
    }
  }

  return alerts;
}

// ── Check 4: Checklist Completion Drop ────────────────────────────────────────
// Compare this week vs 4-week average. Flag if drop > 10%.

async function checkChecklistDrop(orgId: string): Promise<GeneratedAlert[]> {
  const supabase = getSupabase();
  const alerts: GeneratedAlert[] = [];

  const now = new Date();
  const fourWeeksAgo = new Date(
    now.getTime() - 28 * 24 * 60 * 60 * 1000
  ).toISOString();
  const oneWeekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: completions } = await supabase
    .from("checklist_completions")
    .select("id, completed, total_items, completed_at, location_id")
    .eq("organization_id", orgId)
    .gte("completed_at", fourWeeksAgo);

  if (!completions || completions.length === 0) return alerts;

  // Group by location
  const byLocation: Record<
    string,
    { thisWeek: number[]; previous: number[] }
  > = {};
  for (const c of completions) {
    if (!byLocation[c.location_id])
      byLocation[c.location_id] = { thisWeek: [], previous: [] };
    const rate = c.total_items > 0 ? c.completed / c.total_items : 0;
    if (c.completed_at >= oneWeekAgo) {
      byLocation[c.location_id].thisWeek.push(rate);
    } else {
      byLocation[c.location_id].previous.push(rate);
    }
  }

  for (const [locId, data] of Object.entries(byLocation)) {
    if (data.thisWeek.length === 0 || data.previous.length === 0) continue;
    const thisWeekAvg =
      data.thisWeek.reduce((s, v) => s + v, 0) / data.thisWeek.length;
    const prevAvg =
      data.previous.reduce((s, v) => s + v, 0) / data.previous.length;
    const dropPct = (prevAvg - thisWeekAvg) * 100;

    if (dropPct > 10) {
      alerts.push({
        organization_id: orgId,
        location_id: locId,
        alert_type: "checklist_completion_drop",
        severity: dropPct > 20 ? "high" : "medium",
        title: `Checklist completion dropped ${dropPct.toFixed(0)}%`,
        description: `This week: ${(thisWeekAvg * 100).toFixed(0)}% vs 4-week avg: ${(prevAvg * 100).toFixed(0)}%.`,
        recommended_action:
          "Review missed checklists and follow up with assigned staff.",
        data_points: {
          this_week_rate: thisWeekAvg,
          previous_rate: prevAvg,
          drop_pct: dropPct,
        },
        status: "active",
      });
    }
  }

  return alerts;
}

// ── Check 5: Certification Expirations ────────────────────────────────────────

async function checkCertExpirations(orgId: string): Promise<GeneratedAlert[]> {
  const supabase = getSupabase();
  const alerts: GeneratedAlert[] = [];

  const now = new Date();
  const in90Days = new Date(
    now.getTime() + 90 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: certs } = await supabase
    .from("user_certifications")
    .select(
      "id, user_id, cert_type, expiration_date, user_profiles!inner(full_name)"
    )
    .eq("organization_id", orgId)
    .gte("expiration_date", now.toISOString())
    .lte("expiration_date", in90Days);

  for (const cert of certs || []) {
    const daysUntil = Math.ceil(
      (new Date(cert.expiration_date).getTime() - now.getTime()) /
        (24 * 60 * 60 * 1000)
    );
    const severity =
      daysUntil <= 14 ? "high" : daysUntil <= 30 ? "medium" : "low";
    const userName =
      (cert as Record<string, unknown>).user_profiles &&
      ((cert as Record<string, unknown>).user_profiles as Record<string, unknown>)
        .full_name
        ? String(
            (
              (cert as Record<string, unknown>)
                .user_profiles as Record<string, unknown>
            ).full_name
          )
        : "Staff member";

    alerts.push({
      organization_id: orgId,
      location_id: orgId, // cert is org-level
      alert_type: "cert_expiring",
      severity,
      title: `${userName}'s ${cert.cert_type} expires in ${daysUntil} days`,
      description: `${cert.cert_type} certification expires on ${cert.expiration_date}.`,
      recommended_action: `Schedule ${cert.cert_type} renewal for ${userName}.`,
      related_id: cert.id,
      related_type: "certification",
      data_points: {
        expiration_date: cert.expiration_date,
        days_until: daysUntil,
        cert_type: cert.cert_type,
      },
      status: "active",
    });
  }

  return alerts;
}

// ── Check 6: Vendor Non-responsive ────────────────────────────────────────────
// Service requests with no response after 48 hours.

async function checkVendorNonresponsive(
  orgId: string
): Promise<GeneratedAlert[]> {
  const supabase = getSupabase();
  const alerts: GeneratedAlert[] = [];

  const fortyEightHoursAgo = new Date(
    Date.now() - 48 * 60 * 60 * 1000
  ).toISOString();

  const { data: requests } = await supabase
    .from("vendor_service_requests")
    .select(
      "id, vendor_id, vendors!inner(name), requested_at, location_id"
    )
    .eq("organization_id", orgId)
    .is("responded_at", null)
    .lte("requested_at", fortyEightHoursAgo);

  for (const req of requests || []) {
    const hoursSince = Math.floor(
      (Date.now() - new Date(req.requested_at).getTime()) / (60 * 60 * 1000)
    );
    const vendorName =
      (req as Record<string, unknown>).vendors &&
      ((req as Record<string, unknown>).vendors as Record<string, unknown>).name
        ? String(
            (
              (req as Record<string, unknown>)
                .vendors as Record<string, unknown>
            ).name
          )
        : "Vendor";

    alerts.push({
      organization_id: orgId,
      location_id: req.location_id,
      alert_type: "vendor_nonresponsive",
      severity: hoursSince > 96 ? "high" : "medium",
      title: `${vendorName} has not responded in ${hoursSince}h`,
      description: `Service request sent ${hoursSince} hours ago with no response.`,
      recommended_action: `Contact ${vendorName} directly or consider backup vendor.`,
      related_id: req.id,
      related_type: "service_request",
      data_points: { hours_since: hoursSince, vendor_name: vendorName },
      status: "active",
    });
  }

  return alerts;
}

// ── Check 7: Upcoming/Overdue Inspections ─────────────────────────────────────

async function checkUpcomingInspections(
  orgId: string
): Promise<GeneratedAlert[]> {
  const supabase = getSupabase();
  const alerts: GeneratedAlert[] = [];

  const now = new Date();
  const in30Days = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Upcoming scheduled inspections
  const { data: upcoming } = await supabase
    .from("inspections")
    .select("id, inspection_type, scheduled_date, location_id")
    .eq("organization_id", orgId)
    .eq("status", "scheduled")
    .gte("scheduled_date", now.toISOString())
    .lte("scheduled_date", in30Days);

  for (const insp of upcoming || []) {
    const daysUntil = Math.ceil(
      (new Date(insp.scheduled_date).getTime() - now.getTime()) /
        (24 * 60 * 60 * 1000)
    );
    alerts.push({
      organization_id: orgId,
      location_id: insp.location_id,
      alert_type: "inspection_upcoming",
      severity: daysUntil <= 7 ? "high" : daysUntil <= 14 ? "medium" : "low",
      title: `${insp.inspection_type} inspection in ${daysUntil} days`,
      description: `Scheduled for ${insp.scheduled_date}.`,
      recommended_action:
        "Ensure all checklists are complete and documents are current.",
      related_id: insp.id,
      related_type: "inspection",
      data_points: {
        scheduled_date: insp.scheduled_date,
        days_until: daysUntil,
      },
      status: "active",
    });
  }

  // Overdue inspections
  const { data: overdue } = await supabase
    .from("inspections")
    .select("id, inspection_type, scheduled_date, location_id")
    .eq("organization_id", orgId)
    .lt("scheduled_date", now.toISOString())
    .neq("status", "completed");

  for (const insp of overdue || []) {
    const daysOverdue = Math.floor(
      (now.getTime() - new Date(insp.scheduled_date).getTime()) /
        (24 * 60 * 60 * 1000)
    );
    alerts.push({
      organization_id: orgId,
      location_id: insp.location_id,
      alert_type: "inspection_overdue",
      severity: "high",
      title: `${insp.inspection_type} inspection overdue by ${daysOverdue} days`,
      description: `Was scheduled for ${insp.scheduled_date} and has not been completed.`,
      recommended_action: "Reschedule immediately or contact the inspector.",
      related_id: insp.id,
      related_type: "inspection",
      data_points: {
        scheduled_date: insp.scheduled_date,
        days_overdue: daysOverdue,
      },
      status: "active",
    });
  }

  return alerts;
}

// ── Main: Generate all alerts, deduplicate, insert ────────────────────────────

async function generateAlerts(
  orgId: string
): Promise<{ generated: number; skipped: number }> {
  const supabase = getSupabase();

  // Run all 7 checks in parallel
  const results = await Promise.all([
    checkExpiringDocuments(orgId),
    checkOverdueServices(orgId),
    checkTempTrends(orgId),
    checkChecklistDrop(orgId),
    checkCertExpirations(orgId),
    checkVendorNonresponsive(orgId),
    checkUpcomingInspections(orgId),
  ]);

  const allAlerts: GeneratedAlert[] = [];
  for (const result of results) {
    allAlerts.push(...result);
  }

  if (allAlerts.length === 0) {
    return { generated: 0, skipped: 0 };
  }

  // Deduplicate: skip alerts that already exist as active/snoozed
  const { data: existing } = await supabase
    .from("predictive_alerts")
    .select("alert_type, related_id")
    .eq("organization_id", orgId)
    .in("status", ["active", "snoozed"]);

  const existingKeys = new Set(
    (existing || []).map(
      (e: { alert_type: string; related_id: string | null }) =>
        `${e.alert_type}:${e.related_id || ""}`
    )
  );

  const newAlerts = allAlerts.filter(
    (a) => !existingKeys.has(`${a.alert_type}:${a.related_id || ""}`)
  );

  if (newAlerts.length > 0) {
    const { error } = await supabase
      .from("predictive_alerts")
      .insert(newAlerts);
    if (error) {
      console.error("[generate-alerts] Insert error:", error);
    }
  }

  return { generated: newAlerts.length, skipped: allAlerts.length - newAlerts.length };
}

// ── Edge Function Handler ─────────────────────────────────────────────────────
// Triggered daily by pg_cron or manually via POST with { organization_id }

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { organization_id } = await req.json();

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "organization_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await generateAlerts(organization_id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[generate-alerts] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
