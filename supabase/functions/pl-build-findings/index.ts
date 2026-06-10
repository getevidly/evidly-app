import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── JSON response helper ─────────────────────────────────
function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

// ── Text helpers ─────────────────────────────────────────

function norm(s: unknown): string {
  return (s == null ? "" : String(s)).trim().toLowerCase();
}

function mentions(text: unknown, ...terms: string[]): boolean {
  const n = norm(text);
  return terms.some((t) => n.includes(t.toLowerCase()));
}

function shortDesc(desc: unknown, words = 12): string {
  const s = String(desc ?? "").trim();
  const parts = s.split(/\s+/);
  return parts.length <= words ? s : parts.slice(0, words).join(" ") + "…";
}

/** Replace all {slot} tokens in a string. Missing slots become "". */
function fillSlots(text: string, slots: Record<string, string>): string {
  return text.replace(/\{([^}]+)\}/g, (_, key) => slots[key] ?? "");
}

/** Deep slot-fill a jsonb value (stringify → replace → parse). */
function fillSlotsJsonb(obj: unknown, slots: Record<string, string>): unknown {
  if (obj == null) return obj;
  const raw = JSON.stringify(obj);
  const filled = fillSlots(raw, slots);
  try {
    return JSON.parse(filled);
  } catch {
    return filled;
  }
}

// ── Types ────────────────────────────────────────────────

interface FindingTemplate {
  signal_id: string;
  finding_key: string;
  part: string;
  default_flag: string;
  trigger_condition: string;
  agent_title: string;
  agent_body: string;
  agent_refs: string;
  kitchen_title: string;
  kitchen_body: string;
  correlation: unknown;
  citation_verified: string | null;
  severity: string | null;
}

interface TriggeredFinding {
  template: FindingTemplate;
  slots: Record<string, string>;
  flag: string;
  sourceRefs: unknown[];
}

// ── Trigger evaluators ───────────────────────────────────

type Rec = Record<string, unknown>;

function asArr(v: unknown): Rec[] {
  return Array.isArray(v) ? v : [];
}

function evaluateTriggers(
  reconciled: Rec,
  templates: FindingTemplate[],
): TriggeredFinding[] {
  const results: TriggeredFinding[] = [];

  const safeguards = asArr(reconciled.protective_safeguards);
  const fireFindings = asArr(reconciled.fire_findings);
  const foodFindings = asArr(reconciled.food_findings);
  const policyWide = asArr(reconciled.policy_wide);
  const integrityObs = asArr(reconciled.integrity_observations);
  const decl = (reconciled.declarations ?? {}) as Rec;

  // Helper to get declaration field value (handles reconciled {value} wrapper)
  function declVal(field: string): unknown {
    const f = decl[field];
    if (f && typeof f === "object" && "value" in (f as Rec)) return (f as Rec).value;
    return f;
  }

  for (const tpl of templates) {
    const sid = tpl.signal_id;

    // ── UB-01-FR-01: PSE suspension on cooking equipment ──
    if (sid === "UB-01-FR-01") {
      const match = safeguards.find(
        (s) =>
          mentions(s.description, "suppression", "cooking", "hood", "duct") &&
          (s.suspension_wording_present === true || norm(s.suspension_wording_present) === "true"),
      );
      if (match) {
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: buildPseSlots(match, tpl),
          sourceRefs: [match],
        });
      }
      continue;
    }

    // ── UB-02-EDITION: NFPA edition mismatch ──────────────
    if (sid === "UB-02-EDITION") {
      const intMatch = integrityObs.find((o) => norm(o.type) === "nfpa_edition_mismatch");
      const fireMatch = fireFindings.find(
        (f) => /nfpa\s*96/i.test(norm(f.named_standard)) && !/2021/.test(norm(f.named_standard)),
      );
      if (intMatch || fireMatch) {
        const editionStr =
          (fireMatch ? String(fireMatch.named_standard ?? "") : "") ||
          (intMatch ? String(intMatch.detail ?? "") : "");
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: {
            ...buildPseSlots(null, tpl),
            policy_nfpa_edition: editionStr,
          },
          sourceRefs: [intMatch, fireMatch].filter(Boolean),
        });
      }
      continue;
    }

    // ── FR-04-FR-05: suppression system finding ───────────
    if (sid === "FR-04-FR-05") {
      const match = fireFindings.find(
        (f) =>
          norm(f.topic) === "suppression" &&
          (mentions(f.named_standard, "ul 300", "ul300", "nfpa 17a", "nfpa17a") ||
            mentions(f.requirement_text, "ul 300", "ul300", "nfpa 17a", "nfpa17a")),
      );
      if (match) {
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: buildPseSlots(null, tpl),
          sourceRefs: [match],
        });
      }
      continue;
    }

    // ── FR-18-SAT: sprinkler / P-1 safeguard ─────────────
    if (sid === "FR-18-SAT") {
      const sgMatch = safeguards.find((s) => norm(s.code).startsWith("p-1"));
      const fireMatch = fireFindings.find((f) => mentions(f.named_standard, "sprinkler") || mentions(f.requirement_text, "sprinkler"));
      const sgMatch2 = safeguards.find((s) => mentions(s.description, "sprinkler"));
      const match = sgMatch || fireMatch || sgMatch2;
      if (match) {
        const code = sgMatch ? String(sgMatch.code ?? "P-1") : "P-1";
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: {
            ...buildPseSlots(sgMatch || null, tpl),
            sprinkler_symbol: code,
          },
          sourceRefs: [match],
        });
      }
      continue;
    }

    // ── UB-04: communicable disease ───────────────────────
    if (sid === "UB-04") {
      const match = foodFindings.find((f) => norm(f.topic) === "communicable_disease");
      if (match) {
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: {
            ...buildPseSlots(null, tpl),
            cd_form: String(match.form_or_section_ref ?? ""),
          },
          sourceRefs: [match],
        });
      }
      continue;
    }

    // ── UB-03-FS-06: spoilage with sublimit ──────────────
    if (sid === "UB-03-FS-06") {
      const match = foodFindings.find(
        (f) => norm(f.topic) === "spoilage" && f.sublimit_amount,
      );
      if (match) {
        const hasNoTempLog = integrityObs.some((o) => norm(o.type) === "no_temperature_log_requirement");
        const totalLocs = Number(declVal("total_locations") ?? 1);
        results.push({
          template: tpl,
          flag: hasNoTempLog ? "elevated" : tpl.default_flag,
          slots: {
            ...buildPseSlots(null, tpl),
            spoilage_limit: String(match.sublimit_amount ?? ""),
            temp_log_note: hasNoTempLog
              ? "This specimen states no temperature-log requirement; without those records a carrier argues negligence."
              : "",
            spoilage_scope: totalLocs > 1 ? `, across ${totalLocs} locations combined` : "",
          },
          sourceRefs: [match],
        });
      }
      continue;
    }

    // ── PW-BI-CLOSURE: business income / closure ─────────
    if (sid === "PW-BI-CLOSURE") {
      const foodMatch = foodFindings.find(
        (f) => norm(f.topic) === "closure" || norm(f.topic) === "foodborne_illness",
      );
      const pwMatch = policyWide.find((p) => mentions(p.text, "civil authority"));
      if (foodMatch || pwMatch) {
        // Check if a food-contamination endorsement exists
        const hasContamEndorsement = foodFindings.some(
          (f) => mentions(f.requirement_or_exclusion_text, "contamination") && mentions(f.requirement_or_exclusion_text, "income"),
        );
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: {
            ...buildPseSlots(null, tpl),
            bi_endorsement_note: hasContamEndorsement
              ? ""
              : "No food-contamination income endorsement is attached.",
          },
          sourceRefs: [foodMatch, pwMatch].filter(Boolean),
        });
      }
      continue;
    }

    // ── PW-COINS: coinsurance ─────────────────────────────
    if (sid === "PW-COINS") {
      const match = policyWide.find((p) => norm(p.topic) === "coinsurance");
      if (match) {
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: {
            ...buildPseSlots(null, tpl),
            coins_pct: String(match.percentage_or_value ?? ""),
          },
          sourceRefs: [match],
        });
      }
      continue;
    }

    // ── PW-APPWARRANTY: application warranty ──────────────
    if (sid === "PW-APPWARRANTY") {
      const match = policyWide.find(
        (p) => norm(p.topic) === "application_warranty" && mentions(p.text, "violation"),
      );
      if (match) {
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: {
            ...buildPseSlots(null, tpl),
            app_para: String(match.section_ref ?? ""),
          },
          sourceRefs: [match],
        });
      }
      continue;
    }

    // ── FS-04: food handler / CalCode ─────────────────────
    if (sid === "FS-04") {
      const match = foodFindings.find(
        (f) =>
          mentions(f.requirement_or_exclusion_text, "food handler", "food protection manager", "calcode") ||
          mentions(f.topic, "food handler", "food protection manager", "calcode"),
      );
      if (match) {
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: buildPseSlots(null, tpl),
          sourceRefs: [match],
        });
      }
      continue;
    }
  }

  return results;
}

// ── PSE slot builder ─────────────────────────────────────

function buildPseSlots(safeguard: Rec | null, tpl: FindingTemplate): Record<string, string> {
  const slots: Record<string, string> = {
    citation_verified: tpl.citation_verified ?? "",
    pse_form: "",
    pse_symbol: "",
    pse_para: "",
    pse_desc_short: "",
    pse_desc_plain: "",
  };
  if (safeguard) {
    slots.pse_form = String(safeguard.form_reference ?? "");
    slots.pse_symbol = String(safeguard.code ?? "");
    slots.pse_para = String(safeguard.paragraph_ref ?? "");
    slots.pse_desc_short = shortDesc(safeguard.description);
    slots.pse_desc_plain = String(safeguard.description ?? "");
  }
  return slots;
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
    const { run_id } = await req.json();
    if (!run_id) {
      return json({ error: "run_id required" }, 400, headers);
    }

    // ── Load run ─────────────────────────────────────────
    const { data: run, error: runErr } = await supabase
      .from("pl_extraction_runs")
      .select("id, intake_id, reconciled, review_required, status")
      .eq("id", run_id)
      .single();

    if (runErr || !run) {
      return json({ error: "Run not found" }, 404, headers);
    }

    if (run.status !== "reconciled" || !run.reconciled) {
      return json({ error: "Run must be reconciled before building findings" }, 400, headers);
    }

    const reconciled = run.reconciled as Rec;

    // ── Load finding templates ───────────────────────────
    const { data: tplRows, error: tplErr } = await supabase
      .from("pl_finding_templates")
      .select("*");

    if (tplErr || !tplRows || tplRows.length === 0) {
      return json({ error: "No finding templates found" }, 500, headers);
    }

    const templates = tplRows as FindingTemplate[];

    // ── Delete existing findings for idempotent re-run ───
    await supabase.from("pl_findings").delete().eq("run_id", run_id);

    // ── Evaluate triggers ────────────────────────────────
    const triggered = evaluateTriggers(reconciled, templates);

    // ── Insert findings ──────────────────────────────────
    const byKey: Record<string, number> = {};
    const rows = triggered.map((t) => {
      byKey[t.template.finding_key] = (byKey[t.template.finding_key] ?? 0) + 1;

      const agentPayload = {
        title: fillSlots(t.template.agent_title, t.slots),
        body: fillSlots(t.template.agent_body, t.slots),
        refs: fillSlots(t.template.agent_refs, t.slots),
      };
      const kitchenPayload = {
        title: fillSlots(t.template.kitchen_title, t.slots),
        body: fillSlots(t.template.kitchen_body, t.slots),
      };
      const correlation = fillSlotsJsonb(t.template.correlation, t.slots);

      return {
        run_id,
        intake_id: run.intake_id,
        finding_key: t.template.finding_key,
        part: t.template.part,
        flag: t.flag,
        agent_payload: agentPayload,
        kitchen_payload: kitchenPayload,
        correlation,
        source_refs: t.sourceRefs,
        citation_status: t.template.citation_verified ? "verified" : "pending",
        review_required: run.review_required ?? false,
      };
    });

    if (rows.length > 0) {
      const { error: insertErr } = await supabase.from("pl_findings").insert(rows);
      if (insertErr) {
        return json({ error: "Failed to insert findings: " + insertErr.message }, 500, headers);
      }
    }

    return json(
      { run_id, findings_written: rows.length, by_key: byKey },
      200,
      headers,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500, headers);
  }
});
