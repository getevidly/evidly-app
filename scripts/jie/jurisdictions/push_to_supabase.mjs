/**
 * EvidLY Jurisdiction Intelligence Engine - Supabase REST API Updater
 * ===================================================================
 * Reads validated crawl JSON and PATCHes each jurisdiction record
 * via the Supabase PostgREST API.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Config ──────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://irxgmhxhmxtzfwuieblc.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyeGdtaHhobXh0emZ3dWllYmxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg0NjkxMiwiZXhwIjoyMDg0NDIyOTEyfQ.SGfXH8rWFfM0ExMtw_3MueLrNOn8eKA5bTaoVQ7-IdA";

const VALIDATED_JSON = join(
  __dirname,
  "results",
  "validated",
  "_validated_combined.json"
);
const REST_ENDPOINT = `${SUPABASE_URL}/rest/v1/jurisdictions`;

const HEADERS = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

// ── Mapping functions (mirroring load_jurisdictions.py) ─────────────────

function mapGradingType(gs) {
  const gtype = gs.type || "unknown";
  const mapping = {
    letter_grade: "letter_grade",
    numerical_score: "score_only",
    pass_fail: "pass_fail",
    hybrid: "letter_grade",
    other: "report_only",
    unknown: "report_only",
  };
  return mapping[gtype] || "report_only";
}

function mapScoringType(gs) {
  const gtype = gs.type || "unknown";
  const desc = (gs.description || "").toLowerCase();
  if (gtype === "letter_grade") return "weighted_deduction";
  if (gtype === "numerical_score") return "weighted_deduction";
  if (gtype === "pass_fail") return "pass_fail";
  if (gtype === "other") {
    if (desc.includes("good") && desc.includes("satisfactory"))
      return "weighted_deduction";
    if (desc.includes("violation") && desc.includes("count"))
      return "major_violation_count";
    return "weighted_deduction";
  }
  return "weighted_deduction";
}

function buildGradingConfig(gs) {
  const config = {
    crawl_type: gs.type,
    description: gs.description,
  };
  if (gs.letter_grades) config.letter_grades = gs.letter_grades;
  if (gs.grade_thresholds) config.grade_thresholds = gs.grade_thresholds;
  if (gs.score_range_min != null) config.score_range_min = gs.score_range_min;
  if (gs.score_range_max != null) config.score_range_max = gs.score_range_max;
  if (gs.passing_threshold != null)
    config.passing_threshold = gs.passing_threshold;
  return config;
}

function buildViolationWeightMap(gs) {
  const weights = {};
  if (gs.grade_thresholds && typeof gs.grade_thresholds === "object") {
    weights.grade_thresholds = gs.grade_thresholds;
  }
  if (gs.description) {
    weights.methodology_description = gs.description;
  }
  return Object.keys(weights).length > 0 ? weights : {};
}

function mapFireAhjType(fire) {
  const dept = (fire.department_name || "").toLowerCase();
  if (dept.includes("cal fire") || dept.includes("state fire marshal"))
    return "cal_fire";
  if (dept.includes("county fire") || dept.includes("county"))
    return "county_fire";
  if (dept.includes("city fire") || dept.includes("city")) return "city_fire";
  if (dept.includes("fire district") || dept.includes("district"))
    return "fire_district";
  if (dept.includes("federal") || dept.includes("nps")) return "federal";
  if (dept.includes("fire protection")) return "county_fire";
  return "county_fire";
}

// ── Build PATCH body ────────────────────────────────────────────────────

function buildPatchBody(record) {
  const gs = record.grading_system || {};
  const insp = record.inspection_details || {};
  const fire = record.fire_safety_authority || {};
  const reg = record.regulatory_framework || {};
  const validation = record._validation || {};

  // Build notes
  const notesParts = [];
  const confidence =
    validation.computed_confidence || record.confidence_level || "?";
  const confScore = validation.computed_confidence_score || "?";
  notesParts.push(`JIE crawl: confidence=${confidence}(${confScore})`);

  if (record.needs_manual_verification) {
    notesParts.push("NEEDS MANUAL VERIFICATION");
  }

  if (record.verification_notes) {
    notesParts.push(record.verification_notes);
  }

  const freq = insp.frequency || "";
  if (freq) notesParts.push(`Inspection freq: ${freq.slice(0, 200)}`);

  const reinsp = insp.reinspection_trigger || "";
  if (reinsp) notesParts.push(`Reinspection: ${reinsp.slice(0, 200)}`);

  const notes = notesParts.join(" | ");

  // Data sources
  const sources = record.data_sources || [];
  const dataSourceUrl = sources[0] || record.department_url || "";

  // Scoring methodology
  let scoringMethodology = gs.description || "";
  if (reg.food_code_basis) {
    scoringMethodology = `${reg.food_code_basis}. ${scoringMethodology}`;
  }

  // Has local amendments
  const hasAmendments = Boolean(fire.ansul_system_requirements);

  const nowIso = new Date().toISOString();

  return {
    agency_name: record.department_name,
    scoring_type: mapScoringType(gs),
    grading_type: mapGradingType(gs),
    grading_config: buildGradingConfig(gs),
    scoring_methodology: scoringMethodology.slice(0, 500),
    violation_weight_map: buildViolationWeightMap(gs),
    fire_ahj_name: fire.department_name,
    fire_ahj_type: mapFireAhjType(fire),
    has_local_amendments: hasAmendments,
    data_source_type: "jie_crawl",
    data_source_url: dataSourceUrl ? dataSourceUrl.slice(0, 500) : null,
    notes: notes.slice(0, 1000),
    last_sync_at: nowIso,
    updated_at: nowIso,
  };
}

// ── Execute PATCH ───────────────────────────────────────────────────────

async function patchJurisdiction(county, state, body) {
  const params = new URLSearchParams({
    state: `eq.${state}`,
    county: `eq.${county}`,
  });
  const url = `${REST_ENDPOINT}?${params}`;

  try {
    const resp = await fetch(url, {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify(body),
    });

    if (resp.ok) {
      return { ok: true, status: resp.status, msg: "OK" };
    } else {
      const errText = await resp.text();
      return { ok: false, status: resp.status, msg: errText };
    }
  } catch (err) {
    return { ok: false, status: 0, msg: err.message };
  }
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  let records;
  try {
    const raw = readFileSync(VALIDATED_JSON, "utf-8");
    records = JSON.parse(raw);
  } catch (err) {
    console.error(`ERROR: Cannot read ${VALIDATED_JSON}: ${err.message}`);
    process.exit(1);
  }

  console.log(`Loaded ${records.length} records from validated JSON`);
  console.log(`Target: ${REST_ENDPOINT}`);
  console.log("=".repeat(70));

  let succeeded = 0;
  let failed = 0;
  const failures = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const jname = record.jurisdiction_name || "?";
    const county = jname.replace(" County", "").trim();
    const state = record.state || "CA";

    const body = buildPatchBody(record);
    const result = await patchJurisdiction(county, state, body);

    const idx = String(i + 1).padStart(2, " ");
    if (result.ok) {
      succeeded++;
      console.log(
        `  [${idx}/${records.length}] OK   ${county} County (${state}) -> HTTP ${result.status}`
      );
    } else {
      failed++;
      failures.push({ county, status: result.status, msg: result.msg });
      console.log(
        `  [${idx}/${records.length}] FAIL ${county} County (${state}) -> HTTP ${result.status}: ${result.msg.slice(0, 200)}`
      );
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log(
    `RESULTS: ${succeeded} succeeded, ${failed} failed out of ${records.length} total`
  );

  if (failures.length > 0) {
    console.log("\nFailed counties:");
    for (const f of failures) {
      console.log(`  - ${f.county}: HTTP ${f.status} => ${f.msg.slice(0, 300)}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
