// ═══════════════════════════════════════════════════════════
// src/data/demoJurisdictions.ts
// DEMO MODE ONLY — Static jurisdiction data for sales demos
// NEVER import this in live mode code paths
// ═══════════════════════════════════════════════════════════

import type { LocationJurisdiction } from '../types/jurisdiction';

export type ScoringType = 'weighted_deduction' | 'heavy_weighted' | 'major_violation_count' | 'negative_scale' | 'major_minor_reinspect' | 'violation_point_accumulation' | 'point_accumulation' | 'numeric_score' | 'violation_report' | 'report_only' | 'color_placard' | 'color_placard_and_numeric' | 'inspection_report';
export type GradingType = 'letter_grade' | 'letter_grade_strict' | 'letter_grade_abc' | 'color_placard' | 'green_yellow_red' | 'score_100' | 'score_negative' | 'numeric_score_no_letter' | 'pass_reinspect' | 'three_tier_rating' | 'point_accumulation_tiered' | 'violation_report_only' | 'report_only' | 'green_yellow_red_numeric' | 'inspection_report';

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
// THE 16 DEMO JURISDICTIONS
// These power the jurisdiction switcher in sales demos.
// Each demonstrates a different scoring/grading model.
// ═══════════════════════════════════════════════════════════

export const DEMO_JURISDICTIONS: DemoJurisdiction[] = [
  {
    // ═══ FRESNO COUNTY — VERIFIED (2026-03) ═══
    // NO letter grade. NO numeric score. Violation report only.
    // Transparency: LOW — Grand Jury 2023-24 finding.
    // High EvidLY value: platform provides what the jurisdiction lacks.
    id: 'demo-fresno',
    county: 'Fresno',
    agencyName: 'Fresno County Department of Public Health — Environmental Health Division',
    scoringType: 'violation_report',
    gradingType: 'violation_report_only',
    gradingConfig: {
      displayFormat: 'violation_report',
      grades: null,
      letterGrade: false,
      numericScore: false,
      gradeCardPosted: false,
      violationCategories: ['major', 'minor'],
      majorViolationAction: 'reinspection_usually_required_unless_corrected_onsite',
      minorViolationAction: 'correction_required_reinspection_not_always_required',
      transparencyLevel: 'low',
      transparencyNote: 'Grand Jury 2023-24: inspections hard to locate, inconsistent enforcement, some facilities uninspected 1+ year, software failures.',
      gradingNote: 'NO letter grade. NO numeric score. Fresno documents violations only. EvidLY provides the consistent analysis this jurisdiction lacks.',
      grandJuryReport: {
        title: 'Eat At Your Own Risk: The Quiet Reality of Health Inspections in Fresno County',
        year: '2023-2024',
      },
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'Fresno County Fire Protection District (unincorporated areas)',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 11000,
    dataSourceTier: 3,
    gradeLabel: 'No Open Majors',
    gradeExplanation: 'Violation Report Only — No letter grade, no numeric score. EvidLY IS your grading system.',
    passFailLabel: 'No Grade',
    demoScore: 88,
    demoGrade: 'No Open Majors',
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
    // ═══ FIRST VERIFIED JURISDICTION (JIE Crawl 2026-02-19, Confidence: 100/100) ═══
    // Source: LA County DPH official documentation + LA County Code Title 8 §8.04.225
    // Verified facts: 100-point deductive, FOIR format, A/B/C letter grades
    // Below 70: numerical score card only. Below 70 twice in 12 months: closure.
    id: 'demo-la',
    county: 'Los Angeles',
    agencyName: 'Los Angeles County DPH — Environmental Health Division',
    scoringType: 'weighted_deduction',
    gradingType: 'letter_grade',
    gradingConfig: {
      A: [90, 100], B: [80, 89], C: [70, 79], fail_below: 70,
      below_70_display: 'numerical_score_card',
      closure_trigger: 'below_70_twice_in_12_months',
      grade_posting: 'required_visible_to_patrons',
      inspection_frequency: '1-3 per year based on risk level',
      risk_categories: ['High', 'Moderate', 'Low'],
      reinspection_trigger: 'Major CRF violations or score below 70',
      code_basis: 'California Retail Food Code (CRFC)',
      verified_from: 'LA County Code Title 8 §8.04.225',
    },
    passThreshold: 90,
    warningThreshold: 79,
    criticalThreshold: 69,
    fireAhjName: 'LACoFD / LAFD',
    hoodCleaningDefault: 'semi-annual', // Verified: every 6 months per NFPA 96
    facilityCount: 88000,
    dataSourceTier: 1,
    gradeLabel: 'B',
    gradeExplanation: 'Letter Grade — A (90+), B (80-89), C (70-79). Below 70 = no letter grade.',
    passFailLabel: 'PASS',
    demoScore: 88,
    demoGrade: 'B',
    demoPassFail: 'pass',
  },
  {
    // ═══ THE RIVERSIDE MOMENT — VERIFIED (2026-03, Confidence: 85/100) ═══
    // Same score (88) = FAIL here. This closes deals.
    // Source: Riverside County Ordinance No. 493/493.5 + rivcoeh.org
    // Verified: Only Grade A (90+) passes. B and C both = FAIL.
    // C grade = below 80 (no lower bound), NOT 70-79.
    // Grading program since 1963. Award of Recognition (est. 1998): 95%+ all inspections.
    id: 'demo-riverside',
    county: 'Riverside',
    agencyName: 'Riverside County Department of Environmental Health',
    scoringType: 'weighted_deduction',
    gradingType: 'letter_grade_strict',
    gradingConfig: {
      A: [90, 100], B: [80, 89], C: [0, 79], pass_requires: 'A',
      fail_below: 90,
      grade_posting: 'conspicuous_near_entrance',
      grade_card_colors: { A: 'blue', B: 'green', C: 'red' },
      award_of_recognition: { threshold: 95, min_inspections: 2 },
      verified_from: 'Riverside County Ordinance No. 493/493.5',
      grading_since: 1963,
    },
    passThreshold: 90,
    warningThreshold: 89,
    criticalThreshold: 79,
    fireAhjName: 'CAL FIRE RRU / Riverside County Fire Department',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 12000,
    dataSourceTier: 3,
    gradeLabel: 'B',
    gradeExplanation: 'Letter Grade STRICT — Only A (90+) passes. B = FAIL. C = FAIL. Ordinance 493.',
    passFailLabel: 'FAIL',
    demoScore: 88,
    demoGrade: 'B \u2014 FAIL',
    demoPassFail: 'fail',
  },
  {
    // ═══ SANTA CLARA COUNTY — STANDARDIZED (March 2026, updated) ═══
    // DUAL: Green / Yellow / Red placard + numeric score (0-100), both published.
    // GREEN=90-100, YELLOW=70-89, RED=<70. Score: 100-pt deductive.
    // Major=8pts, Moderate=3pts, Minor=2pts. Transparency: HIGH.
    // SCCDineOut app + eservices.sccgov.org/facilityinspection
    // Source: sccphd.org, eservices.sccgov.org — verified March 2026
    id: 'demo-santa-clara',
    county: 'Santa Clara',
    agencyName: 'Santa Clara County Public Health Department — Environmental Health Division',
    scoringType: 'color_placard_and_numeric',
    gradingType: 'green_yellow_red_numeric',
    gradingConfig: {
      displayFormat: 'green_yellow_red_numeric',
      placards: [
        { color: 'green', status: 'pass', label: 'PASS', range: '90-100', criteria: 'Low violation burden — facility in compliance' },
        { color: 'yellow', status: 'conditional_pass', label: 'CONDITIONAL PASS', range: '70-89', criteria: 'Violations corrected during inspection. Reinspection within 3 business days.' },
        { color: 'red', status: 'closed', label: 'CLOSURE', range: 'Below 70', criteria: 'Imminent threat to health/safety; violations not corrected during inspection.' },
      ],
      numericScore: true,
      scoreBase: 100,
      scoreDirection: 'downward_deduction',
      violationPoints: { major: 8, moderate: 3, minor: 2 },
      scoreNote: 'Green / Yellow / Red placard color determined by numeric score thresholds. Score: 100-pt deductive (Major=8, Moderate=3, Minor=2).',
      placardPosted: true,
      inspectionFrequency: 'risk_based_1_to_3_per_year',
      transparencyLevel: 'high',
      sccDineOutApp: true,
      programLaunched: '2014-10-01',
    },
    passThreshold: 90,
    warningThreshold: 70,
    criticalThreshold: 70,
    fireAhjName: 'Santa Clara County Fire Dept / City departments (San Jose, Sunnyvale, etc.)',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 10000,
    dataSourceTier: 1,
    gradeLabel: '\u{1F7E2} 92',
    gradeExplanation: 'DUAL: Green / Yellow / Red Placard + Numeric Score — Green=90-100, Yellow=70-89, Red=<70. Score: 100-pt deductive (Major=8, Moderate=3, Minor=2).',
    passFailLabel: 'PASS',
    demoScore: 92,
    demoGrade: '\u{1F7E2} Green — 92',
    demoPassFail: 'pass',
  },
  {
    // ═══ SAN LUIS OBISPO COUNTY — STANDARDIZED (March 2026) ═══
    // Unique NEGATIVE SCORING effective May 5, 2025. 0 = perfect.
    // Violations deduct from 0 → score becomes negative.
    // More negative = more/more serious violations.
    // NO letter grade. NO placard. Numeric score only.
    // Prior system (pre-May 2025): traditional 0-100 positive.
    // EatSafeSLO interactive map. Award of Excellence program.
    // Transparency: HIGH. ~2,000 facilities.
    // Source: slocounty.ca.gov — verified March 2026
    id: 'demo-san-luis-obispo',
    county: 'San Luis Obispo',
    agencyName: 'San Luis Obispo County Health Agency — Environmental Health Services Division',
    scoringType: 'numeric_score',
    gradingType: 'numeric_score',
    gradingConfig: {
      displayFormat: 'numeric_score',
      placards: [],
      numericScore: true,
      scoringDirection: 'negative',  // UNIQUE: 0 = perfect, negative = violations
      scoringNote: 'Perfect score is 0. Each violation deducts points, resulting in a negative number. More negative = more/more serious violations. Effective May 5, 2025.',
      legacySystem: {
        active: false,
        type: 'positive_100_point',
        description: 'Before May 5, 2025: 0–100 scale, 100 = perfect. Legacy data in 2-Year Inspections Report.',
      },
      placardPosted: false,
      reportOnline: true,
      interactiveMap: 'EatSafeSLO',
      interactiveMapUrl: 'https://www.slocounty.ca.gov/eatsafeslo',
      awardOfExcellence: true,
      inspectionFrequency: 'risk_based',
      transparencyLevel: 'high',
      programNote: 'SLO County uses a unique negative scoring system (effective May 5, 2025). 0 = perfect; violations yield negative scores. No letter grade or color placard. Interactive EatSafeSLO map shows all fixed permitted facilities. Award of Excellence for top-performing facilities. Historical data (pre-May 2025) uses the traditional 100-point positive scale.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'CAL FIRE / City Fire Departments',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 2000,
    dataSourceTier: 2,
    gradeLabel: '-3',
    gradeExplanation: 'Negative Score — 0 is perfect. More negative = more/more serious violations. No letter grade. No placard. EatSafeSLO map.',
    passFailLabel: 'SCORE',
    demoScore: 88,  // EvidLY normalized
    demoGrade: '-3',
    demoPassFail: 'pass',
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
  {
    // ═══ MERCED COUNTY — VERIFIED (2026-03) ═══
    // Unique three-tier POINT-BASED system. Points accumulate upward.
    // Good (0-6 pts) / Satisfactory (7-13 pts) / Unsatisfactory (14+ pts)
    // NO letter grades. Transparency: HIGH.
    // Award of Excellence program for zero-major facilities.
    id: 'demo-merced',
    county: 'Merced',
    agencyName: 'Merced County Department of Public Health — Division of Environmental Health',
    scoringType: 'point_accumulation',
    gradingType: 'point_accumulation_tiered',
    gradingConfig: {
      displayFormat: 'point_accumulation_tiered',
      tiers: { Good: [0, 6], Satisfactory: [7, 13], Unsatisfactory: [14, null] },
      pointValues: { critical: 4, major: 2, minor: 1 },
      direction: 'accumulate_up',
      letterGrade: false,
      numericScore: false,
      gradeCardPosted: true,
      transparencyLevel: 'high',
      publicPortal: 'https://www.countyofmerced.com/departments/public-health',
      awardOfExcellence: {
        available: true,
        criteria: 'Zero major violations across all routine inspections in evaluation period',
      },
      gradingNote: 'Points accumulate upward per violation. Good (0-6), Satisfactory (7-13), Unsatisfactory (14+). No letter grades. Award of Excellence for zero-major facilities.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'City of Merced Fire Department (CAL FIRE MMU for unincorporated)',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 3500,
    dataSourceTier: 3,
    gradeLabel: 'Good',
    gradeExplanation: 'Point Accumulation — Good (0-6 pts) / Satisfactory (7-13 pts) / Unsatisfactory (14+ pts). No letter grade.',
    passFailLabel: 'PASS',
    demoScore: 88,
    demoGrade: 'Satisfactory',
    demoPassFail: 'pass',
  },
  {
    // ═══ STANISLAUS COUNTY — STANDARDIZED (March 2026) ═══
    // NO letter grades, NO numeric scores, NO placards.
    // Violation report only (CalCode ORFIR). Transparency: LOW.
    // Source: stancounty.com/er, Modesto Bee 2024 investigation
    id: 'demo-stanislaus',
    county: 'Stanislaus',
    agencyName: 'Stanislaus County Environmental Resources Department',
    scoringType: 'violation_report',
    gradingType: 'violation_report_only',
    gradingConfig: {},
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'Modesto Fire Department (City); CAL FIRE (unincorporated)',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 2500,
    dataSourceTier: 3,
    gradeLabel: 'No Open Majors',
    gradeExplanation: 'Violation Report Only — NO letter grade, NO numeric score, NO placard. Results via CPRA request only. Transparency: LOW.',
    passFailLabel: 'PASS',
    demoScore: 88,
    demoGrade: 'No Open Majors',
    demoPassFail: 'pass',
  },
  {
    // ═══ SAN BERNARDINO COUNTY — STANDARDIZED (March 2026) ═══
    // B is MINIMUM passing grade. C = mandatory re-score within 30 days.
    // Different from LA (B passes, no mandatory re-score) and Riverside (A-only passes).
    // Source: SBCC Chapter 14 §33.1403, ehs.sbcounty.gov
    id: 'demo-san-bernardino',
    county: 'San Bernardino',
    agencyName: 'San Bernardino County Department of Public Health — Environmental Health Services',
    scoringType: 'weighted_deduction',
    gradingType: 'letter_grade',
    gradingConfig: {
      displayFormat: 'letter_grade',
      grades: {
        A: { min: 90, max: 100, status: 'pass',  label: 'Excellent compliance' },
        B: { min: 80, max: 89,  status: 'pass',  label: 'Minimum passing grade' },
        C: { min: 70, max: 79,  status: 'fail',  label: 'Mandatory re-score required within 30 days' },
        D: { min: 0,  max: 69,  status: 'fail',  label: 'Immediate closure / permit suspension' },
      },
      minimumPassingGrade: 'B',
      rescoreTriggerGrade: 'C',
      rescoreRequestWindowDays: 30,
      rescoreCompletionDays: 10,
      rescoreFee: true,
      rescoreTargetGrade: 'B',
      closureOnRescoreFailure: true,
      violationCategories: ['major', 'minor'],
      majorViolationsHighlighted: 'yellow_on_oir',
      transparencyLevel: 'high',
      yelpIntegration: true,
      gradingNote: 'B is minimum passing. C = mandatory re-score (written request within 30 days, fee charged). Must achieve B on re-score to avoid closure.',
      foodHandlerCard: {
        issuer: 'San Bernardino County EHS',
        windowDays: 60,
        validityYears: 5,
        note: 'SBC issues its own county card',
      },
      foodSafetyManager: {
        required: true,
        minPerFacility: 1,
        examType: 'ANSI_accredited',
        windowDays: 60,
      },
    },
    passThreshold: 80,
    warningThreshold: 79,
    criticalThreshold: 69,
    fireAhjName: 'San Bernardino County Fire Department (unincorporated areas)',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 15000,
    dataSourceTier: 3,
    gradeLabel: 'B',
    gradeExplanation: 'Letter Grade — A (90+) pass, B (80-89) pass (minimum), C (70-79) FAIL (re-score required).',
    passFailLabel: 'PASS',
    demoScore: 88,
    demoGrade: 'B',
    demoPassFail: 'pass',
  },
  {
    // ═══ ORANGE COUNTY — VERIFIED (2026-03, Confidence: 90/100) ═══
    // Placard only: Pass / Reinspection Due-Pass / Closed
    // NO letter grade. NO numeric score.
    // Source: OCHCA Environmental Health Division, ocfoodinfo.com
    id: 'demo-orange',
    county: 'Orange',
    agencyName: 'Orange County Health Care Agency — Environmental Health Division',
    scoringType: 'major_minor_reinspect',
    gradingType: 'pass_reinspect',
    gradingConfig: {
      displayFormat: 'pass_reinspect',
      outcomes: ['Pass', 'Reinspection Due-Pass', 'Closed'],
      passCondition: 'no_uncorrected_major_crf',
      reinspectCondition: 'major_crf_corrected_on_site',
      closureCondition: 'imminent_health_hazard_uncorrectable',
      violationCategories: ['major_crf', 'minor_crf', 'grp'],
      cosFlag: true,
      transparencyLevel: 'moderate',
      gradingNote: 'OC uses placard only. No letter grade. No numeric score. Inspection reports public at ocfoodinfo.com.',
      awardOfExcellence: {
        issued: 'annually_february',
        criteria: {
          zeroMajorCrfAnyRoutine: true,
          maxMinorCrfPerInspection: 2,
          maxGrpPerInspection: 5,
          foodSafetyManagerCertRequired: true,
          foodHandlerCardsRequired: true,
          minRoutineInspectionsPerYear: 2,
        },
      },
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'Orange County Fire Authority (OCFA) — unincorporated areas only',
    hoodCleaningDefault: 'semi-annual',
    facilityCount: 17000,
    dataSourceTier: 2,
    gradeLabel: 'Pass',
    gradeExplanation: 'Placard Only — Pass / Reinspection Due-Pass / Closed. No letter grade. No numeric score.',
    passFailLabel: 'PASS',
    demoScore: 88,
    demoGrade: 'Pass',
    demoPassFail: 'pass',
  },
  {
    // ═══ SAN JOAQUIN COUNTY — STANDARDIZED (March 2026) ═══
    // NO letter grade. NO score. NO placard. Violation report only.
    // Transparency: MEDIUM — searchable online portal.
    // Annual inspections (1/year). Stockton county seat.
    // Source: sjcehd.com, app.sjgov.org/restaurant-inspection/
    id: 'demo-san-joaquin',
    county: 'San Joaquin',
    agencyName: 'San Joaquin County Environmental Health Department',
    scoringType: 'violation_report',
    gradingType: 'violation_report_only',
    gradingConfig: {
      displayFormat: 'violation_report',
      grades: null,
      letterGrade: false,
      numericScore: false,
      placardPosted: false,
      gradeCardPosted: false,
      violationCategories: ['major', 'minor'],
      majorViolationAction: 'must_correct_reinspection_may_be_required',
      minorViolationAction: 'correction_required',
      onSiteReportRequired: true,
      publicPostingRequired: false,
      voluntaryPostingAllowed: true,
      inspectionFrequencyNote: 'Annual (1/year) — less frequent than most CA counties',
      transparencyLevel: 'medium',
      transparencyNote: 'Searchable online portal at app.sjgov.org/restaurant-inspection/. No grade, no score, no placard. Restaurants must allow public to view on-site report on request.',
      publicPortal: 'https://app.sjgov.org/restaurant-inspection/',
      gradingNote: 'NO letter grade. NO score. NO placard. Violation report only. Annual inspections (1/year).',
      localAuthority: 'Stockton Municipal Code Section 7-111.1(h) supplements CalCode',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'San Joaquin County OES / local city fire departments',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 2882,
    dataSourceTier: 3,
    gradeLabel: 'No Open Majors',
    gradeExplanation: 'Violation Report Only — No letter grade, no numeric score, no placard. Annual inspections.',
    passFailLabel: 'No Grade',
    demoScore: 88,
    demoGrade: 'No Open Majors',
    demoPassFail: 'pass',
  },
  {
    // ═══ MADERA COUNTY — STANDARDIZED (March 2026) ═══
    // NO letter grade. NO score. NO placard. Violation report only.
    // Transparency: LOW — no online portal.
    // Annual inspections. Gateway to Yosemite south (distinct from NPS).
    // Source: maderacounty.com/.../environmental-health-division/food-program
    id: 'demo-madera',
    county: 'Madera',
    agencyName: 'Madera County Environmental Health Division',
    scoringType: 'violation_report',
    gradingType: 'violation_report_only',
    gradingConfig: {
      displayFormat: 'violation_report',
      grades: null,
      letterGrade: false,
      numericScore: false,
      placardPosted: false,
      gradeCardPosted: false,
      onSiteReportRequired: true,
      publicPostingRequired: false,
      inspectionFrequency: 'annual',
      transparencyLevel: 'low',
      transparencyNote: 'No public online inspection database identified. LOW transparency.',
      gradingNote: 'NO letter grade. NO score. NO placard. Violation report only. Annual inspections. CalCode + Madera County Ordinance.',
      permitCycle: 'Annual, valid Jan 1 through Dec 31',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'Madera County OES / CAL FIRE (unincorporated)',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 800,
    dataSourceTier: 4,
    gradeLabel: 'No Open Majors',
    gradeExplanation: 'Violation Report Only — No letter grade, no numeric score, no placard. LOW transparency.',
    passFailLabel: 'No Grade',
    demoScore: 88,
    demoGrade: 'No Open Majors',
    demoPassFail: 'pass',
  },
  {
    // ═══ KERN COUNTY — VERIFIED (2026-03) ═══
    // Letter grade A/B/C + numeric score. Closure threshold = 75 (not 70).
    // Points: Major=5, Minor/Risk=3, Non-critical=1.
    // Grade card posted. Safe Diner App. Transparency: HIGH.
    // Source: Kern County Code Chapter 8.58, NACCHO case study, kernpublichealth.com
    id: 'demo-kern',
    county: 'Kern',
    agencyName: 'Kern County Public Health Services — Environmental Health Division',
    scoringType: 'weighted_deduction',
    gradingType: 'letter_grade_abc',
    gradingConfig: {
      displayFormat: 'letter_grade_with_score',
      grades: [
        { grade: 'A', min: 90, max: 100, status: 'pass', label: 'Compliant with state law' },
        { grade: 'B', min: 80, max: 89, status: 'warning', label: 'Below minimum health standards' },
        { grade: 'C', min: 75, max: 79, status: 'fail', label: 'Poor compliance' },
        { grade: 'CLOSURE', min: 0, max: 74, status: 'closed', label: 'Permit suspended — facility closed' },
      ],
      letterGrade: true,
      numericScore: true,
      scoreBase: 100,
      scoreDirection: 'downward_deduction',
      violationPoints: { major: 5, minorRiskFactor: 3, nonCritical: 1 },
      placardPosted: true,
      gradeCardPosted: true,
      inspectionFrequency: 'risk_based_1_to_3_per_year',
      transparencyLevel: 'high',
      safeDinerApp: true,
      localAuthority: 'Kern County Code Chapter 8.58',
      gradingNote: 'Kern closure threshold = 75 (not 70). A=90-100, B=80-89, C=75-79, Closure=<75.',
    },
    passThreshold: 90,
    warningThreshold: 80,
    criticalThreshold: 75,
    fireAhjName: 'Kern County Fire Department / CAL FIRE (unincorporated)',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 3500,
    dataSourceTier: 1,
    gradeLabel: 'B',
    gradeExplanation: 'Letter Grade A / B / C — A (90+) PASS, B (80-89) WARNING, C (75-79) FAIL, <75 CLOSURE. Threshold 75 not 70.',
    passFailLabel: 'WARNING',
    demoScore: 88,
    demoGrade: 'B — 88',
    demoPassFail: 'warning',
  },
  {
    // ═══ KINGS COUNTY — STANDARDIZED (March 2026) ═══
    // NO letter grade. NO score. NO placard. Violation report only.
    // Transparency: MEDIUM — PDF inspection reports posted online.
    // Source: kcdph.com/ehsfoodinspectionreports
    id: 'demo-kings',
    county: 'Kings',
    agencyName: 'Kings County Department of Public Health — EHS Division',
    scoringType: 'violation_report',
    gradingType: 'violation_report_only',
    gradingConfig: {
      displayFormat: 'violation_report',
      grades: null,
      letterGrade: false,
      numericScore: false,
      placardPosted: false,
      gradeCardPosted: false,
      onSiteReportRequired: true,
      publicPostingRequired: false,
      transparencyLevel: 'medium',
      transparencyNote: 'PDF inspection reports posted online at kcdph.com/ehsfoodinspectionreports organized by city and facility name.',
      publicPortal: 'https://www.kcdph.com/ehsfoodinspectionreports',
      gradingNote: 'NO letter grade. NO score. NO placard. PDF violation reports posted online by city/facility.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'Kings County OES / CAL FIRE (unincorporated)',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 600,
    dataSourceTier: 3,
    gradeLabel: 'No Open Majors',
    gradeExplanation: 'Violation Report Only — No letter grade, no numeric score, no placard. PDF reports online.',
    passFailLabel: 'No Grade',
    demoScore: 88,
    demoGrade: 'No Open Majors',
    demoPassFail: 'pass',
  },
  {
    // ═══ MONTEREY COUNTY — STANDARDIZED (March 2026) ═══
    // NO letter grades, NO numeric scores, NO color placards.
    // Inspection report only + Gold Seal Program (recognition, not scoring).
    // Transparency: MEDIUM — reports via MC Food Inspection Findings app.
    // Source: countyofmonterey.gov, MC Food Inspection Findings app
    id: 'demo-monterey',
    county: 'Monterey',
    agencyName: 'Monterey County Health Department — Environmental Health Bureau',
    scoringType: 'inspection_report',
    gradingType: 'inspection_report',
    gradingConfig: {
      displayFormat: 'inspection_report',
      placards: [],
      numericScore: false,
      placardPosted: false,
      reportPdfOnline: false,
      reportViaApp: true,
      appName: 'MC Food Inspection Findings',
      inspectionFrequency: 'risk_based_2_to_4_per_year',
      transparencyLevel: 'medium',
      goldSealProgram: true,
      goldSealDescription: 'Awarded to facilities with multiple consecutive inspections showing minimal or no violations. Gold Seal placard posted at facility entrance.',
      violationTypes: ['major', 'minor'],
      programNote: 'Monterey County uses inspection reports and a Gold Seal recognition program only. No letter grade, numeric score, or color placard is issued or posted. Three branch offices serve the county.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'CAL FIRE / Monterey County Regional Fire District / City Fire Departments',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 2000,
    dataSourceTier: 2,
    gradeLabel: 'No Open Majors',
    gradeExplanation: 'Inspection Report Only — No letter grade, no numeric score, no placard. Gold Seal for top performers. Reports via MC Food Inspection Findings app.',
    passFailLabel: 'No Grade',
    demoScore: 92,
    demoGrade: 'No Open Majors',
    demoPassFail: 'pass',
  },
  {
    // ═══ SAN BENITO COUNTY — VERIFIED (2026-03) ═══
    // NO letter grade. NO numeric score. NO color placard.
    // Inspection report only. Very small county (~400 facilities).
    // No public online inspection database found. Transparency: LOW.
    // Source: hhsa.sanbenitocountyca.gov, (831) 636-4035
    id: 'demo-san-benito',
    county: 'San Benito',
    agencyName: 'San Benito County Health & Human Services Agency — Environmental Health',
    scoringType: 'inspection_report',
    gradingType: 'inspection_report',
    gradingConfig: {
      displayFormat: 'inspection_report',
      placards: [],
      numericScore: false,
      placardPosted: false,
      reportOnline: false,
      reportAtFacility: true,
      inspectionFrequency: 'risk_based',
      transparencyLevel: 'low',
      programNote: 'San Benito County uses standard CalCode inspection reports only. No letter grade, numeric score, or posted placard. No public online database found — reports available at facility or by records request. Second-smallest county in California by population.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'San Benito County Fire Department / CAL FIRE',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 400,
    dataSourceTier: 4,
    gradeLabel: 'No Open Majors',
    gradeExplanation: 'Inspection Report Only — No letter grade, no numeric score, no placard. No online portal. LOW transparency.',
    passFailLabel: 'No Grade',
    demoScore: 88,
    demoGrade: 'No Open Majors',
    demoPassFail: 'pass',
  },
  {
    // ═══ PLACER COUNTY — VERIFIED (2026-03) ═══
    // GREEN/YELLOW/RED placard system. Modeled after Sacramento GYR.
    // Green=Pass. Yellow=Conditional Pass. Red=Closed.
    // Yellow = ANY uncorrected major (differs from Sacramento 2+ threshold).
    // Two offices: Auburn and Tahoe. Transparency: HIGH.
    id: 'demo-placer',
    county: 'Placer',
    agencyName: 'Placer County Health and Human Services — Environmental Health Division',
    scoringType: 'color_placard',
    gradingType: 'green_yellow_red',
    gradingConfig: {
      displayFormat: 'color_placard',
      placards: [
        { color: 'green', status: 'pass', label: 'PASS', criteria: 'No major violations observed, or all corrected/mitigated by end of inspection.' },
        { color: 'yellow', status: 'conditional_pass', label: 'CONDITIONAL PASS', criteria: 'Failure to correct or mitigate any major violation, or violation of a Compliance Agreement.' },
        { color: 'red', status: 'closed', label: 'CLOSED', criteria: 'Imminent danger that cannot be corrected during inspection.' },
      ],
      numericScore: false,
      placardPosted: true,
      placardLocation: 'Near front door of restaurant, grocery store, or convenience store',
      reportOnline: true,
      inspectionFrequency: 'risk_based',
      transparencyLevel: 'high',
      programNote: 'Yellow threshold differs from Sacramento — failure to correct even a single major triggers Yellow. Two offices: Auburn and Tahoe.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'CAL FIRE / Placer Hills Fire / City Fire Departments / South Placer Fire District',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 2200,
    dataSourceTier: 1,
    gradeLabel: 'GREEN',
    gradeExplanation: 'Green / Yellow / Red Placard — Green=PASS, Yellow=Conditional (any uncorrected major), Red=CLOSED. No numeric score.',
    passFailLabel: 'PASS',
    demoScore: 88,
    demoGrade: 'GREEN',
    demoPassFail: 'pass',
  },
  {
    // ═══ SOLANO COUNTY — VERIFIED (2026-03) ═══
    // Violation report only. Last 2 inspections per facility online.
    // NO letter grade. NO numeric score. NO placard. MEDIUM transparency.
    id: 'demo-solano',
    county: 'Solano',
    agencyName: 'Solano County Department of Resource Management — Environmental Health Division',
    scoringType: 'inspection_report',
    gradingType: 'violation_report_only',
    gradingConfig: {
      displayFormat: 'inspection_report',
      placards: [],
      numericScore: false,
      placardPosted: false,
      reportOnline: true,
      onlineHistoryDepth: 'last_2_inspections',
      inspectionFrequency: 'risk_based',
      transparencyLevel: 'medium',
      programNote: 'Solano County provides violation reports only. No letter grade, numeric score, or color placard. The two most recent inspections per facility are available online.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'CAL FIRE / City Fire Departments / Fairfield Fire / Vacaville Fire / Vallejo Fire',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 2200,
    dataSourceTier: 3,
    gradeLabel: 'No Open Majors',
    gradeExplanation: 'Violation Report Only — No letter grade, no numeric score, no placard. Last 2 inspections online. MEDIUM transparency.',
    passFailLabel: 'No Grade',
    demoScore: 88,
    demoGrade: 'No Open Majors',
    demoPassFail: 'pass',
  },
  {
    // ═══ VENTURA COUNTY — STANDARDIZED (March 2026) ═══
    // Pass/fail inspection placard. NOT Green/Yellow/Red color-coded.
    // Placard = dated pass card with inspector name, EHD website, EHD phone.
    // Closure notice posted separately. Online results via VC Safe Diner (daily).
    // Transparency: MEDIUM-HIGH. ~5,000 facilities.
    // Source: rma.venturacounty.gov, VC Safe Diner, Ventura County Grand Jury 2008-09 report
    id: 'demo-ventura',
    county: 'Ventura',
    agencyName: 'Ventura County Resource Management Agency — Environmental Health Division',
    scoringType: 'pass_fail_placard',
    gradingType: 'pass_fail_placard',
    gradingConfig: {
      displayFormat: 'pass_fail_placard',
      placards: [
        {
          status: 'pass',
          label: 'PASSED INSPECTION',
          criteria: 'Facility passed routine inspection. Placard shows date, inspector name, EHD website, and phone number.',
        },
        {
          status: 'closed',
          label: 'CLOSED',
          criteria: 'Significant violations found that could cause foodborne illness. Facility closed until corrected.',
        },
      ],
      numericScore: false,
      colorCoded: false,
      reportOnline: true,
      appName: 'VC Safe Diner',
      onlinePortal: 'eco.vcrma.org',
      resultsUpdatedDaily: true,
      inspectionFrequency: 'annual_minimum',
      transparencyLevel: 'medium_high',
      programNote: 'Ventura County posts a dated pass placard (not color-coded) and publishes full inspection results online via VC Safe Diner. No numeric score or letter grade. Closure notices posted on EHD website. ~5,000 facilities across multiple district offices.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'Ventura County Fire Department / City Fire Departments',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 5000,
    dataSourceTier: 2,
    gradeLabel: 'PASS',
    gradeExplanation: 'Pass/Fail Placard — Dated pass card posted at facility. No letter grade. No numeric score. Not color-coded. VC Safe Diner app.',
    passFailLabel: 'PASS',
    demoScore: 88,
    demoGrade: 'PASSED INSPECTION',
    demoPassFail: 'pass',
  },
  {
    // ═══ YOLO COUNTY — STANDARDIZED (March 2026) ═══
    // Green/Yellow/Red placard system launched July 1, 2017.
    // Modeled after Sacramento County GYR program.
    // QR code on placard links to Yolo County EH inspection database.
    // Transparency: HIGH. ~700 fixed facilities. Single EHD office in Woodland.
    // Source: yolocounty.gov Consumer Protection Programs; Winters Express July 2017;
    //   West Sacramento News-Ledger July 2024 Food Safety Forum — verified March 2026.
    id: 'demo-yolo',
    county: 'Yolo',
    agencyName: 'Yolo County Environmental Health Division',
    scoringType: 'color_placard',
    gradingType: 'green_yellow_red',
    gradingConfig: {
      displayFormat: 'color_placard',
      placards: [
        {
          color: 'green',
          status: 'pass',
          label: 'PASS',
          criteria: 'No more than one major violation observed and corrected. Facility compliant.',
        },
        {
          color: 'yellow',
          status: 'conditional_pass',
          label: 'CONDITIONAL PASS',
          criteria: 'One or more major violations observed. Re-inspection within 3 business days. Green issued if violations permanently corrected.',
        },
        {
          color: 'red',
          status: 'closed',
          label: 'CLOSED',
          criteria: 'Imminent health hazard not correctable during inspection (vermin, no refrigeration, no hot water, sewage).',
        },
      ],
      numericScore: false,
      placardPosted: true,
      qrCodeOnPlacard: true,
      inspectionFrequency: 'risk_based_1_to_2_per_year',
      transparencyLevel: 'high',
      programLaunched: 'July 1, 2017',
      gradingNote: 'Green / Yellow / Red placard launched July 2017, modeled on Sacramento County program. QR code on placard links directly to Yolo County EH inspection database. CFOs and temp event booths not included in placarding.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'Yolo County OES / City fire departments (Davis, Woodland, West Sacramento)',
    hasLocalAmendments: false,
    facilityCount: 700,
    dataSourceTier: 1,
    gradeLabel: 'Green',
    gradeExplanation: 'Green/Yellow/Red Placard — Green / Yellow / Red color placard posted at facility with QR code. Green=PASS. Yellow=CONDITIONAL PASS. Red=CLOSED. HIGH transparency.',
    passFailLabel: 'GREEN',
    demoScore: 92,
    demoGrade: 'Green',
    demoPassFail: 'pass',
  },
  {
    // ═══ EL DORADO COUNTY — STANDARDIZED (March 2026) ═══
    // NO letter grades, NO numeric scores, NO color placards confirmed.
    // Inspection report only. Most recent data online (with disclaimer).
    // Full reports via Records Request. Transparency: MEDIUM.
    // Source: eldoradocounty.ca.gov/Public-Safety-Justice/Food-Safety/Inspection-Reports
    id: 'demo-el-dorado',
    county: 'El Dorado',
    agencyName: 'El Dorado County Environmental Management Department — Environmental Health Division',
    scoringType: 'inspection_report',
    gradingType: 'inspection_report',
    gradingConfig: {
      displayFormat: 'inspection_report',
      placards: [],
      numericScore: false,
      placardPosted: false,
      reportOnline: true,
      onlineDataNote: 'Most recent inspection data. County disclaimer: may not reflect current conditions.',
      fullReportAtFacility: true,
      recordsRequestAvailable: true,
      inspectionFrequency: 'risk_based',
      transparencyLevel: 'medium',
      programNote: 'El Dorado County provides standard CalCode inspection reports. No confirmed letter grade, numeric score, or color placard. Most recent inspection info available online; complete reports at facility or via Records Request.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'CAL FIRE / City of Placerville Fire / City of South Lake Tahoe Fire',
    hoodCleaningDefault: 'quarterly',
    facilityCount: 1200,
    dataSourceTier: 3,
    gradeLabel: 'No Open Majors',
    gradeExplanation: 'Inspection Report Only — No letter grade, no numeric score, no placard confirmed. Most recent data online with disclaimer.',
    passFailLabel: 'No Grade',
    demoScore: 90,
    demoGrade: 'No Open Majors',
    demoPassFail: 'pass',
  },
  {
    // ═══ SHASTA COUNTY — STANDARDIZED (March 2026) ═══
    // NO confirmed letter grade, numeric score, or color placard.
    // Inspection report only. Online inspection data available; full reports by records request.
    // Transparency: MEDIUM. County covers Redding metro food inspections.
    // Source: co.shasta.ca.us/departments/resource-management/environmental-health — verified March 2026.
    id: 'demo-shasta',
    county: 'Shasta',
    agencyName: 'Shasta County Department of Resource Management — Environmental Health Division',
    scoringType: 'inspection_report',
    gradingType: 'inspection_report',
    gradingConfig: {
      displayFormat: 'inspection_report',
      placards: [],
      numericScore: false,
      placardPosted: false,
      reportOnline: true,
      fullReportAtFacility: true,
      recordsRequestAvailable: true,
      inspectionFrequency: 'risk_based',
      transparencyLevel: 'medium',
      programNote: 'Shasta County provides standard CalCode inspection reports for all food facilities, including those in the City of Redding. No confirmed letter grade, numeric score, or color placard system. Inspection data available online; full reports available upon records request. County seat is Redding.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'CAL FIRE / City of Redding Fire / City of Anderson Fire / Shasta Lake City Fire',
    hasLocalAmendments: false,
    facilityCount: null,
    dataSourceTier: 3,
    gradeLabel: 'No Open Majors',
    gradeExplanation: 'Inspection Report Only — No confirmed letter grade, numeric score, or color placard. Online inspection data available. MEDIUM transparency.',
    passFailLabel: 'No Grade',
    demoScore: 88,
    demoGrade: 'No Open Majors',
    demoPassFail: 'pass',
  },
  {
    // ═══ NAPA COUNTY — STANDARDIZED (March 2026) ═══
    // Letter grade A/B/C. Points deducted from 100. ONLY letter-grade county in Bay Area batch.
    // A=90-100, B=80-89, C=70-79, Closure=below 70 (no grade, min 24-hr).
    // Rescore: 1/year, fee required. April 2025: 90%+ A, 98%+ A or B.
    // Napa Valley wine country — high-end food/culinary tourism market.
    // Transparency: HIGH.
    // Source: countyofnapa.org/1000/Environmental-Health — verified March 2026
    id: 'demo-napa',
    county: 'Napa',
    agencyName: 'Napa County Health and Human Services — Division of Environmental Health',
    scoringType: 'letter_grade',
    gradingType: 'letter_grade',
    gradingConfig: {
      displayFormat: 'letter_grade',
      grades: [
        { grade: 'A', scoreRange: '90–100', pointsDeducted: '0–10',
          criteria: 'Excellent compliance. Posted at facility.' },
        { grade: 'B', scoreRange: '80–89', pointsDeducted: '11–20',
          criteria: 'Good compliance with some violations noted.' },
        { grade: 'C', scoreRange: '70–79', pointsDeducted: '21–30',
          criteria: 'Marginal compliance. Reinspection likely required.' },
        { grade: 'CLOSURE', scoreRange: 'Below 70', pointsDeducted: '31+',
          criteria: 'Minimum 24-hour closure. No grade issued. Must correct before reopening.' },
      ],
      rescoreOption: { available: true, frequency: 'once_per_year', feeRequired: true },
      numericScore: true,
      scoreMax: 100,
      scoreMin: 0,
      passThreshold: 70,
      gradeAThreshold: 90,
      gradeBThreshold: 80,
      gradeCThreshold: 70,
      placardPosted: true,
      reportOnline: true,
      realWorldData: { asOf: 'April 2025', aGrade: '90%+', aBGrade: '98%+' },
      inspectionFrequency: 'risk_based',
      transparencyLevel: 'high',
      programNote: 'Napa County is the ONLY letter-grade jurisdiction in the Bay Area batch. A=90-100, B=80-89, C=70-79, closure=below 70. Operators may request one rescore per year (fee required). April 2025: 90%+ A grade; 98%+ A or B.',
    },
    passThreshold: 70,
    warningThreshold: 80,
    criticalThreshold: 70,
    fireAhjName: 'CAL FIRE / City of Napa Fire / City of American Canyon Fire',
    hoodCleaningDefault: 'quarterly',
    facilityCount: null,
    dataSourceTier: 2,
    gradeLabel: 'B',
    gradeExplanation: 'Letter Grade A / B / C — A (90-100) PASS, B (80-89), C (70-79), Closure (<70, no grade). Only letter-grade county in Bay Area. Rescore 1/year.',
    passFailLabel: 'PASS',
    demoScore: 88,
    demoGrade: 'B — 88',
    demoPassFail: 'pass',
  },
  {
    // ═══ COLUSA COUNTY — STANDARDIZED (March 2026) ═══
    // NO letter grade. NO numeric score. NO confirmed placard.
    // Inspection report only. ~140 facilities — one of the smallest EHDs in CA.
    // No confirmed public online portal. Report at facility or EHD office.
    // Transparency: LOW.
    // Source: countyofcolusaca.gov/425/Retail-Food-Safety — verified March 2026
    id: 'demo-colusa',
    county: 'Colusa',
    agencyName: 'Colusa County Environmental Health — Development Services Department',
    scoringType: 'inspection_report',
    gradingType: 'inspection_report',
    gradingConfig: {
      displayFormat: 'inspection_report',
      placards: [],
      numericScore: false,
      placardPosted: false,
      reportOnline: false,
      reportAtFacility: true,
      reportAtOffice: true,
      inspectionFrequency: 'risk_based',
      transparencyLevel: 'low',
      programNote: 'One of the smallest EHDs in California (~140 facilities). No confirmed public portal. Fees paid at office; cash or check only.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'CAL FIRE / City of Colusa Fire / City of Williams Fire',
    hoodCleaningDefault: 'semi-annual',
    facilityCount: 140,
    dataSourceTier: 4,
    gradeLabel: 'N/A',
    gradeExplanation: 'No grade system — inspection report only. ~140 facilities. LOW transparency.',
    passFailLabel: 'No Grade',
    demoScore: 85,
    demoGrade: 'No Grade',
    demoPassFail: 'no_grade',
  },
  {
    // ═══ NEVADA COUNTY — STANDARDIZED (March 2026) ═══
    // NO letter grade. NO numeric score. NO confirmed placard.
    // Inspection report only. Standard CalCode violation classification.
    // Transparency: MEDIUM.
    // Source: nevadacountyca.gov/2136/Food-Safety — verified March 2026
    id: 'demo-nevada',
    county: 'Nevada',
    agencyName: 'Nevada County Community Development Agency — Environmental Health Division',
    scoringType: 'inspection_report',
    gradingType: 'inspection_report',
    gradingConfig: {
      displayFormat: 'inspection_report',
      placards: [],
      numericScore: false,
      placardPosted: false,
      reportOnline: false,
      reportAtFacility: true,
      reportAtOffice: true,
      inspectionFrequency: 'risk_based',
      transparencyLevel: 'medium',
      programNote: 'Sierra foothills + mountain communities (~600–900 facilities). Key areas: Nevada City, Grass Valley, Truckee (Lake Tahoe–adjacent), Penn Valley, North San Juan.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'CAL FIRE / City of Grass Valley Fire / City of Nevada City Fire / Truckee Fire Protection District',
    hoodCleaningDefault: 'semi-annual',
    facilityCount: 750,
    dataSourceTier: 4,
    gradeLabel: 'N/A',
    gradeExplanation: 'No grade system — inspection report only. ~600–900 facilities. MEDIUM transparency.',
    passFailLabel: 'No Grade',
    demoScore: 85,
    demoGrade: 'No Grade',
    demoPassFail: 'no_grade',
  },
  {
    // ═══ LAKE COUNTY — STANDARDIZED (March 2026) ═══
    // NO letter grade. NO numeric score. NO confirmed placard.
    // Inspection report only. PDF reports posted online by community/alphabetical.
    // Transparency: MEDIUM.
    // Source: lakecountyca.gov/360/Food-Facility-Inspections — verified March 2026
    id: 'demo-lake',
    county: 'Lake',
    agencyName: 'Lake County Health Services — Environmental Health Division',
    scoringType: 'inspection_report',
    gradingType: 'inspection_report',
    gradingConfig: {
      displayFormat: 'inspection_report',
      placards: [],
      numericScore: false,
      placardPosted: false,
      reportOnline: true,
      reportAtFacility: true,
      reportAtOffice: true,
      inspectionFrequency: 'risk_based',
      transparencyLevel: 'medium',
      programNote: 'MEDIUM transparency. PDF reports by community/alphabetical list. Clear Lake tourism and wine (Lake County AVA). Significant wildfire history (Valley Fire 2015, River Fire, etc.) — seasonal food service volume varies.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'CAL FIRE / City of Lakeport Fire / Clearlake Fire / Kelseyville Fire / Middletown Area Fire',
    hoodCleaningDefault: 'semi-annual',
    facilityCount: 500,
    dataSourceTier: 3,
    gradeLabel: 'N/A',
    gradeExplanation: 'No grade system — inspection report only. ~400–600 facilities. MEDIUM transparency.',
    passFailLabel: 'No Grade',
    demoScore: 85,
    demoGrade: 'No Grade',
    demoPassFail: 'no_grade',
  },
  {
    // ═══ TEHAMA COUNTY — STANDARDIZED (March 2026) ═══
    // NO letter grade. NO numeric score. NO confirmed placard.
    // Inspection report only. Monthly PDF inspection reports published on county website by period.
    // Transparency: MEDIUM.
    // Source: tehama.gov/government/departments/environmental-health/food-inspection-reports — verified March 2026
    id: 'demo-tehama',
    county: 'Tehama',
    agencyName: 'Tehama County Environmental Health Department',
    scoringType: 'inspection_report',
    gradingType: 'inspection_report',
    gradingConfig: {
      displayFormat: 'inspection_report',
      placards: [],
      numericScore: false,
      placardPosted: false,
      reportOnline: true,
      inspectionFrequency: 'risk_based',
      transparencyLevel: 'medium',
      programNote: 'Monthly PDF publication model. MEDIUM transparency. Red Bluff is county seat. Corning is largest city in north county.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'CAL FIRE / City of Red Bluff Fire / City of Corning Fire',
    hoodCleaningDefault: 'semi-annual',
    facilityCount: 500,
    dataSourceTier: 4,
    gradeLabel: 'N/A',
    gradeExplanation: 'No grade system — inspection report only. ~400–600 facilities. MEDIUM transparency.',
    passFailLabel: 'No Grade',
    demoScore: 85,
    demoGrade: 'No Grade',
    demoPassFail: 'no_grade',
  },
  {
    // ═══ GLENN COUNTY — STANDARDIZED (March 2026) ═══
    // NO letter grade. NO numeric score. NO confirmed placard.
    // Inspection report only. PDF reports posted online by facility name.
    // Transparency: MEDIUM.
    // Source: countyofglenn.net/.../food-facility-inspection-reports — verified March 2026
    id: 'demo-glenn',
    county: 'Glenn',
    agencyName: 'Glenn County Environmental Health — Planning and Community Development Services',
    scoringType: 'inspection_report',
    gradingType: 'inspection_report',
    gradingConfig: {
      displayFormat: 'inspection_report',
      placards: [],
      numericScore: false,
      placardPosted: false,
      reportOnline: true,
      inspectionFrequency: 'risk_based',
      transparencyLevel: 'medium',
      programNote: 'PDF reports posted by facility name on county website. MEDIUM transparency. Small agricultural county. Willows is county seat.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'CAL FIRE / City of Willows Fire / City of Orland Fire',
    hoodCleaningDefault: 'semi-annual',
    facilityCount: null,
    dataSourceTier: 4,
    gradeLabel: 'N/A',
    gradeExplanation: 'No grade system — inspection report only. ~200-300 facilities. MEDIUM transparency.',
    passFailLabel: 'No Grade',
    demoScore: 85,
    demoGrade: 'No Grade',
    demoPassFail: 'no_grade',
  },
  {
    // ═══ AMADOR COUNTY — STANDARDIZED (March 2026) ═══
    // NO letter grade. NO numeric score. NO confirmed placard.
    // Inspection report only. Results at facility or EHD office in person.
    // Transparency: LOW-MEDIUM.
    // Source: amadorcounty.gov/departments/environmental-health/food-program — verified March 2026
    id: 'demo-amador',
    county: 'Amador',
    agencyName: 'Amador County Environmental Health Department',
    scoringType: 'inspection_report',
    gradingType: 'inspection_report',
    gradingConfig: {
      displayFormat: 'inspection_report',
      placards: [],
      numericScore: false,
      placardPosted: false,
      reportOnline: false,
      reportAtFacility: true,
      reportAtOffice: true,
      inspectionFrequency: 'risk_based',
      transparencyLevel: 'low-medium',
      programNote: 'LOW-MEDIUM transparency. Results at facility or EHD in person only. No confirmed public online search. Jackson is county seat. Wine country foothill market.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'CAL FIRE / City of Jackson Fire / Amador Fire Protection District',
    hoodCleaningDefault: 'semi-annual',
    facilityCount: 400,
    dataSourceTier: 4,
    gradeLabel: 'N/A',
    gradeExplanation: 'No grade system — inspection report only. ~300–500 facilities. LOW-MEDIUM transparency.',
    passFailLabel: 'No Grade',
    demoScore: 85,
    demoGrade: 'No Grade',
    demoPassFail: 'no_grade',
  },
  {
    // ═══ CALAVERAS COUNTY — STANDARDIZED (March 2026) ═══
    // NO letter grade. NO numeric score. NO confirmed placard.
    // Inspection report only. Results available at facility.
    // Transparency: MEDIUM.
    // Source: ema.calaverasgov.us — verified March 2026
    id: 'demo-calaveras',
    county: 'Calaveras',
    agencyName: 'Calaveras County Environmental Management Agency — Environmental Health Division',
    scoringType: 'inspection_report',
    gradingType: 'inspection_report',
    gradingConfig: {
      displayFormat: 'inspection_report',
      placards: [],
      numericScore: false,
      placardPosted: false,
      reportOnline: false,
      inspectionFrequency: 'risk_based',
      transparencyLevel: 'medium',
      programNote: 'MEDIUM transparency. Sierra foothills wine country. San Andreas is county seat. Includes Stanislaus National Forest adjacent areas. No confirmed online portal.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'CAL FIRE / City of Angels Camp Fire / Calaveras Consolidated Fire / Ebbetts Pass Fire District',
    hoodCleaningDefault: 'semi-annual',
    facilityCount: 500,
    dataSourceTier: 4,
    gradeLabel: 'N/A',
    gradeExplanation: 'No grade system — inspection report only. ~400–600 facilities. MEDIUM transparency.',
    passFailLabel: 'No Grade',
    demoScore: 85,
    demoGrade: 'No Grade',
    demoPassFail: 'no_grade',
  },
  {
    // ═══ TUOLUMNE COUNTY — STANDARDIZED (March 2026) ═══
    // NO letter grade. NO numeric score. NO confirmed placard.
    // Inspection report only. Own Field Inspection Guide (Oct 2021).
    // Transparency: MEDIUM.
    // Source: tuolumnecounty.ca.gov/247/Safe-Food — verified March 2026
    id: 'demo-tuolumne',
    county: 'Tuolumne',
    agencyName: 'Tuolumne County Community Development Department — Environmental Health Division',
    scoringType: 'inspection_report',
    gradingType: 'inspection_report',
    gradingConfig: {
      displayFormat: 'inspection_report',
      placards: [],
      numericScore: false,
      placardPosted: false,
      reportOnline: false,
      inspectionFrequency: 'risk_based',
      transparencyLevel: 'medium',
      programNote: 'MEDIUM transparency. Has its own Field Inspection Guide (Oct 2021). Includes Columbia State Historic Park food vendors. Sonora is county seat. No confirmed online portal or placard.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'CAL FIRE / City of Sonora Fire / Tuolumne City Fire District / Groveland Community Services District',
    hoodCleaningDefault: 'semi-annual',
    facilityCount: null,
    dataSourceTier: 4,
    gradeLabel: 'N/A',
    gradeExplanation: 'No grade system — inspection report only. ~400-600 facilities. MEDIUM transparency.',
    passFailLabel: 'No Grade',
    demoScore: 85,
    demoGrade: 'No Grade',
    demoPassFail: 'no_grade',
  },
  {
    // ═══ YUBA COUNTY — STANDARDIZED (March 2026) ═══
    // NO letter grade. NO numeric score. NO confirmed placard.
    // Inspection report only. ~500–700 facilities.
    // IMPORTANT: Yuba County ≠ Sutter County. Yuba City → Sutter. Marysville → Yuba.
    // Sutter County uses Green / Yellow / Red placard; Yuba County does NOT.
    // Transparency: MEDIUM.
    // Source: yuba.org/departments/community_development/environmental_health/ — verified March 2026
    id: 'demo-yuba',
    county: 'Yuba',
    agencyName: 'Yuba County Community Development Department — Environmental Health Division',
    scoringType: 'inspection_report',
    gradingType: 'inspection_report',
    gradingConfig: {
      displayFormat: 'inspection_report',
      placards: [],
      numericScore: false,
      placardPosted: false,
      reportOnline: false,
      reportAtFacility: true,
      reportAtOffice: true,
      inspectionFrequency: 'risk_based',
      transparencyLevel: 'medium',
      programNote: 'Inspection report only — no letter grade, no numeric score, no confirmed placard. ~500–700 facilities. Marysville is county seat. Adjacent Sutter County uses Green / Yellow / Red placard — Yuba does NOT. Single EHD office at 915 8th Street, Marysville.',
    },
    passThreshold: null,
    warningThreshold: null,
    criticalThreshold: null,
    fireAhjName: 'CAL FIRE / City of Marysville Fire / Yuba County Fire',
    hoodCleaningDefault: 'semi-annual',
    facilityCount: 600,
    dataSourceTier: 3,
    gradeLabel: 'N/A',
    gradeExplanation: 'No grade system — inspection report only. ~500–700 facilities. MEDIUM transparency. Different from adjacent Sutter County (Green / Yellow / Red placard).',
    passFailLabel: 'No Grade',
    demoScore: 85,
    demoGrade: 'No Grade',
    demoPassFail: 'no_grade',
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
    name: 'Location 1',
    jurisdiction: DEMO_JURISDICTIONS.find(j => j.id === 'demo-fresno')!,
    score: 92,
    foodSafety: { ops: 97, docs: 94 },
    facilitySafety: { ops: 88, docs: 95 },
    gradeDisplay: 'No Open Majors',
    tagline: 'EvidLY IS your grading system',
  },
  {
    id: 'demo-loc-airport',
    name: 'Location 2',
    jurisdiction: DEMO_JURISDICTIONS.find(j => j.id === 'demo-merced')!,
    score: 85,
    foodSafety: { ops: 88, docs: 80 },
    facilitySafety: { ops: 75, docs: 82 },
    gradeDisplay: 'Satisfactory',
    tagline: 'Point accumulation — Good/Satisfactory/Unsatisfactory',
  },
  {
    id: 'demo-loc-university',
    name: 'Location 3',
    jurisdiction: DEMO_JURISDICTIONS.find(j => j.id === 'demo-stanislaus')!,
    score: 88,
    foodSafety: { ops: 91, docs: 86 },
    facilitySafety: { ops: 84, docs: 88 },
    gradeDisplay: 'Pass',
    tagline: 'CalCode pass/reinspect standard',
  },
  {
    id: 'demo-loc-yosemite',
    name: 'Yosemite (Aramark)',
    jurisdiction: DEMO_JURISDICTIONS.find(j => j.id === 'demo-yosemite')!,
    score: 90,
    foodSafety: { ops: 92, docs: 88 },
    facilitySafety: { ops: 86, docs: 90 },
    gradeDisplay: 'Pass (Dual Jurisdiction)',
    tagline: 'Multi-AHJ — County + NPS federal overlay',
  },
];

// ═══════════════════════════════════════════════════════════
// VERIFIED DEMO DISPLAY OVERRIDES
// Spec-exact display strings for the 3 demo locations.
// These bypass calculateDemoGrade() math — used by the
// dashboard components to show jurisdiction-native grades.
// ═══════════════════════════════════════════════════════════

export const DEMO_LOCATION_GRADE_OVERRIDES: Record<string, {
  foodSafety: {
    grade: string;
    gradeDisplay: string;
    summary: string;
    status: 'passing' | 'failing' | 'at_risk';
    details: Record<string, any>;
  };
  facilitySafety: {
    grade: string;
    gradeDisplay: string;
    summary: string;
    status: 'passing' | 'failing' | 'at_risk';
    permitStatus: 'current' | 'expiring' | 'expired' | 'no_status';
    hoodStatus: 'current' | 'due_soon' | 'overdue' | 'no_status';
    extinguisherStatus: 'current' | 'due_soon' | 'expired' | 'no_status';
    ansulStatus: 'current' | 'due_soon' | 'overdue' | 'no_status';
    pestStatus: 'current' | 'due_soon' | 'overdue' | 'no_status';
    greaseStatus: 'current' | 'due_soon' | 'overdue' | 'no_status';
    elevatorStatus: 'current' | 'due_soon' | 'overdue' | 'no_status';
    backflowStatus: 'current' | 'expiring' | 'expired' | 'no_status';
  };
}> = {
  'demo-loc-downtown': {
    foodSafety: {
      grade: 'No Open Majors',
      gradeDisplay: 'No Open Majors',
      summary: '2 minor — corrected on-site',
      status: 'passing',
      details: { majorViolations: 0, minorViolations: 2, uncorrectedMajors: 0 },
    },
    facilitySafety: {
      grade: 'No Status',
      gradeDisplay: 'Pending Verification',
      summary: 'Fresno County Fire Protection District',
      status: 'at_risk',
      permitStatus: 'no_status',
      hoodStatus: 'no_status',
      extinguisherStatus: 'no_status',
      ansulStatus: 'no_status',
      pestStatus: 'no_status',
      greaseStatus: 'no_status',
      elevatorStatus: 'no_status',
      backflowStatus: 'no_status',
    },
  },
  'demo-loc-airport': {
    foodSafety: {
      grade: 'Satisfactory',
      gradeDisplay: 'Satisfactory',
      summary: '9 violation points · Good: 0–6 · Satisfactory: 7–13 · Unsatisfactory: 14+',
      status: 'passing',
      details: { totalPoints: 9, majorViolations: 0, minorViolations: 0, uncorrectedMajors: 0 },
    },
    facilitySafety: {
      grade: 'Partial',
      gradeDisplay: 'Partial Compliance',
      summary: 'Merced County Fire Dept (CAL FIRE MMU)',
      status: 'at_risk',
      permitStatus: 'current',
      hoodStatus: 'current',
      extinguisherStatus: 'due_soon',
      ansulStatus: 'current',
      pestStatus: 'current',
      greaseStatus: 'due_soon',
      elevatorStatus: 'no_status',
      backflowStatus: 'current',
    },
  },
  'demo-loc-university': {
    foodSafety: {
      grade: 'Reinspection Required',
      gradeDisplay: '3 Major Open',
      summary: '3 major violations — reinspection required',
      status: 'failing',
      details: { majorViolations: 3, minorViolations: 1, uncorrectedMajors: 3 },
    },
    facilitySafety: {
      grade: 'Action Required',
      gradeDisplay: 'Action Required',
      summary: 'Modesto Fire Department',
      status: 'failing',
      permitStatus: 'expiring',
      hoodStatus: 'overdue',
      extinguisherStatus: 'current',
      ansulStatus: 'due_soon',
      pestStatus: 'overdue',
      greaseStatus: 'current',
      elevatorStatus: 'no_status',
      backflowStatus: 'expired',
    },
  },
  'demo-loc-yosemite': {
    foodSafety: {
      grade: 'Pass (Dual Jurisdiction)',
      gradeDisplay: 'Pass (Dual Jurisdiction)',
      summary: 'Mariposa County CalCode + NPS FDA Food Code — both authorities satisfied',
      status: 'passing',
      details: {
        majorViolations: 0, minorViolations: 1, uncorrectedMajors: 0,
        dualAhj: true,
        primaryAuthority: 'Mariposa County Environmental Health',
        federalOverlay: 'NPS — Yosemite Environmental Health',
        primaryStatus: 'passing',
        federalStatus: 'passing',
      },
    },
    facilitySafety: {
      grade: 'Compliant',
      gradeDisplay: 'Compliant (Dual Authority)',
      summary: 'CAL FIRE MMU + NPS Structural Fire — both authorities satisfied',
      status: 'passing',
      permitStatus: 'current',
      hoodStatus: 'current',
      extinguisherStatus: 'current',
      ansulStatus: 'current',
      pestStatus: 'no_status',
      greaseStatus: 'current',
      elevatorStatus: 'no_status',
      backflowStatus: 'no_status',
    },
  },
};

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
    case 'letter_grade_abc': {
      // Kern County — A/B/C letter grade with closure threshold at 75 (not 70)
      // A=90-100 PASS, B=80-89 WARNING, C=75-79 FAIL, <75 CLOSURE
      const config = jurisdiction.gradingConfig || {};
      const grades = config.grades || [];
      if (score >= 90) return { grade: 'A', passFail: 'pass', display: `A \u2014 ${score}` };
      if (score >= 80) return { grade: 'B', passFail: 'warning', display: `B \u2014 ${score}` };
      const closureMin = (grades.find?.((g: any) => g.grade === 'CLOSURE')?.max ?? 74) + 1;
      if (score >= closureMin) return { grade: 'C', passFail: 'fail', display: `C \u2014 ${score}` };
      return { grade: 'CLOSURE', passFail: 'fail', display: `Closure \u2014 ${score}` };
    }
    case 'color_placard': {
      // Green / Yellow / Red placard — Green=pass, Yellow=conditional, Red=closed
      // In demo mode, score >= 80 = all majors corrected (Green)
      // score 60-79 = uncorrected major exists (Yellow)
      // score < 60 = imminent danger (Red)
      if (score >= 80) return { grade: 'GREEN', passFail: 'pass', display: 'GREEN' };
      if (score >= 60) return { grade: 'YELLOW', passFail: 'warning', display: 'YELLOW — Conditional' };
      return { grade: 'RED', passFail: 'fail', display: 'RED — Closed' };
    }
    case 'score_100': {
      const t = jurisdiction.passThreshold || 70;
      return { grade: String(score), passFail: score >= t ? 'pass' : 'fail', display: String(score) };
    }
    case 'numeric_score_no_letter': {
      // Numeric score only — no letter grade, no placard
      // Uses pass/warning/critical thresholds from jurisdiction config
      const nsPass = jurisdiction.passThreshold || 90;
      const nsCrit = jurisdiction.criticalThreshold || 70;
      let nsPf: 'pass' | 'fail' | 'warning' = 'pass';
      if (score < nsCrit) nsPf = 'fail';
      else if (score < nsPass) nsPf = 'warning';
      return { grade: String(score), passFail: nsPf, display: String(score) };
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
    case 'point_accumulation_tiered':
    case 'three_tier_rating': {
      // Merced County Model — points accumulate UPWARD per violation
      // Good (0-6) / Satisfactory (7-13) / Unsatisfactory (14+)
      // NO letter grades. Award of Excellence for zero-major facilities.
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
    case 'violation_report_only': {
      // NO letter grade, NO numeric score — violation report only
      // Demo: simulate major/minor counts from normalized score
      const vrMajors = Math.max(0, Math.floor((100 - score) / 4));
      const vrMinors = Math.max(0, Math.floor((100 - score) / 6));
      const vrUncorrected = score >= 80 ? 0 : Math.max(1, Math.floor((80 - score) / 8));
      if (vrUncorrected > 0) {
        return {
          grade: 'Major Violations',
          passFail: 'fail',
          display: `${vrUncorrected} Major Violation${vrUncorrected > 1 ? 's' : ''} Open`,
          majorViolations: vrMajors, minorViolations: vrMinors,
          uncorrectedMajors: vrUncorrected, totalPoints: 0,
        };
      }
      const vrNote = vrMajors > 0 ? `${vrMajors} major corrected on-site` : 'No violations';
      return {
        grade: 'No Open Majors',
        passFail: 'pass',
        display: vrNote,
        majorViolations: vrMajors, minorViolations: vrMinors,
        uncorrectedMajors: 0, totalPoints: 0,
      };
    }
    case 'green_yellow_red': {
      // Yolo County — Green / Yellow / Red placard WITHOUT numeric score
      // Green = PASS (≤1 major corrected), Yellow = CONDITIONAL PASS (1+ major),
      // Red = CLOSED (imminent health hazard)
      const gyrNoScoreMajors = Math.max(0, Math.floor((100 - score) / 10));
      const gyrNoScoreMinors = Math.max(0, Math.floor(((100 - score) % 10) / 3));
      const gyrNoScoreUncorrected = score < 60 ? gyrNoScoreMajors : 0;
      if (gyrNoScoreUncorrected > 0) {
        return {
          grade: 'Red',
          passFail: 'fail',
          display: `\u{1F534} Red — CLOSED (${gyrNoScoreUncorrected} major uncorrected)`,
          majorViolations: gyrNoScoreMajors, minorViolations: gyrNoScoreMinors,
          uncorrectedMajors: gyrNoScoreUncorrected, totalPoints: 0,
        };
      }
      if (gyrNoScoreMajors >= 2) {
        return {
          grade: 'Yellow',
          passFail: 'warning',
          display: `\u{1F7E1} Yellow — Conditional Pass (${gyrNoScoreMajors} major corrected)`,
          majorViolations: gyrNoScoreMajors, minorViolations: gyrNoScoreMinors,
          uncorrectedMajors: 0, totalPoints: 0,
        };
      }
      return {
        grade: 'Green',
        passFail: 'pass',
        display: '\u{1F7E2} Green — Pass',
        majorViolations: gyrNoScoreMajors, minorViolations: gyrNoScoreMinors,
        uncorrectedMajors: 0, totalPoints: 0,
      };
    }
    case 'inspection_report': {
      // Monterey County model — inspection report only + Gold Seal recognition
      // NO letter grade, NO numeric score, NO color placard
      // Demo: simulate violation counts from normalized score
      const irMajors = Math.max(0, Math.floor((100 - score) / 5));
      const irMinors = Math.max(0, Math.floor((100 - score) / 4));
      const irUncorrected = score >= 80 ? 0 : Math.max(1, Math.floor((80 - score) / 8));
      const goldSeal = score >= 95 && irMajors === 0;
      if (irUncorrected > 0) {
        return {
          grade: 'Major Violations',
          passFail: 'fail',
          display: `${irUncorrected} Major Violation${irUncorrected > 1 ? 's' : ''} Open`,
          majorViolations: irMajors, minorViolations: irMinors,
          uncorrectedMajors: irUncorrected, totalPoints: 0,
        };
      }
      const irDisplay = goldSeal
        ? 'Gold Seal — No violations'
        : irMajors > 0 ? `${irMajors} major corrected on-site` : 'No violations';
      return {
        grade: goldSeal ? 'Gold Seal' : 'No Open Majors',
        passFail: 'pass',
        display: irDisplay,
        majorViolations: irMajors, minorViolations: irMinors,
        uncorrectedMajors: 0, totalPoints: 0,
      };
    }
    case 'green_yellow_red_numeric': {
      // San Francisco — Green / Yellow / Red placard + numeric score (0-100), both published
      // CRITICAL: SF uses High/Moderate/Low RISK TIERS — not Major/Minor
      // GREEN=90-100, YELLOW=70-89, RED=<70 or imminent hazard
      const sfPass = jurisdiction.passThreshold || 90;
      const sfWarn = jurisdiction.warningThreshold || 70;
      if (score >= sfPass) {
        return { grade: 'GREEN', passFail: 'pass', display: `\u{1F7E2} Green — ${score}` };
      }
      if (score >= sfWarn) {
        return { grade: 'YELLOW', passFail: 'warning', display: `\u{1F7E1} Yellow — ${score} (Conditional Pass)` };
      }
      return { grade: 'RED', passFail: 'fail', display: `\u{1F534} Red — ${score} (Closed)` };
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
  facilityCount: number | null;
  tier: number;
}> = [
  { county: 'Los Angeles', agencyName: 'LA County DPH — Environmental Health Division', scoringType: 'weighted_deduction', gradingType: 'letter_grade', facilityCount: 88000, tier: 1 },
  { county: 'San Francisco', agencyName: 'San Francisco Department of Public Health (SFDPH) — Environmental Health Branch', scoringType: 'color_placard_and_numeric', gradingType: 'green_yellow_red_numeric', facilityCount: 7000, tier: 1 },
  { county: 'Sonoma', agencyName: 'Sonoma County DHS', scoringType: 'major_violation_count', gradingType: 'color_placard', facilityCount: 3200, tier: 1 },
  { county: 'Sacramento', agencyName: 'Sacramento County EMD', scoringType: 'major_violation_count', gradingType: 'color_placard', facilityCount: 8500, tier: 2 },
  { county: 'Orange', agencyName: 'Orange County Health Care Agency — Environmental Health Division', scoringType: 'major_minor_reinspect', gradingType: 'pass_reinspect', facilityCount: 17000, tier: 2 },
  { county: 'Yolo', agencyName: 'Yolo County Environmental Health Division', scoringType: 'color_placard', gradingType: 'green_yellow_red', facilityCount: 700, tier: 1 },
  { county: 'San Luis Obispo', agencyName: 'San Luis Obispo County Health Agency — Environmental Health Services Division', scoringType: 'numeric_score', gradingType: 'numeric_score', facilityCount: 2000, tier: 2 },
  { county: 'San Diego', agencyName: 'SD County DEH', scoringType: 'weighted_deduction', gradingType: 'letter_grade', facilityCount: 14000, tier: 3 },
  { county: 'Riverside', agencyName: 'Riverside County Department of Environmental Health', scoringType: 'weighted_deduction', gradingType: 'letter_grade_strict', facilityCount: 12000, tier: 3 },
  { county: 'San Bernardino', agencyName: 'San Bernardino County DPH — Environmental Health Services', scoringType: 'weighted_deduction', gradingType: 'letter_grade', facilityCount: 15000, tier: 3 },
  { county: 'Alameda', agencyName: 'Alameda County DEH', scoringType: 'weighted_deduction', gradingType: 'color_placard', facilityCount: 8500, tier: 3 },
  { county: 'Santa Clara', agencyName: 'Santa Clara County Public Health Department — Environmental Health Division', scoringType: 'color_placard_and_numeric', gradingType: 'green_yellow_red_numeric', facilityCount: 10000, tier: 1 },
  { county: 'Contra Costa', agencyName: 'Contra Costa Health', scoringType: 'major_violation_count', gradingType: 'color_placard', facilityCount: 5500, tier: 3 },
  { county: 'Fresno', agencyName: 'Fresno County Department of Public Health — Environmental Health Division', scoringType: 'violation_report', gradingType: 'violation_report_only', facilityCount: 11000, tier: 3 },
  { county: 'Kern', agencyName: 'Kern County Public Health Services — Environmental Health Division', scoringType: 'weighted_deduction', gradingType: 'letter_grade_abc', facilityCount: 3500, tier: 1 },
  { county: 'Ventura', agencyName: 'Ventura County Resource Management Agency — Environmental Health Division', scoringType: 'pass_fail_placard', gradingType: 'pass_fail_placard', facilityCount: 5000, tier: 2 },
  { county: 'San Mateo', agencyName: 'San Mateo County Health', scoringType: 'weighted_deduction', gradingType: 'score_100', facilityCount: 3800, tier: 3 },
  { county: 'San Joaquin', agencyName: 'San Joaquin County Environmental Health Department', scoringType: 'violation_report', gradingType: 'violation_report_only', facilityCount: 2882, tier: 3 },
  { county: 'Santa Barbara', agencyName: 'Santa Barbara County Public Health Department — Environmental Health Services', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 2000, tier: 3 },
  { county: 'Stanislaus', agencyName: 'Stanislaus County Environmental Resources', scoringType: 'violation_report', gradingType: 'violation_report_only', facilityCount: 2500, tier: 3 },
  { county: 'Monterey', agencyName: 'Monterey County Health Department — Environmental Health Bureau', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 2000, tier: 2 },
  { county: 'Tulare', agencyName: 'Tulare County Division of Environmental Health', scoringType: 'numeric_score', gradingType: 'numeric_score_no_letter', facilityCount: 3500, tier: 3 },
  { county: 'Placer', agencyName: 'Placer County Health and Human Services — Environmental Health Division', scoringType: 'color_placard', gradingType: 'green_yellow_red', facilityCount: 2200, tier: 1 },
  { county: 'Solano', agencyName: 'Solano County Department of Resource Management — Environmental Health Division', scoringType: 'inspection_report', gradingType: 'violation_report_only', facilityCount: 2200, tier: 3 },
  { county: 'Marin', agencyName: 'Marin County CDA', scoringType: 'weighted_deduction', gradingType: 'score_100', facilityCount: 1800, tier: 3 },
  { county: 'Napa', agencyName: 'Napa County Health and Human Services — Division of Environmental Health', scoringType: 'letter_grade', gradingType: 'letter_grade', facilityCount: null, tier: 2 },
  { county: 'Santa Cruz', agencyName: 'Santa Cruz County Environmental Health', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 2000, tier: 3 },
  { county: 'Butte', agencyName: 'Butte County Public Health Department — Environmental Health Division', scoringType: 'color_placard', gradingType: 'green_yellow_red', facilityCount: 1200, tier: 2 },
  { county: 'Shasta', agencyName: 'Shasta County Department of Resource Management — Environmental Health Division', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: null, tier: 3 },
  { county: 'El Dorado', agencyName: 'El Dorado County Environmental Management — Environmental Health Division', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 1200, tier: 3 },
  { county: 'Los Angeles', city: 'Long Beach', agencyName: 'Long Beach Health', scoringType: 'weighted_deduction', gradingType: 'letter_grade', facilityCount: 3000, tier: 3 },
  { county: 'Los Angeles', city: 'Pasadena', agencyName: 'Pasadena PH', scoringType: 'weighted_deduction', gradingType: 'score_100', facilityCount: 1200, tier: 3 },
  { county: 'Alameda', city: 'Berkeley', agencyName: 'Berkeley EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 800, tier: 3 },
  { county: 'Los Angeles', city: 'Vernon', agencyName: 'Vernon EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 100, tier: 3 },
  // Tier 4 — remaining 28 small/rural counties
  { county: 'Merced', agencyName: 'Merced County Department of Public Health — Division of Environmental Health', scoringType: 'point_accumulation', gradingType: 'point_accumulation_tiered', facilityCount: 3500, tier: 3 },
  { county: 'Madera', agencyName: 'Madera County Environmental Health Division', scoringType: 'violation_report', gradingType: 'violation_report_only', facilityCount: 800, tier: 4 },
  { county: 'Mariposa', agencyName: 'Mariposa County + NPS', scoringType: 'major_minor_reinspect', gradingType: 'pass_reinspect', facilityCount: 150, tier: 4 },
  { county: 'Kings', agencyName: 'Kings County Department of Public Health — EHS Division', scoringType: 'violation_report', gradingType: 'violation_report_only', facilityCount: 600, tier: 4 },
  { county: 'Humboldt', agencyName: 'Humboldt County DOH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 900, tier: 4 },
  { county: 'Imperial', agencyName: 'Imperial County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 900, tier: 4 },
  { county: 'Tuolumne', agencyName: 'Tuolumne County Community Development Department — Environmental Health Division', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 400, tier: 4 },
  { county: 'Nevada', agencyName: 'Nevada County Community Development Agency — Environmental Health Division', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 750, tier: 4 },
  { county: 'Mendocino', agencyName: 'Mendocino County Public Health — Environmental Health Division', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 600, tier: 4 },
  { county: 'Sutter', agencyName: 'Sutter County Development Services — Environmental Health Division', scoringType: 'color_placard', gradingType: 'green_yellow_red', facilityCount: 500, tier: 3 },
  { county: 'Yuba', agencyName: 'Yuba County Community Development Department — Environmental Health Division', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 600, tier: 4 },
  { county: 'Lake', agencyName: 'Lake County Health Services — Environmental Health Division', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 500, tier: 3 },
  { county: 'Tehama', agencyName: 'Tehama County Environmental Health Department', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 500, tier: 4 },
  { county: 'Calaveras', agencyName: 'Calaveras County Environmental Management Agency — Environmental Health Division', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 500, tier: 4 },
  { county: 'Siskiyou', agencyName: 'Siskiyou County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 300, tier: 4 },
  { county: 'San Benito', agencyName: 'San Benito County Health & Human Services Agency — Environmental Health', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 400, tier: 4 },
  { county: 'Amador', agencyName: 'Amador County Environmental Health Department', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 400, tier: 4 },
  { county: 'Glenn', agencyName: 'Glenn County Environmental Health — Planning and Community Development Services', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 200, tier: 4 },
  { county: 'Del Norte', agencyName: 'Del Norte County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 200, tier: 4 },
  { county: 'Lassen', agencyName: 'Lassen County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 200, tier: 4 },
  { county: 'Plumas', agencyName: 'Plumas County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 200, tier: 4 },
  { county: 'Colusa', agencyName: 'Colusa County Environmental Health — Development Services Department', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 140, tier: 4 },
  { county: 'Mono', agencyName: 'Mono County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 150, tier: 4 },
  { county: 'Inyo', agencyName: 'Inyo County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 150, tier: 4 },
  { county: 'Trinity', agencyName: 'Trinity County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 120, tier: 4 },
  { county: 'Modoc', agencyName: 'Modoc County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 80, tier: 4 },
  { county: 'Sierra', agencyName: 'Sierra County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 40, tier: 4 },
  { county: 'Alpine', agencyName: 'Alpine County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 20, tier: 4 },
];

// ═══════════════════════════════════════════════════════════
// DUAL-AUTHORITY JURISDICTION DATA PER DEMO LOCATION
// Each location has TWO independent authorities:
//   1. Food Safety (county health dept / CalCode)
//   2. Facility Safety (city fire dept / NFPA 96)
// These CANNOT be combined into a single score.
// ═══════════════════════════════════════════════════════════

export const demoLocationJurisdictions: Record<string, LocationJurisdiction> = {
  'demo-loc-downtown': {
    location_id: 'demo-loc-downtown',
    county: 'Fresno',
    foodSafety: {
      id: 'fresno-food',
      pillar: 'food_safety',
      agency_name: 'Fresno County Department of Public Health — Environmental Health Division',
      agency_phone: '(559) 600-3357',
      agency_website: 'https://www.fresnohealthinspections.com',
      code_basis: 'CalCode (updated Jan 1, 2025)',
      code_references: ['CalCode \u00A7113700+'],
      scoring_method: 'violation_report',
      grading_type: 'violation_report_only',
      grading_config: {
        grades: null,
        letterGrade: false,
        numericScore: false,
        gradeCardPosted: false,
        violationCategories: ['major', 'minor'],
        transparencyLevel: 'low',
      },
      inspection_frequency: null, // Grand Jury: 4x/year required but not met
      is_verified: true,
      local_amendments: null, // No local grading ordinance — CalCode only
    },
    facilitySafety: {
      id: 'fresno-fire',
      pillar: 'facility_safety',
      agency_name: 'City of Fresno Fire Department',
      agency_phone: '(559) 621-4120',
      agency_website: 'https://www.fresno.gov/fire/',
      code_basis: '2022 CFC (NFPA 96, 2021 ed.)',
      code_references: ['2022 CFC', 'NFPA 96 (2021)', 'NFPA 17A', 'NFPA 10', 'NFPA 25', 'NFPA 72'],
      scoring_method: 'pass_fail',
      grading_type: 'pass_fail',
      grading_config: { pass: 'Operational Permit Issued', fail: 'Operational Permit Denied/Revoked' },
      inspection_frequency: 1, // annual per NFPA 96
      is_verified: false, // using NFPA 96 baseline — individual AHJ grading not yet verified
      local_amendments: null, // TODO: verify Fresno local fire amendments
    },
    federalFoodOverlay: null,
    federalFireOverlay: null,
    food_safety_weight: null, // Not verified from source data
    facility_safety_weight: null,
    ops_weight: null,
    docs_weight: null,
  },

  'demo-loc-airport': {
    location_id: 'demo-loc-airport',
    county: 'Merced',
    foodSafety: {
      id: 'merced-food',
      pillar: 'food_safety',
      agency_name: 'Merced County Department of Public Health — Division of Environmental Health',
      agency_phone: '(209) 381-1100',
      agency_website: 'https://www.countyofmerced.com/departments/public-health',
      code_basis: 'CalCode (updated Jan 1, 2025)',
      code_references: ['CalCode \u00A7113700+', 'Merced County local requirements'],
      scoring_method: 'point_accumulation',
      grading_type: 'point_accumulation_tiered',
      grading_config: { tiers: { Good: [0, 6], Satisfactory: [7, 13], Unsatisfactory: [14, null] } },
      inspection_frequency: null, // TODO: verify Merced inspection frequency
      is_verified: true,
      local_amendments: null, // TODO: research Merced-specific additions to CalCode
    },
    facilitySafety: {
      id: 'merced-fire',
      pillar: 'facility_safety',
      agency_name: 'City of Merced Fire Department',
      agency_phone: '(209) 385-6891',
      agency_website: 'https://www.cityofmerced.org/departments/fire',
      code_basis: '2022 CFC (NFPA 96, 2021 ed.)',
      code_references: ['2022 CFC', 'NFPA 96 (2021)', 'NFPA 17A', 'NFPA 10', 'NFPA 25', 'NFPA 72'],
      scoring_method: 'pass_fail',
      grading_type: 'pass_fail',
      grading_config: { pass: 'Operational Permit Issued', fail: 'Operational Permit Denied/Revoked' },
      inspection_frequency: 1,
      is_verified: false,
      local_amendments: 'Merced County Fire Prevention Ordinance Sections 9.24.020-9.24.360',
    },
    federalFoodOverlay: null,
    federalFireOverlay: null,
    food_safety_weight: null, // Not verified from source data
    facility_safety_weight: null,
    ops_weight: null,
    docs_weight: null,
  },

  'demo-loc-university': {
    location_id: 'demo-loc-university',
    county: 'Stanislaus',
    foodSafety: {
      id: 'stanislaus-food',
      pillar: 'food_safety',
      agency_name: 'Stanislaus County Environmental Resources Department',
      agency_phone: '(209) 525-6700',
      agency_website: 'https://www.stancounty.com/er/environmental-health.shtm',
      code_basis: 'CalCode (updated Jan 1, 2025)',
      code_references: ['CalCode \u00A7113700+'],
      scoring_method: 'violation_report',
      grading_type: 'violation_report_only',
      grading_config: { transparency: 'low', public_display: 'none', data_access: 'CPRA_request_only' },
      inspection_frequency: 1, // Risk-based: high risk annually
      is_verified: true,
      local_amendments: null, // No local amendments to CalCode grading
    },
    facilitySafety: {
      id: 'modesto-fire',
      pillar: 'facility_safety',
      agency_name: 'Modesto Fire Department, Fire Prevention Division',
      agency_phone: '(209) 577-5232',
      agency_website: 'https://www.modestogov.com/170/Fire-Prevention',
      code_basis: '2022 CFC (NFPA 96, 2021 ed.)',
      code_references: ['2022 CFC', 'NFPA 96 (2021)', 'NFPA 17A', 'NFPA 10', 'NFPA 25', 'NFPA 72'],
      scoring_method: 'pass_fail',
      grading_type: 'pass_fail',
      grading_config: { pass: 'Operational Permit Issued', fail: 'Operational Permit Denied/Revoked' },
      inspection_frequency: 1,
      is_verified: false,
      local_amendments: null, // TODO: verify Modesto local fire amendments
    },
    federalFoodOverlay: null,
    federalFireOverlay: null,
    food_safety_weight: null, // Not verified from source data
    facility_safety_weight: null,
    ops_weight: null,
    docs_weight: null,
  },

  // ═══════════════════════════════════════════════════════════
  // YOSEMITE (ARAMARK) — MULTI-AHJ DEMO CASE
  // Dual food AHJ: Mariposa County + NPS (federal overlay)
  // Dual fire AHJ: CAL FIRE MMU + NPS Fire (federal overlay)
  // Compliance status = MORE STRINGENT of the two AHJs
  // ═══════════════════════════════════════════════════════════
  'demo-loc-yosemite': {
    location_id: 'demo-loc-yosemite',
    county: 'Mariposa',
    foodSafety: {
      id: 'mariposa-food',
      pillar: 'food_safety',
      agency_name: 'Mariposa County Environmental Health',
      agency_phone: '(209) 966-2061',
      agency_website: 'https://www.mariposacounty.org/181/Environmental-Health',
      code_basis: 'CalCode (updated Jan 1, 2025)',
      code_references: ['CalCode \u00A7113700+'],
      scoring_method: 'major_minor_reinspect',
      grading_type: 'pass_reinspect',
      grading_config: { outcomes: ['Pass', 'Reinspection Required', 'Closed'] },
      inspection_frequency: 2,
      is_verified: false,
      local_amendments: null,
    },
    facilitySafety: {
      id: 'mariposa-calfire',
      pillar: 'facility_safety',
      agency_name: 'CAL FIRE Madera-Mariposa-Merced Unit (MMU)',
      agency_phone: '(209) 966-3622',
      agency_website: 'https://www.fire.ca.gov/locations/madera-mariposa-merced-unit',
      code_basis: '2022 CFC (NFPA 96, 2021 ed.)',
      code_references: ['2022 CFC', 'NFPA 96 (2021)', 'NFPA 17A', 'NFPA 10'],
      scoring_method: 'pass_fail',
      grading_type: 'pass_fail',
      grading_config: { pass: 'Operational Permit Issued', fail: 'Operational Permit Denied/Revoked' },
      inspection_frequency: 1,
      is_verified: false,
      local_amendments: null,
    },
    federalFoodOverlay: {
      id: 'nps-yosemite-food',
      pillar: 'food_safety',
      agency_name: 'National Park Service \u2014 Yosemite Environmental Health',
      agency_phone: '(209) 372-0200',
      agency_website: 'https://www.nps.gov/yose/',
      code_basis: 'FDA Food Code 2022 (+ 2024 Supplement)',
      code_references: ['FDA Food Code 2022', '2024 FDA Supplement', 'NPS Reference Manual 83'],
      scoring_method: 'priority_violation_count',
      grading_type: 'compliance_report',
      grading_config: {
        outcomes: ['In Compliance', 'Priority Violation \u2014 Corrective Action', 'Closed'],
        violationCategories: ['priority_foundation', 'priority', 'core'],
        federalAuthority: 'NPS Public Health Program',
      },
      inspection_frequency: 4,
      is_verified: false,
      local_amendments: 'NPS Reference Manual 83 \u2014 concession food safety requirements',
    },
    federalFireOverlay: {
      id: 'nps-yosemite-fire',
      pillar: 'facility_safety',
      agency_name: 'National Park Service \u2014 Yosemite Structural Fire',
      agency_phone: '(209) 372-0200',
      agency_website: 'https://www.nps.gov/yose/',
      code_basis: 'NFPA 96 (2021) + NPS Director\'s Order 58',
      code_references: ['NFPA 96 (2021)', 'NPS DO-58', 'NPS RM-58'],
      scoring_method: 'pass_fail',
      grading_type: 'compliance_report',
      grading_config: { pass: 'Compliant', fail: 'Non-Compliant' },
      inspection_frequency: 1,
      is_verified: false,
      local_amendments: 'NPS Director\'s Order 58 \u2014 structural fire management in park units',
    },
    food_safety_weight: null,
    facility_safety_weight: null,
    ops_weight: null,
    docs_weight: null,
  },
};

