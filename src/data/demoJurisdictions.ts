// ═══════════════════════════════════════════════════════════
// src/data/demoJurisdictions.ts
// DEMO MODE ONLY — Static jurisdiction data for sales demos
// NEVER import this in live mode code paths
// ═══════════════════════════════════════════════════════════

export type ScoringType = 'weighted_deduction' | 'heavy_weighted' | 'major_violation_count' | 'negative_scale' | 'major_minor_reinspect' | 'violation_point_accumulation' | 'report_only';
export type GradingType = 'letter_grade' | 'letter_grade_strict' | 'color_placard' | 'score_100' | 'score_negative' | 'pass_reinspect' | 'three_tier_rating' | 'report_only';

export interface DemoJurisdiction {
  id: string;
  county: string;
  city?: string;
  agencyName: string;
  scoringType: ScoringType;
  gradingType: GradingType;
  gradingConfig: Record<string, any>;
  passThreshold: number | null;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  fireAhjName: string;
  hoodCleaningDefault: string;
  facilityCount: number;
  dataSourceTier: number;
  // Demo display helpers
  gradeLabel: string;        // What to show: "A", "🟢", "92", "N/A"
  gradeExplanation: string;  // "Letter Grade (A/B/C)", "Color Placard", etc.
  passFailLabel: string;     // "PASS", "FAIL", "No Grade"
  demoScore: number;         // Pre-set score for demo (used for The Riverside Moment)
  demoGrade: string;         // Pre-set grade display
  demoPassFail: 'pass' | 'fail' | 'warning' | 'no_grade';
}

// ═══════════════════════════════════════════════════════════
// THE 7 DEMO JURISDICTIONS
// These power the jurisdiction switcher in sales demos.
// Each demonstrates a different scoring/grading model.
// ═══════════════════════════════════════════════════════════

export const DEMO_JURISDICTIONS: DemoJurisdiction[] = [
  {
    id: 'demo-fresno',
    county: 'Fresno',
    agencyName: 'Fresno County Department of Public Health',
    scoringType: 'major_minor_reinspect',
    gradingType: 'pass_reinspect',
    gradingConfig: {},
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'Fresno Fire Department',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 4500,
    dataSourceTier: 3,
    gradeLabel: 'Pass',
    gradeExplanation: 'Pass / Reinspection Required — CalCode ORFIR standard. No numeric grade.',
    passFailLabel: 'PASS',
    demoScore: 88,
    demoGrade: 'Pass',
    demoPassFail: 'pass',
  },
  {
    id: 'demo-sacramento',
    county: 'Sacramento',
    agencyName: 'Sacramento County EMD',
    scoringType: 'major_violation_count',
    gradingType: 'color_placard',
    gradingConfig: { green: { max_majors: 1 }, yellow: { max_majors: 3 }, red: { min_majors: 4 } },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'Sacramento Fire Department',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 8500,
    dataSourceTier: 2,
    gradeLabel: '\u{1F7E2}',
    gradeExplanation: 'Color Placard — Green/Yellow/Red based on major violations',
    passFailLabel: 'PASS',
    demoScore: 88,
    demoGrade: '\u{1F7E2} Green',
    demoPassFail: 'pass',
  },
  {
    id: 'demo-la',
    county: 'Los Angeles',
    agencyName: 'Los Angeles County DPH',
    scoringType: 'weighted_deduction',
    gradingType: 'letter_grade',
    gradingConfig: { A: [90, 100], B: [80, 89], C: [70, 79], fail_below: 70 },
    passThreshold: 90,
    warningThreshold: 79,
    criticalThreshold: 69,
    fireAhjName: 'LACoFD / LAFD',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 88000,
    dataSourceTier: 1,
    gradeLabel: 'B',
    gradeExplanation: 'Letter Grade — A (90+), B (80-89), C (70-79)',
    passFailLabel: 'PASS',
    demoScore: 88,
    demoGrade: 'B',
    demoPassFail: 'pass',
  },
  {
    // ═══ THE RIVERSIDE MOMENT ═══
    // Same score (88) = FAIL here. This closes deals.
    id: 'demo-riverside',
    county: 'Riverside',
    agencyName: 'Riverside County DEH',
    scoringType: 'weighted_deduction',
    gradingType: 'letter_grade_strict',
    gradingConfig: { A: [90, 100], B: [80, 89], C: [70, 79], pass_requires: 'A' },
    passThreshold: 90,
    warningThreshold: 89,
    criticalThreshold: 79,
    fireAhjName: 'Riverside FD / CAL FIRE RRU',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 12000,
    dataSourceTier: 3,
    gradeLabel: 'B',
    gradeExplanation: 'Letter Grade STRICT — Only A (90+) passes. B = FAIL.',
    passFailLabel: 'FAIL',
    demoScore: 88,
    demoGrade: 'B \u2014 FAIL',
    demoPassFail: 'fail',
  },
  {
    id: 'demo-santa-clara',
    county: 'Santa Clara',
    agencyName: 'Santa Clara County DEH',
    scoringType: 'heavy_weighted',
    gradingType: 'color_placard',
    gradingConfig: { green: { max_majors: 0 }, yellow: { max_majors: 2 }, red: { min_majors: 3 } },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'Santa Clara County Fire / San Jose FD',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 10000,
    dataSourceTier: 3,
    gradeLabel: '\u{1F7E1}',
    gradeExplanation: 'Color Placard — 8-point major violations. Stricter than standard.',
    passFailLabel: 'CONDITIONAL',
    demoScore: 88,
    demoGrade: '\u{1F7E1} Yellow',
    demoPassFail: 'warning',
  },
  {
    id: 'demo-slo',
    county: 'San Luis Obispo',
    agencyName: 'SLO County Health Department',
    scoringType: 'negative_scale',
    gradingType: 'score_negative',
    gradingConfig: { perfect: 0, warning: -10, critical: -25 },
    passThreshold: null,
    warningThreshold: -10,
    criticalThreshold: -25,
    fireAhjName: 'CAL FIRE SLU / SLO City FD',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 1800,
    dataSourceTier: 2,
    gradeLabel: '-12',
    gradeExplanation: 'Negative Score — 0 is perfect. More negative = worse.',
    passFailLabel: 'WARNING',
    demoScore: 88,  // EvidLY normalized
    demoGrade: '-12',
    demoPassFail: 'warning',
  },
  {
    id: 'demo-yosemite',
    county: 'Mariposa',
    agencyName: 'Mariposa County + NPS (Yosemite)',
    scoringType: 'major_minor_reinspect',
    gradingType: 'pass_reinspect',
    gradingConfig: {},
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'CAL FIRE MMU + NPS Fire (Yosemite)',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 150,
    dataSourceTier: 4,
    gradeLabel: 'Pass',
    gradeExplanation: 'Multi-Jurisdiction — County health + NPS federal overlay + CAL FIRE. Pass/Reinspect standard.',
    passFailLabel: 'PASS',
    demoScore: 88,
    demoGrade: 'Pass (Dual Jurisdiction)',
    demoPassFail: 'pass',
  },
];

// ═══════════════════════════════════════════════════════════
// THE 88% TEST — The Riverside Moment
// Same kitchen. Same score. Different outcome.
// This is the single most powerful demo moment in the product.
// ═══════════════════════════════════════════════════════════

export const THE_88_TEST = {
  score: 88,
  results: DEMO_JURISDICTIONS.map(j => ({
    jurisdiction: j.county,
    grade: j.demoGrade,
    passFail: j.demoPassFail,
    explanation: j.gradeExplanation,
  })),
  headline: 'Same Kitchen. Same Score. Different Outcome.',
  subheadline: 'An 88 means something completely different depending on who inspects you.',
  callToAction: 'EvidLY knows your inspector\u2019s exact methodology. Do you?',
};

// ═══════════════════════════════════════════════════════════
// DEMO LOCATION DATA
// 3 demo locations, each in a different jurisdiction
// Used by the Executive dashboard multi-jurisdiction view
// ═══════════════════════════════════════════════════════════

export const DEMO_LOCATIONS = [
  {
    id: 'demo-loc-downtown',
    name: 'Downtown Kitchen',
    jurisdiction: DEMO_JURISDICTIONS.find(j => j.id === 'demo-fresno')!,
    score: 92,
    foodSafety: { ops: 97, docs: 94 },
    fireSafety: { ops: 88, docs: 95 },
    gradeDisplay: 'Pass',
    tagline: 'EvidLY IS your grading system',
  },
  {
    id: 'demo-loc-airport',
    name: 'Airport Cafe',
    jurisdiction: DEMO_JURISDICTIONS.find(j => j.id === 'demo-sacramento')!,
    score: 85,
    foodSafety: { ops: 88, docs: 80 },
    fireSafety: { ops: 75, docs: 82 },
    gradeDisplay: '\u{1F7E2} Green \u2014 PASS',
    tagline: 'Placard posted at entrance',
  },
  {
    id: 'demo-loc-university',
    name: 'University Dining',
    jurisdiction: DEMO_JURISDICTIONS.find(j => j.id === 'demo-riverside')!,
    score: 88,
    foodSafety: { ops: 91, docs: 86 },
    fireSafety: { ops: 84, docs: 88 },
    gradeDisplay: 'B \u2014 FAIL',
    tagline: 'Same score, different outcome',
  },
];

// ═══════════════════════════════════════════════════════════
// SCORING HELPER — Demo mode score calculator
// Mirrors the live scoring engine but runs 100% locally
// ═══════════════════════════════════════════════════════════

export function calculateDemoGrade(score: number, jurisdiction: DemoJurisdiction): {
  grade: string;
  passFail: 'pass' | 'fail' | 'warning' | 'no_grade';
  display: string;
  majorViolations?: number;
  minorViolations?: number;
  uncorrectedMajors?: number;
  totalPoints?: number;
} {
  switch (jurisdiction.gradingType) {
    case 'letter_grade': {
      const config = jurisdiction.gradingConfig || {};
      const grades = config.grades || { A: [90, 100], B: [80, 89], C: [70, 79] };
      const failBelow = config.fail_below || 70;
      let letter = 'F';
      if (grades.A && score >= grades.A[0]) letter = 'A';
      else if (grades.B && score >= grades.B[0]) letter = 'B';
      else if (grades.C && score >= grades.C[0]) letter = 'C';
      return { grade: letter, passFail: score >= failBelow ? 'pass' : 'fail', display: `${letter} \u2014 ${score}` };
    }
    case 'letter_grade_strict': {
      const letter = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'F';
      const config = jurisdiction.gradingConfig || {};
      const passRequires = config.pass_requires || 'A';
      const passing = (passRequires === 'A' && score >= 90) ||
                      (passRequires === 'B' && score >= 80) ||
                      (passRequires === 'C' && score >= 70);
      return { grade: letter, passFail: passing ? 'pass' : 'fail', display: passing ? `${letter} \u2014 PASS` : `${letter} \u2014 FAIL` };
    }
    case 'color_placard': {
      // Simplified — in real engine this uses major violation count
      if (score >= 90) return { grade: 'Green', passFail: 'pass', display: 'Green' };
      if (score >= 75) return { grade: 'Yellow', passFail: 'warning', display: 'Yellow' };
      return { grade: 'Red', passFail: 'fail', display: 'Red' };
    }
    case 'score_100': {
      const t = jurisdiction.passThreshold || 70;
      return { grade: String(score), passFail: score >= t ? 'pass' : 'fail', display: String(score) };
    }
    case 'score_negative': {
      const neg = score - 100; // Convert normalized back to negative
      const config = jurisdiction.gradingConfig || {};
      const warning = config.warning || -10;
      const critical = config.critical || -25;
      let pf: 'pass' | 'fail' | 'warning' = 'pass';
      if (neg <= critical) pf = 'fail';
      else if (neg <= warning) pf = 'warning';
      return { grade: String(neg), passFail: pf, display: String(neg) };
    }
    case 'pass_reinspect': {
      // CalCode ORFIR Standard — Pass / Reinspection Required / Closed
      // In demo mode, simulate: score >= 80 means no uncorrected majors (pass)
      // score 60-79 means uncorrected majors exist (reinspect)
      // score < 60 means imminent hazard (closed)
      const demoMajors = Math.max(0, Math.floor((100 - score) / 4));
      const demoMinors = Math.max(0, Math.floor((100 - score) / 6));
      const uncorrected = score >= 80 ? 0 : Math.max(1, Math.floor((80 - score) / 8));
      if (score < 60) {
        return {
          grade: 'CLOSED',
          passFail: 'fail',
          display: 'Closed \u2014 Imminent Health Hazard',
          majorViolations: demoMajors, minorViolations: demoMinors,
          uncorrectedMajors: uncorrected, totalPoints: 0,
        };
      }
      if (uncorrected > 0) {
        return {
          grade: 'Reinspection Required',
          passFail: 'fail',
          display: `Reinspection Required \u2014 ${uncorrected} Major Violation${uncorrected > 1 ? 's' : ''}`,
          majorViolations: demoMajors, minorViolations: demoMinors,
          uncorrectedMajors: uncorrected, totalPoints: 0,
        };
      }
      const minorNote = demoMajors > 0 ? ` (${demoMajors} major corrected on-site)` : '';
      return {
        grade: 'Pass',
        passFail: 'pass',
        display: `Pass${minorNote}`,
        majorViolations: demoMajors, minorViolations: demoMinors,
        uncorrectedMajors: 0, totalPoints: 0,
      };
    }
    case 'three_tier_rating': {
      // Merced County Model — points accumulate
      // Demo: estimate points from normalized score
      const totalPoints = Math.max(0, 100 - score);
      const config = jurisdiction.gradingConfig || {};
      const tiers = config.tiers || { Good: [0, 6], Satisfactory: [7, 13], Unsatisfactory: [14, null] };
      if (totalPoints >= (tiers.Unsatisfactory?.[0] || 14)) {
        return {
          grade: 'Unsatisfactory',
          passFail: 'fail',
          display: `Unsatisfactory \u2014 ${totalPoints} points`,
          totalPoints, majorViolations: 0, minorViolations: 0, uncorrectedMajors: 0,
        };
      }
      if (totalPoints >= (tiers.Satisfactory?.[0] || 7)) {
        return {
          grade: 'Satisfactory',
          passFail: 'pass',
          display: `Satisfactory \u2014 ${totalPoints} points`,
          totalPoints, majorViolations: 0, minorViolations: 0, uncorrectedMajors: 0,
        };
      }
      return {
        grade: 'Good',
        passFail: 'pass',
        display: `Good \u2014 ${totalPoints} points`,
        totalPoints, majorViolations: 0, minorViolations: 0, uncorrectedMajors: 0,
      };
    }
    case 'report_only':
    default:
      // DEPRECATED — treat same as pass_reinspect for backward compatibility
      if (score >= 80) {
        return { grade: 'Pass', passFail: 'pass', display: 'Pass', uncorrectedMajors: 0 };
      }
      return {
        grade: 'Reinspection Required',
        passFail: 'fail',
        display: `Reinspection Required`,
        uncorrectedMajors: Math.max(1, Math.floor((80 - score) / 8)),
      };
  }
}

// ═══════════════════════════════════════════════════════════
// PERSONALIZED DEMO GENERATOR
// For live demos: replace company/contact/locations with
// the prospect's real info. Still 100% local — no DB.
// ═══════════════════════════════════════════════════════════

export interface DemoConfig {
  companyName: string;
  contactName: string;
  locations: Array<{
    name: string;
    jurisdictionId: string;  // One of the DEMO_JURISDICTIONS ids
    score?: number;          // Optional override, otherwise uses jurisdiction default
  }>;
}

export function generatePersonalizedDemo(config: DemoConfig) {
  return {
    company: config.companyName,
    contact: config.contactName,
    locations: config.locations.map(loc => {
      const jurisdiction = DEMO_JURISDICTIONS.find(j => j.id === loc.jurisdictionId)
        || DEMO_JURISDICTIONS[0];
      const score = loc.score || jurisdiction.demoScore;
      const gradeResult = calculateDemoGrade(score, jurisdiction);
      return {
        name: loc.name,
        jurisdiction: jurisdiction.county,
        score,
        ...gradeResult,
        fireAhj: jurisdiction.fireAhjName,
        hoodCleaning: jurisdiction.hoodCleaningDefault,
      };
    }),
  };
}

// ═══════════════════════════════════════════════════════════
// ALL 62 JURISDICTIONS — Static reference (read-only)
// For the full jurisdiction picker in demo admin tools
// ═══════════════════════════════════════════════════════════

export const ALL_CA_JURISDICTIONS: Array<{
  county: string;
  city?: string;
  agencyName: string;
  scoringType: ScoringType;
  gradingType: GradingType;
  facilityCount: number;
  tier: number;
}> = [
  { county: 'Los Angeles', agencyName: 'LA County DPH', scoringType: 'weighted_deduction', gradingType: 'letter_grade', facilityCount: 88000, tier: 1 },
  { county: 'San Francisco', agencyName: 'SF DPH', scoringType: 'weighted_deduction', gradingType: 'score_100', facilityCount: 7500, tier: 1 },
  { county: 'Sonoma', agencyName: 'Sonoma County DHS', scoringType: 'weighted_deduction', gradingType: 'score_100', facilityCount: 3200, tier: 1 },
  { county: 'Sacramento', agencyName: 'Sacramento County EMD', scoringType: 'major_violation_count', gradingType: 'color_placard', facilityCount: 8500, tier: 2 },
  { county: 'Orange', agencyName: 'OC Health Care Agency', scoringType: 'weighted_deduction', gradingType: 'letter_grade', facilityCount: 18000, tier: 2 },
  { county: 'Yolo', agencyName: 'Yolo County Health', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 1200, tier: 2 },
  { county: 'San Luis Obispo', agencyName: 'SLO County Health', scoringType: 'negative_scale', gradingType: 'score_negative', facilityCount: 1800, tier: 2 },
  { county: 'San Diego', agencyName: 'SD County DEH', scoringType: 'weighted_deduction', gradingType: 'letter_grade', facilityCount: 14000, tier: 3 },
  { county: 'Riverside', agencyName: 'Riverside County DEH', scoringType: 'weighted_deduction', gradingType: 'letter_grade_strict', facilityCount: 12000, tier: 3 },
  { county: 'San Bernardino', agencyName: 'SB County DPH', scoringType: 'weighted_deduction', gradingType: 'letter_grade', facilityCount: 9000, tier: 3 },
  { county: 'Alameda', agencyName: 'Alameda County DEH', scoringType: 'weighted_deduction', gradingType: 'score_100', facilityCount: 8500, tier: 3 },
  { county: 'Santa Clara', agencyName: 'Santa Clara County DEH', scoringType: 'heavy_weighted', gradingType: 'color_placard', facilityCount: 10000, tier: 3 },
  { county: 'Contra Costa', agencyName: 'Contra Costa Health', scoringType: 'major_violation_count', gradingType: 'color_placard', facilityCount: 5500, tier: 3 },
  { county: 'Fresno', agencyName: 'Fresno County DPH', scoringType: 'major_minor_reinspect', gradingType: 'pass_reinspect', facilityCount: 4500, tier: 3 },
  { county: 'Kern', agencyName: 'Kern County PHS', scoringType: 'weighted_deduction', gradingType: 'letter_grade', facilityCount: 4000, tier: 3 },
  { county: 'Ventura', agencyName: 'Ventura County EHD', scoringType: 'weighted_deduction', gradingType: 'score_100', facilityCount: 4500, tier: 3 },
  { county: 'San Mateo', agencyName: 'San Mateo County Health', scoringType: 'weighted_deduction', gradingType: 'score_100', facilityCount: 3800, tier: 3 },
  { county: 'San Joaquin', agencyName: 'San Joaquin County PHS', scoringType: 'major_minor_reinspect', gradingType: 'pass_reinspect', facilityCount: 3500, tier: 3 },
  { county: 'Santa Barbara', agencyName: 'SB County PHD', scoringType: 'weighted_deduction', gradingType: 'score_100', facilityCount: 2800, tier: 3 },
  { county: 'Stanislaus', agencyName: 'Stanislaus County HSA', scoringType: 'major_minor_reinspect', gradingType: 'pass_reinspect', facilityCount: 2500, tier: 3 },
  { county: 'Monterey', agencyName: 'Monterey County Health', scoringType: 'weighted_deduction', gradingType: 'score_100', facilityCount: 2500, tier: 3 },
  { county: 'Tulare', agencyName: 'Tulare County HHSA', scoringType: 'major_minor_reinspect', gradingType: 'pass_reinspect', facilityCount: 2000, tier: 3 },
  { county: 'Placer', agencyName: 'Placer County Health', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 2200, tier: 3 },
  { county: 'Solano', agencyName: 'Solano County DRM', scoringType: 'major_violation_count', gradingType: 'color_placard', facilityCount: 2200, tier: 3 },
  { county: 'Marin', agencyName: 'Marin County CDA', scoringType: 'weighted_deduction', gradingType: 'score_100', facilityCount: 1800, tier: 3 },
  { county: 'Napa', agencyName: 'Napa County PH', scoringType: 'weighted_deduction', gradingType: 'score_100', facilityCount: 1100, tier: 3 },
  { county: 'Santa Cruz', agencyName: 'Santa Cruz County HSA', scoringType: 'weighted_deduction', gradingType: 'score_100', facilityCount: 1500, tier: 3 },
  { county: 'Butte', agencyName: 'Butte County PH', scoringType: 'major_violation_count', gradingType: 'color_placard', facilityCount: 1200, tier: 3 },
  { county: 'Shasta', agencyName: 'Shasta County HHSA', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 1000, tier: 3 },
  { county: 'El Dorado', agencyName: 'El Dorado County EM', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 1200, tier: 3 },
  { county: 'Los Angeles', city: 'Long Beach', agencyName: 'Long Beach Health', scoringType: 'weighted_deduction', gradingType: 'letter_grade', facilityCount: 3000, tier: 3 },
  { county: 'Los Angeles', city: 'Pasadena', agencyName: 'Pasadena PH', scoringType: 'weighted_deduction', gradingType: 'score_100', facilityCount: 1200, tier: 3 },
  { county: 'Alameda', city: 'Berkeley', agencyName: 'Berkeley EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 800, tier: 3 },
  { county: 'Los Angeles', city: 'Vernon', agencyName: 'Vernon EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 100, tier: 3 },
  // Tier 4 — remaining 28 small/rural counties
  { county: 'Merced', agencyName: 'Merced County DPH', scoringType: 'violation_point_accumulation', gradingType: 'three_tier_rating', facilityCount: 1200, tier: 4 },
  { county: 'Madera', agencyName: 'Madera County DPH', scoringType: 'major_minor_reinspect', gradingType: 'pass_reinspect', facilityCount: 700, tier: 4 },
  { county: 'Mariposa', agencyName: 'Mariposa County + NPS', scoringType: 'major_minor_reinspect', gradingType: 'pass_reinspect', facilityCount: 150, tier: 4 },
  { county: 'Kings', agencyName: 'Kings County DPH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 700, tier: 4 },
  { county: 'Humboldt', agencyName: 'Humboldt County DOH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 900, tier: 4 },
  { county: 'Imperial', agencyName: 'Imperial County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 900, tier: 4 },
  { county: 'Tuolumne', agencyName: 'Tuolumne County Health', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 400, tier: 4 },
  { county: 'Nevada', agencyName: 'Nevada County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 700, tier: 4 },
  { county: 'Mendocino', agencyName: 'Mendocino County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 600, tier: 4 },
  { county: 'Sutter', agencyName: 'Sutter County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 500, tier: 4 },
  { county: 'Yuba', agencyName: 'Yuba County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 400, tier: 4 },
  { county: 'Lake', agencyName: 'Lake County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 400, tier: 4 },
  { county: 'Tehama', agencyName: 'Tehama County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 350, tier: 4 },
  { county: 'Calaveras', agencyName: 'Calaveras County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 300, tier: 4 },
  { county: 'Siskiyou', agencyName: 'Siskiyou County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 300, tier: 4 },
  { county: 'San Benito', agencyName: 'San Benito County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 300, tier: 4 },
  { county: 'Amador', agencyName: 'Amador County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 300, tier: 4 },
  { county: 'Glenn', agencyName: 'Glenn County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 200, tier: 4 },
  { county: 'Del Norte', agencyName: 'Del Norte County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 200, tier: 4 },
  { county: 'Lassen', agencyName: 'Lassen County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 200, tier: 4 },
  { county: 'Plumas', agencyName: 'Plumas County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 200, tier: 4 },
  { county: 'Colusa', agencyName: 'Colusa County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 150, tier: 4 },
  { county: 'Mono', agencyName: 'Mono County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 150, tier: 4 },
  { county: 'Inyo', agencyName: 'Inyo County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 150, tier: 4 },
  { county: 'Trinity', agencyName: 'Trinity County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 120, tier: 4 },
  { county: 'Modoc', agencyName: 'Modoc County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 80, tier: 4 },
  { county: 'Sierra', agencyName: 'Sierra County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 40, tier: 4 },
  { county: 'Alpine', agencyName: 'Alpine County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 20, tier: 4 },
];
