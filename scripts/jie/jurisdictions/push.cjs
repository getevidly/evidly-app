/**
 * EvidLY JIE - Supabase REST API Updater (CommonJS)
 * PATCHes 51 CA jurisdiction records via PostgREST.
 */

const fs = require("fs");
const path = require("path");

const SUPABASE_URL = "https://irxgmhxhmxtzfwuieblc.supabase.co";
const SKEY = fs.readFileSync(path.join(__dirname, ".skey"), "utf8").trim();

const VALIDATED = path.join(__dirname, "results", "validated", "_validated_combined.json");
const EP = SUPABASE_URL + "/rest/v1/jurisdictions";

function mapGradingType(gs) {
  const m = { letter_grade: "letter_grade", numerical_score: "score_only", pass_fail: "pass_fail", hybrid: "letter_grade", other: "report_only", unknown: "report_only" };
  return m[gs.type || "unknown"] || "report_only";
}

function mapScoringType(gs) {
  const t = gs.type || "unknown";
  const d = (gs.description || "").toLowerCase();
  if (t === "pass_fail") return "pass_fail";
  if (t === "other" && d.includes("violation") && d.includes("count")) return "major_violation_count";
  return "weighted_deduction";
}

function buildGradingConfig(gs) {
  const c = { crawl_type: gs.type, description: gs.description };
  if (gs.letter_grades) c.letter_grades = gs.letter_grades;
  if (gs.grade_thresholds) c.grade_thresholds = gs.grade_thresholds;
  if (gs.score_range_min != null) c.score_range_min = gs.score_range_min;
  if (gs.score_range_max != null) c.score_range_max = gs.score_range_max;
  if (gs.passing_threshold != null) c.passing_threshold = gs.passing_threshold;
  return c;
}

function buildViolationWeightMap(gs) {
  const w = {};
  if (gs.grade_thresholds && typeof gs.grade_thresholds === "object") w.grade_thresholds = gs.grade_thresholds;
  if (gs.description) w.methodology_description = gs.description;
  return w;
}

function mapFireAhjType(fire) {
  const d = (fire.department_name || "").toLowerCase();
  if (d.includes("cal fire") || d.includes("state fire marshal")) return "cal_fire";
  if (d.includes("county fire") || d.includes("county")) return "county_fire";
  if (d.includes("city fire") || d.includes("city")) return "city_fire";
  if (d.includes("fire district") || d.includes("district")) return "fire_district";
  if (d.includes("federal") || d.includes("nps")) return "federal";
  return "county_fire";
}

function buildBody(rec) {
  const gs = rec.grading_system || {};
  const insp = rec.inspection_details || {};
  const fire = rec.fire_safety_authority || {};
  const reg = rec.regulatory_framework || {};
  const val = rec._validation || {};

  const np = [];
  const conf = val.computed_confidence || rec.confidence_level || "?";
  const cs = val.computed_confidence_score || "?";
  np.push("JIE crawl: confidence=" + conf + "(" + cs + ")");
  if (rec.needs_manual_verification) np.push("NEEDS MANUAL VERIFICATION");
  if (rec.verification_notes) np.push(rec.verification_notes);
  if (insp.frequency) np.push("Inspection freq: " + (insp.frequency || "").slice(0, 200));
  if (insp.reinspection_trigger) np.push("Reinspection: " + (insp.reinspection_trigger || "").slice(0, 200));

  const sources = rec.data_sources || [];
  const dsUrl = sources[0] || rec.department_url || "";
  let sm = gs.description || "";
  if (reg.food_code_basis) sm = reg.food_code_basis + ". " + sm;

  const now = new Date().toISOString();
  return {
    agency_name: rec.department_name,
    scoring_type: mapScoringType(gs),
    grading_type: mapGradingType(gs),
    grading_config: buildGradingConfig(gs),
    scoring_methodology: sm.slice(0, 500),
    violation_weight_map: buildViolationWeightMap(gs),
    fire_ahj_name: fire.department_name,
    fire_ahj_type: mapFireAhjType(fire),
    has_local_amendments: Boolean(fire.ansul_system_requirements),
    data_source_type: "jie_crawl",
    data_source_url: dsUrl ? dsUrl.slice(0, 500) : null,
    notes: np.join(" | ").slice(0, 1000),
    last_sync_at: now,
    updated_at: now,
  };
}

async function doPatch(county, state, body) {
  const u = EP + "?state=eq." + encodeURIComponent(state) + "&county=eq." + encodeURIComponent(county);
  try {
    const r = await fetch(u, {
      method: "PATCH",
      headers: { apikey: SKEY, Authorization: "Bearer " + SKEY, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(body),
    });
    if (r.ok) return { ok: true, status: r.status, msg: "OK" };
    const t = await r.text();
    return { ok: false, status: r.status, msg: t };
  } catch (e) {
    return { ok: false, status: 0, msg: e.message };
  }
}

async function main() {
  const records = JSON.parse(fs.readFileSync(VALIDATED, "utf8"));
  console.log("Loaded " + records.length + " records");
  console.log("Target: " + EP);
  console.log("======================================================================");

  let ok = 0, fail = 0;
  const fails = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const county = (rec.jurisdiction_name || "").replace(" County", "").trim();
    const state = rec.state || "CA";
    const body = buildBody(rec);
    const res = await doPatch(county, state, body);
    const idx = String(i + 1).padStart(2);
    if (res.ok) {
      ok++;
      console.log("  [" + idx + "/" + records.length + "] OK   " + county + " (" + state + ") -> HTTP " + res.status);
    } else {
      fail++;
      fails.push({ county, status: res.status, msg: res.msg });
      console.log("  [" + idx + "/" + records.length + "] FAIL " + county + " (" + state + ") -> HTTP " + res.status + ": " + res.msg.slice(0, 200));
    }
  }

  console.log("\n======================================================================");
  console.log("RESULTS: " + ok + " succeeded, " + fail + " failed out of " + records.length);
  if (fails.length) {
    console.log("\nFailed:");
    fails.forEach(f => console.log("  - " + f.county + ": HTTP " + f.status + " => " + f.msg.slice(0, 300)));
  }
}

main();
