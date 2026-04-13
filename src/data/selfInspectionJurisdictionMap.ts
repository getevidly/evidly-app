// ═══════════════════════════════════════════════════════════════════
// src/data/selfInspectionJurisdictionMap.ts
// Scoring config for ALL 62 California jurisdictions.
// Maps each jurisdiction to penalty weights, scoring type, grading
// type, and verification status for the self-inspection module.
// ═══════════════════════════════════════════════════════════════════

import type { ScoringType, GradingType } from './demoJurisdictions';
import { DEMO_JURISDICTIONS } from './demoJurisdictions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JurisdictionScoringConfig {
  key: string; // county or "county|city"
  county: string;
  city?: string;
  agencyName: string;
  penaltyWeights: { critical: number; major: number; minor: number };
  scoringType: ScoringType;
  gradingType: GradingType;
  codeBasis: 'calcode' | 'fda_food_code_2022';
  inspectionFrequency: string;
  configLastUpdated: string;
  isVerified: boolean;
  dataSourceTier: number;
  varianceNotes: string[];
}

// ---------------------------------------------------------------------------
// CalCode baseline penalties (used when jurisdiction has no explicit weights)
// ---------------------------------------------------------------------------

const CALCODE_BASELINE = { critical: 10, major: 5, minor: 2 };

// ---------------------------------------------------------------------------
// Extract penalty weights from a DemoJurisdiction's gradingConfig
// ---------------------------------------------------------------------------

function extractPenalties(config: Record<string, any> | undefined): {
  critical: number;
  major: number;
  minor: number;
} {
  if (!config) return CALCODE_BASELINE;

  // Explicit violationPoints (Santa Clara, Kern, etc.)
  if (config.violationPoints) {
    return {
      critical: config.violationPoints.major || config.violationPoints.critical || 8,
      major:
        config.violationPoints.moderate ||
        config.violationPoints.minorRiskFactor ||
        config.violationPoints.major ||
        5,
      minor:
        config.violationPoints.minor || config.violationPoints.nonCritical || 2,
    };
  }

  // Point accumulation (Merced model)
  if (config.pointValues) {
    return {
      critical: config.pointValues.critical || 4,
      major: config.pointValues.major || 2,
      minor: config.pointValues.minor || 1,
    };
  }

  return CALCODE_BASELINE;
}

// ---------------------------------------------------------------------------
// Build the full 62-jurisdiction map
// ---------------------------------------------------------------------------

function buildJurisdictionMap(): Record<string, JurisdictionScoringConfig> {
  const map: Record<string, JurisdictionScoringConfig> = {};

  // Index DEMO_JURISDICTIONS by county (and city if present)
  const demoByKey = new Map<string, (typeof DEMO_JURISDICTIONS)[number]>();
  for (const dj of DEMO_JURISDICTIONS) {
    demoByKey.set(dj.county, dj);
  }

  // All 62 jurisdictions (58 counties + Long Beach, Pasadena, Vernon, Berkeley)
  const allJurisdictions: Array<{
    county: string;
    city?: string;
    agencyName: string;
    scoringType: ScoringType;
    gradingType: GradingType;
    facilityCount: number | null;
    tier: number;
  }> = [
    // ── Tier 1 ─────────────────────────────────────────────────
    { county: 'Los Angeles', agencyName: 'LA County DPH \u2014 Environmental Health Division', scoringType: 'weighted_deduction', gradingType: 'letter_grade', facilityCount: 88000, tier: 1 },
    { county: 'San Francisco', agencyName: 'San Francisco DPH \u2014 Environmental Health Branch', scoringType: 'color_placard_and_numeric', gradingType: 'green_yellow_red_numeric', facilityCount: 7000, tier: 1 },
    { county: 'Santa Clara', agencyName: 'Santa Clara County PHD \u2014 Environmental Health Division', scoringType: 'color_placard_and_numeric', gradingType: 'green_yellow_red_numeric', facilityCount: 10000, tier: 1 },
    { county: 'Kern', agencyName: 'Kern County PHS \u2014 Environmental Health Division', scoringType: 'weighted_deduction', gradingType: 'letter_grade_abc', facilityCount: 3500, tier: 1 },
    { county: 'Sonoma', agencyName: 'Sonoma County DHS', scoringType: 'major_violation_count', gradingType: 'color_placard', facilityCount: 3200, tier: 1 },
    { county: 'Placer', agencyName: 'Placer County HHS \u2014 Environmental Health Division', scoringType: 'color_placard', gradingType: 'green_yellow_red', facilityCount: 2200, tier: 1 },
    { county: 'Yolo', agencyName: 'Yolo County Environmental Health Division', scoringType: 'color_placard', gradingType: 'green_yellow_red', facilityCount: 700, tier: 1 },

    // ── Tier 2 ─────────────────────────────────────────────────
    { county: 'Sacramento', agencyName: 'Sacramento County EMD', scoringType: 'major_violation_count', gradingType: 'color_placard', facilityCount: 8500, tier: 2 },
    { county: 'Orange', agencyName: 'Orange County HCA \u2014 Environmental Health Division', scoringType: 'major_minor_reinspect', gradingType: 'pass_reinspect', facilityCount: 17000, tier: 2 },
    { county: 'San Luis Obispo', agencyName: 'SLO County Health Agency \u2014 EHS Division', scoringType: 'numeric_score', gradingType: 'numeric_score', facilityCount: 2000, tier: 2 },
    { county: 'Ventura', agencyName: 'Ventura County RMA \u2014 Environmental Health Division', scoringType: 'pass_fail_placard' as ScoringType, gradingType: 'pass_fail_placard' as GradingType, facilityCount: 5000, tier: 2 },
    { county: 'Monterey', agencyName: 'Monterey County Health \u2014 Environmental Health Bureau', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 2000, tier: 2 },
    { county: 'Napa', agencyName: 'Napa County HHS \u2014 Division of Environmental Health', scoringType: 'letter_grade' as ScoringType, gradingType: 'letter_grade', facilityCount: null, tier: 2 },
    { county: 'Butte', agencyName: 'Butte County PH \u2014 Environmental Health Division', scoringType: 'color_placard', gradingType: 'green_yellow_red', facilityCount: 1200, tier: 2 },

    // ── Tier 3 ─────────────────────────────────────────────────
    { county: 'San Diego', agencyName: 'SD County DEH', scoringType: 'weighted_deduction', gradingType: 'letter_grade', facilityCount: 14000, tier: 3 },
    { county: 'Riverside', agencyName: 'Riverside County DEH', scoringType: 'weighted_deduction', gradingType: 'letter_grade_strict', facilityCount: 12000, tier: 3 },
    { county: 'San Bernardino', agencyName: 'San Bernardino County DPH \u2014 EHS', scoringType: 'weighted_deduction', gradingType: 'letter_grade', facilityCount: 15000, tier: 3 },
    { county: 'Alameda', agencyName: 'Alameda County DEH', scoringType: 'weighted_deduction', gradingType: 'color_placard', facilityCount: 8500, tier: 3 },
    { county: 'Contra Costa', agencyName: 'Contra Costa Health', scoringType: 'major_violation_count', gradingType: 'color_placard', facilityCount: 5500, tier: 3 },
    { county: 'Fresno', agencyName: 'Fresno County DPH \u2014 Environmental Health Division', scoringType: 'violation_report', gradingType: 'violation_report_only', facilityCount: 11000, tier: 3 },
    { county: 'Stanislaus', agencyName: 'Stanislaus County Environmental Resources', scoringType: 'violation_report', gradingType: 'violation_report_only', facilityCount: 2500, tier: 3 },
    { county: 'San Mateo', agencyName: 'San Mateo County Health', scoringType: 'weighted_deduction', gradingType: 'score_100', facilityCount: 3800, tier: 3 },
    { county: 'San Joaquin', agencyName: 'San Joaquin County EHD', scoringType: 'violation_report', gradingType: 'violation_report_only', facilityCount: 2882, tier: 3 },
    { county: 'Santa Barbara', agencyName: 'Santa Barbara County PH \u2014 EHS', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 2000, tier: 3 },
    { county: 'Tulare', agencyName: 'Tulare County Division of Environmental Health', scoringType: 'numeric_score', gradingType: 'numeric_score_no_letter' as GradingType, facilityCount: 3500, tier: 3 },
    { county: 'Solano', agencyName: 'Solano County \u2014 Environmental Health Division', scoringType: 'inspection_report', gradingType: 'violation_report_only', facilityCount: 2200, tier: 3 },
    { county: 'Marin', agencyName: 'Marin County CDA', scoringType: 'weighted_deduction', gradingType: 'score_100', facilityCount: 1800, tier: 3 },
    { county: 'Santa Cruz', agencyName: 'Santa Cruz County Environmental Health', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 2000, tier: 3 },
    { county: 'Shasta', agencyName: 'Shasta County \u2014 Environmental Health Division', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: null, tier: 3 },
    { county: 'El Dorado', agencyName: 'El Dorado County Environmental Management \u2014 EH', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 1200, tier: 3 },
    { county: 'Merced', agencyName: 'Merced County DPH \u2014 Division of Environmental Health', scoringType: 'point_accumulation', gradingType: 'point_accumulation_tiered', facilityCount: 3500, tier: 3 },
    { county: 'Sutter', agencyName: 'Sutter County Development Services \u2014 EH', scoringType: 'color_placard', gradingType: 'green_yellow_red', facilityCount: 500, tier: 3 },
    { county: 'Lake', agencyName: 'Lake County Health Services \u2014 EH', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 500, tier: 3 },
    { county: 'Yuba', agencyName: 'Yuba County \u2014 Environmental Health Division', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 600, tier: 3 },

    // ── Independent cities ─────────────────────────────────────
    { county: 'Los Angeles', city: 'Long Beach', agencyName: 'Long Beach Health Department', scoringType: 'weighted_deduction', gradingType: 'letter_grade', facilityCount: 3000, tier: 3 },
    { county: 'Los Angeles', city: 'Pasadena', agencyName: 'Pasadena Public Health', scoringType: 'weighted_deduction', gradingType: 'score_100', facilityCount: 1200, tier: 3 },
    { county: 'Alameda', city: 'Berkeley', agencyName: 'Berkeley Environmental Health', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 800, tier: 3 },
    { county: 'Los Angeles', city: 'Vernon', agencyName: 'Vernon Environmental Health', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 100, tier: 3 },

    // ── Tier 4 (small / rural) ─────────────────────────────────
    { county: 'Madera', agencyName: 'Madera County EH Division', scoringType: 'violation_report', gradingType: 'violation_report_only', facilityCount: 800, tier: 4 },
    { county: 'Mariposa', agencyName: 'Mariposa County + NPS', scoringType: 'major_minor_reinspect', gradingType: 'pass_reinspect', facilityCount: 150, tier: 4 },
    { county: 'Kings', agencyName: 'Kings County DPH \u2014 EHS Division', scoringType: 'violation_report', gradingType: 'violation_report_only', facilityCount: 600, tier: 4 },
    { county: 'Humboldt', agencyName: 'Humboldt County DOH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 900, tier: 4 },
    { county: 'Imperial', agencyName: 'Imperial County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 900, tier: 4 },
    { county: 'Tuolumne', agencyName: 'Tuolumne County \u2014 Environmental Health Division', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 400, tier: 4 },
    { county: 'Nevada', agencyName: 'Nevada County \u2014 Environmental Health Division', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 750, tier: 4 },
    { county: 'Mendocino', agencyName: 'Mendocino County PH \u2014 EH Division', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 600, tier: 4 },
    { county: 'Tehama', agencyName: 'Tehama County EH Department', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 500, tier: 4 },
    { county: 'Calaveras', agencyName: 'Calaveras County EMA \u2014 EH Division', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 500, tier: 4 },
    { county: 'Glenn', agencyName: 'Glenn County EH', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 200, tier: 4 },
    { county: 'Amador', agencyName: 'Amador County EH Department', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 400, tier: 4 },
    { county: 'San Benito', agencyName: 'San Benito County HHSA \u2014 EH', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 400, tier: 4 },
    { county: 'Colusa', agencyName: 'Colusa County EH', scoringType: 'inspection_report', gradingType: 'inspection_report', facilityCount: 140, tier: 4 },
    { county: 'Siskiyou', agencyName: 'Siskiyou County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 300, tier: 4 },
    { county: 'Del Norte', agencyName: 'Del Norte County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 200, tier: 4 },
    { county: 'Lassen', agencyName: 'Lassen County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 200, tier: 4 },
    { county: 'Plumas', agencyName: 'Plumas County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 200, tier: 4 },
    { county: 'Mono', agencyName: 'Mono County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 150, tier: 4 },
    { county: 'Inyo', agencyName: 'Inyo County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 150, tier: 4 },
    { county: 'Trinity', agencyName: 'Trinity County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 120, tier: 4 },
    { county: 'Modoc', agencyName: 'Modoc County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 80, tier: 4 },
    { county: 'Sierra', agencyName: 'Sierra County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 40, tier: 4 },
    { county: 'Alpine', agencyName: 'Alpine County EH', scoringType: 'weighted_deduction', gradingType: 'report_only', facilityCount: 20, tier: 4 },
  ];

  // Inspection frequency labels by scoring type
  const frequencyLabel = (st: ScoringType, tier: number): string => {
    if (tier <= 2) return 'Risk-based (1\u20133x/year)';
    if (st === 'weighted_deduction' || st === 'color_placard_and_numeric') return 'Risk-based (1\u20133x/year)';
    return 'Annual (1x/year)';
  };

  // Variance notes for known jurisdictions
  const varianceNotes: Record<string, string[]> = {
    'Riverside': ['Only A (90+) passes \u2014 B and C both = FAIL (Ordinance 493)'],
    'Kern': ['Closure threshold is 75 (not 70) \u2014 Chapter 8.58'],
    'San Bernardino': ['C grade (70-79) = mandatory re-score within 30 days'],
    'San Luis Obispo': ['Negative scoring (0 = perfect) \u2014 effective May 5, 2025'],
    'Merced': ['Point accumulation upward \u2014 Good/Satisfactory/Unsatisfactory'],
    'Napa': ['Rescore available 1x/year (fee required)'],
    'Orange': ['Pass/Reinspection Due-Pass/Closed placard \u2014 no letter grade'],
    'Santa Clara': ['Green / Yellow / Red + numeric score \u2014 Major=8pts, Moderate=3pts, Minor=2pts'],
    'Placer': ['Single uncorrected major = Yellow placard'],
    'Mariposa': ['Dual jurisdiction \u2014 Mariposa County CalCode + NPS FDA Food Code 2022'],
    'Los Angeles|Long Beach': ['Independent city \u2014 NOT under LA County DPH'],
    'Los Angeles|Pasadena': ['Independent city \u2014 NOT under LA County DPH'],
    'Los Angeles|Vernon': ['Independent city \u2014 industrial/food manufacturing focus'],
    'Alameda|Berkeley': ['Independent city \u2014 NOT under Alameda County DEH'],
  };

  for (const j of allJurisdictions) {
    const key = j.city ? `${j.county}|${j.city}` : j.county;
    const demo = demoByKey.get(j.city || j.county);
    const penalties = demo ? extractPenalties(demo.gradingConfig) : CALCODE_BASELINE;
    const isVerified = demo
      ? (demo.dataSourceTier <= 2)
      : false;

    map[key] = {
      key,
      county: j.county,
      city: j.city,
      agencyName: demo?.agencyName || j.agencyName,
      penaltyWeights: penalties,
      scoringType: j.scoringType,
      gradingType: j.gradingType,
      codeBasis: j.county === 'Mariposa' ? 'fda_food_code_2022' : 'calcode',
      inspectionFrequency: frequencyLabel(j.scoringType, j.tier),
      configLastUpdated: isVerified ? 'March 2026' : 'Not verified',
      isVerified,
      dataSourceTier: j.tier,
      varianceNotes: varianceNotes[key] || [],
    };
  }

  return map;
}

export const JURISDICTION_SCORING_MAP = buildJurisdictionMap();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up scoring config for a jurisdiction by county and optional city.
 * City-level lookup (Long Beach, Pasadena, Vernon, Berkeley) takes priority.
 */
export function getJurisdictionScoringConfig(
  county: string,
  city?: string,
): JurisdictionScoringConfig {
  // Try city-level first
  if (city) {
    const cityKey = `${county}|${city}`;
    if (JURISDICTION_SCORING_MAP[cityKey]) {
      return JURISDICTION_SCORING_MAP[cityKey];
    }
  }

  // Fall back to county
  if (JURISDICTION_SCORING_MAP[county]) {
    return JURISDICTION_SCORING_MAP[county];
  }

  // Ultimate fallback: CalCode baseline
  return {
    key: county,
    county,
    agencyName: `${county} County Environmental Health`,
    penaltyWeights: { critical: 10, major: 5, minor: 2 },
    scoringType: 'violation_report',
    gradingType: 'violation_report_only',
    codeBasis: 'calcode',
    inspectionFrequency: 'Annual (1x/year)',
    configLastUpdated: 'Not verified',
    isVerified: false,
    dataSourceTier: 4,
    varianceNotes: [],
  };
}

/** Returns all 62 jurisdiction keys */
export function getAllJurisdictionKeys(): string[] {
  return Object.keys(JURISDICTION_SCORING_MAP);
}

/** Returns the total count of configured jurisdictions */
export function getJurisdictionCount(): number {
  return Object.keys(JURISDICTION_SCORING_MAP).length;
}
