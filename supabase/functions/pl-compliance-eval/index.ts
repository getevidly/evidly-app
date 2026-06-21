import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── JSON response helper ─────────────────────────────────
function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

// ── Types ────────────────────────────────────────────────

/** Map service_type_code → pl_standards_registry topic. */
const CODE_TO_TOPIC: Record<string, string> = {
  FS: "suppression",
  FA: "fire_alarm",
  SP: "sprinkler",
};

interface ReqLeaf {
  cite?: string;
  value?: string | null;
  intervals_days?: { default?: number } | null;
  _status?: string;
}
interface ReqTier {
  frequency?: ReqLeaf;
  edition?: string;
  standard?: string;
  [key: string]: unknown;
}
interface ThreeTierReq {
  national?: ReqTier;
  state?: Record<string, ReqTier>;
  local?: Record<string, ReqTier>;
  binds?: Record<string, { tier?: string; across?: string[] }>;
}
interface RegistryRow {
  topic: string;
  standard: string;
  edition: string;
  requirement: ThreeTierReq | null;
}
interface ServiceRecord {
  id: string;
  service_type_code: string;
  service_date: string | null;
  next_due_date: string | null;
  lifecycle_state: string | null;
}

// ── Requirement resolver (frequency dimension only) ──────

interface FreqResolution {
  resolved: true;
  intervalDays: number;
  cite: string;
  edition: string;
}
interface FreqUnresolved {
  resolved: false;
  reason: string;
  edition: string;
}

function resolveFrequencyInterval(
  row: RegistryRow,
): FreqResolution | FreqUnresolved {
  const req = row.requirement;
  if (!req) {
    return { resolved: false, reason: "no_requirement_data", edition: row.edition };
  }

  const bind = req.binds?.frequency;
  const tier = bind?.tier;

  if (!tier) {
    return { resolved: false, reason: "no_frequency_bind", edition: row.edition };
  }
  if (tier === "pending") {
    return { resolved: false, reason: "pending_verification", edition: row.edition };
  }

  // Collect candidate tiers to check for intervals_days
  const tiersToCheck: ReqTier[] = [];

  if (tier === "national") {
    if (req.national) tiersToCheck.push(req.national);
  } else if (tier === "equal" || tier === "union") {
    // Check state tiers first (more specific), then national
    for (const st of Object.values(req.state ?? {})) {
      tiersToCheck.push(st);
    }
    if (req.national) tiersToCheck.push(req.national);
  } else {
    // Specific state/local key like "US-CA"
    const fromState = req.state?.[tier];
    if (fromState) tiersToCheck.push(fromState);
    const fromLocal = req.local?.[tier];
    if (fromLocal) tiersToCheck.push(fromLocal);
    // Fallback to national
    if (req.national) tiersToCheck.push(req.national);
  }

  // Find the first tier that has a numeric intervals_days
  for (const t of tiersToCheck) {
    const freq = t.frequency;
    if (!freq) continue;
    const days = freq.intervals_days?.default;
    if (typeof days === "number" && days > 0) {
      const edition = t.edition ?? row.edition;
      const cite = freq.cite ?? "";
      return { resolved: true, intervalDays: days, cite, edition };
    }
  }

  return { resolved: false, reason: "no_numeric_interval", edition: row.edition };
}

// ── Alignment evaluator ─────────────────────────────────

type AlignmentState = "aligned" | "approaching_drift" | "unaligned" | "not_monitored";

function evaluateAlignment(nextDueDate: string | null): AlignmentState {
  if (!nextDueDate) return "not_monitored";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDueDate + "T00:00:00");
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / 86400000);
  if (diffDays < 0) return "unaligned";
  if (diffDays <= 30) return "approaching_drift";
  return "aligned";
}

function alignmentSeverity(state: AlignmentState): string {
  if (state === "unaligned") return "high";
  if (state === "approaching_drift") return "medium";
  return "low";
}

// ── Main handler ─────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Auth: test secret, service_role bearer, OR platform_admin JWT ──
    const testSecret = Deno.env.get("PL_TEST_SECRET");
    const testHeader = req.headers.get("x-pl-test-secret");
    const isTestAuth = testSecret && testSecret.length > 0 && testHeader === testSecret;

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const isServiceRole = token !== null && token.trim() === serviceKey.trim();

    if (!isTestAuth && !isServiceRole) {
      if (!token) {
        return json({ error: "Unauthorized" }, 401, headers);
      }
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !user) {
        return json({ error: "Unauthorized" }, 401, headers);
      }

      let isAdmin = user.email?.endsWith("@getevidly.com") || false;
      if (!isAdmin) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile?.role !== "platform_admin") {
          return json({ error: "Admin access required" }, 403, headers);
        }
      }
    }

    // ── Parse body ───────────────────────────────────────
    const { location_id } = await req.json();
    if (!location_id) {
      return json({ error: "location_id required" }, 400, headers);
    }

    // ── Resolve location → org + jurisdiction ────────────
    const { data: loc, error: locErr } = await supabase
      .from("locations")
      .select("id, organization_id, jurisdiction_id, state")
      .eq("id", location_id)
      .single();

    if (locErr || !loc) {
      return json({ error: "Location not found" }, 404, headers);
    }

    const orgId = loc.organization_id;

    // ── Load active sealed fire records (FS/FA/SP) ───────
    const { data: records, error: recErr } = await supabase
      .from("vendor_service_records")
      .select("id, service_type_code, service_date, next_due_date, lifecycle_state")
      .eq("location_id", location_id)
      .eq("lifecycle_state", "active")
      .eq("is_sample", false)
      .in("service_type_code", ["FS", "FA", "SP"])
      .order("service_date", { ascending: false });

    if (recErr) {
      return json({ error: "Failed to load service records: " + recErr.message }, 500, headers);
    }

    // Take latest per service_type_code
    const latestByCode = new Map<string, ServiceRecord>();
    for (const r of (records ?? []) as ServiceRecord[]) {
      if (!latestByCode.has(r.service_type_code)) {
        latestByCode.set(r.service_type_code, r);
      }
    }

    // ── Load standards registry for fire topics ──────────
    const topics = Object.values(CODE_TO_TOPIC);
    const { data: regRows, error: regErr } = await supabase
      .from("pl_standards_registry")
      .select("topic, standard, edition, requirement")
      .in("topic", topics);

    if (regErr) {
      return json({ error: "Failed to load standards registry: " + regErr.message }, 500, headers);
    }

    const registry = new Map<string, RegistryRow>(
      (regRows ?? []).map((r: RegistryRow) => [r.topic, r]),
    );

    // ── Evaluate each system ─────────────────────────────
    const evaluated: {
      code: string;
      topic: string;
      alignment: AlignmentState;
      intervalDays: number;
      cite: string;
      edition: string;
      recordId: string;
      nextDueDate: string | null;
    }[] = [];
    const unresolved: { code: string; topic: string; reason: string }[] = [];

    for (const [code, topic] of Object.entries(CODE_TO_TOPIC)) {
      const record = latestByCode.get(code);
      if (!record) continue; // no sealed record for this system — skip

      const regRow = registry.get(topic);
      if (!regRow) {
        unresolved.push({ code, topic, reason: "topic_not_in_registry" });
        continue;
      }

      const freq = resolveFrequencyInterval(regRow);
      if (!freq.resolved) {
        unresolved.push({ code, topic, reason: freq.reason });
        continue;
      }

      const alignment = evaluateAlignment(record.next_due_date);

      evaluated.push({
        code,
        topic,
        alignment,
        intervalDays: freq.intervalDays,
        cite: freq.cite,
        edition: freq.edition,
        recordId: record.id,
        nextDueDate: record.next_due_date,
      });
    }

    // ── Write drift_catches (idempotent per record) ──────
    for (const ev of evaluated) {
      // Delete existing compliance-frequency rows for this specific record
      await supabase
        .from("drift_catches")
        .delete()
        .eq("location_id", location_id)
        .eq("pillar", "fire")
        .eq("dimension", "frequency")
        .eq("drift_type", "compliance")
        .eq("source_record_id", ev.recordId);

      // Insert fresh row
      const { error: insErr } = await supabase
        .from("drift_catches")
        .insert({
          org_id: orgId,
          location_id,
          pillar: "fire",
          drift_type: "compliance",
          dimension: "frequency",
          detected_at: new Date().toISOString(),
          source_table: "vendor_service_records",
          source_record_id: ev.recordId,
          requirement_source: "pl_standards_registry",
          requirement_version: ev.edition,
          expected_value: `${ev.intervalDays} days (${ev.cite})`,
          actual_value: `${ev.alignment} | next_due_date: ${ev.nextDueDate ?? "null"}`,
          severity: alignmentSeverity(ev.alignment),
          status: "open",
        });

      if (insErr) {
        return json({ error: "Failed to write drift_catches: " + insErr.message }, 500, headers);
      }
    }

    return json(
      {
        location_id,
        evaluated: evaluated.map((e) => ({
          code: e.code,
          topic: e.topic,
          alignment: e.alignment,
          interval_days: e.intervalDays,
          edition: e.edition,
          next_due_date: e.nextDueDate,
        })),
        unresolved,
      },
      200,
      headers,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500, headers);
  }
});
