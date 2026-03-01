// ── Demo seed data for Kitchen Checkup ──────────────────────────────
// Pre-populated completed checkup: 78.5% overall (Grade C)
// Food Safety ~82%, Facility Safety ~75%

import type { Answer, Grade } from '../lib/kitchenCheckupScoring';

export interface DemoCheckupResult {
  id: string;
  foodSafetyScore: number;
  facilitySafetyScore: number;
  overallScore: number;
  grade: Grade;
  completedAt: string;
  responses: Record<string, Answer>;
}

// Completed 2 weeks ago
const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

export const DEMO_CHECKUP_RESULT: DemoCheckupResult = {
  id: 'demo-checkup-1',
  foodSafetyScore: 82.0,
  facilitySafetyScore: 75.0,
  overallScore: 78.5,
  grade: 'C',
  completedAt: twoWeeksAgo,
  responses: {
    // Food Safety — 82% (score: 8.2/10 avg → 82/100)
    // 10+10+6+10+10+6+10+10+0+10 = 82/100
    FS1: 'yes',     // Cold holding temps logged
    FS2: 'yes',     // Hot holding temps verified
    FS3: 'mostly',  // Delivery temps — mostly checked
    FS4: 'yes',     // Handwashing stations stocked
    FS5: 'yes',     // Raw/RTE stored separately
    FS6: 'mostly',  // Surfaces sanitized — mostly
    FS7: 'yes',     // Employee illness policy
    FS8: 'yes',     // Date marking
    FS9: 'no',      // Pest signs found (this is a negative question — "no" means compliant is ambiguous, but per the scoring "no" = not compliant)
    FS10: 'yes',    // Can produce 30-day logs
  },
};

// Facility Safety — 75% (score: 60/80, FAC8 is N/A)
// 10+6+10+6+6+10+6+na+6+0 = 60/80 = 75%
DEMO_CHECKUP_RESULT.responses.FAC1 = 'yes';     // Hood cleaned on schedule
DEMO_CHECKUP_RESULT.responses.FAC2 = 'mostly';  // Hood docs — mostly have them
DEMO_CHECKUP_RESULT.responses.FAC3 = 'yes';     // Fire suppression inspected
DEMO_CHECKUP_RESULT.responses.FAC4 = 'mostly';  // Fire extinguishers — monthly mostly
DEMO_CHECKUP_RESULT.responses.FAC5 = 'mostly';  // Grease trap — mostly on schedule
DEMO_CHECKUP_RESULT.responses.FAC6 = 'yes';     // Active pest control contract
DEMO_CHECKUP_RESULT.responses.FAC7 = 'mostly';  // Backflow — mostly tested
DEMO_CHECKUP_RESULT.responses.FAC8 = 'na';      // No elevator/dumbwaiter
DEMO_CHECKUP_RESULT.responses.FAC9 = 'mostly';  // Emergency exits — mostly clear
DEMO_CHECKUP_RESULT.responses.FAC10 = 'no';     // Can't produce 12-month records
