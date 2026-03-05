// ═══════════════════════════════════════════════════════════════════
// src/lib/selfInspectionScoring.ts
// Jurisdiction-native scoring engine for the self-inspection module.
// Replaces the hardcoded computeScore() in SelfAudit.tsx.
// Scoring weights are ALWAYS pulled from the jurisdiction config —
// never hardcoded in the component.
// ═══════════════════════════════════════════════════════════════════

import type { DemoJurisdiction } from '../data/demoJurisdictions';
import { calculateDemoGrade } from '../data/demoJurisdictions';
import type { JurisdictionScoringConfig } from '../data/selfInspectionJurisdictionMap';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Severity = 'critical' | 'major' | 'minor';
export type ItemStatus = 'pass' | 'fail' | 'na' | null;

export interface CompletedItem {
  id: string;
  status: ItemStatus;
  severity: Severity;
}

export interface ScoreResult {
  /** Normalized 0-100 score for deductive systems, or total points for accumulation */
  rawScore: number;
  /** Total items evaluated (excludes NA and unanswered) */
  totalEvaluated: number;
  /** Count of failed items by severity */
  failCounts: { critical: number; major: number; minor: number };
  /** Total penalty points applied */
  totalPenalty: number;
  /** Scoring method used */
  scoringMethod: string;
}

export interface GradeResult {
  grade: string;
  passFail: 'pass' | 'fail' | 'warning' | 'no_grade';
  display: string;
  majorViolations?: number;
  minorViolations?: number;
  uncorrectedMajors?: number;
  totalPoints?: number;
}

// ---------------------------------------------------------------------------
// Scoring Functions
// ---------------------------------------------------------------------------

/**
 * Compute the jurisdiction-native score from completed inspection items.
 * Uses the jurisdiction's penalty weights and scoring method.
 */
export function computeJurisdictionScore(
  items: CompletedItem[],
  config: JurisdictionScoringConfig,
): ScoreResult {
  const { penaltyWeights, scoringType } = config;

  // Count failures by severity
  const failCounts = { critical: 0, major: 0, minor: 0 };
  let totalEvaluated = 0;

  for (const item of items) {
    if (item.status === 'na' || item.status === null) continue;
    totalEvaluated++;
    if (item.status === 'fail') {
      failCounts[item.severity]++;
    }
  }

  const totalPenalty =
    failCounts.critical * penaltyWeights.critical +
    failCounts.major * penaltyWeights.major +
    failCounts.minor * penaltyWeights.minor;

  // Compute raw score based on scoring method
  let rawScore: number;
  let scoringMethod: string;

  switch (scoringType) {
    case 'weighted_deduction':
    case 'color_placard_and_numeric':
    case 'heavy_weighted':
    case 'numeric_score': {
      // 100-pt deductive: start at 100, subtract penalties
      rawScore = Math.max(0, 100 - totalPenalty);
      scoringMethod = '100-Point Deductive';
      break;
    }

    case 'point_accumulation': {
      // Points accumulate upward (Merced model): lower = better
      // Return raw point total (NOT 100-based)
      // For grade lookup, we invert: normalizedScore = max(0, 100 - totalPenalty)
      rawScore = Math.max(0, 100 - totalPenalty);
      scoringMethod = 'Point Accumulation';
      break;
    }

    case 'major_violation_count':
    case 'color_placard': {
      // GYR placard: grade based on major violation count
      // Simulate a normalized score for grade lookup
      if (failCounts.critical + failCounts.major === 0) {
        rawScore = 95;
      } else if (failCounts.critical === 0 && failCounts.major <= 1) {
        rawScore = 85;
      } else if (failCounts.critical === 0 && failCounts.major <= 3) {
        rawScore = 70;
      } else {
        rawScore = 50;
      }
      scoringMethod = 'Major Violation Count';
      break;
    }

    case 'major_minor_reinspect': {
      // Pass/Reinspect: based on uncorrected major violations
      if (failCounts.critical === 0 && failCounts.major === 0) {
        rawScore = 95;
      } else if (failCounts.critical === 0) {
        rawScore = 80 - failCounts.major * 5;
      } else {
        rawScore = 60 - failCounts.critical * 10;
      }
      rawScore = Math.max(0, rawScore);
      scoringMethod = 'Pass / Reinspect';
      break;
    }

    case 'violation_report':
    case 'inspection_report':
    case 'report_only':
    default: {
      // No formal scoring — report violations only
      // Compute a normalized score for internal tracking
      if (totalEvaluated === 0) {
        rawScore = 100;
      } else {
        const maxPenalty = totalEvaluated * penaltyWeights.critical;
        rawScore = Math.max(
          0,
          Math.round(((maxPenalty - totalPenalty) / maxPenalty) * 100),
        );
      }
      scoringMethod = 'Violation Report';
      break;
    }
  }

  return {
    rawScore,
    totalEvaluated,
    failCounts,
    totalPenalty,
    scoringMethod,
  };
}

/**
 * Grade the inspection using the jurisdiction's native grading system.
 * Delegates to calculateDemoGrade() from demoJurisdictions.ts.
 */
export function gradeInspection(
  score: number,
  jurisdiction: DemoJurisdiction,
): GradeResult {
  return calculateDemoGrade(score, jurisdiction);
}

/**
 * Get the scoring method display label for a jurisdiction.
 */
export function getScoringMethodLabel(scoringType: string): string {
  const labels: Record<string, string> = {
    weighted_deduction: '100-Point Deductive',
    heavy_weighted: 'Heavy-Weighted Deductive',
    major_violation_count: 'Major Violation Count',
    negative_scale: 'Negative Scale (0 = perfect)',
    major_minor_reinspect: 'Pass / Reinspect',
    violation_point_accumulation: 'Point Accumulation',
    point_accumulation: 'Point Accumulation',
    numeric_score: 'Numeric Score',
    violation_report: 'Violation Report Only',
    report_only: 'Report Only',
    color_placard: 'Color Placard (GYR)',
    color_placard_and_numeric: 'GYR Placard + Numeric Score',
    inspection_report: 'Inspection Report Only',
    letter_grade: '100-Point Deductive',
    pass_fail_placard: 'Pass/Fail Placard',
  };
  return labels[scoringType] || 'Violation Report';
}

/**
 * Get the grading format display label for a jurisdiction.
 */
export function getGradingFormatLabel(gradingType: string): string {
  const labels: Record<string, string> = {
    letter_grade: 'Letter Grade (A/B/C)',
    letter_grade_strict: 'Letter Grade \u2014 A-Only Passes',
    letter_grade_abc: 'Letter Grade (A/B/C)',
    color_placard: 'Green/Yellow/Red Placard',
    green_yellow_red: 'Green/Yellow/Red Placard',
    green_yellow_red_numeric: 'GYR Placard + Numeric Score',
    score_100: 'Numeric Score (0\u2013100)',
    score_negative: 'Negative Scale',
    numeric_score: 'Numeric Score',
    numeric_score_no_letter: 'Numeric Score (no letter)',
    pass_reinspect: 'Pass / Reinspection Required',
    pass_fail_placard: 'Pass/Fail Placard',
    three_tier_rating: 'Good / Satisfactory / Unsatisfactory',
    point_accumulation_tiered: 'Good / Satisfactory / Unsatisfactory',
    violation_report_only: 'No Grade \u2014 Violation Report Only',
    report_only: 'No Grade \u2014 Report Only',
    inspection_report: 'No Grade \u2014 Inspection Report Only',
  };
  return labels[gradingType] || 'No Grade';
}

/**
 * Get the data source tier label.
 */
export function getTierLabel(tier: number): string {
  switch (tier) {
    case 1: return 'Verified';
    case 2: return 'Standardized';
    case 3: return 'Estimated';
    case 4: return 'Minimal';
    default: return 'Unknown';
  }
}

/**
 * Get the tier badge color classes.
 */
export function getTierColor(tier: number): string {
  switch (tier) {
    case 1: return 'bg-green-100 text-green-700 border-green-200';
    case 2: return 'bg-blue-100 text-blue-700 border-blue-200';
    case 3: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 4: return 'bg-gray-100 text-gray-500 border-gray-200';
    default: return 'bg-gray-100 text-gray-500 border-gray-200';
  }
}
