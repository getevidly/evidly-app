// ═══════════════════════════════════════════════════════════
// src/data/demoCalcodeMap.ts
// DEMO MODE ONLY — Static CalCode violation data
// NEVER import this in live mode code paths
// ═══════════════════════════════════════════════════════════

export interface CalCodeViolation {
  section: string;
  title: string;
  severity: 'critical' | 'major' | 'minor' | 'grp';
  points: number;
  module: string;
  pillar: 'food_safety' | 'fire_safety';
  cdcRiskFactor: boolean;
  cdcCategory: string | null;
  category: string;
}

// Top violations inspectors find — used in demo score breakdowns
export const DEMO_CALCODE_VIOLATIONS: CalCodeViolation[] = [
  { section: '113996', title: 'Hot Holding Temperature', severity: 'critical', points: 4, module: 'temperatures', pillar: 'food_safety', cdcRiskFactor: true, cdcCategory: 'improper_holding_temp', category: 'temperature' },
  { section: '113996.5', title: 'Cold Holding Temperature', severity: 'critical', points: 4, module: 'temperatures', pillar: 'food_safety', cdcRiskFactor: true, cdcCategory: 'improper_holding_temp', category: 'temperature' },
  { section: '113953', title: 'Handwashing Required', severity: 'critical', points: 4, module: 'checklists', pillar: 'food_safety', cdcRiskFactor: true, cdcCategory: 'poor_hygiene', category: 'hygiene' },
  { section: '113953.1', title: 'No Bare Hand Contact', severity: 'critical', points: 4, module: 'checklists', pillar: 'food_safety', cdcRiskFactor: true, cdcCategory: 'poor_hygiene', category: 'hygiene' },
  { section: '114002', title: 'Cooking Temperature', severity: 'critical', points: 4, module: 'temperatures', pillar: 'food_safety', cdcRiskFactor: true, cdcCategory: 'inadequate_cooking', category: 'temperature' },
  { section: '113999', title: 'Cooling Procedures', severity: 'critical', points: 4, module: 'temperatures', pillar: 'food_safety', cdcRiskFactor: true, cdcCategory: 'improper_holding_temp', category: 'temperature' },
  { section: '114097', title: 'Food Contact Surfaces Clean', severity: 'major', points: 2, module: 'checklists', pillar: 'food_safety', cdcRiskFactor: true, cdcCategory: 'contaminated_equipment', category: 'equipment' },
  { section: '114105', title: 'Manual Warewashing', severity: 'major', points: 2, module: 'checklists', pillar: 'food_safety', cdcRiskFactor: true, cdcCategory: 'contaminated_equipment', category: 'equipment' },
  { section: '113980', title: 'Approved Food Source', severity: 'critical', points: 4, module: 'documents', pillar: 'food_safety', cdcRiskFactor: true, cdcCategory: 'unsafe_source', category: 'food_source' },
  { section: '114259.1', title: 'No Evidence of Vermin', severity: 'major', points: 2, module: 'checklists', pillar: 'food_safety', cdcRiskFactor: false, cdcCategory: null, category: 'pest' },
  { section: '114049', title: 'Proper Food Storage Order', severity: 'major', points: 2, module: 'checklists', pillar: 'food_safety', cdcRiskFactor: true, cdcCategory: 'contaminated_equipment', category: 'storage' },
  { section: '113725.1', title: 'HACCP Plan Required', severity: 'critical', points: 4, module: 'haccp', pillar: 'food_safety', cdcRiskFactor: false, cdcCategory: null, category: 'documentation' },
];

// Demo score breakdown — shows how violations reduce score
export const DEMO_SCORE_BREAKDOWN = {
  startingScore: 100,
  violations: [
    { section: '113996', title: 'Hot holding below 135F (walk-in prep line)', points: -4, remaining: 96 },
    { section: '114097', title: 'Cutting board not sanitized between proteins', points: -2, remaining: 94 },
    { section: '114099', title: 'Grease buildup on hood filters', points: -1, remaining: 93 },
    { section: '113969.5', title: 'Hair restraint not worn by prep cook', points: -1, remaining: 92 },
    { section: '114259.4', title: 'Gap under back door (pest entry point)', points: -1, remaining: 91 },
    { section: '114047.1', title: 'Dry goods stored on floor in storage room', points: -1, remaining: 90 },
    { section: '114145', title: 'Ceiling tile damaged above dish area', points: -1, remaining: 89 },
    { section: '114117', title: 'Wiping cloths not in sanitizer solution', points: -1, remaining: 88 },
  ],
  finalScore: 88,
  headline: 'How an 88 happens: 8 violations, 12 points deducted',
  insight: 'The daily checklist catches 6 of these 8 violations BEFORE the inspector arrives. The temp log catches the other 2. EvidLY prevents the score drop.',
};

// Maps which EvidLY module prevents which violation category
export const MODULE_PREVENTION_MAP = {
  temperatures: {
    prevents: ['temperature'],
    description: 'Daily temp logs catch holding, cooking, and cooling violations before inspection',
    violationsCaught: 6,
    pointsSaved: 'Up to 20 points',
  },
  checklists: {
    prevents: ['hygiene', 'equipment', 'pest', 'storage', 'structural', 'chemical'],
    description: 'Daily opening/closing checklists cover hygiene, sanitation, pest prevention, and storage',
    violationsCaught: 18,
    pointsSaved: 'Up to 24 points',
  },
  documents: {
    prevents: ['food_source', 'documentation', 'food_protection'],
    description: 'Document management ensures permits, labels, and source records are current',
    violationsCaught: 4,
    pointsSaved: 'Up to 10 points',
  },
  haccp: {
    prevents: ['documentation'],
    description: 'HACCP plan tracking for specialized processing operations',
    violationsCaught: 1,
    pointsSaved: 'Up to 4 points',
  },
  equipment: {
    prevents: ['equipment', 'structural'],
    description: 'Equipment tracking ensures maintenance schedules and condition monitoring',
    violationsCaught: 5,
    pointsSaved: 'Up to 8 points',
  },
  training: {
    prevents: ['documentation'],
    description: 'Training tracker ensures food handler cards and certifications stay current',
    violationsCaught: 1,
    pointsSaved: 'Up to 1 point',
  },
};
