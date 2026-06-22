import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── JSON response helper ─────────────────────────────────
function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

// ── Types ────────────────────────────────────────────────

interface PseCondition {
  id: string;
  symbol_code: string;
  pillar: string;
  requirement_version: string | null;
  policy_number: string | null;
}

interface SymbolRow {
  symbol_code: string;
  symbol_label: string;
  edition: string;
  is_schedule_defined: boolean;
  requirement: {
    evidence?: { satisfied_by_codes?: string[] };
  } | null;
}

interface VsrRecord {
  id: string;
  service_type_code: string;
  next_due_date: string | null;
  service_date: string | null;
  content_hash: string | null;
}

type LegStatus = "current" | "approaching" | "lapsed" | "missing" | "no_due_date";
type ConditionVerdict = "satisfied" | "unsatisfied" | "approaching_drift" | "not_monitored";

// ── Per-code leg evaluator ───────────────────────────────

function evaluateLeg(record: VsrRecord | null): LegStatus {
  if (!record) return "missing";
  if (record.next_due_date == null) return "no_due_date";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(record.next_due_date + "T00:00:00");
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / 86400000);

  if (diffDays < 0) return "lapsed";
  if (diffDays <= 30) return "approaching";
  return "current";
}

// ── Condition verdict from all legs ──────────────────────

function computeVerdict(legs: LegStatus[]): ConditionVerdict {
  if (legs.some((l) => l === "missing" || l === "lapsed")) return "unsatisfied";
  if (legs.some((l) => l === "approaching")) return "approaching_drift";
  if (legs.some((l) => l === "no_due_date")) return "not_monitored";
  return "satisfied";
}

function verdictSeverity(verdict: ConditionVerdict): string {
  if (verdict === "unsatisfied") return "high";
  if (verdict === "approaching_drift" || verdict === "not_monitored") return "medium";
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
          .from("user_profiles")
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

    // ── Step 1: Resolve location → org_id ────────────────
    const { data: loc, error: locErr } = await supabase
      .from("locations")
      .select("organization_id")
      .eq("id", location_id)
      .single();

    if (locErr || !loc) {
      return json({ error: "Location not found" }, 404, headers);
    }

    const orgId = loc.organization_id;

    // ── Step 2: Load active PSE conditions ───────────────
    const { data: conditions, error: condErr } = await supabase
      .from("pl_pse_conditions")
      .select("id, symbol_code, pillar, requirement_version, policy_number")
      .eq("location_id", location_id)
      .eq("condition_status", "active");

    if (condErr) {
      return json(
        { error: "Failed to load PSE conditions: " + condErr.message },
        500,
        headers,
      );
    }

    if (!conditions || conditions.length === 0) {
      return json(
        { location_id, evaluated: [], unresolved: [], note: "no active PSE conditions" },
        200,
        headers,
      );
    }

    // ── Steps 3–6: Evaluate each condition ───────────────
    const evaluated: {
      symbol_code: string;
      verdict: ConditionVerdict;
      severity: string;
      source_record_ids: string[];
    }[] = [];
    const unresolved: { symbol_code: string; reason: string }[] = [];

    for (const cond of conditions as PseCondition[]) {
      // Step 3: Load symbol from registry
      const { data: sym, error: symErr } = await supabase
        .from("pl_pse_symbol_registry")
        .select("symbol_code, symbol_label, edition, is_schedule_defined, requirement")
        .eq("symbol_code", cond.symbol_code)
        .single();

      if (symErr || !sym) {
        unresolved.push({ symbol_code: cond.symbol_code, reason: "symbol_not_in_registry" });
        continue;
      }

      const symbol = sym as SymbolRow;
      const codes: string[] = symbol.requirement?.evidence?.satisfied_by_codes ?? [];

      // is_schedule_defined with no selector → P-9 pending
      if (symbol.is_schedule_defined && codes.length === 0) {
        unresolved.push({
          symbol_code: cond.symbol_code,
          reason: "schedule_defined_selector_pending",
        });
        continue;
      }

      if (codes.length === 0) {
        unresolved.push({ symbol_code: cond.symbol_code, reason: "no_satisfied_by_codes" });
        continue;
      }

      // Step 4: Find satisfying evidence per code
      const legs: { code: string; status: LegStatus; record: VsrRecord | null }[] = [];

      for (const code of codes) {
        const { data: recs } = await supabase
          .from("vendor_service_records")
          .select("id, service_type_code, next_due_date, service_date, content_hash")
          .eq("location_id", location_id)
          .eq("service_type_code", code)
          .eq("lifecycle_state", "active")
          .eq("is_sample", false)
          .order("service_date", { ascending: false })
          .limit(1);

        const rec = recs && recs.length > 0 ? (recs[0] as VsrRecord) : null;
        legs.push({ code, status: evaluateLeg(rec), record: rec });
      }

      // Step 5: Compute condition verdict
      const verdict = computeVerdict(legs.map((l) => l.status));
      const severity = verdictSeverity(verdict);
      const sourceRecordIds = legs
        .filter((l) => l.record !== null)
        .map((l) => l.record!.id);

      // Build per-code summary for actual_value
      const legSummary = legs
        .map((l) => {
          if (!l.record) return `${l.code} missing`;
          return `${l.code} ${l.status} (due ${l.record.next_due_date ?? "none"})`;
        })
        .join("; ");

      // Build expected_value (facts-only: safeguard maintained per policy terms)
      const codesPart =
        codes.length > 1
          ? ` (satisfied by ${codes.join("+")})`
          : ` (satisfied by ${codes[0]})`;
      const expectedValue =
        `${symbol.symbol_code} ${symbol.symbol_label} maintained per CP 04 11 terms${codesPart}`;
      const actualValue = `${verdict} — ${legSummary}`;

      // Build requirement_version
      const reqVersion =
        symbol.edition +
        (cond.requirement_version ? ` / ${cond.requirement_version}` : "");

      // Step 6: Write drift_catches (idempotent delete + insert)
      await supabase
        .from("drift_catches")
        .delete()
        .eq("location_id", location_id)
        .eq("pillar", cond.pillar)
        .eq("dimension", "pse_condition")
        .eq("source_record_id", cond.id);

      const { error: insErr } = await supabase
        .from("drift_catches")
        .insert({
          org_id: orgId,
          location_id,
          pillar: cond.pillar,
          drift_type: "compliance",
          dimension: "pse_condition",
          detected_at: new Date().toISOString(),
          source_table: "pl_pse_conditions",
          source_record_id: cond.id,
          requirement_source: "policy",
          requirement_version: reqVersion,
          expected_value: expectedValue,
          actual_value: actualValue,
          severity,
          status: "open",
        });

      if (insErr) {
        return json(
          { error: "Failed to write drift_catches: " + insErr.message },
          500,
          headers,
        );
      }

      evaluated.push({
        symbol_code: cond.symbol_code,
        verdict,
        severity,
        source_record_ids: sourceRecordIds,
      });
    }

    // ── Step 7: Return ───────────────────────────────────
    return json({ location_id, evaluated, unresolved }, 200, headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500, headers);
  }
});
