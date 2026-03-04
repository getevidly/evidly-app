// ============================================================
// Jurisdiction Scoring Engine — Layer 2 (Inspector-Grade Score)
// ============================================================
// Calculates county-specific inspection scores using deduction-based
// model that mirrors how actual health department inspectors grade.
// ============================================================

import type { ScoreImpactItem } from '../data/demoData';
import { findViolationMapping, getEffectiveSeverity, type ViolationSeverity } from '../data/violationMapping';

// ── Types ─────────────────────────────────────────────────────

export type InspectionSystemType =
  | 'letter_grade'
  | 'color_placard'
  | 'pass_fail'
  | 'violation_report'
  | 'point_accumulation'
  | 'color_placard_with_score'
  | 'inspection_report'
  | 'standard'
  | 'none';

export interface DeductionRule {
  critical: number;
  major: number;
  minor: number;
  good_practice: number;
}

export interface CountyGrade {
  label: string;
  color: string;
  passing: boolean;
  special?: string; // e.g. "Award of Excellence"
}

export interface CountyScoringProfile {
  countySlug: string;
  countyName: string;
  systemType: InspectionSystemType;
  startingScore: number;
  deductions: DeductionRule;
  getGrade: (score: number, hasCritical: boolean) => CountyGrade;
  /** Imminent health hazard auto-deduction (Alameda special) */
  imminentHealthHazardDeduction?: number;
}

export interface ViolationDetail {
  label: string;
  calCodeSection: string;
  severity: ViolationSeverity;
  deduction: number;
}

export interface JurisdictionScoreResult {
  systemType: InspectionSystemType;
  countyName: string;
  numericScore: number;
  grade: CountyGrade;
  violations: ViolationDetail[];
  totalDeductions: number;
  message?: string; // for non-CA or informational messages
}

// ── County Scoring Profiles ───────────────────────────────────

const LA_COUNTY: CountyScoringProfile = {
  countySlug: 'la',
  countyName: 'Los Angeles County',
  systemType: 'letter_grade',
  startingScore: 100,
  deductions: { critical: 4, major: 2, minor: 1, good_practice: 0 },
  getGrade: (score) => {
    if (score >= 90) return { label: 'A', color: '#22c55e', passing: true };
    if (score >= 80) return { label: 'B', color: '#eab308', passing: true };
    return { label: 'C', color: '#ef4444', passing: false };
  },
};

const SAN_DIEGO_COUNTY: CountyScoringProfile = {
  countySlug: 'san-diego',
  countyName: 'San Diego County',
  systemType: 'letter_grade',
  startingScore: 100,
  deductions: { critical: 4, major: 2, minor: 1, good_practice: 0 },
  getGrade: (score) => {
    if (score >= 90) return { label: 'A', color: '#22c55e', passing: true };
    if (score >= 80) return { label: 'B', color: '#eab308', passing: true };
    return { label: 'C', color: '#ef4444', passing: false };
  },
};

const KERN_COUNTY: CountyScoringProfile = {
  countySlug: 'kern',
  countyName: 'Kern County',
  systemType: 'letter_grade',
  startingScore: 100,
  deductions: { critical: 5, major: 5, minor: 3, good_practice: 1 },
  getGrade: (score) => {
    // Kern raised closure threshold to 75 (not 70). Kern County Code Ch 8.58.
    if (score >= 90) return { label: 'A', color: '#22c55e', passing: true };
    if (score >= 80) return { label: 'B', color: '#f59e0b', passing: false };
    if (score >= 75) return { label: 'C', color: '#ef4444', passing: false };
    return { label: 'Closure', color: '#ef4444', passing: false, special: 'Permit suspended — facility closed' };
  },
};

const RIVERSIDE_COUNTY: CountyScoringProfile = {
  countySlug: 'riverside',
  countyName: 'Riverside County',
  systemType: 'letter_grade',
  startingScore: 100,
  deductions: { critical: 4, major: 2, minor: 1, good_practice: 0 },
  getGrade: (score) => {
    if (score >= 95) return { label: 'A', color: '#22c55e', passing: true, special: 'Award of Excellence' };
    if (score >= 90) return { label: 'A', color: '#22c55e', passing: true };
    if (score >= 80) return { label: 'B', color: '#f59e0b', passing: false };
    return { label: 'C', color: '#ef4444', passing: false };
  },
};

const SAN_BERNARDINO_COUNTY: CountyScoringProfile = {
  countySlug: 'san-bernardino',
  countyName: 'San Bernardino County',
  systemType: 'letter_grade',
  startingScore: 100,
  deductions: { critical: 4, major: 2, minor: 1, good_practice: 0 },
  getGrade: (score) => {
    // B is minimum passing per SBCC §33.1403. C = mandatory re-score.
    if (score >= 90) return { label: 'A', color: '#22c55e', passing: true };
    if (score >= 80) return { label: 'B', color: '#eab308', passing: true };
    if (score >= 70) return { label: 'C', color: '#ef4444', passing: false, special: 'Mandatory re-score required within 30 days' };
    return { label: 'Below 70', color: '#ef4444', passing: false, special: 'Immediate closure / permit suspension' };
  },
};

const ALAMEDA_COUNTY: CountyScoringProfile = {
  countySlug: 'alameda',
  countyName: 'Alameda County',
  systemType: 'letter_grade',
  startingScore: 100,
  deductions: { critical: 4, major: 2, minor: 1, good_practice: 0 },
  imminentHealthHazardDeduction: 26,
  getGrade: (score) => {
    if (score >= 90) return { label: 'A', color: '#22c55e', passing: true };
    if (score >= 80) return { label: 'B', color: '#eab308', passing: true };
    return { label: 'C', color: '#ef4444', passing: false };
  },
};

const ORANGE_COUNTY: CountyScoringProfile = {
  countySlug: 'orange',
  countyName: 'Orange County',
  systemType: 'pass_fail',
  startingScore: 100,
  deductions: { critical: 100, major: 2, minor: 1, good_practice: 0 },
  getGrade: (_score, hasCritical) => {
    if (hasCritical) return { label: 'FAIL', color: '#ef4444', passing: false };
    return { label: 'PASS', color: '#22c55e', passing: true };
  },
};

const SACRAMENTO_COUNTY: CountyScoringProfile = {
  countySlug: 'sacramento',
  countyName: 'Sacramento County',
  systemType: 'color_placard',
  startingScore: 100,
  deductions: { critical: 4, major: 4, minor: 2, good_practice: 0 },
  getGrade: (score) => {
    if (score >= 85) return { label: 'GREEN', color: '#22c55e', passing: true };
    if (score >= 70) return { label: 'YELLOW', color: '#f59e0b', passing: true };
    return { label: 'RED', color: '#ef4444', passing: false };
  },
};

const FRESNO_COUNTY: CountyScoringProfile = {
  countySlug: 'fresno',
  countyName: 'Fresno County',
  systemType: 'violation_report',
  startingScore: 100,
  deductions: { critical: 4, major: 2, minor: 1, good_practice: 0 },
  getGrade: (_score, hasCritical) => {
    // Fresno has NO letter grade, NO numeric score — violation report only
    if (hasCritical) return { label: 'Major Violations', color: '#ef4444', passing: false };
    return { label: 'No Open Majors', color: '#22c55e', passing: true };
  },
};

const MERCED_COUNTY: CountyScoringProfile = {
  countySlug: 'merced',
  countyName: 'Merced County',
  systemType: 'point_accumulation',
  startingScore: 100,
  deductions: { critical: 4, major: 2, minor: 1, good_practice: 0 },
  getGrade: (score) => {
    // Merced uses point ACCUMULATION — points go UP with violations
    // Convert deductive score to accumulated points
    const points = 100 - score;
    if (points <= 6) return { label: 'Good', color: '#22c55e', passing: true };
    if (points <= 13) return { label: 'Satisfactory', color: '#f59e0b', passing: true };
    return { label: 'Unsatisfactory', color: '#ef4444', passing: false };
  },
};

const SANTA_CLARA_COUNTY: CountyScoringProfile = {
  countySlug: 'santa-clara',
  countyName: 'Santa Clara County',
  systemType: 'color_placard_with_score',
  startingScore: 100,
  deductions: { critical: 8, major: 3, minor: 2, good_practice: 0 },
  getGrade: (_score, hasCritical) => {
    // Santa Clara: GYR placard based on major violation COUNT + separate numeric score
    // GREEN = ≤1 major corrected, YELLOW = 2+ majors corrected, RED = imminent threat
    // In the scoring engine we use hasCritical as proxy for uncorrected violations
    if (hasCritical) return { label: 'RED', color: '#ef4444', passing: false, special: 'Closure — imminent health/safety threat' };
    // Without full violation count data, use score as proxy
    // Score itself is just compliance indicator; placard is the status
    return { label: 'GREEN', color: '#22c55e', passing: true };
  },
};

const MONTEREY_COUNTY: CountyScoringProfile = {
  countySlug: 'monterey',
  countyName: 'Monterey County',
  systemType: 'inspection_report',
  startingScore: 100,
  deductions: { critical: 4, major: 2, minor: 1, good_practice: 0 },
  getGrade: (_score, hasCritical) => {
    // Monterey has NO letter grade, NO numeric score, NO placard — inspection report + Gold Seal
    if (hasCritical) return { label: 'Major Violations', color: '#ef4444', passing: false };
    return { label: 'No Open Majors', color: '#22c55e', passing: true };
  },
};

const STANISLAUS_COUNTY: CountyScoringProfile = {
  countySlug: 'stanislaus',
  countyName: 'Stanislaus County',
  systemType: 'violation_report',
  startingScore: 100,
  deductions: { critical: 4, major: 2, minor: 1, good_practice: 0 },
  getGrade: (_score, hasCritical) => {
    // Stanislaus has NO letter grade, NO numeric score, NO placard — violation report only
    if (hasCritical) return { label: 'Major Violations', color: '#ef4444', passing: false };
    return { label: 'No Open Majors', color: '#22c55e', passing: true };
  },
};

const TULARE_COUNTY: CountyScoringProfile = {
  countySlug: 'tulare',
  countyName: 'Tulare County',
  systemType: 'standard', // numeric score, no letter grade
  startingScore: 100,
  deductions: { critical: 4, major: 2, minor: 1, good_practice: 0 },
  getGrade: (score) => {
    // Tulare uses numeric score only — NO letter grade, NO placard
    // Thresholds estimated — verify with county (559) 624-7400
    if (score >= 90) return { label: String(score), color: '#22c55e', passing: true };
    if (score >= 70) return { label: String(score), color: '#f59e0b', passing: true };
    return { label: String(score), color: '#ef4444', passing: false };
  },
};

const GENERIC_CALCODE: CountyScoringProfile = {
  countySlug: 'generic',
  countyName: 'California (Standard CalCode)',
  systemType: 'standard',
  startingScore: 100,
  deductions: { critical: 3, major: 3, minor: 1, good_practice: 0 },
  getGrade: (score) => {
    if (score >= 80) return { label: 'Satisfactory', color: '#22c55e', passing: true };
    if (score >= 60) return { label: 'Needs Correction', color: '#f59e0b', passing: false };
    return { label: 'Non-Compliant', color: '#ef4444', passing: false };
  },
};

// ── Profile Registry ──────────────────────────────────────────

const COUNTY_PROFILES: Record<string, CountyScoringProfile> = {
  'la': LA_COUNTY,
  'los-angeles': LA_COUNTY,
  'san-diego': SAN_DIEGO_COUNTY,
  'kern': KERN_COUNTY,
  'riverside': RIVERSIDE_COUNTY,
  'san-bernardino': SAN_BERNARDINO_COUNTY,
  'alameda': ALAMEDA_COUNTY,
  'orange': ORANGE_COUNTY,
  'sacramento': SACRAMENTO_COUNTY,
  'generic': GENERIC_CALCODE,
  'santa-clara': SANTA_CLARA_COUNTY,
  'monterey': MONTEREY_COUNTY,
  // Central Valley counties
  'fresno': FRESNO_COUNTY,
  'merced': MERCED_COUNTY,
  'stanislaus': STANISLAUS_COUNTY,
  'tulare': TULARE_COUNTY,
};

/**
 * Get the county scoring profile for a given county slug.
 * Falls back to generic CalCode for unknown CA counties.
 */
export function getCountyProfile(countySlug: string): CountyScoringProfile {
  return COUNTY_PROFILES[countySlug.toLowerCase()] ?? GENERIC_CALCODE;
}

/**
 * Extract county slug from a jurisdiction chain or county name.
 * e.g. "Fresno County" → "fresno", "county-fresno" → "fresno"
 */
export function extractCountySlug(countyNameOrId: string): string {
  return countyNameOrId
    .toLowerCase()
    .replace(/^county-/, '')
    .replace(/\s*county\s*$/i, '')
    .trim();
}

// ── Main Scoring Function ─────────────────────────────────────

/**
 * Calculate jurisdiction-specific inspection score for a location.
 *
 * Logic:
 * 1. Start at 100
 * 2. For each failing/overdue/expired/missing scoreImpactData item:
 *    - Match to violation via label pattern
 *    - Look up county-specific deduction
 *    - Apply deduction
 * 3. Skip `due_soon` and `current` items (not yet in violation)
 * 4. Return numeric score + grade
 */
export function calculateJurisdictionScore(
  scoreImpactItems: ScoreImpactItem[],
  countySlug: string,
): JurisdictionScoreResult {
  const profile = getCountyProfile(countySlug);

  // Non-CA: return EvidLY-only message
  if (profile.systemType === 'none') {
    return {
      systemType: 'none',
      countyName: 'Non-California',
      numericScore: 0,
      grade: { label: 'N/A', color: '#94a3b8', passing: true },
      violations: [],
      totalDeductions: 0,
      message: 'Jurisdiction scoring is only available for California counties. Your EvidLY score is displayed instead.',
    };
  }

  let score = profile.startingScore;
  const violations: ViolationDetail[] = [];
  let hasCritical = false;

  for (const item of scoreImpactItems) {
    // Only deduct for items actually in violation
    if (item.status === 'current' || item.status === 'due_soon') continue;

    const mapping = findViolationMapping(item.label);
    if (!mapping) continue;

    const severity = getEffectiveSeverity(mapping, countySlug);
    const deduction = profile.deductions[severity];

    if (severity === 'critical') hasCritical = true;

    // Alameda special: imminent health hazard (e.g. health permit expired)
    if (profile.imminentHealthHazardDeduction && severity === 'critical' && item.status === 'expired') {
      const bigDeduction = profile.imminentHealthHazardDeduction;
      score -= bigDeduction;
      violations.push({
        label: item.label,
        calCodeSection: mapping.calCodeSection,
        severity,
        deduction: bigDeduction,
      });
      continue;
    }

    score -= deduction;
    violations.push({
      label: item.label,
      calCodeSection: mapping.calCodeSection,
      severity,
      deduction,
    });
  }

  score = Math.max(0, score);
  const grade = profile.getGrade(score, hasCritical);

  return {
    systemType: profile.systemType,
    countyName: profile.countyName,
    numericScore: score,
    grade,
    violations,
    totalDeductions: profile.startingScore - score,
    message: grade.special ?? undefined,
  };
}

/**
 * Get all available county profiles for UI dropdowns.
 */
export function getAvailableCounties(): { slug: string; name: string; systemType: InspectionSystemType }[] {
  const seen = new Set<string>();
  return Object.entries(COUNTY_PROFILES)
    .filter(([slug, profile]) => {
      // Deduplicate aliases
      const key = profile.countySlug;
      if (seen.has(key)) return false;
      seen.add(key);
      // Only include the canonical slug
      return slug === profile.countySlug;
    })
    .map(([, profile]) => ({
      slug: profile.countySlug,
      name: profile.countyName,
      systemType: profile.systemType,
    }));
}
