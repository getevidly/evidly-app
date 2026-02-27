// ============================================================================
// Assessment Scoring Engine — ASSESS-TOOL-1
// Two-layer scoring: Category Scores (Diagnosis) + 4-Risk Impact (Prognosis)
// ============================================================================

// ── Types ────────────────────────────────────────────────────────────────────

export interface AssessmentQuestion {
  id: string;
  section: 'profile' | 'facility' | 'food_safety';
  sectionLabel: string;
  label: string;
  options: { value: string; label: string }[];
  skipIf?: (answers: Record<string, string>) => boolean;
  freeText?: boolean;
}

export interface Finding {
  id: string;
  category: 'facility' | 'food' | 'documentation';
  riskDimensions: ('revenue' | 'liability' | 'cost' | 'operational')[];
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
  costRiskLow: number;
  costRiskHigh: number;
  operationalDays: number;
  operationalCostLow: number;
  operationalCostHigh: number;
  totalLow: number;
  totalHigh: number;
}

export interface AssessmentScores {
  facilitySafety: number;
  foodSafety: number;
  documentation: number;
  revenueRisk: number;
  liabilityRisk: number;
  costRisk: number;
  operationalRisk: number;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  findings: Finding[];
  riskDrivers: Record<string, RiskDriver[]>;
  estimates: DollarEstimates;
}

export interface LeadData {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  zipCode: string;
  referralSource: string;
  utmRef: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const isCA = (zip: string) => {
  const n = parseInt(zip, 10);
  return n >= 90001 && n <= 96162;
};

const isMultiStory = (a1: string) =>
  ['hotel_resort', 'hospital', 'school_k12', 'government'].includes(a1);

const HOOD_FREQ: Record<string, { label: string; months: number }> = {
  solid_fuel:     { label: 'monthly', months: 1 },
  high_volume:    { label: 'quarterly', months: 3 },
  moderate:       { label: 'semi-annually', months: 6 },
  low_volume:     { label: 'annually', months: 12 },
};

function revenueFromAnswer(a4: string): number {
  switch (a4) {
    case 'under_500k': return 350_000;
    case '500k_1m': return 750_000;
    case '1m_5m': return 3_000_000;
    case '5m_10m': return 7_500_000;
    case '10m_plus': return 15_000_000;
    default: return 1_000_000;
  }
}

function dailyRevenueFromMeals(a3: string): number {
  const avgTicket = 18;
  switch (a3) {
    case 'under_100': return 50 * avgTicket;
    case '100_300': return 200 * avgTicket;
    case '300_500': return 400 * avgTicket;
    case '500_1000': return 750 * avgTicket;
    case '1000_plus': return 1200 * avgTicket;
    default: return 200 * avgTicket;
  }
}

function locationMultiplier(a2: string): number {
  switch (a2) {
    case '1': return 1;
    case '2_5': return 3;
    case '6_10': return 8;
    case '11_25': return 18;
    case '26_plus': return 30;
    default: return 1;
  }
}

// ── Question Config ──────────────────────────────────────────────────────────

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  // Section A — Business Profile
  { id: 'A1', section: 'profile', sectionLabel: 'Business Profile', label: 'What type of food establishment do you operate?', options: [
    { value: 'restaurant_full', label: 'Restaurant (full service)' },
    { value: 'restaurant_quick', label: 'Restaurant (quick service / fast food)' },
    { value: 'hotel_resort', label: 'Hotel / resort with kitchen' },
    { value: 'hospital', label: 'Hospital / healthcare facility' },
    { value: 'school_k12', label: 'School / education facility (K-12)' },
    { value: 'government', label: 'Government / military / correctional' },
    { value: 'catering', label: 'Catering company' },
    { value: 'food_truck', label: 'Food truck / mobile kitchen' },
    { value: 'ghost_kitchen', label: 'Ghost kitchen / commissary' },
    { value: 'bar_nightclub', label: 'Bar / nightclub with kitchen' },
    { value: 'other', label: 'Other' },
  ], freeText: true },
  { id: 'A2', section: 'profile', sectionLabel: 'Business Profile', label: 'How many kitchen locations do you operate?', options: [
    { value: '1', label: '1' },
    { value: '2_5', label: '2–5' },
    { value: '6_10', label: '6–10' },
    { value: '11_25', label: '11–25' },
    { value: '26_plus', label: '26+' },
  ] },
  { id: 'A3', section: 'profile', sectionLabel: 'Business Profile', label: 'How many meals/covers per day (approximate)?', options: [
    { value: 'under_100', label: 'Under 100' },
    { value: '100_300', label: '100–300' },
    { value: '300_500', label: '300–500' },
    { value: '500_1000', label: '500–1,000' },
    { value: '1000_plus', label: '1,000+' },
  ] },
  { id: 'A4', section: 'profile', sectionLabel: 'Business Profile', label: 'What is your approximate annual revenue?', options: [
    { value: 'under_500k', label: 'Under $500K' },
    { value: '500k_1m', label: '$500K – $1M' },
    { value: '1m_5m', label: '$1M – $5M' },
    { value: '5m_10m', label: '$5M – $10M' },
    { value: '10m_plus', label: '$10M+' },
    { value: 'prefer_not', label: 'Prefer not to say' },
  ] },

  // Section B — Facility Safety
  { id: 'B1', section: 'facility', sectionLabel: 'Facility Safety', label: 'Do you have a commercial kitchen exhaust hood system?', options: [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
    { value: 'not_sure', label: 'Not sure' },
  ] },
  { id: 'B2', section: 'facility', sectionLabel: 'Facility Safety', label: 'When was your last hood cleaning?', options: [
    { value: 'within_month', label: 'Within the last month' },
    { value: '1_3_months', label: '1–3 months ago' },
    { value: '3_6_months', label: '3–6 months ago' },
    { value: '6_12_months', label: '6–12 months ago' },
    { value: 'over_year', label: 'Over a year ago' },
    { value: 'never', label: 'Never / don\'t know' },
  ], skipIf: a => a.B1 === 'no' },
  { id: 'B3', section: 'facility', sectionLabel: 'Facility Safety', label: 'What type of cooking do you primarily do?', options: [
    { value: 'solid_fuel', label: 'Solid-fuel (wood-fired, charcoal, smoker) — monthly cleaning required' },
    { value: 'high_volume', label: 'High-volume (charbroiling, wok, deep frying) — quarterly cleaning' },
    { value: 'moderate', label: 'Moderate-volume (grilling, sauteing, general) — semi-annual cleaning' },
    { value: 'low_volume', label: 'Low-volume (steam, baking, light cooking) — annual cleaning' },
    { value: 'not_sure', label: 'Not sure' },
  ], skipIf: a => a.B1 === 'no' },
  { id: 'B4', section: 'facility', sectionLabel: 'Facility Safety', label: 'Do you have a current hood cleaning certificate on file?', options: [
    { value: 'yes_current', label: 'Yes, and it\'s current' },
    { value: 'yes_expired', label: 'Yes, but it may be expired' },
    { value: 'no', label: 'No' },
    { value: 'dont_know', label: 'Don\'t know' },
  ], skipIf: a => a.B1 === 'no' },
  { id: 'B5', section: 'facility', sectionLabel: 'Facility Safety', label: 'Do you have a fire suppression system (Ansul/wet chemical)?', options: [
    { value: 'yes_inspected', label: 'Yes, inspected within 6 months' },
    { value: 'yes_not_recent', label: 'Yes, but not recently inspected' },
    { value: 'yes_unknown', label: 'Yes, don\'t know last inspection' },
    { value: 'no', label: 'No' },
    { value: 'not_sure', label: 'Not sure' },
  ], skipIf: a => a.B1 === 'no' },
  { id: 'B6', section: 'facility', sectionLabel: 'Facility Safety', label: 'Do you have current fire extinguisher inspections?', options: [
    { value: 'yes_all', label: 'Yes, all inspected within 12 months' },
    { value: 'some', label: 'Some are current, some may be expired' },
    { value: 'no', label: 'No / don\'t know' },
  ], skipIf: a => a.B1 === 'no' },
  { id: 'B7', section: 'facility', sectionLabel: 'Facility Safety', label: 'Do you operate any solid-fuel cooking equipment? (wood-fired oven, charcoal grill, smoker)', options: [
    { value: 'yes_dedicated', label: 'Yes, with dedicated exhaust system' },
    { value: 'yes_shared', label: 'Yes, shared exhaust with standard hood (code violation)' },
    { value: 'no', label: 'No solid-fuel cooking' },
    { value: 'not_sure', label: 'Not sure' },
  ], skipIf: a => a.B1 === 'no' || a.B3 === 'solid_fuel' },
  { id: 'B8', section: 'facility', sectionLabel: 'Facility Safety', label: 'Do you have an elevator on premises?', options: [
    { value: 'yes_inspected', label: 'Yes, inspected within 12 months' },
    { value: 'yes_not_recent', label: 'Yes, not recently inspected' },
    { value: 'no', label: 'No' },
  ], skipIf: a => !isMultiStory(a.A1) },
  { id: 'B9', section: 'facility', sectionLabel: 'Facility Safety', label: 'Do you have a current pest control contract?', options: [
    { value: 'yes_monthly', label: 'Yes, monthly service' },
    { value: 'yes_quarterly', label: 'Yes, quarterly service' },
    { value: 'informal', label: 'No contract / informal' },
    { value: 'none', label: 'No pest control' },
  ] },
  { id: 'B10', section: 'facility', sectionLabel: 'Facility Safety', label: 'When was your grease trap/interceptor last pumped?', options: [
    { value: 'within_month', label: 'Within the last month' },
    { value: '1_3_months', label: '1–3 months ago' },
    { value: '3_6_months', label: '3–6 months ago' },
    { value: 'over_6_months', label: 'Over 6 months ago' },
    { value: 'dont_have', label: 'Don\'t have one / don\'t know' },
  ] },
  { id: 'B11', section: 'facility', sectionLabel: 'Facility Safety', label: 'Do you have current grease trap pumping receipts/manifests on file?', options: [
    { value: 'yes_all', label: 'Yes, all current' },
    { value: 'some', label: 'Some on file, not organized' },
    { value: 'no', label: 'No' },
  ] },
  { id: 'B12', section: 'facility', sectionLabel: 'Facility Safety', label: 'Do you know how many gallons your grease trap collects per pumping?', options: [
    { value: 'yes_track', label: 'Yes, we track volume on every service' },
    { value: 'receipt_only', label: 'The hauler gives us a receipt but we don\'t track volume' },
    { value: 'no', label: 'No idea' },
  ] },
  { id: 'B13', section: 'facility', sectionLabel: 'Facility Safety', label: 'Do you know where your collected grease is disposed?', options: [
    { value: 'yes_manifests', label: 'Yes, we have manifests showing the receiving facility' },
    { value: 'hauler_handles', label: 'The hauler takes care of it, we don\'t track where' },
    { value: 'no', label: 'No idea' },
  ] },
  { id: 'B14', section: 'facility', sectionLabel: 'Facility Safety', label: 'When was your last backflow preventer test?', options: [
    { value: 'within_12', label: 'Within the past 12 months (current)' },
    { value: 'over_12', label: 'Over 12 months ago' },
    { value: 'never', label: 'Never tested / don\'t know' },
    { value: 'what_is_that', label: 'Don\'t know what that is' },
  ] },

  // Section C — Food Safety & Compliance
  { id: 'C1', section: 'food_safety', sectionLabel: 'Food Safety & Compliance', label: 'How do you currently track food safety compliance?', options: [
    { value: 'paper', label: 'Paper checklists and binders' },
    { value: 'spreadsheets', label: 'Spreadsheets (Excel/Google Sheets)' },
    { value: 'software', label: 'Existing software' },
    { value: 'none', label: 'We don\'t formally track it' },
  ] },
  { id: 'C2', section: 'food_safety', sectionLabel: 'Food Safety & Compliance', label: 'How do you track temperature logs?', options: [
    { value: 'paper', label: 'Manual paper logs' },
    { value: 'digital_therm', label: 'Digital thermometer with logging' },
    { value: 'iot', label: 'IoT/automated sensors' },
    { value: 'none', label: 'We don\'t consistently log temps' },
  ] },
  { id: 'C3', section: 'food_safety', sectionLabel: 'Food Safety & Compliance', label: 'Do you have a current HACCP plan?', options: [
    { value: 'yes_current', label: 'Yes, reviewed within the past year' },
    { value: 'yes_outdated', label: 'Yes, but outdated' },
    { value: 'no', label: 'No' },
    { value: 'not_sure', label: 'Not sure what that is' },
  ] },
  { id: 'C4', section: 'food_safety', sectionLabel: 'Food Safety & Compliance', label: 'When was your last health department inspection?', options: [
    { value: 'within_3', label: 'Within 3 months' },
    { value: '3_6', label: '3–6 months ago' },
    { value: '6_12', label: '6–12 months ago' },
    { value: 'over_year', label: 'Over a year ago' },
    { value: 'dont_know', label: 'Don\'t know' },
  ] },
  { id: 'C5', section: 'food_safety', sectionLabel: 'Food Safety & Compliance', label: 'What was your most recent inspection score/grade?', options: [
    { value: 'a_pass', label: 'A / 90-100 / Pass' },
    { value: 'b_conditional', label: 'B / 80-89 / Conditional Pass' },
    { value: 'c_fail_reinspect', label: 'C / 70-79 / Fail-Reinspect' },
    { value: 'below_70', label: 'Below 70 / Fail' },
    { value: 'dont_know', label: 'Don\'t know' },
    { value: 'na', label: 'N/A (not graded)' },
  ] },
  { id: 'C6', section: 'food_safety', sectionLabel: 'Food Safety & Compliance', label: 'Do your food handlers have current food handler cards/certifications?', options: [
    { value: 'yes_all', label: 'Yes, all current' },
    { value: 'some', label: 'Some current, some expired' },
    { value: 'no', label: 'No / don\'t know' },
  ] },
  { id: 'C7', section: 'food_safety', sectionLabel: 'Food Safety & Compliance', label: 'How do you manage vendor compliance documents?', options: [
    { value: 'digital', label: 'Organized digital file system' },
    { value: 'paper', label: 'Paper files / binders' },
    { value: 'whatever', label: 'Whatever the vendor gives us, somewhere' },
    { value: 'none', label: 'We don\'t track vendor documents' },
  ] },
  { id: 'C8', section: 'food_safety', sectionLabel: 'Food Safety & Compliance', label: 'Are you a Tier 1 or Tier 2 food generator under SB 1383?', options: [
    { value: 'tier1', label: 'Yes, Tier 1' },
    { value: 'tier2', label: 'Yes, Tier 2' },
    { value: 'not_sure', label: 'Not sure' },
    { value: 'na', label: 'Not applicable' },
  ], skipIf: (_, zip?: string) => !isCA(zip || '') },
  { id: 'C9', section: 'food_safety', sectionLabel: 'Food Safety & Compliance', label: 'Do you maintain USDA daily production records?', options: [
    { value: 'yes_digital', label: 'Yes, digitally' },
    { value: 'yes_paper', label: 'Yes, on paper' },
    { value: 'no', label: 'No' },
  ], skipIf: a => a.A1 !== 'school_k12' },
];

// ── Scoring Engine ───────────────────────────────────────────────────────────

export function computeAssessmentScores(
  answers: Record<string, string>,
  zipCode: string,
): AssessmentScores {
  const a = answers;
  const findings: Finding[] = [];
  const riskDrivers: Record<string, RiskDriver[]> = {
    revenue: [], liability: [], cost: [], operational: [],
  };

  let facility = 0, food = 0, doc = 0;
  let revenue = 0, liability = 0, cost = 0, operational = 0;

  const cookingType = a.B3 || 'moderate';
  const freq = HOOD_FREQ[cookingType] || HOOD_FREQ.moderate;

  // Helper: add finding + risk drivers
  function addFinding(f: Omit<Finding, 'id'>, categoryPts: Record<string, number>, riskPts: Record<string, number>, driverDesc?: string) {
    const id = `F${findings.length + 1}`;
    findings.push({ ...f, id });
    if (categoryPts.facility) facility += categoryPts.facility;
    if (categoryPts.food) food += categoryPts.food;
    if (categoryPts.doc) doc += categoryPts.doc;
    for (const [dim, pts] of Object.entries(riskPts)) {
      if (dim === 'revenue') revenue += pts;
      if (dim === 'liability') liability += pts;
      if (dim === 'cost') cost += pts;
      if (dim === 'operational') operational += pts;
      riskDrivers[dim].push({ dimension: dim as RiskDriver['dimension'], title: f.title, description: driverDesc || f.description, points: pts });
    }
  }

  // ── FACILITY SAFETY SCORING ──────────────────────────────────────────────

  // Hood cleaning overdue
  if (a.B1 !== 'no') {
    const overdue = isHoodOverdue(a.B2, cookingType);
    if (overdue) {
      const isSolid = cookingType === 'solid_fuel';
      addFinding({
        category: 'facility', riskDimensions: ['revenue', 'liability', 'cost', 'operational'],
        severity: isSolid ? 'critical' : 'high',
        title: 'Hood cleaning overdue',
        description: `NFPA 96 requires ${freq.label} cleaning for ${cookingType.replace('_', '-')} operations. Your last cleaning is overdue.`,
        isPositive: false,
      }, { facility: isSolid ? 35 : 30 }, {
        revenue: 20, liability: isSolid ? 25 : 20, cost: 15, operational: 15,
      }, 'Inspector finds violation → forced closure until cleaned');
    } else if (a.B2 === 'within_month') {
      addFinding({
        category: 'facility', riskDimensions: [], severity: 'positive',
        title: 'Hood cleaning is current', description: 'Your hood cleaning is up to date.', isPositive: true,
      }, {}, {});
    }
  }

  // Solid-fuel shared exhaust (code violation)
  if ((a.B7 === 'yes_shared') || (a.B3 === 'solid_fuel' && a.B7 === 'yes_shared')) {
    addFinding({
      category: 'facility', riskDimensions: ['revenue', 'liability', 'operational'],
      severity: 'critical',
      title: 'Solid-fuel cooking with shared exhaust — code violation',
      description: 'NFPA 96 Chapter 14 requires a dedicated exhaust system for solid-fuel cooking. Shared exhaust is a code violation.',
      isPositive: false,
    }, { facility: 25 }, { revenue: 25, liability: 25, operational: 20 },
    'Code violation → forced shutdown until exhaust retrofit');
  }

  // No hood cleaning cert
  if (a.B4 === 'no' || a.B4 === 'dont_know') {
    addFinding({
      category: 'facility', riskDimensions: ['liability'],
      severity: 'high', title: 'No hood cleaning certificate on file',
      description: 'Without a certificate, you cannot prove compliance during an inspection or insurance claim.',
      isPositive: false,
    }, { facility: 20, doc: 20 }, { liability: 20 }, 'Can\'t prove compliance → insurance claim denied');
  } else if (a.B4 === 'yes_expired') {
    addFinding({
      category: 'facility', riskDimensions: ['liability'],
      severity: 'medium', title: 'Hood cleaning certificate may be expired',
      description: 'An expired certificate may not satisfy inspector or insurance requirements.',
      isPositive: false,
    }, { facility: 10, doc: 10 }, { liability: 10 });
  }

  // Fire suppression
  if (a.B5 === 'yes_not_recent' || a.B5 === 'yes_unknown') {
    addFinding({
      category: 'facility', riskDimensions: ['revenue', 'liability', 'cost', 'operational'],
      severity: 'critical',
      title: 'Fire suppression system not recently inspected',
      description: 'This is a Protective Safeguard Endorsement (PSE) violation that could void your insurance coverage.',
      isPositive: false,
    }, { facility: 25 }, { revenue: 20, liability: 25, cost: 15, operational: 20 },
    'PSE violation → insurance will deny fire claim');
  } else if (a.B5 === 'no' || a.B5 === 'not_sure') {
    addFinding({
      category: 'facility', riskDimensions: ['revenue', 'liability'],
      severity: 'high', title: 'No fire suppression system or status unknown',
      description: 'Commercial kitchens with hood systems typically require fire suppression.',
      isPositive: false,
    }, { facility: 20 }, { revenue: 15, liability: 20, cost: 10 });
  } else if (a.B5 === 'yes_inspected') {
    addFinding({
      category: 'facility', riskDimensions: [], severity: 'positive',
      title: 'Fire suppression system is current', description: 'Your fire suppression inspection is up to date.', isPositive: true,
    }, {}, {});
  }

  // Fire extinguishers
  if (a.B6 === 'no') {
    addFinding({
      category: 'facility', riskDimensions: ['liability', 'cost'],
      severity: 'medium', title: 'No fire extinguisher inspection on file',
      description: 'Fire extinguishers require annual inspection.',
      isPositive: false,
    }, { facility: 15 }, { liability: 10, cost: 10 });
  }

  // Elevator
  if (a.B8 === 'yes_not_recent') {
    addFinding({
      category: 'facility', riskDimensions: ['liability', 'cost'],
      severity: 'medium', title: 'Elevator not recently inspected',
      description: 'Elevator inspections are required annually in most jurisdictions.',
      isPositive: false,
    }, { facility: 10 }, { liability: 15, cost: 10 });
  }

  // Pest control
  if (a.B9 === 'none') {
    addFinding({
      category: 'facility', riskDimensions: ['revenue', 'operational'],
      severity: 'high', title: 'No pest control service',
      description: 'No pest control increases risk of failed health inspections.',
      isPositive: false,
    }, { facility: 10 }, { revenue: 15, operational: 15 });
  } else if (a.B9 === 'informal') {
    addFinding({
      category: 'facility', riskDimensions: ['revenue'],
      severity: 'medium', title: 'Informal pest control arrangement',
      description: 'A formal contract provides documentation for inspections.',
      isPositive: false,
    }, { facility: 5 }, { revenue: 5 });
  }

  // Grease trap
  if (a.B10 === 'over_6_months' || a.B10 === 'dont_have') {
    addFinding({
      category: 'facility', riskDimensions: ['revenue', 'liability', 'cost', 'operational'],
      severity: 'high',
      title: 'Grease trap pumping overdue',
      description: 'FOG violations can result in fines of $10,000–$50,000+ per sanitary sewer overflow incident.',
      isPositive: false,
    }, { facility: 20 }, { revenue: 20, liability: 15, cost: 20, operational: 20 },
    'Sewer backup → kitchen and restrooms offline for days');
  }

  // Grease trap receipts
  if (a.B11 === 'no') {
    addFinding({
      category: 'documentation', riskDimensions: ['liability'],
      severity: 'medium', title: 'No grease trap pumping receipts on file',
      description: 'Without receipts, you cannot prove compliance during a FOG inspection.',
      isPositive: false,
    }, { doc: 15 }, { liability: 10 });
  }

  // Grease volume tracking
  if (a.B12 === 'no') {
    addFinding({
      category: 'documentation', riskDimensions: ['cost'],
      severity: 'low', title: 'Not tracking grease trap volume',
      description: 'Volume tracking helps right-size your pumping schedule and avoid emergency service.',
      isPositive: false,
    }, { doc: 10 }, { cost: 5 });
  }

  // Grease disposal tracking
  if (a.B13 === 'hauler_handles' || a.B13 === 'no') {
    addFinding({
      category: 'documentation', riskDimensions: ['liability'],
      severity: 'high',
      title: 'No grease disposal manifests on file',
      description: 'You are liable if your hauler disposes of grease illegally. Manifests showing the receiving facility are your protection.',
      isPositive: false,
    }, { doc: 15 }, { liability: 20 },
    'Liable if hauler dumps illegally → $10K–$50K fines');
  }

  // Backflow
  if (a.B14 === 'over_12' || a.B14 === 'never') {
    addFinding({
      category: 'facility', riskDimensions: ['revenue', 'liability', 'cost', 'operational'],
      severity: 'critical',
      title: 'Backflow testing overdue',
      description: 'Your water district can shut off water service for non-compliance with backflow testing requirements.',
      isPositive: false,
    }, { facility: 20, doc: 15 }, { revenue: 25, liability: 15, cost: 15, operational: 25 },
    'Water district shuts off water → forced closure');
  } else if (a.B14 === 'what_is_that') {
    addFinding({
      category: 'facility', riskDimensions: ['revenue', 'liability', 'cost', 'operational'],
      severity: 'critical',
      title: 'Unaware of backflow testing requirements',
      description: 'Backflow preventers protect the public water supply. Most jurisdictions require annual testing. Non-compliance can result in water shutoff.',
      isPositive: false,
    }, { facility: 25, doc: 15 }, { revenue: 25, liability: 15, cost: 15, operational: 25 });
  } else if (a.B14 === 'within_12') {
    addFinding({
      category: 'facility', riskDimensions: [], severity: 'positive',
      title: 'Backflow testing is current', description: 'Your backflow preventer test is up to date.', isPositive: true,
    }, {}, {});
  }

  // ── FOOD SAFETY SCORING ──────────────────────────────────────────────────

  // HACCP
  if (a.C3 === 'no' || a.C3 === 'not_sure') {
    addFinding({
      category: 'food', riskDimensions: ['revenue', 'liability', 'operational'],
      severity: 'high', title: 'No HACCP plan',
      description: 'A HACCP plan is critical for food safety compliance and may be required for enterprise contracts.',
      isPositive: false,
    }, { food: 25 }, { revenue: 15, liability: 15, cost: 10, operational: 10 },
    'Failed audit → lost enterprise contracts');
  } else if (a.C3 === 'yes_outdated') {
    addFinding({
      category: 'food', riskDimensions: ['liability'],
      severity: 'medium', title: 'HACCP plan is outdated',
      description: 'HACCP plans should be reviewed at least annually.',
      isPositive: false,
    }, { food: 10 }, { liability: 5 });
  }

  // Compliance tracking
  if (a.C1 === 'none') {
    addFinding({
      category: 'food', riskDimensions: ['revenue', 'operational'],
      severity: 'critical', title: 'No formal food safety tracking',
      description: 'Without tracking, compliance gaps go undetected until an inspection failure.',
      isPositive: false,
    }, { food: 30, doc: 30 }, { revenue: 10, operational: 10 });
  } else if (a.C1 === 'paper') {
    addFinding({
      category: 'food', riskDimensions: ['operational'],
      severity: 'medium', title: 'Paper-based food safety tracking',
      description: 'Digital tracking reduces health inspection violations by up to 40% and provides faster compliance recovery.',
      isPositive: false,
    }, { food: 15, doc: 20 }, { operational: 10 });
  }

  // Temperature logs
  if (a.C2 === 'none') {
    addFinding({
      category: 'food', riskDimensions: ['revenue', 'operational'],
      severity: 'critical', title: 'No consistent temperature logging',
      description: 'Temperature logging is a fundamental food safety requirement.',
      isPositive: false,
    }, { food: 25 }, { revenue: 10, operational: 10 });
  } else if (a.C2 === 'paper') {
    addFinding({
      category: 'food', riskDimensions: ['operational'],
      severity: 'low', title: 'Manual paper temperature logs',
      description: 'Digital or IoT temp logging provides real-time alerts and automatic documentation.',
      isPositive: false,
    }, { food: 10 }, { operational: 5 });
  } else if (a.C2 === 'iot') {
    addFinding({
      category: 'food', riskDimensions: [], severity: 'positive',
      title: 'Automated temperature monitoring', description: 'You\'re using IoT sensors for temperature logging — excellent.', isPositive: true,
    }, {}, {});
  }

  // Inspection score
  if (a.C5 === 'c_fail_reinspect' || a.C5 === 'below_70') {
    addFinding({
      category: 'food', riskDimensions: ['revenue', 'liability', 'cost'],
      severity: 'critical', title: 'Poor health inspection score',
      description: 'A low inspection score affects customer confidence and may trigger increased regulatory scrutiny.',
      isPositive: false,
    }, { food: 20 }, { revenue: 15, liability: 10, cost: 10 });
  } else if (a.C5 === 'dont_know') {
    addFinding({
      category: 'documentation', riskDimensions: [],
      severity: 'medium', title: 'Cannot locate last inspection score',
      description: 'Knowing your inspection history is important for compliance management.',
      isPositive: false,
    }, { doc: 15 }, {});
  } else if (a.C5 === 'a_pass') {
    addFinding({
      category: 'food', riskDimensions: [], severity: 'positive',
      title: 'Excellent inspection score', description: 'Your most recent inspection score is A/Pass — great work.', isPositive: true,
    }, {}, {});
  }

  // Food handler cards
  if (a.C6 === 'some' || a.C6 === 'no') {
    addFinding({
      category: 'food', riskDimensions: ['revenue', 'operational'],
      severity: a.C6 === 'no' ? 'high' : 'medium',
      title: 'Food handler certifications not fully current',
      description: 'Expired food handler cards can result in inspection failures.',
      isPositive: false,
    }, { food: 15 }, { revenue: 10, cost: 5, operational: 10 });
  } else if (a.C6 === 'yes_all') {
    addFinding({
      category: 'food', riskDimensions: [], severity: 'positive',
      title: 'Food handler certifications are current', description: 'All food handler cards are up to date.', isPositive: true,
    }, {}, {});
  }

  // Vendor document management
  if (a.C7 === 'none') {
    addFinding({
      category: 'documentation', riskDimensions: ['liability'],
      severity: 'high', title: 'No vendor document tracking',
      description: 'Without tracking vendor compliance documents, you can\'t prove due diligence during an audit or claim.',
      isPositive: false,
    }, { doc: 30 }, { liability: 20 }, 'Can\'t prove compliance in court');
  } else if (a.C7 === 'whatever') {
    addFinding({
      category: 'documentation', riskDimensions: ['liability'],
      severity: 'medium', title: 'Disorganized vendor document management',
      description: 'Vendor compliance documents should be organized and easily retrievable.',
      isPositive: false,
    }, { doc: 20 }, { liability: 10 });
  } else if (a.C7 === 'paper') {
    addFinding({
      category: 'documentation', riskDimensions: ['operational'],
      severity: 'low', title: 'Paper-based vendor document management',
      description: 'Digital document management makes compliance tracking faster and more reliable.',
      isPositive: false,
    }, { doc: 15 }, { operational: 5 });
  }

  // SB 1383 (CA only)
  if (isCA(zipCode) && (a.C8 === 'not_sure')) {
    addFinding({
      category: 'documentation', riskDimensions: ['cost'],
      severity: 'medium', title: 'SB 1383 compliance status unclear',
      description: 'California\'s SB 1383 requires food generators to comply with organic waste diversion requirements.',
      isPositive: false,
    }, { doc: 15 }, { cost: 10 });
  }

  // Multi-location without central system
  if (a.A2 !== '1' && (a.C1 === 'paper' || a.C1 === 'none')) {
    addFinding({
      category: 'food', riskDimensions: ['revenue', 'operational'],
      severity: 'high', title: 'Multi-location operation without centralized compliance system',
      description: 'Managing compliance across multiple locations without a central system creates inconsistencies.',
      isPositive: false,
    }, { food: 10 }, { revenue: 10, operational: 15 });
  }

  // ── Cap scores at 100 ────────────────────────────────────────────────────

  facility = Math.min(100, facility);
  food = Math.min(100, food);
  doc = Math.min(100, doc);
  revenue = Math.min(100, revenue);
  liability = Math.min(100, liability);
  cost = Math.min(100, cost);
  operational = Math.min(100, operational);

  // ── Grade ────────────────────────────────────────────────────────────────

  const avg = (revenue + liability + cost + operational) / 4;
  let overallGrade: AssessmentScores['overallGrade'];
  if (avg < 25) overallGrade = 'A';
  else if (avg <= 45) overallGrade = 'B';
  else if (avg <= 65) overallGrade = 'C';
  else if (avg <= 80) overallGrade = 'D';
  else overallGrade = 'F';

  // ── Sort risk drivers by points (highest first), keep top 3 per dim ───

  for (const dim of Object.keys(riskDrivers)) {
    riskDrivers[dim].sort((a, b) => b.points - a.points);
    riskDrivers[dim] = riskDrivers[dim].slice(0, 3);
  }

  // ── Dollar estimates ─────────────────────────────────────────────────────

  const annualRev = revenueFromAnswer(a.A4);
  const dailyRev = dailyRevenueFromMeals(a.A3);
  const locMult = locationMultiplier(a.A2);

  const revenueRiskDollarLow = Math.round(annualRev * (revenue / 100) * 0.05);
  const revenueRiskDollarHigh = Math.round(annualRev * (revenue / 100) * 0.15);

  // Liability: sum fine ranges based on findings
  let liabilityLow = 0, liabilityHigh = 0;
  if (findings.some(f => f.title.includes('Grease trap') || f.title.includes('grease disposal'))) { liabilityLow += 10000; liabilityHigh += 50000; }
  if (findings.some(f => f.title.includes('fire suppression') || f.title.includes('Fire suppression'))) { liabilityLow += 25000; liabilityHigh += 75000; }
  if (findings.some(f => f.title.includes('Backflow'))) { liabilityLow += 5000; liabilityHigh += 25000; }
  if (findings.some(f => f.title.includes('inspection score') && !f.isPositive)) { liabilityLow += 250 * locMult; liabilityHigh += 1000 * locMult; }
  liabilityLow = Math.round(liabilityLow);
  liabilityHigh = Math.round(liabilityHigh);

  // Cost: emergency premiums + re-inspection fees
  let costLow = 0, costHigh = 0;
  if (findings.some(f => f.title.includes('Hood cleaning overdue'))) { costLow += 500 * locMult; costHigh += 2000 * locMult; }
  if (findings.some(f => f.title.includes('fire suppression') && !f.isPositive)) { costLow += 300 * locMult; costHigh += 1500 * locMult; }
  if (findings.some(f => f.title.includes('Grease trap pumping'))) { costLow += 1000 * locMult; costHigh += 5000 * locMult; }
  if (findings.some(f => f.title.includes('Backflow') && !f.isPositive)) { costLow += 200 * locMult; costHigh += 1000 * locMult; }
  if (findings.some(f => f.title.includes('inspection score') && !f.isPositive)) { costLow += 150 * locMult; costHigh += 500 * locMult; }
  costLow = Math.round(costLow);
  costHigh = Math.round(costHigh);

  // Operational: downtime days
  let downtimeDays = 0;
  if (findings.some(f => f.title.includes('Hood cleaning overdue'))) downtimeDays += 1 * locMult;
  if (findings.some(f => f.title.includes('shared exhaust'))) downtimeDays += 5 * locMult;
  if (findings.some(f => f.title.includes('fire suppression') && !f.isPositive)) downtimeDays += 2 * locMult;
  if (findings.some(f => f.title.includes('Grease trap pumping'))) downtimeDays += 3 * locMult;
  if (findings.some(f => f.title.includes('Backflow') && !f.isPositive)) downtimeDays += 2 * locMult;

  const opCostLow = Math.round(downtimeDays * dailyRev * 0.5);
  const opCostHigh = Math.round(downtimeDays * dailyRev);

  const totalLow = revenueRiskDollarLow + liabilityLow + costLow + opCostLow;
  const totalHigh = revenueRiskDollarHigh + liabilityHigh + costHigh + opCostHigh;

  return {
    facilitySafety: facility,
    foodSafety: food,
    documentation: doc,
    revenueRisk: revenue,
    liabilityRisk: liability,
    costRisk: cost,
    operationalRisk: operational,
    overallGrade,
    findings,
    riskDrivers,
    estimates: {
      revenueRiskLow: revenueRiskDollarLow,
      revenueRiskHigh: revenueRiskDollarHigh,
      liabilityRiskLow: liabilityLow,
      liabilityRiskHigh: liabilityHigh,
      costRiskLow: costLow,
      costRiskHigh: costHigh,
      operationalDays: downtimeDays,
      operationalCostLow: opCostLow,
      operationalCostHigh: opCostHigh,
      totalLow,
      totalHigh,
    },
  };
}

// ── Helper: is hood cleaning overdue based on cooking type + last cleaning ──

function isHoodOverdue(lastCleaning: string, cookingType: string): boolean {
  const freq = HOOD_FREQ[cookingType] || HOOD_FREQ.moderate;
  const monthsMap: Record<string, number> = {
    within_month: 1,
    '1_3_months': 2,
    '3_6_months': 4.5,
    '6_12_months': 9,
    over_year: 13,
    never: 99,
  };
  const months = monthsMap[lastCleaning] ?? 99;
  return months > freq.months;
}

// ── Get visible questions (applying skip logic) ────────────────────────────

export function getVisibleQuestions(
  answers: Record<string, string>,
  zipCode: string,
): AssessmentQuestion[] {
  return ASSESSMENT_QUESTIONS.filter(q => {
    if (!q.skipIf) return true;
    // C8 skipIf needs zip code as second arg
    if (q.id === 'C8') return !(q.skipIf as (a: Record<string, string>, zip?: string) => boolean)(answers, zipCode);
    return !q.skipIf(answers);
  });
}

// ── Grade color ────────────────────────────────────────────────────────────

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

export function scoreColor(score: number): string {
  if (score < 25) return '#22c55e';
  if (score <= 45) return '#84cc16';
  if (score <= 65) return '#eab308';
  if (score <= 80) return '#f97316';
  return '#ef4444';
}

export function formatDollars(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}
