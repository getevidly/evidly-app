// ═══════════════════════════════════════════════════════════════════
// src/data/selfInspectionChecklist.ts
// Config-driven self-inspection checklist definitions.
// Base CalCode checklist (61 CA jurisdictions) + FDA Food Code 2022
// overlay (NPS/Yosemite). Each item carries code basis, citation,
// default severity, and optional FDA equivalent.
// ═══════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CodeBasis = 'calcode' | 'fda_food_code_2022' | 'nfpa_96_2024';

export interface InspectionItemDef {
  id: string;
  text: string;
  sectionId: string;
  codeBasis: CodeBasis;
  citation: string;
  fdaCitation?: string; // FDA Food Code 2022 equivalent (for NPS overlay)
  defaultSeverity: 'critical' | 'major' | 'minor';
  category: 'food_safety' | 'facility_safety';
}

export interface JurisdictionVariance {
  jurisdictionId: string;
  itemId: string;
  varianceType:
    | 'stricter_threshold'
    | 'additional_requirement'
    | 'different_citation'
    | 'different_penalty';
  description: string;
  standardValue: string;
  jurisdictionValue: string;
}

export interface InspectionSectionDef {
  id: string;
  name: string;
  defaultCitation: string;
  iconName: string; // lucide icon name
  category: 'food_safety' | 'facility_safety';
  itemIds: string[];
}

// ---------------------------------------------------------------------------
// Base CalCode Inspection Items (41 items across 7 sections)
// Used by 61 of 62 CA jurisdictions. NPS overlay modifies citations.
// ---------------------------------------------------------------------------

export const INSPECTION_ITEMS: Record<string, InspectionItemDef> = {
  // ── Section 1: Food Temperature Control ──────────────────────
  'temp-001': {
    id: 'temp-001',
    text: 'Cold holding below 41\u00B0F',
    sectionId: 'food-temp',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7113996',
    fdaCitation: 'FDA Food Code 2022 \u00A73-501.16(A)(2)',
    defaultSeverity: 'critical',
    category: 'food_safety',
  },
  'temp-002': {
    id: 'temp-002',
    text: 'Hot holding above 135\u00B0F',
    sectionId: 'food-temp',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7113996',
    fdaCitation: 'FDA Food Code 2022 \u00A73-501.16(A)(1)',
    defaultSeverity: 'critical',
    category: 'food_safety',
  },
  'temp-003': {
    id: 'temp-003',
    text: 'Cooling from 135\u00B0F to 70\u00B0F within 2 hours',
    sectionId: 'food-temp',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114002',
    fdaCitation: 'FDA Food Code 2022 \u00A73-501.14(A)',
    defaultSeverity: 'critical',
    category: 'food_safety',
  },
  'temp-004': {
    id: 'temp-004',
    text: 'Reheating to 165\u00B0F within 1 hour',
    sectionId: 'food-temp',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114016',
    fdaCitation: 'FDA Food Code 2022 \u00A73-403.11(A)',
    defaultSeverity: 'critical',
    category: 'food_safety',
  },
  'temp-005': {
    id: 'temp-005',
    text: 'Time as temperature control procedures posted',
    sectionId: 'food-temp',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114000',
    fdaCitation: 'FDA Food Code 2022 \u00A73-501.19',
    defaultSeverity: 'major',
    category: 'food_safety',
  },
  'temp-006': {
    id: 'temp-006',
    text: 'Thermometer calibration verified',
    sectionId: 'food-temp',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114157',
    fdaCitation: 'FDA Food Code 2022 \u00A74-502.11',
    defaultSeverity: 'major',
    category: 'food_safety',
  },

  // ── Section 2: Employee Hygiene & Health ─────────────────────
  'hygiene-001': {
    id: 'hygiene-001',
    text: 'Proper handwashing observed',
    sectionId: 'employee-hygiene',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7113953',
    fdaCitation: 'FDA Food Code 2022 \u00A72-301.14',
    defaultSeverity: 'critical',
    category: 'food_safety',
  },
  'hygiene-002': {
    id: 'hygiene-002',
    text: 'Hair restraints worn',
    sectionId: 'employee-hygiene',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7113969',
    fdaCitation: 'FDA Food Code 2022 \u00A72-402.11',
    defaultSeverity: 'minor',
    category: 'food_safety',
  },
  'hygiene-003': {
    id: 'hygiene-003',
    text: 'No bare hand contact with RTE food',
    sectionId: 'employee-hygiene',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7113961',
    fdaCitation: 'FDA Food Code 2022 \u00A73-301.11',
    defaultSeverity: 'critical',
    category: 'food_safety',
  },
  'hygiene-004': {
    id: 'hygiene-004',
    text: 'Ill employee exclusion/restriction policy',
    sectionId: 'employee-hygiene',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7113949.2',
    fdaCitation: 'FDA Food Code 2022 \u00A72-201.12',
    defaultSeverity: 'critical',
    category: 'food_safety',
  },
  'hygiene-005': {
    id: 'hygiene-005',
    text: 'Clean uniforms/aprons',
    sectionId: 'employee-hygiene',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7113968',
    fdaCitation: 'FDA Food Code 2022 \u00A72-402.11',
    defaultSeverity: 'minor',
    category: 'food_safety',
  },

  // ── Section 3: Food Storage & Labeling ──────────────────────
  'storage-001': {
    id: 'storage-001',
    text: 'FIFO rotation followed',
    sectionId: 'food-storage',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114047',
    fdaCitation: 'FDA Food Code 2022 \u00A73-501.17',
    defaultSeverity: 'major',
    category: 'food_safety',
  },
  'storage-002': {
    id: 'storage-002',
    text: 'Date marking on opened TCS foods',
    sectionId: 'food-storage',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114059',
    fdaCitation: 'FDA Food Code 2022 \u00A73-501.17(A)',
    defaultSeverity: 'major',
    category: 'food_safety',
  },
  'storage-003': {
    id: 'storage-003',
    text: 'Foods stored 6\u2033 above floor',
    sectionId: 'food-storage',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114047',
    fdaCitation: 'FDA Food Code 2022 \u00A73-305.11(A)(3)',
    defaultSeverity: 'minor',
    category: 'food_safety',
  },
  'storage-004': {
    id: 'storage-004',
    text: 'Raw/cooked separation maintained',
    sectionId: 'food-storage',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7113980',
    fdaCitation: 'FDA Food Code 2022 \u00A73-302.11',
    defaultSeverity: 'critical',
    category: 'food_safety',
  },
  'storage-005': {
    id: 'storage-005',
    text: 'Allergen labeling present',
    sectionId: 'food-storage',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114090',
    fdaCitation: 'FDA Food Code 2022 \u00A73-602.11',
    defaultSeverity: 'major',
    category: 'food_safety',
  },
  'storage-006': {
    id: 'storage-006',
    text: 'Chemical storage separated',
    sectionId: 'food-storage',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114254.3',
    fdaCitation: 'FDA Food Code 2022 \u00A77-202.11',
    defaultSeverity: 'major',
    category: 'food_safety',
  },

  // ── Section 4: Equipment & Utensils ─────────────────────────
  'equipment-001': {
    id: 'equipment-001',
    text: 'Food contact surfaces clean and sanitized',
    sectionId: 'equipment',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114099',
    fdaCitation: 'FDA Food Code 2022 \u00A74-602.11',
    defaultSeverity: 'critical',
    category: 'food_safety',
  },
  'equipment-002': {
    id: 'equipment-002',
    text: 'Sanitizer concentration verified (quat/chlorine)',
    sectionId: 'equipment',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114099.6',
    fdaCitation: 'FDA Food Code 2022 \u00A74-501.114',
    defaultSeverity: 'major',
    category: 'food_safety',
  },
  'equipment-003': {
    id: 'equipment-003',
    text: 'Ice machine clean',
    sectionId: 'equipment',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114130',
    fdaCitation: 'FDA Food Code 2022 \u00A74-602.11',
    defaultSeverity: 'major',
    category: 'food_safety',
  },
  'equipment-004': {
    id: 'equipment-004',
    text: 'Cutting boards in good repair',
    sectionId: 'equipment',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114130',
    fdaCitation: 'FDA Food Code 2022 \u00A74-501.11',
    defaultSeverity: 'minor',
    category: 'food_safety',
  },
  'equipment-005': {
    id: 'equipment-005',
    text: '3-compartment sink setup correct',
    sectionId: 'equipment',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114099',
    fdaCitation: 'FDA Food Code 2022 \u00A74-301.12',
    defaultSeverity: 'major',
    category: 'food_safety',
  },

  // ── Section 5: Fire Safety & Suppression ────────────────
  'facility-001': {
    id: 'facility-001',
    text: 'Hood suppression system inspection current',
    sectionId: 'facility-safety',
    codeBasis: 'nfpa_96_2024',
    citation: 'NFPA 96 \u00A712.4',
    defaultSeverity: 'critical',
    category: 'facility_safety',
  },
  'facility-002': {
    id: 'facility-002',
    text: 'Fire extinguishers accessible and tagged',
    sectionId: 'facility-safety',
    codeBasis: 'nfpa_96_2024',
    citation: 'NFPA 10 (2022) \u00A77.2',
    defaultSeverity: 'critical',
    category: 'facility_safety',
  },
  'facility-003': {
    id: 'facility-003',
    text: 'Grease filter cleaning schedule current',
    sectionId: 'facility-safety',
    codeBasis: 'nfpa_96_2024',
    citation: 'NFPA 96 Table 12.4',
    defaultSeverity: 'major',
    category: 'facility_safety',
  },
  'facility-004': {
    id: 'facility-004',
    text: 'Ansul system last service within 6 months',
    sectionId: 'facility-safety',
    codeBasis: 'nfpa_96_2024',
    citation: 'NFPA 17A (2025) \u00A710.1',
    defaultSeverity: 'critical',
    category: 'facility_safety',
  },
  'facility-005': {
    id: 'facility-005',
    text: 'Emergency exit paths clear',
    sectionId: 'facility-safety',
    codeBasis: 'nfpa_96_2024',
    citation: 'CFC 2022 \u00A71031',
    defaultSeverity: 'critical',
    category: 'facility_safety',
  },

  // ── Section 6: Facility & Pest Control ──────────────────────
  'pest-001': {
    id: 'pest-001',
    text: 'Floors, walls, ceiling in good repair',
    sectionId: 'pest-control',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114271',
    fdaCitation: 'FDA Food Code 2022 \u00A76-501.11',
    defaultSeverity: 'minor',
    category: 'food_safety',
  },
  'pest-002': {
    id: 'pest-002',
    text: 'Adequate ventilation operational',
    sectionId: 'pest-control',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114149',
    fdaCitation: 'FDA Food Code 2022 \u00A76-304.11',
    defaultSeverity: 'minor',
    category: 'food_safety',
  },
  'pest-003': {
    id: 'pest-003',
    text: 'Pest control service current',
    sectionId: 'pest-control',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114259',
    fdaCitation: 'FDA Food Code 2022 \u00A76-501.111',
    defaultSeverity: 'major',
    category: 'food_safety',
  },
  'pest-004': {
    id: 'pest-004',
    text: 'No evidence of pest activity',
    sectionId: 'pest-control',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114259.1',
    fdaCitation: 'FDA Food Code 2022 \u00A76-501.111',
    defaultSeverity: 'critical',
    category: 'food_safety',
  },
  'pest-005': {
    id: 'pest-005',
    text: 'Restrooms clean and stocked',
    sectionId: 'pest-control',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114250',
    fdaCitation: 'FDA Food Code 2022 \u00A76-501.18',
    defaultSeverity: 'minor',
    category: 'food_safety',
  },
  'pest-006': {
    id: 'pest-006',
    text: 'Garbage areas clean and covered',
    sectionId: 'pest-control',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114244',
    fdaCitation: 'FDA Food Code 2022 \u00A75-501.113',
    defaultSeverity: 'minor',
    category: 'food_safety',
  },

  // ── Section 7: Documentation & Records ──────────────────────
  'docs-001': {
    id: 'docs-001',
    text: 'Health permit displayed and current',
    sectionId: 'documentation',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7113725',
    fdaCitation: 'FDA Food Code 2022 \u00A78-304.11',
    defaultSeverity: 'major',
    category: 'food_safety',
  },
  'docs-002': {
    id: 'docs-002',
    text: 'Food handler certifications on file',
    sectionId: 'documentation',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7113948 (SB 476)',
    fdaCitation: 'FDA Food Code 2022 \u00A72-102.20',
    defaultSeverity: 'major',
    category: 'food_safety',
  },
  'docs-003': {
    id: 'docs-003',
    text: 'Manager food safety certification valid',
    sectionId: 'documentation',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7113947.1',
    fdaCitation: 'FDA Food Code 2022 \u00A72-102.20',
    defaultSeverity: 'major',
    category: 'food_safety',
  },
  'docs-004': {
    id: 'docs-004',
    text: 'HACCP plan available (if applicable)',
    sectionId: 'documentation',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114419',
    fdaCitation: 'FDA Food Code 2022 \u00A78-201.14',
    defaultSeverity: 'major',
    category: 'food_safety',
  },
  'docs-005': {
    id: 'docs-005',
    text: 'Vendor service records current',
    sectionId: 'documentation',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114021',
    fdaCitation: 'FDA Food Code 2022 \u00A73-202.15',
    defaultSeverity: 'minor',
    category: 'food_safety',
  },
  'docs-006': {
    id: 'docs-006',
    text: 'Food supplier licenses verified',
    sectionId: 'documentation',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114021',
    fdaCitation: 'FDA Food Code 2022 \u00A73-202.15',
    defaultSeverity: 'minor',
    category: 'food_safety',
  },
  'docs-007': {
    id: 'docs-007',
    text: 'Delivery temperature logs maintained',
    sectionId: 'documentation',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114039',
    fdaCitation: 'FDA Food Code 2022 \u00A73-202.11',
    defaultSeverity: 'major',
    category: 'food_safety',
  },
  'docs-008': {
    id: 'docs-008',
    text: 'Receiving inspection procedures followed',
    sectionId: 'documentation',
    codeBasis: 'calcode',
    citation: 'CalCode \u00A7114035',
    fdaCitation: 'FDA Food Code 2022 \u00A73-202.11',
    defaultSeverity: 'major',
    category: 'food_safety',
  },
};

// ---------------------------------------------------------------------------
// NPS / FDA Food Code 2022 Overlay Items
// Additional items required under federal jurisdiction (Yosemite, etc.)
// These are ADDED to the base checklist for federal track only.
// ---------------------------------------------------------------------------

export const FDA_OVERLAY_ITEMS: Record<string, InspectionItemDef> = {
  'fda-001': {
    id: 'fda-001',
    text: 'NPS concession food safety plan on file (RM-83)',
    sectionId: 'documentation',
    codeBasis: 'fda_food_code_2022',
    citation: 'NPS Reference Manual 83 \u00A74.1',
    defaultSeverity: 'major',
    category: 'food_safety',
  },
  'fda-002': {
    id: 'fda-002',
    text: 'Person in Charge (PIC) present and knowledgeable',
    sectionId: 'employee-hygiene',
    codeBasis: 'fda_food_code_2022',
    citation: 'FDA Food Code 2022 \u00A72-101.11',
    defaultSeverity: 'major',
    category: 'food_safety',
  },
  'fda-003': {
    id: 'fda-003',
    text: 'Consumer advisory for raw/undercooked items',
    sectionId: 'food-storage',
    codeBasis: 'fda_food_code_2022',
    citation: 'FDA Food Code 2022 \u00A73-603.11',
    defaultSeverity: 'major',
    category: 'food_safety',
  },
  'fda-004': {
    id: 'fda-004',
    text: 'NPS environmental sustainability practices followed',
    sectionId: 'pest-control',
    codeBasis: 'fda_food_code_2022',
    citation: 'NPS Director\u2019s Order 13A',
    defaultSeverity: 'minor',
    category: 'food_safety',
  },
  'fda-005': {
    id: 'fda-005',
    text: 'Bear-resistant food storage containers used (if applicable)',
    sectionId: 'food-storage',
    codeBasis: 'fda_food_code_2022',
    citation: 'NPS Superintendent\u2019s Compendium \u2014 Yosemite',
    defaultSeverity: 'major',
    category: 'food_safety',
  },
};

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export const INSPECTION_SECTIONS: InspectionSectionDef[] = [
  {
    id: 'food-temp',
    name: 'Food Temperature Control',
    defaultCitation: 'CalCode \u00A7113996',
    iconName: 'Thermometer',
    category: 'food_safety',
    itemIds: ['temp-001', 'temp-002', 'temp-003', 'temp-004', 'temp-005', 'temp-006'],
  },
  {
    id: 'employee-hygiene',
    name: 'Employee Hygiene & Health',
    defaultCitation: 'CalCode \u00A7113968',
    iconName: 'Users',
    category: 'food_safety',
    itemIds: ['hygiene-001', 'hygiene-002', 'hygiene-003', 'hygiene-004', 'hygiene-005'],
  },
  {
    id: 'food-storage',
    name: 'Food Storage & Labeling',
    defaultCitation: 'CalCode \u00A7114047',
    iconName: 'Package',
    category: 'food_safety',
    itemIds: ['storage-001', 'storage-002', 'storage-003', 'storage-004', 'storage-005', 'storage-006'],
  },
  {
    id: 'equipment',
    name: 'Equipment & Utensils',
    defaultCitation: 'CalCode \u00A7114130',
    iconName: 'Wrench',
    category: 'food_safety',
    itemIds: ['equipment-001', 'equipment-002', 'equipment-003', 'equipment-004', 'equipment-005'],
  },
  {
    id: 'facility-safety',
    name: 'Fire Safety & Suppression',
    defaultCitation: 'NFPA 96 \u00A712.4',
    iconName: 'Flame',
    category: 'facility_safety',
    itemIds: ['facility-001', 'facility-002', 'facility-003', 'facility-004', 'facility-005'],
  },
  {
    id: 'pest-control',
    name: 'Facility & Pest Control',
    defaultCitation: 'CalCode \u00A7114259',
    iconName: 'Building2',
    category: 'food_safety',
    itemIds: ['pest-001', 'pest-002', 'pest-003', 'pest-004', 'pest-005', 'pest-006'],
  },
  {
    id: 'documentation',
    name: 'Documentation & Records',
    defaultCitation: 'CalCode \u00A7113725',
    iconName: 'FileText',
    category: 'food_safety',
    itemIds: ['docs-001', 'docs-002', 'docs-003', 'docs-004', 'docs-005', 'docs-006', 'docs-007', 'docs-008'],
  },
];

// FDA overlay adds extra items to existing sections for NPS track
export const FDA_OVERLAY_SECTION_ADDITIONS: Record<string, string[]> = {
  'employee-hygiene': ['fda-002'],
  'food-storage': ['fda-003', 'fda-005'],
  'pest-control': ['fda-004'],
  'documentation': ['fda-001'],
};

// ---------------------------------------------------------------------------
// Jurisdiction Variance Registry
// Pre-configured variances for jurisdictions with known differences from
// the CalCode standard. Only items that MATERIALLY differ are flagged.
// ---------------------------------------------------------------------------

export const JURISDICTION_VARIANCES: JurisdictionVariance[] = [
  // ── Riverside: A-only pass ───────────────────────────────────
  {
    jurisdictionId: 'Riverside',
    itemId: 'temp-001',
    varianceType: 'stricter_threshold',
    description: 'Riverside County requires Grade A (90+) to pass. A score of 88 = Grade B = FAIL under Riverside Ordinance 493.',
    standardValue: 'CalCode standard: 70+ to pass',
    jurisdictionValue: 'Riverside: 90+ required (A-only passes)',
  },
  {
    jurisdictionId: 'Riverside',
    itemId: 'hygiene-001',
    varianceType: 'stricter_threshold',
    description: 'Handwashing violations are weighted heavily. Under Riverside strict grading, any critical violation drops score below A threshold.',
    standardValue: 'CalCode standard: reinspection if uncorrected',
    jurisdictionValue: 'Riverside: critical violation likely drops to B grade = FAIL',
  },

  // ── Kern: closure at 75, not 70 ─────────────────────────────
  {
    jurisdictionId: 'Kern',
    itemId: 'temp-001',
    varianceType: 'stricter_threshold',
    description: 'Kern County closure threshold is 75 (not 70 like LA County). Major=5pts, MinorRisk=3pts, NonCritical=1pt.',
    standardValue: 'LA County: closure below 70',
    jurisdictionValue: 'Kern: closure below 75 (Chapter 8.58)',
  },

  // ── San Bernardino: C grade triggers mandatory re-score ─────
  {
    jurisdictionId: 'San Bernardino',
    itemId: 'temp-001',
    varianceType: 'additional_requirement',
    description: 'C grade (70-79) triggers mandatory re-score within 30 days. Must achieve B on re-score to avoid closure. Fee charged.',
    standardValue: 'LA County: C grade = warning, no mandatory re-score',
    jurisdictionValue: 'SB County: C = mandatory re-score (30 days, fee required)',
  },

  // ── San Luis Obispo: negative scoring ───────────────────────
  {
    jurisdictionId: 'San Luis Obispo',
    itemId: 'temp-001',
    varianceType: 'different_penalty',
    description: 'SLO County uses negative scoring (effective May 5, 2025). 0 = perfect. Violations deduct from 0 into negative numbers.',
    standardValue: 'Most CA counties: 100-pt deductive or no score',
    jurisdictionValue: 'SLO: 0 is perfect, violations yield negative scores',
  },

  // ── Merced: point accumulation upward ───────────────────────
  {
    jurisdictionId: 'Merced',
    itemId: 'temp-001',
    varianceType: 'different_penalty',
    description: 'Merced County uses point accumulation upward. Critical=4pts, Major=2pts, Minor=1pt. Good (0-6), Satisfactory (7-13), Unsatisfactory (14+).',
    standardValue: 'Most CA counties: deductive from 100',
    jurisdictionValue: 'Merced: points accumulate up (Good/Satisfactory/Unsatisfactory)',
  },

  // ── Napa: rescore available ─────────────────────────────────
  {
    jurisdictionId: 'Napa',
    itemId: 'docs-001',
    varianceType: 'additional_requirement',
    description: 'Napa County allows operators to request one rescore per year (fee required). Closure below 70 with minimum 24-hour closure.',
    standardValue: 'Most CA counties: no rescore option',
    jurisdictionValue: 'Napa: 1 rescore/year (fee required)',
  },

  // ── Orange: placard outcomes ────────────────────────────────
  {
    jurisdictionId: 'Orange',
    itemId: 'temp-001',
    varianceType: 'different_citation',
    description: 'Orange County uses Pass / Reinspection Due-Pass / Closed placards. No letter grade. No numeric score. Major CRF violations trigger reinspection.',
    standardValue: 'LA County: letter grade A / B / C',
    jurisdictionValue: 'Orange: Pass/Reinspection/Closed placard only',
  },

  // ── Santa Clara: major=8pts ─────────────────────────────────
  {
    jurisdictionId: 'Santa Clara',
    itemId: 'temp-001',
    varianceType: 'different_penalty',
    description: 'Santa Clara County uses 100-pt deductive with Major=8pts, Moderate=3pts, Minor=2pts. Green / Yellow / Red placard + numeric score both published.',
    standardValue: 'LA County: Major=4pts',
    jurisdictionValue: 'Santa Clara: Major=8pts (higher penalty per violation)',
  },

  // ── Placer: single uncorrected major = Yellow ───────────────
  {
    jurisdictionId: 'Placer',
    itemId: 'temp-001',
    varianceType: 'stricter_threshold',
    description: 'Placer County: failure to correct even a single major violation triggers Yellow placard (differs from Sacramento 2+ threshold).',
    standardValue: 'Sacramento: 2+ uncorrected majors for Yellow',
    jurisdictionValue: 'Placer: 1 uncorrected major = Yellow',
  },

  // ── NPS / Yosemite: FDA Food Code basis ─────────────────────
  {
    jurisdictionId: 'Mariposa',
    itemId: 'temp-001',
    varianceType: 'different_citation',
    description: 'Yosemite NPS concessions inspected under BOTH Mariposa County CalCode AND NPS FDA Food Code 2022. Two separate inspection tracks.',
    standardValue: 'Standard: CalCode only',
    jurisdictionValue: 'Yosemite: CalCode + FDA Food Code 2022 (dual jurisdiction)',
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns the 7 base CalCode inspection sections */
export function getBaseSections(): InspectionSectionDef[] {
  return INSPECTION_SECTIONS;
}

/** Returns FDA Food Code 2022 sections for NPS/Yosemite federal track */
export function getFdaOverlaySections(): InspectionSectionDef[] {
  return INSPECTION_SECTIONS.map((section) => {
    const extraItemIds = FDA_OVERLAY_SECTION_ADDITIONS[section.id] || [];
    const fdaCitation = section.category === 'food_safety'
      ? section.defaultCitation.replace('CalCode', 'FDA Food Code 2022')
      : section.defaultCitation;
    return {
      ...section,
      defaultCitation: fdaCitation,
      itemIds: [...section.itemIds, ...extraItemIds],
    };
  });
}

/** Returns all inspection items for a section */
export function getItemsForSection(sectionId: string, useFdaOverlay = false): InspectionItemDef[] {
  const section = INSPECTION_SECTIONS.find((s) => s.id === sectionId);
  if (!section) return [];
  const extras = useFdaOverlay ? (FDA_OVERLAY_SECTION_ADDITIONS[sectionId] || []) : [];
  const allItemIds = [...section.itemIds, ...extras];
  return allItemIds
    .map((id) => INSPECTION_ITEMS[id] || FDA_OVERLAY_ITEMS[id])
    .filter(Boolean)
    .map((item) => {
      if (!useFdaOverlay || item.codeBasis !== 'calcode') return item;
      // For FDA overlay, swap citation to FDA equivalent
      return {
        ...item,
        citation: item.fdaCitation || item.citation,
        codeBasis: 'fda_food_code_2022' as CodeBasis,
      };
    });
}

/** Returns variances applicable to a given jurisdiction */
export function getVariancesForJurisdiction(county: string): JurisdictionVariance[] {
  return JURISDICTION_VARIANCES.filter((v) => v.jurisdictionId === county);
}

/** Returns variance for a specific item in a jurisdiction (if any) */
export function getItemVariance(
  itemId: string,
  county: string,
): JurisdictionVariance | undefined {
  return JURISDICTION_VARIANCES.find(
    (v) => v.jurisdictionId === county && v.itemId === itemId,
  );
}
