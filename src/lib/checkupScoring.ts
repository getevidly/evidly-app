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
  };
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
