// ============================================================================
// Kitchen Checkup Scoring Engine — CHECKUP-1
// Two-layer scoring: Category Scores + 4-Area Impact Scores
// Config-driven — scoring rules are data, not hardcoded per-question logic
// ============================================================================

// ── Types ────────────────────────────────────────────────────────────────────

export interface CheckupQuestion {
  id: string;
  section: 'profile' | 'equipment' | 'operations';
  sectionLabel: string;
  label: string;
  options: { value: string; label: string }[];
  skipIf?: (answers: Record<string, string>) => boolean;
  freeText?: boolean; // show free-text input for "Other" option
}

export interface CheckupFinding {
  id: string;
  category: 'facility' | 'food' | 'documentation';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'positive';
  title: string;
  description: string;
  isPositive: boolean;
}

export interface RiskDriver {
  dimension: 'revenue' | 'liability' | 'cost' | 'operational';
  title: string;
  description: string;
  points: number;
}

export interface DollarEstimates {
  revenueRiskLow: number;
  revenueRiskHigh: number;
  liabilityRiskLow: number;
  liabilityRiskHigh: number;
  avoidableCosts: number;
  avoidableCostsHigh: number;
  operationalDays: number;
  operationalCostLow: number;
  operationalCostHigh: number;
  totalLow: number;
  totalHigh: number;
}

export interface CheckupScores {
  facilitySafety: number;
  foodSafety: number;
  documentation: number;
  revenueRisk: number;
  liabilityRisk: number;
  costRisk: number;
  operationalRisk: number;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  gradeLabel: string;
  findings: CheckupFinding[];
  riskDrivers: Record<string, RiskDriver[]>;
  estimates: DollarEstimates;
}

// ── Questions ────────────────────────────────────────────────────────────────

export const CHECKUP_QUESTIONS: CheckupQuestion[] = [
  // ── Section A — Business Profile ───────────────────────────────────────────
  {
    id: 'A1', section: 'profile', sectionLabel: 'Business Profile',
    label: 'What type of food establishment do you operate?',
    options: [
      { value: 'restaurant_full', label: 'Restaurant (full service)' },
      { value: 'restaurant_quick', label: 'Restaurant (quick service / fast food)' },
      { value: 'hotel', label: 'Hotel / resort with kitchen' },
      { value: 'hospital', label: 'Hospital / healthcare facility' },
      { value: 'school', label: 'School / education facility (K-12)' },
      { value: 'government', label: 'Government / military / correctional' },
      { value: 'catering', label: 'Catering company' },
      { value: 'food_truck', label: 'Food truck / mobile kitchen' },
      { value: 'ghost_kitchen', label: 'Ghost kitchen / commissary' },
      { value: 'bar', label: 'Bar / nightclub with kitchen' },
      { value: 'other', label: 'Other' },
    ],
    freeText: true,
  },
  {
    id: 'A2', section: 'profile', sectionLabel: 'Business Profile',
    label: 'How many kitchen locations do you operate?',
    options: [
      { value: '1', label: '1' },
      { value: '2-5', label: '2–5' },
      { value: '6-10', label: '6–10' },
      { value: '11-25', label: '11–25' },
      { value: '26+', label: '26+' },
    ],
  },
  {
    id: 'A3', section: 'profile', sectionLabel: 'Business Profile',
    label: 'How many meals/covers per day (approximate)?',
    options: [
      { value: 'under_100', label: 'Under 100' },
      { value: '100-300', label: '100–300' },
      { value: '300-500', label: '300–500' },
      { value: '500-1000', label: '500–1,000' },
      { value: '1000+', label: '1,000+' },
    ],
  },
  {
    id: 'A4', section: 'profile', sectionLabel: 'Business Profile',
    label: 'What is your approximate annual revenue?',
    options: [
      { value: 'under_500k', label: 'Under $500K' },
      { value: '500k-1m', label: '$500K – $1M' },
      { value: '1m-5m', label: '$1M – $5M' },
      { value: '5m-10m', label: '$5M – $10M' },
      { value: '10m+', label: '$10M+' },
      { value: 'prefer_not', label: 'Prefer not to say' },
    ],
  },

  // ── Section B — Your Kitchen & Equipment ───────────────────────────────────
  {
    id: 'B1', section: 'equipment', sectionLabel: 'Your Kitchen & Equipment',
    label: 'Do you have a commercial kitchen exhaust hood system?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'not_sure', label: 'Not sure' },
    ],
  },
  {
    id: 'B2', section: 'equipment', sectionLabel: 'Your Kitchen & Equipment',
    label: 'When was your last hood cleaning?',
    skipIf: (a) => a.B1 === 'no',
    options: [
      { value: 'within_month', label: 'Within the last month' },
      { value: '1-3_months', label: '1–3 months ago' },
      { value: '3-6_months', label: '3–6 months ago' },
      { value: '6-12_months', label: '6–12 months ago' },
      { value: 'over_year', label: 'Over a year ago' },
      { value: 'never', label: "Never / don't know" },
    ],
  },
  {
    id: 'B3', section: 'equipment', sectionLabel: 'Your Kitchen & Equipment',
    label: 'What type of cooking do you primarily do?',
    skipIf: (a) => a.B1 === 'no',
    options: [
      { value: 'solid_fuel', label: 'Solid-fuel (wood-fired, charcoal, smoker) — monthly cleaning' },
      { value: 'high_volume', label: 'High-volume (charbroiling, wok, deep frying) — quarterly cleaning' },
      { value: 'moderate', label: 'Moderate (grilling, sauteing, general) — semi-annual cleaning' },
      { value: 'low_volume', label: 'Low-volume (steam, baking, light cooking) — annual cleaning' },
      { value: 'not_sure', label: 'Not sure' },
    ],
  },
  {
    id: 'B4', section: 'equipment', sectionLabel: 'Your Kitchen & Equipment',
    label: 'Do you have a current hood cleaning certificate on file?',
    skipIf: (a) => a.B1 === 'no',
    options: [
      { value: 'yes_current', label: "Yes, and it's current" },
      { value: 'yes_expired', label: 'Yes, but it may be expired' },
      { value: 'no', label: 'No' },
      { value: 'dont_know', label: "Don't know" },
    ],
  },
  {
    id: 'B5', section: 'equipment', sectionLabel: 'Your Kitchen & Equipment',
    label: 'Do you have a fire suppression system (Ansul/wet chemical)?',
    options: [
      { value: 'yes_inspected', label: 'Yes, inspected within 6 months' },
      { value: 'yes_not_inspected', label: 'Yes, but not recently inspected' },
      { value: 'yes_unknown', label: "Yes, don't know last inspection" },
      { value: 'no', label: 'No' },
      { value: 'not_sure', label: 'Not sure' },
    ],
  },
  {
    id: 'B6', section: 'equipment', sectionLabel: 'Your Kitchen & Equipment',
    label: 'Do you have current fire extinguisher inspections?',
    options: [
      { value: 'yes_all', label: 'Yes, all inspected within 12 months' },
      { value: 'some', label: 'Some are current, some may be expired' },
      { value: 'no', label: "No / don't know" },
    ],
  },
  {
    id: 'B7', section: 'equipment', sectionLabel: 'Your Kitchen & Equipment',
    label: 'Do you operate any solid-fuel cooking equipment?',
    skipIf: (a) => a.B1 === 'no' || a.B3 === 'solid_fuel',
    options: [
      { value: 'yes_dedicated', label: 'Yes, with dedicated exhaust system' },
      { value: 'yes_shared', label: 'Yes, shared exhaust with standard hood' },
      { value: 'no', label: 'No solid-fuel cooking' },
      { value: 'not_sure', label: 'Not sure' },
    ],
  },
  {
    id: 'B8', section: 'equipment', sectionLabel: 'Your Kitchen & Equipment',
    label: 'Do you have an elevator on premises?',
    skipIf: (a) => !['hotel', 'hospital', 'school', 'government'].includes(a.A1),
    options: [
      { value: 'yes_inspected', label: 'Yes, inspected within 12 months' },
      { value: 'yes_not_inspected', label: 'Yes, not recently inspected' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'B9', section: 'equipment', sectionLabel: 'Your Kitchen & Equipment',
    label: 'Do you have a current pest control contract?',
    options: [
      { value: 'yes_monthly', label: 'Yes, monthly service' },
      { value: 'yes_quarterly', label: 'Yes, quarterly service' },
      { value: 'informal', label: 'No contract / informal' },
      { value: 'none', label: 'No pest control' },
    ],
  },
  {
    id: 'B10', section: 'equipment', sectionLabel: 'Your Kitchen & Equipment',
    label: 'When was your grease trap/interceptor last pumped?',
    options: [
      { value: 'within_month', label: 'Within the last month' },
      { value: '1-3_months', label: '1–3 months ago' },
      { value: '3-6_months', label: '3–6 months ago' },
      { value: 'over_6_months', label: 'Over 6 months ago' },
      { value: 'dont_have', label: "Don't have one / don't know" },
    ],
  },
  {
    id: 'B11', section: 'equipment', sectionLabel: 'Your Kitchen & Equipment',
    label: 'Do you have current grease trap pumping receipts/manifests on file?',
    options: [
      { value: 'yes_all', label: 'Yes, all current' },
      { value: 'some', label: 'Some on file, not organized' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'B12', section: 'equipment', sectionLabel: 'Your Kitchen & Equipment',
    label: 'Do you know how many gallons your grease trap collects per pumping?',
    options: [
      { value: 'yes_track', label: 'Yes, we track volume on every service' },
      { value: 'receipt_only', label: "The hauler gives us a receipt but we don't track volume" },
      { value: 'no_idea', label: 'No idea' },
    ],
  },
  {
    id: 'B13', section: 'equipment', sectionLabel: 'Your Kitchen & Equipment',
    label: 'Do you know where your collected grease is disposed?',
    options: [
      { value: 'yes_manifests', label: 'Yes, we have manifests showing the receiving facility' },
      { value: 'hauler_handles', label: "The hauler takes care of it, we don't track where" },
      { value: 'no_idea', label: 'No idea' },
    ],
  },
  {
    id: 'B14', section: 'equipment', sectionLabel: 'Your Kitchen & Equipment',
    label: 'When was your last backflow preventer test?',
    options: [
      { value: 'within_12', label: 'Within the past 12 months (current)' },
      { value: 'over_12', label: 'Over 12 months ago' },
      { value: 'never', label: "Never tested / don't know" },
      { value: 'what_is_that', label: "Don't know what that is" },
    ],
  },

  // ── Section C — Day-to-Day Operations ──────────────────────────────────────
  {
    id: 'C1', section: 'operations', sectionLabel: 'Day-to-Day Operations',
    label: 'How do you currently keep track of food safety?',
    options: [
      { value: 'paper', label: 'Paper checklists and binders' },
      { value: 'spreadsheets', label: 'Spreadsheets (Excel/Google Sheets)' },
      { value: 'software', label: 'Existing software' },
      { value: 'none', label: "We don't formally track it" },
    ],
    freeText: true,
  },
  {
    id: 'C2', section: 'operations', sectionLabel: 'Day-to-Day Operations',
    label: 'How do you track temperature logs?',
    options: [
      { value: 'manual', label: 'Manual paper logs' },
      { value: 'digital', label: 'Digital thermometer with logging' },
      { value: 'iot', label: 'IoT/automated sensors' },
      { value: 'none', label: "We don't consistently log temps" },
    ],
  },
  {
    id: 'C3', section: 'operations', sectionLabel: 'Day-to-Day Operations',
    label: 'Do you have a current HACCP plan?',
    options: [
      { value: 'yes_current', label: 'Yes, reviewed within the past year' },
      { value: 'yes_outdated', label: 'Yes, but outdated' },
      { value: 'no', label: 'No' },
      { value: 'not_sure', label: 'Not sure what that is' },
    ],
  },
  {
    id: 'C4', section: 'operations', sectionLabel: 'Day-to-Day Operations',
    label: 'When was your last health department inspection?',
    options: [
      { value: 'within_3', label: 'Within 3 months' },
      { value: '3-6_months', label: '3–6 months ago' },
      { value: '6-12_months', label: '6–12 months ago' },
      { value: 'over_year', label: 'Over a year ago' },
      { value: 'dont_know', label: "Don't know" },
    ],
  },
  {
    id: 'C5', section: 'operations', sectionLabel: 'Day-to-Day Operations',
    label: 'What was your most recent inspection score/grade?',
    options: [
      { value: 'a', label: 'A / 90–100 / Pass' },
      { value: 'b', label: 'B / 80–89 / Conditional Pass' },
      { value: 'c', label: 'C / 70–79 / Fail-Reinspect' },
      { value: 'below_70', label: 'Below 70 / Fail' },
      { value: 'dont_know', label: "Don't know" },
      { value: 'na', label: 'N/A (not graded)' },
    ],
  },
  {
    id: 'C6', section: 'operations', sectionLabel: 'Day-to-Day Operations',
    label: 'Do your food handlers have current food handler cards/certifications?',
    options: [
      { value: 'yes_all', label: 'Yes, all current' },
      { value: 'some', label: 'Some current, some expired' },
      { value: 'no', label: "No / don't know" },
    ],
  },
  {
    id: 'C7', section: 'operations', sectionLabel: 'Day-to-Day Operations',
    label: 'How do you manage vendor documents?',
    options: [
      { value: 'digital', label: 'Organized digital file system' },
      { value: 'paper', label: 'Paper files / binders' },
      { value: 'scattered', label: 'Whatever the vendor gives us, somewhere' },
      { value: 'none', label: "We don't track vendor documents" },
    ],
  },
  {
    id: 'C8', section: 'operations', sectionLabel: 'Day-to-Day Operations',
    label: 'Are you a Tier 1 or Tier 2 food generator under SB 1383?',
    skipIf: (a) => !isCaliforniaZip(a._zip || ''),
    options: [
      { value: 'tier_1', label: 'Yes, Tier 1' },
      { value: 'tier_2', label: 'Yes, Tier 2' },
      { value: 'not_sure', label: 'Not sure' },
      { value: 'na', label: 'Not applicable' },
    ],
  },
  {
    id: 'C9', section: 'operations', sectionLabel: 'Day-to-Day Operations',
    label: 'Do you maintain USDA daily production records?',
    skipIf: (a) => a.A1 !== 'school',
    options: [
      { value: 'yes_digital', label: 'Yes, digitally' },
      { value: 'yes_paper', label: 'Yes, on paper' },
      { value: 'no', label: 'No' },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** California zip codes start with 9 (900xx–961xx) */
function isCaliforniaZip(zip: string): boolean {
  const n = parseInt(zip, 10);
  return n >= 90000 && n <= 96199;
}

/** Return only questions visible given current answers */
export function getVisibleQuestions(
  answers: Record<string, string>,
  zipCode: string,
): CheckupQuestion[] {
  const ctx = { ...answers, _zip: zipCode };
  return CHECKUP_QUESTIONS.filter((q) => !q.skipIf || !q.skipIf(ctx));
}

// ── Scoring Config ───────────────────────────────────────────────────────────
// Each rule: { questionId, answerMatch(value) → bool, points by dimension }

interface ScoringRule {
  questionId: string;
  match: (value: string, answers: Record<string, string>) => boolean;
  facilitySafety?: number;
  foodSafety?: number;
  documentation?: number;
  revenueRisk?: number;
  liabilityRisk?: number;
  costRisk?: number;
  operationalRisk?: number;
}

/** Helper: is hood cleaning past due based on cooking type? */
function isHoodPastDue(answers: Record<string, string>): boolean {
  const cookType = answers.B3;
  const lastClean = answers.B2;
  if (!cookType || !lastClean) return false;

  // Required frequencies by cooking type
  const thresholds: Record<string, string[]> = {
    solid_fuel: ['3-6_months', '6-12_months', 'over_year', 'never'],  // monthly needed
    high_volume: ['6-12_months', 'over_year', 'never'],                // quarterly needed
    moderate: ['over_year', 'never'],                                   // semi-annual needed
    low_volume: ['never'],                                              // annual needed
    not_sure: ['6-12_months', 'over_year', 'never'],                   // assume moderate+
  };

  const pastDueValues = thresholds[cookType] || thresholds.not_sure;
  return pastDueValues.includes(lastClean);
}

const SCORING_RULES: ScoringRule[] = [
  // ── Facility Safety Category Rules ─────────────────────────────────────────
  {
    questionId: 'B2', match: (_v, a) => isHoodPastDue(a),
    facilitySafety: 30, revenueRisk: 20, liabilityRisk: 20, costRisk: 15, operationalRisk: 15,
  },
  {
    questionId: 'B3', match: (v, a) => v === 'solid_fuel' && isHoodPastDue(a),
    facilitySafety: 35, liabilityRisk: 25,
  },
  {
    questionId: 'B7', match: (v) => v === 'yes_shared',
    facilitySafety: 25, revenueRisk: 25, liabilityRisk: 25 /* (was missing — shared exhaust risk) */, operationalRisk: 20,
  },
  {
    questionId: 'B4', match: (v) => v === 'no' || v === 'dont_know',
    facilitySafety: 20, documentation: 20,
  },
  {
    questionId: 'B5', match: (v) => v === 'yes_not_inspected' || v === 'yes_unknown' || v === 'no' || v === 'not_sure',
    facilitySafety: 25, revenueRisk: 20, liabilityRisk: 25, costRisk: 15, operationalRisk: 20,
  },
  {
    questionId: 'B6', match: (v) => v === 'some' || v === 'no',
    facilitySafety: 15,
  },
  {
    questionId: 'B9', match: (v) => v === 'none',
    facilitySafety: 10, revenueRisk: 15, operationalRisk: 15,
  },
  {
    questionId: 'B8', match: (v) => v === 'yes_not_inspected',
    facilitySafety: 10, liabilityRisk: 15, costRisk: 10,
  },
  {
    questionId: 'B10', match: (v) => v === 'over_6_months' || v === 'dont_have',
    facilitySafety: 20, revenueRisk: 20, liabilityRisk: 15, costRisk: 20, operationalRisk: 20,
  },
  {
    questionId: 'B11', match: (v) => v === 'no',
    facilitySafety: 15, documentation: 15,
  },
  {
    questionId: 'B12', match: (v) => v === 'no_idea',
    facilitySafety: 10, documentation: 10 /* (implied: no volume tracking = doc gap) */,
  },
  {
    questionId: 'B13', match: (v) => v === 'hauler_handles' || v === 'no_idea',
    facilitySafety: 15, liabilityRisk: 20, documentation: 15, costRisk: 20,
  },
  {
    questionId: 'B14', match: (v) => v === 'over_12' || v === 'never',
    facilitySafety: 20, revenueRisk: 25, liabilityRisk: 15, costRisk: 15, operationalRisk: 25,
  },
  {
    questionId: 'B14', match: (v) => v === 'what_is_that',
    facilitySafety: 25, revenueRisk: 25, liabilityRisk: 15, costRisk: 15, operationalRisk: 25,
  },

  // ── Food Safety Category Rules ─────────────────────────────────────────────
  {
    questionId: 'C3', match: (v) => v === 'no' || v === 'not_sure',
    foodSafety: 25, revenueRisk: 15, liabilityRisk: 15, costRisk: 10, operationalRisk: 10,
  },
  {
    questionId: 'C1', match: (v) => v === 'paper',
    foodSafety: 15, operationalRisk: 10,
  },
  {
    questionId: 'C1', match: (v) => v === 'none',
    foodSafety: 30, liabilityRisk: 20, operationalRisk: 10 /* multi-loc no system */,
  },
  {
    questionId: 'C2', match: (v) => v === 'manual',
    foodSafety: 10,
  },
  {
    questionId: 'C2', match: (v) => v === 'none',
    foodSafety: 25, operationalRisk: 10,
  },
  {
    questionId: 'C6', match: (v) => v === 'some' || v === 'no',
    foodSafety: 15, revenueRisk: 10, liabilityRisk: 10 /* (missing from liability per spec — added) */, costRisk: 5, operationalRisk: 10,
  },
  {
    questionId: 'C5', match: (v) => v === 'c' || v === 'below_70',
    foodSafety: 20, revenueRisk: 15, liabilityRisk: 10, costRisk: 10,
  },

  // ── Documentation Category Rules ───────────────────────────────────────────
  {
    questionId: 'C7', match: (v) => v === 'none',
    documentation: 30, liabilityRisk: 20,
  },
  {
    questionId: 'C7', match: (v) => v === 'paper' || v === 'scattered',
    documentation: 20,
  },
  // B4 no cert already covered above (facilitySafety: 20, documentation: 20)
  // B11 no receipts already covered above (facilitySafety: 15, documentation: 15)
  {
    questionId: 'B14', match: (v) => v === 'never' || v === 'what_is_that',
    documentation: 15,
  },
  // B13 no disposal docs already covered above (documentation: 15)
  {
    questionId: 'C5', match: (v) => v === 'dont_know',
    documentation: 15,
  },
  {
    questionId: 'C8', match: (v) => v === 'not_sure',
    documentation: 15,
  },

  // ── Multi-location no central system (cross-cutting) ──────────────────────
  {
    questionId: 'A2', match: (v, a) => v !== '1' && (a.C1 === 'paper' || a.C1 === 'none'),
    revenueRisk: 10, operationalRisk: 15, costRisk: 10,
  },
];

// ── Scoring Engine ───────────────────────────────────────────────────────────

function cap100(n: number): number {
  return Math.min(100, Math.max(0, n));
}

export function computeCheckupScores(answers: Record<string, string>): CheckupScores {
  let facilitySafety = 0;
  let foodSafety = 0;
  let documentation = 0;
  let revenueRisk = 0;
  let liabilityRisk = 0;
  let costRisk = 0;
  let operationalRisk = 0;

  // Track which rules have fired to avoid double-counting from duplicate questionId rules
  // (B14 appears twice with different matches — both can fire independently)
  for (const rule of SCORING_RULES) {
    const value = answers[rule.questionId];
    if (value === undefined) continue;
    if (!rule.match(value, answers)) continue;

    facilitySafety += rule.facilitySafety || 0;
    foodSafety += rule.foodSafety || 0;
    documentation += rule.documentation || 0;
    revenueRisk += rule.revenueRisk || 0;
    liabilityRisk += rule.liabilityRisk || 0;
    costRisk += rule.costRisk || 0;
    operationalRisk += rule.operationalRisk || 0;
  }

  // Cap all scores at 100
  facilitySafety = cap100(facilitySafety);
  foodSafety = cap100(foodSafety);
  documentation = cap100(documentation);
  revenueRisk = cap100(revenueRisk);
  liabilityRisk = cap100(liabilityRisk);
  costRisk = cap100(costRisk);
  operationalRisk = cap100(operationalRisk);

  // Overall grade: average of 4 impact areas
  const avg = (revenueRisk + liabilityRisk + costRisk + operationalRisk) / 4;

  let overallGrade: CheckupScores['overallGrade'];
  let gradeLabel: string;
  if (avg < 25) {
    overallGrade = 'A';
    gradeLabel = 'Looking good';
  } else if (avg <= 45) {
    overallGrade = 'B';
    gradeLabel = 'Mostly there';
  } else if (avg <= 65) {
    overallGrade = 'C';
    gradeLabel = 'Some things need attention';
  } else if (avg <= 80) {
    overallGrade = 'D';
    gradeLabel = 'Several things to address';
  } else {
    overallGrade = 'F';
    gradeLabel = 'Needs work';
  }

  const findings = generateFindings(answers);
  const riskDrivers = generateRiskDrivers(answers);
  const estimates = computeDollarEstimates(answers, { revenueRisk, liabilityRisk, costRisk, operationalRisk });

  return {
    facilitySafety,
    foodSafety,
    documentation,
    revenueRisk,
    liabilityRisk,
    costRisk,
    operationalRisk,
    overallGrade,
    gradeLabel,
    findings,
    riskDrivers,
    estimates,
  };
}

// ── Findings Generation ──────────────────────────────────────────────────────

const COOKING_FREQUENCY: Record<string, string> = {
  solid_fuel: 'monthly',
  high_volume: 'quarterly',
  moderate: 'every six months',
  low_volume: 'annually',
  not_sure: 'quarterly to semi-annually',
};

const LAST_CLEAN_LABELS: Record<string, string> = {
  within_month: 'within the last month',
  '1-3_months': '1–3 months ago',
  '3-6_months': '3–6 months ago',
  '6-12_months': '6–12 months ago',
  over_year: 'over a year ago',
  never: 'never (or unknown)',
};

function generateFindings(answers: Record<string, string>): CheckupFinding[] {
  const f: CheckupFinding[] = [];
  let id = 0;
  const add = (
    cat: CheckupFinding['category'],
    sev: CheckupFinding['severity'],
    title: string,
    desc: string,
  ) => {
    f.push({ id: `f-${++id}`, category: cat, severity: sev, title, description: desc, isPositive: sev === 'positive' });
  };

  // ── Hood cleaning ──
  if (answers.B2 && answers.B3 && isHoodPastDue(answers)) {
    const freq = COOKING_FREQUENCY[answers.B3] || 'quarterly';
    const last = LAST_CLEAN_LABELS[answers.B2] || answers.B2;
    add('facility', 'high', 'Hood cleaning past schedule',
      `Your last hood cleaning was ${last}. For your cooking type, it's usually done ${freq} per NFPA 96.`);
  } else if (answers.B2 && !isHoodPastDue(answers) && answers.B1 !== 'no') {
    add('facility', 'positive', 'Hood cleaning on schedule',
      'Your hood cleaning looks current for your cooking type.');
  }

  // ── Solid-fuel shared exhaust ──
  if (answers.B7 === 'yes_shared') {
    add('facility', 'high', 'Solid-fuel shared exhaust',
      'Your solid-fuel equipment shares an exhaust with your standard hoods. These typically need their own dedicated system.');
  }

  // ── Hood cleaning cert ──
  if (answers.B4 === 'no' || answers.B4 === 'dont_know') {
    add('documentation', 'medium', 'No hood cleaning certificate on file',
      'No current hood cleaning certificate on file. Worth getting one from your cleaning provider.');
  } else if (answers.B4 === 'yes_current') {
    add('documentation', 'positive', 'Hood cleaning certificate current',
      'Your hood cleaning certificate is current — good to have on hand.');
  }

  // ── Fire suppression ──
  if (answers.B5 === 'yes_not_inspected' || answers.B5 === 'yes_unknown') {
    add('facility', 'high', 'Fire suppression not recently inspected',
      "Your fire suppression system doesn't have a recent inspection on file. Most insurance policies expect this to be current.");
  } else if (answers.B5 === 'no' || answers.B5 === 'not_sure') {
    add('facility', 'medium', 'No fire suppression system',
      'No fire suppression system on record. Most commercial kitchens with cooking hoods need one.');
  } else if (answers.B5 === 'yes_inspected') {
    add('facility', 'positive', 'Fire suppression inspected',
      "Your fire suppression was inspected within 6 months — that's current.");
  }

  // ── Fire extinguishers ──
  if (answers.B6 === 'no') {
    add('facility', 'medium', 'Fire extinguisher inspections missing',
      'Fire extinguishers need annual inspection. Worth checking if yours are current.');
  }

  // ── Pest control ──
  if (answers.B9 === 'none') {
    add('facility', 'medium', 'No pest control service',
      'No pest control on record. Regular service helps prevent issues before they start.');
  } else if (answers.B9 === 'yes_quarterly') {
    add('facility', 'positive', 'Pest control on schedule',
      'Your pest control is on a quarterly schedule — that covers most kitchen types.');
  } else if (answers.B9 === 'yes_monthly') {
    add('facility', 'positive', 'Monthly pest control',
      'Monthly pest control — thorough coverage.');
  }

  // ── Elevator ──
  if (answers.B8 === 'yes_not_inspected') {
    add('facility', 'medium', 'Elevator not recently inspected',
      'Your elevator hasn\'t had a recent inspection. Most jurisdictions require annual certification.');
  }

  // ── Grease trap ──
  if (answers.B10 === 'over_6_months' || answers.B10 === 'dont_have') {
    add('facility', 'high', 'Grease trap service past due',
      "Your grease trap hasn't been pumped recently. Most districts expect regular service on a set schedule.");
  }
  if (answers.B11 === 'no') {
    add('documentation', 'medium', 'No grease trap pumping receipts',
      'No pumping receipts/manifests on file. Worth keeping these — they show your service history.');
  }
  if (answers.B12 === 'no_idea') {
    add('documentation', 'low', 'No grease volume tracking',
      "You're not tracking how much grease is collected per pumping. This can help right-size your service schedule.");
  }
  if (answers.B13 === 'hauler_handles' || answers.B13 === 'no_idea') {
    add('documentation', 'medium', 'No disposal tracking',
      "No disposal receipts on file for your grease trap. Worth having these — they show where your grease went.");
  }

  // ── Backflow ──
  if (answers.B14 === 'over_12' || answers.B14 === 'never') {
    add('facility', 'high', 'Backflow preventer test past due',
      "Your backflow preventer hasn't been tested recently. Most water districts ask for this annually.");
  } else if (answers.B14 === 'what_is_that') {
    add('facility', 'high', 'Backflow preventer unknown',
      "A backflow preventer stops contaminated water from flowing back into the public supply. Most water districts require annual testing.");
  } else if (answers.B14 === 'within_12') {
    add('facility', 'positive', 'Backflow test current',
      'Your backflow preventer test is current.');
  }

  // ── Food safety tracking ──
  if (answers.C1 === 'paper') {
    add('food', 'low', 'Paper-based food safety tracking',
      "You're tracking food safety on paper. Kitchens that go digital tend to do better on inspections.");
  } else if (answers.C1 === 'none') {
    add('food', 'high', 'No food safety tracking',
      "No formal food safety tracking in place. This is one of the first things an inspector looks for.");
  }

  // ── Temp logs ──
  if (answers.C2 === 'none') {
    add('food', 'high', 'No temperature logging',
      'No consistent temperature logging. This is a key inspection item and an easy one to address.');
  } else if (answers.C2 === 'manual') {
    add('food', 'low', 'Manual temp logs',
      "Manual paper temp logs work, but digital logging saves time and creates a cleaner audit trail.");
  }

  // ── HACCP ──
  if (answers.C3 === 'no' || answers.C3 === 'not_sure') {
    add('food', 'high', 'No HACCP plan',
      "No HACCP plan on record. It's the foundation of food safety management and most inspectors expect one.");
  }

  // ── Inspection score ──
  if (answers.C5 === 'c' || answers.C5 === 'below_70') {
    add('food', 'high', 'Low inspection score',
      'Your last inspection score was below expectations. Addressing the items above should help improve it.');
  }

  // ── Food handler cards ──
  if (answers.C6 === 'some' || answers.C6 === 'no') {
    add('food', 'medium', 'Food handler certifications need renewal',
      'Some food handler cards may be expired. Most jurisdictions require all handlers to be current.');
  } else if (answers.C6 === 'yes_all') {
    add('food', 'positive', 'Food handler certifications current',
      'Your food handler certifications are current — nice.');
  }

  // ── Vendor documents ──
  if (answers.C7 === 'none') {
    add('documentation', 'high', 'No vendor document tracking',
      "You're not tracking vendor documents. When you need proof of insurance or a certificate, it helps to have it on hand.");
  } else if (answers.C7 === 'scattered') {
    add('documentation', 'medium', 'Vendor documents disorganized',
      'Vendor documents are scattered. A central system saves time when you need to find something.');
  }

  // ── SB 1383 ──
  if (answers.C8 === 'not_sure') {
    add('documentation', 'medium', 'SB 1383 status unclear',
      "You're not sure about your SB 1383 tier. California food generators need to know their classification for organic waste compliance.");
  }

  return f;
}

// ── Risk Drivers Generation ──────────────────────────────────────────────────

interface DriverConfig {
  dimension: RiskDriver['dimension'];
  questionId: string;
  match: (v: string, a: Record<string, string>) => boolean;
  title: string;
  description: string;
  points: number;
}

const DRIVER_CONFIGS: DriverConfig[] = [
  // Revenue / Business Continuity
  { dimension: 'revenue', questionId: 'B14', match: (v) => v === 'over_12' || v === 'never' || v === 'what_is_that',
    title: 'Backflow test past due', description: 'Water district may follow up — could affect service', points: 25 },
  { dimension: 'revenue', questionId: 'B2', match: (_v, a) => isHoodPastDue(a),
    title: 'Hood cleaning past schedule', description: 'Past-due cleaning can lead to forced kitchen closure', points: 20 },
  { dimension: 'revenue', questionId: 'B7', match: (v) => v === 'yes_shared',
    title: 'Shared solid-fuel exhaust', description: 'Code violation risk — may require retrofit', points: 25 },
  { dimension: 'revenue', questionId: 'B5', match: (v) => v !== 'yes_inspected',
    title: 'Fire suppression overdue', description: 'Insurance or fire marshal could require closure until inspected', points: 20 },
  { dimension: 'revenue', questionId: 'B10', match: (v) => v === 'over_6_months' || v === 'dont_have',
    title: 'Grease trap past due', description: 'Backup or overflow can shut down the kitchen', points: 20 },
  { dimension: 'revenue', questionId: 'B9', match: (v) => v === 'none',
    title: 'No pest control', description: 'Infestation can trigger immediate closure', points: 15 },
  { dimension: 'revenue', questionId: 'C5', match: (v) => v === 'c' || v === 'below_70',
    title: 'Low inspection score', description: 'Follow-up inspections and potential closure risk', points: 15 },
  { dimension: 'revenue', questionId: 'C3', match: (v) => v === 'no' || v === 'not_sure',
    title: 'No HACCP plan', description: 'Missing foundational food safety documentation', points: 15 },
  { dimension: 'revenue', questionId: 'C6', match: (v) => v === 'some' || v === 'no',
    title: 'Expired food handler cards', description: 'Staff may not be allowed to work until renewed', points: 10 },
  { dimension: 'revenue', questionId: 'A2', match: (v, a) => v !== '1' && (a.C1 === 'paper' || a.C1 === 'none'),
    title: 'Multi-location without central system', description: 'Harder to maintain consistency across sites', points: 10 },

  // Liability / Exposure
  { dimension: 'liability', questionId: 'B5', match: (v) => v !== 'yes_inspected',
    title: 'Fire suppression not current', description: 'Insurance coverage may be affected', points: 25 },
  { dimension: 'liability', questionId: 'B3', match: (v, a) => v === 'solid_fuel' && isHoodPastDue(a),
    title: 'Solid-fuel past due', description: 'Higher fire risk with solid-fuel cooking and overdue cleaning', points: 25 },
  { dimension: 'liability', questionId: 'B2', match: (_v, a) => isHoodPastDue(a),
    title: 'Hood cleaning overdue', description: 'Grease buildup increases fire risk and liability', points: 20 },
  { dimension: 'liability', questionId: 'B13', match: (v) => v === 'hauler_handles' || v === 'no_idea',
    title: 'No grease disposal receipts', description: 'No proof of proper disposal — potential environmental liability', points: 20 },
  { dimension: 'liability', questionId: 'C7', match: (v) => v === 'none',
    title: 'No documentation system', description: "Can't demonstrate compliance if challenged", points: 20 },
  { dimension: 'liability', questionId: 'B10', match: (v) => v === 'over_6_months' || v === 'dont_have',
    title: 'Grease trap past due', description: 'FOG discharge violations carry significant fines', points: 15 },
  { dimension: 'liability', questionId: 'B14', match: (v) => v === 'over_12' || v === 'never' || v === 'what_is_that',
    title: 'Backflow test concerns', description: 'Public water contamination is a serious liability', points: 15 },
  { dimension: 'liability', questionId: 'C3', match: (v) => v === 'no' || v === 'not_sure',
    title: 'No HACCP plan', description: 'Weaker defense in any food safety incident', points: 15 },
  { dimension: 'liability', questionId: 'B8', match: (v) => v === 'yes_not_inspected',
    title: 'Elevator not inspected', description: 'Liability exposure if an incident occurs', points: 15 },
  { dimension: 'liability', questionId: 'C5', match: (v) => v === 'c' || v === 'below_70',
    title: 'Poor inspection score', description: 'Documented compliance issues on public record', points: 10 },

  // Cost / Avoidable Costs
  { dimension: 'cost', questionId: 'B10', match: (v) => v === 'over_6_months' || v === 'dont_have',
    title: 'Emergency grease trap pumping', description: 'Emergency service costs 2-3x regular pumping', points: 20 },
  { dimension: 'cost', questionId: 'B13', match: (v) => v === 'hauler_handles' || v === 'no_idea',
    title: 'Grease district fines', description: 'Improper disposal documentation can lead to fines', points: 20 },
  { dimension: 'cost', questionId: 'B2', match: (_v, a) => isHoodPastDue(a),
    title: 'Hood cleaning emergency premium', description: 'Rush cleaning costs significantly more than scheduled service', points: 15 },
  { dimension: 'cost', questionId: 'B5', match: (v) => v !== 'yes_inspected',
    title: 'Fire suppression emergency fee', description: 'Emergency inspection costs more than scheduled service', points: 15 },
  { dimension: 'cost', questionId: 'B14', match: (v) => v === 'over_12' || v === 'never' || v === 'what_is_that',
    title: 'Backflow emergency test', description: 'Rush testing costs more than scheduled annual testing', points: 15 },
  { dimension: 'cost', questionId: 'C5', match: (v) => v === 'c' || v === 'below_70',
    title: 'Re-inspection fees', description: 'Failed inspections trigger re-inspection charges', points: 10 },
  { dimension: 'cost', questionId: 'B8', match: (v) => v === 'yes_not_inspected',
    title: 'Elevator emergency inspection', description: 'Emergency inspection premium', points: 10 },
  { dimension: 'cost', questionId: 'C3', match: (v) => v === 'no' || v === 'not_sure',
    title: 'HACCP consultant fee', description: 'May need professional help to create a compliant plan', points: 10 },
  { dimension: 'cost', questionId: 'C6', match: (v) => v === 'some' || v === 'no',
    title: 'Food handler renewals', description: 'Rush renewal costs more than keeping cards current', points: 5 },
  { dimension: 'cost', questionId: 'A2', match: (v, a) => v !== '1' && (a.C1 === 'paper' || a.C1 === 'none'),
    title: 'Manual tracking staff time', description: 'Paper systems cost more labor across multiple locations', points: 10 },

  // Operational / Day-to-Day Impact
  { dimension: 'operational', questionId: 'B14', match: (v) => v === 'over_12' || v === 'never' || v === 'what_is_that',
    title: 'Backflow — water shutoff risk', description: 'Failed or missing test can result in water service interruption', points: 25 },
  { dimension: 'operational', questionId: 'B7', match: (v) => v === 'yes_shared',
    title: 'Solid-fuel exhaust retrofit', description: 'May need construction to separate exhaust systems', points: 20 },
  { dimension: 'operational', questionId: 'B5', match: (v) => v !== 'yes_inspected',
    title: 'Fire suppression — kitchen offline', description: 'Failed system could take kitchen offline for repairs', points: 20 },
  { dimension: 'operational', questionId: 'B10', match: (v) => v === 'over_6_months' || v === 'dont_have',
    title: 'Grease trap backup', description: 'Overflow or backup can shut down drains and cooking', points: 20 },
  { dimension: 'operational', questionId: 'B2', match: (_v, a) => isHoodPastDue(a),
    title: 'Hood cleaning — kitchen offline', description: 'Emergency cleaning takes kitchen offline during service', points: 15 },
  { dimension: 'operational', questionId: 'B9', match: (v) => v === 'none',
    title: 'Pest control emergency', description: 'Infestation response is disruptive and time-consuming', points: 15 },
  { dimension: 'operational', questionId: 'A2', match: (v, a) => v !== '1' && (a.C1 === 'paper' || a.C1 === 'none'),
    title: 'Multi-location without system', description: 'No centralized view means slower response to issues', points: 15 },
  { dimension: 'operational', questionId: 'C1', match: (v) => v === 'paper' || v === 'none',
    title: 'Paper or no tracking', description: 'More time spent on manual processes', points: 10 },
  { dimension: 'operational', questionId: 'C2', match: (v) => v === 'none',
    title: 'No temp logs', description: 'Risk of serving food at unsafe temperatures', points: 10 },
  { dimension: 'operational', questionId: 'C6', match: (v) => v === 'some' || v === 'no',
    title: 'Expired food handler cards', description: 'Staff scheduling disruption for renewals', points: 10 },
  { dimension: 'operational', questionId: 'C3', match: (v) => v === 'no' || v === 'not_sure',
    title: 'No HACCP plan', description: 'No structured approach to identifying and managing hazards', points: 10 },
];

function generateRiskDrivers(answers: Record<string, string>): Record<string, RiskDriver[]> {
  const grouped: Record<string, RiskDriver[]> = {
    revenue: [], liability: [], cost: [], operational: [],
  };

  for (const cfg of DRIVER_CONFIGS) {
    const value = answers[cfg.questionId];
    if (value === undefined) continue;
    if (!cfg.match(value, answers)) continue;
    grouped[cfg.dimension].push({
      dimension: cfg.dimension,
      title: cfg.title,
      description: cfg.description,
      points: cfg.points,
    });
  }

  // Sort each dimension by points descending, keep top 3
  for (const dim of Object.keys(grouped)) {
    grouped[dim] = grouped[dim].sort((a, b) => b.points - a.points).slice(0, 3);
  }

  return grouped;
}

// ── Dollar Estimates ─────────────────────────────────────────────────────────

function getEstimatedRevenue(answers: Record<string, string>): number {
  const rev = answers.A4;
  switch (rev) {
    case 'under_500k': return 350000;
    case '500k-1m': return 750000;
    case '1m-5m': return 3000000;
    case '5m-10m': return 7500000;
    case '10m+': return 15000000;
    default: return 1000000; // prefer_not or missing
  }
}

function getRevenueMultiplier(answers: Record<string, string>): number {
  const rev = answers.A4;
  switch (rev) {
    case 'under_500k': return 0.08;
    case '500k-1m': return 0.06;
    case '1m-5m': return 0.05;
    case '5m-10m': return 0.04;
    case '10m+': return 0.03;
    default: return 0.05;
  }
}

function computeDollarEstimates(
  answers: Record<string, string>,
  scores: { revenueRisk: number; liabilityRisk: number; costRisk: number; operationalRisk: number },
): DollarEstimates {
  const revenue = getEstimatedRevenue(answers);
  const mult = getRevenueMultiplier(answers);

  // Revenue risk
  const revenueRiskLow = Math.round(revenue * (scores.revenueRisk / 100) * mult * 0.8);
  const revenueRiskHigh = Math.round(revenue * (scores.revenueRisk / 100) * mult * 1.2);

  // Liability risk
  const liabilityRiskLow = Math.round(revenue * (scores.liabilityRisk / 100) * 0.10);
  const liabilityRiskHigh = Math.round(revenue * (scores.liabilityRisk / 100) * 0.15);

  // Avoidable costs — sum specific line items based on answers
  let avoidLow = 0;
  let avoidHigh = 0;
  if (isHoodPastDue(answers)) { avoidLow += 500; avoidHigh += 1500; }
  if (answers.B5 && answers.B5 !== 'yes_inspected') { avoidLow += 500; avoidHigh += 1500; }
  if (answers.B10 === 'over_6_months' || answers.B10 === 'dont_have') { avoidLow += 800; avoidHigh += 2000; }
  if (answers.B13 === 'hauler_handles' || answers.B13 === 'no_idea') { avoidLow += 500; avoidHigh += 2000; }
  if (answers.B14 === 'over_12' || answers.B14 === 'never' || answers.B14 === 'what_is_that') { avoidLow += 300; avoidHigh += 800; }
  if (answers.C5 === 'c' || answers.C5 === 'below_70') { avoidLow += 200; avoidHigh += 500; }
  if (answers.B8 === 'yes_not_inspected') { avoidLow += 200; avoidHigh += 500; }
  if (answers.C3 === 'no' || answers.C3 === 'not_sure') { avoidLow += 300; avoidHigh += 1000; }
  if (answers.C6 === 'some' || answers.C6 === 'no') { avoidLow += 100; avoidHigh += 300; }
  if (answers.C1 === 'paper' || answers.C1 === 'none') { avoidLow += 200; avoidHigh += 800; }
  // Insurance premium increase estimate
  if (scores.liabilityRisk > 40) {
    const premiumBase = revenue * 0.005; // ~0.5% of revenue as premium proxy
    avoidLow += Math.round(premiumBase * 0.05);
    avoidHigh += Math.round(premiumBase * 0.15);
  }

  // Operational impact — days
  const operationalDays = Math.round((scores.operationalRisk / 10) * 2) / 2; // round to 0.5
  const dailyRevenue = revenue / 365;
  const operationalCostLow = Math.round(operationalDays * dailyRevenue * 0.5);
  const operationalCostHigh = Math.round(operationalDays * dailyRevenue);

  const totalLow = revenueRiskLow + liabilityRiskLow + avoidLow + operationalCostLow;
  const totalHigh = revenueRiskHigh + liabilityRiskHigh + avoidHigh + operationalCostHigh;

  return {
    revenueRiskLow, revenueRiskHigh,
    liabilityRiskLow, liabilityRiskHigh,
    avoidableCosts: avoidLow, avoidableCostsHigh: avoidHigh,
    operationalDays,
    operationalCostLow, operationalCostHigh,
    totalLow, totalHigh,
  };
}

// ── Format Helpers ───────────────────────────────────────────────────────────

export function formatDollars(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n.toLocaleString()}`;
}

// ── Grade / Score color helpers ───────────────────────────────────────────────

export function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return '#22c55e';
    case 'B': return '#84cc16';
    case 'C': return '#eab308';
    case 'D': return '#f97316';
    case 'F': return '#ef4444';
    default: return '#6b7280';
  }
}

export function scoreBarColor(score: number): string {
  if (score <= 25) return '#22c55e';
  if (score <= 45) return '#84cc16';
  if (score <= 65) return '#eab308';
  if (score <= 80) return '#f97316';
  return '#ef4444';
}
