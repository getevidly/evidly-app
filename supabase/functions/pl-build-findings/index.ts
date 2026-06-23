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

function truncate80(s: unknown): string {
  const t = String(s ?? "").trim();
  return t.length <= 80 ? t : t.slice(0, 77) + "…";
}

/** Replace all {slot} tokens in a string. Missing slots become "". */
function fillSlots(text: string, slots: Record<string, string>): string {
  return text.replace(/\{([^}]+)\}/g, (_, key) => slots[key] ?? "");
}

// ── Authoritative standards registry: types + lookup ─────────────────────
// The engine cites standards from pl_standards_registry (the authority), never from
// the uploaded policy document. resolveStandard returns the registry citation and
// requirement fields to fill slots.
// requirement is the three-tier grounding structure:
//   { national: {<dim>: {cite,value}}, state: {US-XX: {<dim>: {cite,value}}}, local: {...},
//     binds: {<dim>: {tier: "national"|"US-XX"|"equal"|"union"|"pending", across: [...]}} }
// A "dimension" is who / frequency / scope / records (and others per topic).
// resolveStandard collapses this into the flat {who,frequency,scope,proof} the slot
// fillers expect, choosing each dimension's value per its binds.tier. Legacy flat rows
// (top-level who/frequency/...) still resolve via the fallback path.
type ReqLeaf = { cite?: string; value?: string | null; _status?: string };
type ReqTier = Record<string, ReqLeaf | string | undefined> & { standard?: string; edition?: string };
type ReqBind = { tier?: string; across?: string[] };
interface ThreeTierRequirement {
  national?: ReqTier;
  state?: Record<string, ReqTier>;
  local?: Record<string, ReqTier>;
  binds?: Record<string, ReqBind>;
}
interface StandardRow {
  topic: string;
  standard: string;
  edition: string;
  citation: string;
  citation_detail: string | null;
  requirement:
    | ThreeTierRequirement
    | { who?: string; frequency?: string; scope?: string; proof?: string }
    | null;
  pending_fields: string[] | null;
}

const PENDING_TEXT = "pending verification";

/** Pull a dimension's value-string from one tier object (national / state["US-CA"] / ...). */
function tierDimValue(tier: ReqTier | undefined, dim: string): string | null {
  if (!tier) return null;
  const leaf = tier[dim] as ReqLeaf | string | undefined;
  if (leaf == null) return null;
  if (typeof leaf === "string") return leaf; // legacy flat string
  const v = leaf.value;
  return v == null ? null : String(v);
}

/** First non-null tier value, scanning local entries then state entries then national. */
function firstAvailable(req: ThreeTierRequirement, dim: string): string | null {
  for (const t of Object.values(req.local ?? {})) {
    const v = tierDimValue(t, dim);
    if (v != null && v !== "") return v;
  }
  for (const t of Object.values(req.state ?? {})) {
    const v = tierDimValue(t, dim);
    if (v != null && v !== "") return v;
  }
  return tierDimValue(req.national, dim);
}

/** Resolve one dimension to its bound display value, honoring binds.tier semantics. */
function resolveDim(req: ThreeTierRequirement, dim: string): string {
  const bind = req.binds?.[dim];
  const tier = bind?.tier;
  if (tier === "pending") return PENDING_TEXT;
  if (tier === "union") {
    const parts: string[] = [];
    const nat = tierDimValue(req.national, dim);
    if (nat) parts.push(nat);
    for (const t of Object.values(req.state ?? {})) {
      const v = tierDimValue(t, dim);
      if (v && !parts.includes(v)) parts.push(v);
    }
    for (const t of Object.values(req.local ?? {})) {
      const v = tierDimValue(t, dim);
      if (v && !parts.includes(v)) parts.push(v);
    }
    const joined = parts.join("; ");
    return joined || firstAvailable(req, dim) || "";
  }
  if (tier === "national") return tierDimValue(req.national, dim) ?? firstAvailable(req, dim) ?? "";
  if (tier && tier !== "equal") {
    // a specific state/local key, e.g. "US-CA"
    const fromState = tierDimValue(req.state?.[tier], dim);
    if (fromState != null && fromState !== "") return fromState;
    const fromLocal = tierDimValue(req.local?.[tier], dim);
    if (fromLocal != null && fromLocal !== "") return fromLocal;
    return firstAvailable(req, dim) ?? "";
  }
  // "equal", missing bind, or anything else → first available value
  return firstAvailable(req, dim) ?? "";
}

function isThreeTier(r: unknown): r is ThreeTierRequirement {
  return !!r && typeof r === "object" &&
    ("national" in (r as object) || "state" in (r as object) || "binds" in (r as object));
}

function resolveStandard(
  registry: Map<string, StandardRow>,
  topic: string,
): { citation: string; citation_detail: string; req: { who: string; frequency: string; scope: string; proof: string } } {
  const row = registry.get(topic);
  if (!row) return { citation: "", citation_detail: "", req: { who: "", frequency: "", scope: "", proof: "" } };
  const citation = row.citation ?? "";
  const citation_detail = row.citation_detail ?? "";
  const r = row.requirement;
  if (isThreeTier(r)) {
    // map legacy slot names → new dimension names (proof → records)
    return {
      citation,
      citation_detail,
      req: {
        who: resolveDim(r, "who"),
        frequency: resolveDim(r, "frequency"),
        scope: resolveDim(r, "scope"),
        proof: resolveDim(r, "records"),
      },
    };
  }
  // legacy flat requirement
  const flat = (r ?? {}) as { who?: string; frequency?: string; scope?: string; proof?: string };
  return {
    citation,
    citation_detail,
    req: {
      who: flat.who ?? "",
      frequency: flat.frequency ?? "",
      scope: flat.scope ?? "",
      proof: flat.proof ?? "",
    },
  };
}

/** Deep slot-fill a jsonb value (walk leaves, fill only strings). */
function fillSlotsJsonb(obj: unknown, slots: Record<string, string>): unknown {
  if (obj == null) return obj;
  if (typeof obj === "string") return fillSlots(obj, slots);
  if (Array.isArray(obj)) return obj.map((v) => fillSlotsJsonb(v, slots));
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = fillSlotsJsonb(v, slots);
    }
    return out;
  }
  return obj;
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
  consumedKeys: string[];
}

// ── Trigger evaluators ───────────────────────────────────

type Rec = Record<string, unknown>;

function asArr(v: unknown): Rec[] {
  return Array.isArray(v) ? v : [];
}

// ── Item key builders (for coverage tracking) ────────────

function sgItemKey(s: Rec): string { return `safeguard|${norm(s.code)}`; }
function fireItemKey(f: Rec): string { return `fire|${norm(f.topic)}|${norm(f.named_standard)}`; }
function foodItemKey(f: Rec): string { return `food|${norm(f.topic)}|${norm(f.form_or_section_ref)}`; }
function pwItemKey(p: Rec): string { return `pw|${norm(p.topic)}`; }
function intItemKey(o: Rec): string { return `integrity|${norm(o.type)}`; }

interface ExtractedItem { section: string; key: string; summary: string; }

function buildExtractedItems(reconciled: Rec): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  for (const s of asArr(reconciled.protective_safeguards)) {
    items.push({ section: "protective_safeguards", key: sgItemKey(s), summary: truncate80(s.description) });
  }
  for (const f of asArr(reconciled.fire_findings)) {
    items.push({ section: "fire_findings", key: fireItemKey(f), summary: truncate80(f.requirement_text || f.named_standard) });
  }
  for (const f of asArr(reconciled.food_findings)) {
    items.push({ section: "food_findings", key: foodItemKey(f), summary: truncate80(f.requirement_or_exclusion_text || f.topic) });
  }
  for (const p of asArr(reconciled.policy_wide)) {
    items.push({ section: "policy_wide", key: pwItemKey(p), summary: truncate80(p.text || p.topic) });
  }
  for (const o of asArr(reconciled.integrity_observations)) {
    items.push({ section: "integrity_observations", key: intItemKey(o), summary: truncate80(o.detail || o.type) });
  }
  return items;
}

function evaluateTriggers(
  reconciled: Rec,
  templates: FindingTemplate[],
  registry: Map<string, StandardRow>,
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
          consumedKeys: [sgItemKey(match)],
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
        const std = resolveStandard(registry, "suppression");
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: {
            ...buildPseSlots(null, tpl),
            std_citation: std.citation,
            std_who: std.req.who ?? "",
            std_frequency: std.req.frequency ?? "",
            std_scope: std.req.scope ?? "",
            std_proof: std.req.proof ?? "",
          },
          sourceRefs: [match],
          consumedKeys: [fireItemKey(match)],
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
        const keys: string[] = [];
        if (sgMatch) keys.push(sgItemKey(sgMatch));
        if (fireMatch) keys.push(fireItemKey(fireMatch));
        if (sgMatch2 && sgMatch2 !== sgMatch) keys.push(sgItemKey(sgMatch2));
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: {
            ...buildPseSlots(sgMatch || null, tpl),
            sprinkler_symbol: code,
          },
          sourceRefs: [match],
          consumedKeys: keys,
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
          consumedKeys: [foodItemKey(match)],
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
        const keys: string[] = [foodItemKey(match)];
        if (hasNoTempLog) keys.push("integrity|no_temperature_log_requirement");
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
          consumedKeys: keys,
        });
      }
      continue;
    }

    // ── FS-07: spoilage with sublimit (single-location) + temp-log fold-in ──
    if (sid === "FS-07") {
      const match = foodFindings.find(
        (f) => norm(f.topic) === "spoilage" && f.sublimit_amount,
      );
      if (match) {
        const hasNoTempLog = integrityObs.some(
          (o) => norm(o.type) === "no_temperature_log_requirement",
        );
        const keys: string[] = [foodItemKey(match)];
        if (hasNoTempLog) keys.push("integrity|no_temperature_log_requirement");
        results.push({
          template: tpl,
          flag: hasNoTempLog ? "elevated" : tpl.default_flag,
          slots: {
            ...buildPseSlots(null, tpl),
            spoilage_form: String(match.form_or_section_ref ?? ""),
            spoilage_limit: String(match.sublimit_amount ?? ""),
            cd_form: "CG 21 32",
          },
          sourceRefs: [match],
          consumedKeys: keys,
        });
      }
      continue;
    }

    // ── FS-08: health-permit / sanitation representation (warranty) ──
    if (sid === "FS-08") {
      const match = foodFindings.find(
        (f) =>
          norm(f.topic) === "other" &&
          (mentions(f.requirement_or_exclusion_text, "health permit") ||
            mentions(f.requirement_or_exclusion_text, "environmental-health") ||
            mentions(f.requirement_or_exclusion_text, "environmental health") ||
            mentions(f.form_or_section_ref, "sanitation")),
      );
      if (match) {
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: {
            ...buildPseSlots(null, tpl),
          },
          sourceRefs: [match],
          consumedKeys: [foodItemKey(match)],
        });
      }
      continue;
    }

    // ── FS-09: no first-party food-contamination / recall buy-back endorsement ──
    if (sid === "FS-09") {
      const hasContamGap = integrityObs.some(
        (o) => norm(o.type) === "no_food_contamination_coverage",
      );
      const hasBuyBack = foodFindings.some(
        (f) =>
          norm(f.topic) === "contamination_buyback" ||
          mentions(f.form_or_section_ref, "recall") ||
          mentions(f.requirement_or_exclusion_text, "recall expense"),
      );
      if (hasContamGap && !hasBuyBack) {
        const cdMatch = foodFindings.find(
          (f) => norm(f.topic) === "communicable_disease",
        );
        const spoilMatch = foodFindings.find((f) => norm(f.topic) === "spoilage");
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: {
            ...buildPseSlots(null, tpl),
            cd_form: String(cdMatch?.form_or_section_ref ?? "CG 21 32"),
            spoilage_form: String(spoilMatch?.form_or_section_ref ?? "BP 04 17"),
          },
          sourceRefs: [{ integrity: "no_food_contamination_coverage" }],
          consumedKeys: ["integrity|no_food_contamination_coverage"],
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
        const keys: string[] = [];
        if (foodMatch) keys.push(foodItemKey(foodMatch));
        if (pwMatch) keys.push(pwItemKey(pwMatch));
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
          consumedKeys: keys,
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
          consumedKeys: [pwItemKey(match)],
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
          consumedKeys: [pwItemKey(match)],
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
          consumedKeys: [foodItemKey(match)],
        });
      }
      continue;
    }

    // ── T1: UB-01-FR-02: safeguard presence not scheduled ──
    if (sid === "UB-01-FR-02") {
      const match = integrityObs.find((o) => norm(o.type) === "safeguard_presence_not_scheduled");
      if (match) {
        const unconfirmedSGs = safeguards.filter((s) => asArr(s.unconfirmed_locations).length > 0);
        const pseForm = unconfirmedSGs.length > 0 ? String(unconfirmedSGs[0].form_reference ?? "") : "";
        const pseCodes = unconfirmedSGs.map((s) => String(s.code ?? "")).filter(Boolean).join(", ");
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: {
            ...buildPseSlots(null, tpl),
            pse_form: pseForm,
            pse_codes: pseCodes,
          },
          sourceRefs: [match],
          consumedKeys: [intItemKey(match)],
        });
      }
      continue;
    }

    // ── T2: UB-03-FS-01: equipment breakdown ───────────────
    if (sid === "UB-03-FS-01") {
      const matches = foodFindings.filter((f) => norm(f.topic) === "equipment_breakdown");
      if (matches.length > 0) {
        const sublimit = matches.find((m) => m.sublimit_amount)?.sublimit_amount;
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: {
            ...buildPseSlots(null, tpl),
            eb_sublimit: sublimit ? String(sublimit) : "",
          },
          sourceRefs: [matches[0]],
          consumedKeys: matches.map(foodItemKey),
        });
      }
      continue;
    }

    // ── T3: UB-03-FS-02: shared spoilage sublimit ─────────
    if (sid === "UB-03-FS-02") {
      const intMatch = integrityObs.find((o) => norm(o.type) === "sublimit_no_scheduled_value");
      if (intMatch) {
        const pwMatch = policyWide.find(
          (p) => norm(p.topic) === "other" && mentions(p.text, "spoilage") && mentions(p.text, "shared"),
        );
        const dollarSource = String(pwMatch?.text ?? intMatch.detail ?? "");
        const dollarMatch = dollarSource.match(/\$[\d,]+/);
        const keys: string[] = [intItemKey(intMatch)];
        if (pwMatch) keys.push(pwItemKey(pwMatch));
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: {
            ...buildPseSlots(null, tpl),
            spoilage_amount: dollarMatch ? dollarMatch[0] : "",
            loc_count: String(declVal("total_locations") ?? ""),
          },
          sourceRefs: [intMatch, pwMatch].filter(Boolean),
          consumedKeys: keys,
        });
      }
      continue;
    }

    // ── T4: UB-04-FS-01: FC-VALUES endorsement gap ────────
    if (sid === "UB-04-FS-01") {
      const intMatch = integrityObs.find(
        (o) => norm(o.type) === "endorsement_named_not_attached" &&
          (mentions(o.detail, "fc-values") || mentions(o.detail, "contamination")),
      );
      if (intMatch) {
        const fcFoods = foodFindings.filter(
          (f) => (norm(f.topic) === "foodborne_illness" || norm(f.topic) === "other") &&
            mentions(f.requirement_or_exclusion_text, "fc-values"),
        );
        const fcAmount = fcFoods.find((f) => f.sublimit_amount)?.sublimit_amount;
        const keys: string[] = [intItemKey(intMatch)];
        for (const f of fcFoods) keys.push(foodItemKey(f));
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: {
            ...buildPseSlots(null, tpl),
            fc_amount: fcAmount ? String(fcAmount) : "",
            fc_schedule: "FC-VALUES",
          },
          sourceRefs: [intMatch, ...fcFoods],
          consumedKeys: keys,
        });
      }
      continue;
    }

    // ── T5: UB-04-FS-02: CalCode warranty ──────────────────
    if (sid === "UB-04-FS-02") {
      const matches = foodFindings.filter(
        (f) => (norm(f.topic) === "foodborne_illness" || norm(f.topic) === "other") &&
          mentions(f.requirement_or_exclusion_text, "california retail food code"),
      );
      if (matches.length > 0) {
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: buildPseSlots(null, tpl),
          sourceRefs: [matches[0]],
          consumedKeys: matches.map(foodItemKey),
        });
      }
      continue;
    }

    // ── T6: FR-06-FR-07: solid-fuel frequency headline ────
    if (sid === "FR-06-FR-07") {
      const locs = asArr(declVal("locations"));
      const solidFuelLocs = locs.filter((l) => l.solid_fuel === true || norm(l.solid_fuel) === "true");
      if (solidFuelLocs.length === 0) { continue; }

      const intMatch = integrityObs.find((o) => norm(o.type) === "nfpa_edition_mismatch");
      const fireMatch = fireFindings.find(
        (f) => norm(f.topic) === "hood_cleaning" && mentions(f.named_standard, "semi-annual"),
      );
      if (intMatch || fireMatch) {
        const locNos = solidFuelLocs.map((l) => String(l.loc_no ?? "")).filter(Boolean);
        const solidFuelLocsStr = locNos.length === 1
          ? `Location ${locNos[0]}`
          : locNos.length === 2
            ? `Locations ${locNos[0]} and ${locNos[1]}`
            : `Locations ${locNos.slice(0, -1).join(", ")} and ${locNos[locNos.length - 1]}`;
        const keys: string[] = [];
        if (intMatch) keys.push(intItemKey(intMatch));
        if (fireMatch) keys.push(fireItemKey(fireMatch));
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: {
            ...buildPseSlots(null, tpl),
            solid_fuel_locs: solidFuelLocsStr,
          },
          sourceRefs: [intMatch, fireMatch].filter(Boolean),
          consumedKeys: keys,
        });
      }
      continue;
    }

    // ── T7: FR-08: hood cleaning NFPA 96 Table 12.4 ───────
    if (sid === "FR-08") {
      const match = fireFindings.find(
        (f) => norm(f.topic) === "hood_cleaning" &&
          mentions(f.named_standard, "nfpa 96") && mentions(f.named_standard, "table 12.4"),
      );
      if (match) {
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: buildPseSlots(null, tpl),
          sourceRefs: [match],
          consumedKeys: [fireItemKey(match)],
        });
      }
      continue;
    }

    // ── FR-CLEAN-WARRANTY: hood-cleaning warranty + Certificate of Performance retention ──
    // Fires on ANY hood_cleaning topic regardless of cited edition. Distinct from the
    // edition-correction finding (UB-02-EDITION) and the solid-fuel frequency finding (FR-06-FR-07).
    if (sid === "FR-CLEAN-WARRANTY") {
      const match = fireFindings.find((f) => norm(f.topic) === "hood_cleaning");
      if (match) {
        const std = resolveStandard(registry, "hood_cleaning");
        const editionObs = integrityObs.find((o) => norm(o.type) === "nfpa_edition_mismatch");
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: {
            ...buildPseSlots(null, tpl),
            clean_form: String(match.form_or_section_ref ?? "the fire warranty"),
            std_citation: std.citation,
            std_who: std.req.who ?? "",
            std_frequency: std.req.frequency ?? "",
            std_scope: std.req.scope ?? "",
            std_proof: std.req.proof ?? "",
            std_citation_detail: std.citation_detail,
          },
          sourceRefs: [match],
          consumedKeys: editionObs
            ? [fireItemKey(match), intItemKey(editionObs)]
            : [fireItemKey(match)],
        });
      }
      continue;
    }

    // ── T8: FR-09: extinguisher NFPA 10 ────────────────────
    if (sid === "FR-09") {
      const match = fireFindings.find(
        (f) => norm(f.topic) === "extinguisher" && mentions(f.named_standard, "nfpa 10"),
      );
      if (match) {
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: buildPseSlots(null, tpl),
          sourceRefs: [match],
          consumedKeys: [fireItemKey(match)],
        });
      }
      continue;
    }

    // ── T9: FR-10: filter / suppression interlock ──────────
    if (sid === "FR-10") {
      const matches = fireFindings.filter(
        (f) => norm(f.topic) === "other" && mentions(f.requirement_text, "filter"),
      );
      if (matches.length > 0) {
        results.push({
          template: tpl,
          flag: tpl.default_flag,
          slots: buildPseSlots(null, tpl),
          sourceRefs: [matches[0]],
          consumedKeys: matches.map(fireItemKey),
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

  let runId: string | null = null;
  let intakeId: string | null = null;
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
    runId = run_id;

    // ── Load run ─────────────────────────────────────────
    const { data: run, error: runErr } = await supabase
      .from("pl_extraction_runs")
      .select("id, intake_id, document_id, reconciled, review_required, status, release_status")
      .eq("id", run_id)
      .single();

    if (runErr || !run) {
      return json({ error: "Run not found" }, 404, headers);
    }
    intakeId = run.intake_id;

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

    // ── Load authoritative standards registry ────────────
    const { data: regRows, error: regErr } = await supabase
      .from("pl_standards_registry")
      .select("topic, standard, edition, citation, citation_detail, requirement, pending_fields");
    if (regErr) {
      return json({ error: "Failed to load standards registry: " + regErr.message }, 500, headers);
    }
    const registry = new Map<string, StandardRow>(
      (regRows ?? []).map((r: StandardRow) => [String(r.topic), r]),
    );

    // ── Delete existing findings for idempotent re-run ───
    await supabase.from("pl_findings").delete().eq("run_id", run_id);

    // ── Evaluate triggers ────────────────────────────────
    const triggered = evaluateTriggers(reconciled, templates, registry);

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
        source_run_id: run.id,
        source_document_id: run.document_id,
        release_status_at_build: run.release_status,
      };
    });

    if (rows.length > 0) {
      const { error: insertErr } = await supabase.from("pl_findings").insert(rows);
      if (insertErr) {
        return json({ error: "Failed to insert findings: " + insertErr.message }, 500, headers);
      }
    }

    // ── Coverage pass ──────────────────────────────────────
    const extracted = buildExtractedItems(reconciled);
    const mappedKeys = new Set<string>();
    for (const t of triggered) {
      for (const k of t.consumedKeys) mappedKeys.add(k);
    }

    const unmapped = extracted.filter((e) => !mappedKeys.has(e.key));
    const extracted_count = extracted.length;
    const mapped_count = extracted_count - unmapped.length;
    const unmapped_count = unmapped.length;
    const coverage_ratio = extracted_count > 0
      ? Math.round((mapped_count / extracted_count) * 1000) / 1000
      : 0;
    const report_complete = unmapped_count === 0;

    const coverageObj = {
      extracted_count,
      mapped_count,
      unmapped_count,
      coverage_ratio,
      unmapped,
    };

    await supabase
      .from("pl_extraction_runs")
      .update({ coverage: coverageObj, report_complete })
      .eq("id", run_id);

    // ── Advance intake status to 'verified' ───────────────
    const { error: intakeVerifiedErr } = await supabase
      .from("policy_lens_intakes")
      .update({ status: "verified" })
      .eq("id", run.intake_id);
    if (intakeVerifiedErr) {
      console.error("[pl-build-findings] Failed to set intake status=verified:", intakeVerifiedErr.message);
    }

    return json(
      {
        run_id,
        findings_written: rows.length,
        by_key: byKey,
        coverage: { extracted_count, mapped_count, unmapped_count, coverage_ratio },
        report_complete,
      },
      200,
      headers,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    if (runId) {
      const { error: runFailErr } = await sb
        .from("pl_extraction_runs")
        .update({ status: "failed", error: `build_findings_failed: ${message}` })
        .eq("id", runId)
        .select("id")
        .single();
      if (runFailErr) console.error("[pl-build-findings] run status=failed write failed:", runFailErr.message);
    }
    if (intakeId) {
      const { error: intakeFailErr } = await sb
        .from("policy_lens_intakes")
        .update({ status: "failed" })
        .eq("id", intakeId)
        .select("id")
        .single();
      if (intakeFailErr) console.error("[pl-build-findings] intake status=failed write failed:", intakeFailErr.message);
    }
    return json({ error: message }, 500, headers);
  }
});
