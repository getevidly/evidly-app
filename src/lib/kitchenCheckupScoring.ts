// ── Kitchen Checkup Scoring Engine ──────────────────────────────────
// Simple percentage-based scoring for 20 self-assessment questions
// across two pillars: Food Safety and Facility Safety.

export type Pillar = 'food_safety' | 'facility_safety';
export type Answer = 'yes' | 'mostly' | 'no' | 'na';
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface CheckupQuestion {
  id: string;
  pillar: Pillar;
  category: string;
  question: string;
}

export interface CheckupResult {
  foodSafetyScore: number;
  facilitySafetyScore: number;
  overallScore: number;
  grade: Grade;
  gradeLabel: string;
  gradeColor: string;
}

// ── Answer point values ─────────────────────────────────────────────
const ANSWER_POINTS: Record<Answer, number | null> = {
  yes: 10,
  mostly: 6,
  no: 0,
  na: null,
};

// ── Grade thresholds ────────────────────────────────────────────────
const GRADE_MAP: { min: number; grade: Grade; label: string; color: string }[] = [
  { min: 90, grade: 'A', label: 'Excellent — Inspection Ready', color: '#22C55E' },
  { min: 80, grade: 'B', label: 'Good — Minor Improvements Needed', color: '#3B82F6' },
  { min: 70, grade: 'C', label: 'Fair — Action Items Required', color: '#EAB308' },
  { min: 60, grade: 'D', label: 'Needs Attention — Significant Gaps', color: '#F97316' },
  { min: 0,  grade: 'F', label: 'Critical — Immediate Action Required', color: '#EF4444' },
];

// ── The 20 Questions ────────────────────────────────────────────────

export const KITCHEN_CHECKUP_QUESTIONS: CheckupQuestion[] = [
  // ── Food Safety (FS1–FS10) ──
  {
    id: 'FS1', pillar: 'food_safety', category: 'Temperature Monitoring',
    question: 'Are you logging temperatures for all cold holding units at least every 4 hours?',
  },
  {
    id: 'FS2', pillar: 'food_safety', category: 'Temperature Monitoring',
    question: 'Are hot holding temperatures verified and logged at required intervals?',
  },
  {
    id: 'FS3', pillar: 'food_safety', category: 'Receiving Procedures',
    question: 'Do you check and log temperatures of incoming deliveries?',
  },
  {
    id: 'FS4', pillar: 'food_safety', category: 'Handwashing',
    question: 'Are handwashing stations fully stocked and accessible at all times?',
  },
  {
    id: 'FS5', pillar: 'food_safety', category: 'Cross-Contamination',
    question: 'Are raw and ready-to-eat foods stored separately with proper labeling?',
  },
  {
    id: 'FS6', pillar: 'food_safety', category: 'Cleaning & Sanitizing',
    question: 'Are food contact surfaces cleaned and sanitized between uses?',
  },
  {
    id: 'FS7', pillar: 'food_safety', category: 'Employee Health',
    question: 'Do you have a written employee illness reporting policy that staff follow?',
  },
  {
    id: 'FS8', pillar: 'food_safety', category: 'Date Marking',
    question: 'Are all prepared foods date-marked with discard dates?',
  },
  {
    id: 'FS9', pillar: 'food_safety', category: 'Pest Prevention',
    question: 'Are there any signs of pest activity in food storage or prep areas?',
  },
  {
    id: 'FS10', pillar: 'food_safety', category: 'Documentation',
    question: 'Can you produce food safety logs from the past 30 days if asked by an inspector?',
  },

  // ── Facility Safety (FAC1–FAC10) ──
  {
    id: 'FAC1', pillar: 'facility_safety', category: 'Hood Cleaning',
    question: 'Is your kitchen exhaust hood system cleaned on schedule per NFPA 96 Table 12.4?',
  },
  {
    id: 'FAC2', pillar: 'facility_safety', category: 'Hood Cleaning',
    question: 'Do you have documentation of your most recent hood cleaning with before/after photos?',
  },
  {
    id: 'FAC3', pillar: 'facility_safety', category: 'Fire Suppression',
    question: 'Has your fire suppression system been inspected within the last 6 months?',
  },
  {
    id: 'FAC4', pillar: 'facility_safety', category: 'Fire Extinguishers',
    question: 'Are all fire extinguishers inspected monthly and serviced annually?',
  },
  {
    id: 'FAC5', pillar: 'facility_safety', category: 'Grease Trap',
    question: 'Is your grease trap/interceptor cleaned on schedule with service records?',
  },
  {
    id: 'FAC6', pillar: 'facility_safety', category: 'Pest Control',
    question: 'Do you have an active pest control service contract with regular visit documentation?',
  },
  {
    id: 'FAC7', pillar: 'facility_safety', category: 'Backflow Prevention',
    question: 'Has your backflow prevention device been tested within the last 12 months?',
  },
  {
    id: 'FAC8', pillar: 'facility_safety', category: 'Elevator Inspection',
    question: 'If applicable, are elevator/dumbwaiter inspections current?',
  },
  {
    id: 'FAC9', pillar: 'facility_safety', category: 'General Safety',
    question: 'Are emergency exits clear, marked, and illuminated?',
  },
  {
    id: 'FAC10', pillar: 'facility_safety', category: 'Documentation',
    question: 'Can you produce facility safety service records from the past 12 months if asked?',
  },
];

// ── Scoring ─────────────────────────────────────────────────────────

function pillarScore(answers: Record<string, Answer>, pillar: Pillar): number {
  let earned = 0;
  let possible = 0;
  for (const q of KITCHEN_CHECKUP_QUESTIONS) {
    if (q.pillar !== pillar) continue;
    const a = answers[q.id];
    if (!a || a === 'na') continue;
    const pts = ANSWER_POINTS[a];
    if (pts === null) continue;
    earned += pts;
    possible += 10;
  }
  return possible === 0 ? 0 : (earned / possible) * 100;
}

function assignGrade(score: number): { grade: Grade; label: string; color: string } {
  for (const g of GRADE_MAP) {
    if (score >= g.min) return { grade: g.grade, label: g.label, color: g.color };
  }
  return { grade: 'F', label: GRADE_MAP[4].label, color: GRADE_MAP[4].color };
}

export function computeKitchenCheckupScore(answers: Record<string, Answer>): CheckupResult {
  const foodSafetyScore = Math.round(pillarScore(answers, 'food_safety') * 10) / 10;
  const facilitySafetyScore = Math.round(pillarScore(answers, 'facility_safety') * 10) / 10;
  const overallScore = Math.round(((foodSafetyScore + facilitySafetyScore) / 2) * 10) / 10;
  const { grade, label: gradeLabel, color: gradeColor } = assignGrade(overallScore);
  return { foodSafetyScore, facilitySafetyScore, overallScore, grade, gradeLabel, gradeColor };
}

export function gradeColor(grade: Grade): string {
  return GRADE_MAP.find(g => g.grade === grade)?.color ?? '#EF4444';
}

export function gradeLabel(grade: Grade): string {
  return GRADE_MAP.find(g => g.grade === grade)?.label ?? '';
}
