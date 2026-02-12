// =============================================================================
// State-Specific Health Code Requirements Registry
// Central registry for US state health code requirements, checklist additions,
// and temperature overrides relative to the FDA Food Code baseline.
// =============================================================================

// -----------------------------------------------------------------------------
// Interfaces
// -----------------------------------------------------------------------------

export interface StateCode {
  id: string;              // 'CA', 'TX', etc.
  name: string;            // 'California'
  primaryCode: string;     // 'California Retail Food Code (CalCode)'
  citation: string;        // 'Health & Safety Code Div 104, Part 7'
  agency: string;          // 'CDPH + county health departments'
  fdaFoodCodeBase: string; // '2022' — which FDA Food Code edition the state adopted
  requirements: StateRequirement[];
  additionalChecklistItems: ChecklistAddition[];
  tempRequirements?: TempOverride[];
}

export interface StateRequirement {
  id: string;
  category: 'food_safety' | 'fire_safety' | 'vendor_compliance';
  title: string;
  description: string;
  citation: string;
  isAdditional: boolean;   // true = adds to FDA baseline, false = modifies it
}

export interface ChecklistAddition {
  id: string;
  checklistType: 'opening' | 'closing' | 'receiving' | 'daily';
  item: string;
  citation: string;
  required: boolean;
}

export interface TempOverride {
  category: string;        // 'cold_holding', 'hot_holding', 'receiving', etc.
  fdaTemp: number;
  stateTemp: number;
  unit: 'F';
  citation: string;
}

// -----------------------------------------------------------------------------
// State Data
// -----------------------------------------------------------------------------

// ---- California (CA) --------------------------------------------------------

const california: StateCode = {
  id: 'CA',
  name: 'California',
  primaryCode: 'California Retail Food Code (CalCode)',
  citation: 'Health & Safety Code Div 104, Part 7',
  agency: 'CDPH + county health departments',
  fdaFoodCodeBase: '2022',
  requirements: [
    {
      id: 'CA-REQ-001',
      category: 'food_safety',
      title: 'Food Handler Card Within 30 Days',
      description: 'All food handlers must obtain a valid food handler card within 30 days of date of hire.',
      citation: 'CalCode §113948',
      isAdditional: true,
    },
    {
      id: 'CA-REQ-002',
      category: 'food_safety',
      title: 'Certified Food Handler On-Site',
      description: 'A certified food handler must be present on-site during all hours of operation.',
      citation: 'CalCode §113947.1',
      isAdditional: true,
    },
    {
      id: 'CA-REQ-003',
      category: 'food_safety',
      title: 'Consumer Advisory for Raw/Undercooked',
      description: 'A consumer advisory must be provided for menu items containing raw or undercooked animal-derived foods.',
      citation: 'CalCode §114012',
      isAdditional: false,
    },
    {
      id: 'CA-REQ-004',
      category: 'food_safety',
      title: 'Food Facility Grading Display',
      description: 'Food facility inspection grade card must be displayed in a location visible to the public at all times.',
      citation: 'CalCode §114099.6',
      isAdditional: true,
    },
    {
      id: 'CA-REQ-005',
      category: 'food_safety',
      title: 'Employer Must Pay for Food Handler Training',
      description: 'Employers are required to pay for food handler training and certification costs for all employees.',
      citation: 'SB 476',
      isAdditional: true,
    },
    {
      id: 'CA-REQ-006',
      category: 'food_safety',
      title: 'Indoor Heat Illness Prevention Plan',
      description: 'An indoor heat illness prevention plan must be developed, implemented, and posted in the workplace.',
      citation: 'Cal/OSHA §3396',
      isAdditional: true,
    },
    {
      id: 'CA-REQ-007',
      category: 'vendor_compliance',
      title: 'Organic Waste Diversion Required',
      description: 'All food facilities must divert organic waste from landfills through composting or other approved recovery methods.',
      citation: 'SB 1383',
      isAdditional: true,
    },
    {
      id: 'CA-REQ-008',
      category: 'fire_safety',
      title: 'Grease Trap Cleaning Per Local Jurisdiction',
      description: 'Grease traps must be cleaned and maintained per the schedule set by the local fire and health jurisdiction.',
      citation: 'Local fire code (varies by jurisdiction)',
      isAdditional: true,
    },
  ],
  additionalChecklistItems: [
    {
      id: 'CA-CHK-001',
      checklistType: 'opening',
      item: 'Verify food handler cards current for all staff',
      citation: 'CalCode §113948',
      required: true,
    },
    {
      id: 'CA-CHK-002',
      checklistType: 'opening',
      item: 'Check heat illness prevention plan posted',
      citation: 'Cal/OSHA §3396',
      required: true,
    },
    {
      id: 'CA-CHK-003',
      checklistType: 'receiving',
      item: 'Verify organic waste recovery partner documentation',
      citation: 'SB 1383',
      required: true,
    },
    {
      id: 'CA-CHK-004',
      checklistType: 'daily',
      item: 'Confirm food facility grade card displayed',
      citation: 'CalCode §114099.6',
      required: true,
    },
    {
      id: 'CA-CHK-005',
      checklistType: 'closing',
      item: 'Log grease trap levels',
      citation: 'Local fire code',
      required: true,
    },
  ],
  tempRequirements: [
    {
      category: 'cold_holding',
      fdaTemp: 41,
      stateTemp: 41,
      unit: 'F',
      citation: 'CalCode §113996',
    },
    {
      category: 'cooling_1st_stage',
      fdaTemp: 70,
      stateTemp: 70,
      unit: 'F',
      citation: 'CalCode §114002 (changes April 2026)',
    },
  ],
};

// ---- Texas (TX) -------------------------------------------------------------

const texas: StateCode = {
  id: 'TX',
  name: 'Texas',
  primaryCode: 'Texas Food Establishment Rules (TFER)',
  citation: '25 TAC Chapter 228',
  agency: 'DSHS (Department of State Health Services)',
  fdaFoodCodeBase: '2017',
  requirements: [
    {
      id: 'TX-REQ-001',
      category: 'food_safety',
      title: 'Certified Food Manager Required',
      description: 'Each food establishment must employ at least one Certified Food Manager who has passed an accredited examination.',
      citation: '25 TAC §228.65',
      isAdditional: true,
    },
    {
      id: 'TX-REQ-002',
      category: 'food_safety',
      title: 'Person in Charge Must Be Present',
      description: 'A designated Person in Charge must be present and responsible for operations during all hours the establishment is open.',
      citation: '25 TAC §228.61',
      isAdditional: false,
    },
    {
      id: 'TX-REQ-003',
      category: 'food_safety',
      title: 'Food Handler Card Within 60 Days',
      description: 'All food handlers must obtain a food handler card within 60 days of employment.',
      citation: '25 TAC §228.33',
      isAdditional: true,
    },
    {
      id: 'TX-REQ-004',
      category: 'vendor_compliance',
      title: 'Mobile Food Unit Commissary Letter',
      description: 'Mobile food units must maintain a current commissary letter on file demonstrating an approved base of operations.',
      citation: '25 TAC §228.222',
      isAdditional: true,
    },
    {
      id: 'TX-REQ-005',
      category: 'food_safety',
      title: 'Bare Hand Contact Prohibition',
      description: 'Bare hand contact with ready-to-eat food is prohibited. Gloves, utensils, or other barriers must be used.',
      citation: '25 TAC §228.64',
      isAdditional: false,
    },
    {
      id: 'TX-REQ-006',
      category: 'vendor_compliance',
      title: 'Annual Permit Renewal Required',
      description: 'Food establishment permits must be renewed annually with the local regulatory authority.',
      citation: '25 TAC §228.31',
      isAdditional: true,
    },
  ],
  additionalChecklistItems: [
    {
      id: 'TX-CHK-001',
      checklistType: 'opening',
      item: 'Verify Certified Food Manager on-site',
      citation: '25 TAC §228.65',
      required: true,
    },
    {
      id: 'TX-CHK-002',
      checklistType: 'opening',
      item: 'Verify food handler cards current — 60-day window',
      citation: '25 TAC §228.33',
      required: true,
    },
    {
      id: 'TX-CHK-003',
      checklistType: 'receiving',
      item: 'Check commissary letter on file for mobile units',
      citation: '25 TAC §228.222',
      required: true,
    },
    {
      id: 'TX-CHK-004',
      checklistType: 'daily',
      item: 'Confirm bare hand contact policy posted',
      citation: '25 TAC §228.64',
      required: true,
    },
  ],
};

// ---- Florida (FL) -----------------------------------------------------------

const florida: StateCode = {
  id: 'FL',
  name: 'Florida',
  primaryCode: 'Florida Food Safety Act',
  citation: 'Chapter 64E-11, FAC (Florida Administrative Code)',
  agency: 'DBPR Division of Hotels and Restaurants + county health departments',
  fdaFoodCodeBase: '2017',
  requirements: [
    {
      id: 'FL-REQ-001',
      category: 'food_safety',
      title: 'Food Manager Certification Required',
      description: 'At least one certified food manager (ServSafe or equivalent accredited program) must be employed by the establishment.',
      citation: '64E-11.012',
      isAdditional: true,
    },
    {
      id: 'FL-REQ-002',
      category: 'food_safety',
      title: 'Certified Food Manager Must Be Employed',
      description: 'The certified food manager must be a direct employee of the establishment, not a contracted or third-party individual.',
      citation: '64E-11.012(1)',
      isAdditional: true,
    },
    {
      id: 'FL-REQ-003',
      category: 'food_safety',
      title: 'Risk-Based Inspection Frequency',
      description: 'Establishments are inspected based on risk level: high-risk 3x/year, moderate 2x/year, low 1x/year.',
      citation: '64E-11.002',
      isAdditional: true,
    },
    {
      id: 'FL-REQ-004',
      category: 'food_safety',
      title: 'Shellfish HACCP Plan Required',
      description: 'A written HACCP plan is required for any establishment serving raw shellfish, including source documentation and handling procedures.',
      citation: '64E-11.005',
      isAdditional: true,
    },
    {
      id: 'FL-REQ-005',
      category: 'food_safety',
      title: 'Written Employee Health Policy',
      description: 'A written employee health policy must be maintained on file and available for regulatory review at all times.',
      citation: '64E-11.004',
      isAdditional: true,
    },
    {
      id: 'FL-REQ-006',
      category: 'food_safety',
      title: 'Backflow Prevention on Water Connections',
      description: 'Backflow prevention devices must be installed and maintained on all water supply connections within the establishment.',
      citation: '64E-11.003',
      isAdditional: false,
    },
  ],
  additionalChecklistItems: [
    {
      id: 'FL-CHK-001',
      checklistType: 'opening',
      item: 'Verify Food Manager Certification posted',
      citation: '64E-11.012',
      required: true,
    },
    {
      id: 'FL-CHK-002',
      checklistType: 'opening',
      item: 'Review employee illness log',
      citation: '64E-11.004',
      required: true,
    },
    {
      id: 'FL-CHK-003',
      checklistType: 'receiving',
      item: 'Verify shellfish tags retained 90 days',
      citation: '64E-11.005',
      required: true,
    },
    {
      id: 'FL-CHK-004',
      checklistType: 'daily',
      item: 'Confirm backflow preventer operational',
      citation: '64E-11.003',
      required: true,
    },
  ],
};

// ---- New York (NY) ----------------------------------------------------------

const newYork: StateCode = {
  id: 'NY',
  name: 'New York',
  primaryCode: 'New York State Sanitary Code',
  citation: '10 NYCRR Subpart 14-1',
  agency: 'NYSDOH (New York State Department of Health)',
  fdaFoodCodeBase: '2017',
  requirements: [
    {
      id: 'NY-REQ-001',
      category: 'food_safety',
      title: 'Food Protection Certificate Required',
      description: 'A supervisory-level employee must hold a valid Food Protection Certificate from an accredited program.',
      citation: '10 NYCRR §14-1.20',
      isAdditional: true,
    },
    {
      id: 'NY-REQ-002',
      category: 'food_safety',
      title: 'Allergen Awareness Training',
      description: 'All food handlers must complete allergen awareness training covering the major food allergens and cross-contact prevention.',
      citation: 'NYC Local Law 17',
      isAdditional: true,
    },
    {
      id: 'NY-REQ-003',
      category: 'food_safety',
      title: 'Letter Grade Posting Required (NYC)',
      description: 'In New York City, the inspection letter grade must be conspicuously posted at the entrance visible to the public.',
      citation: 'NYC Admin Code §81.51',
      isAdditional: true,
    },
    {
      id: 'NY-REQ-004',
      category: 'food_safety',
      title: 'Choking Prevention Poster Required',
      description: 'A choking prevention poster with first-aid instructions must be displayed in a visible location within the establishment.',
      citation: 'Gen. Business Law §399-z',
      isAdditional: true,
    },
    {
      id: 'NY-REQ-005',
      category: 'food_safety',
      title: 'Trans Fat Ban',
      description: 'Artificial trans fats are banned from use in food preparation and cooking in all food service establishments.',
      citation: 'NYC Health Code §81.08',
      isAdditional: true,
    },
    {
      id: 'NY-REQ-006',
      category: 'food_safety',
      title: 'Calorie Posting for Chain Restaurants',
      description: 'Restaurant chains with 15 or more locations must post calorie counts on menus and menu boards.',
      citation: 'NYC Admin Code §81.50',
      isAdditional: true,
    },
  ],
  additionalChecklistItems: [
    {
      id: 'NY-CHK-001',
      checklistType: 'opening',
      item: 'Verify Food Protection Certificate on-site',
      citation: '10 NYCRR §14-1.20',
      required: true,
    },
    {
      id: 'NY-CHK-002',
      checklistType: 'opening',
      item: 'Allergen info available for staff reference',
      citation: 'NYC LL 17',
      required: true,
    },
    {
      id: 'NY-CHK-003',
      checklistType: 'daily',
      item: 'Letter grade conspicuously posted at entrance',
      citation: 'NYC §81.51',
      required: true,
    },
    {
      id: 'NY-CHK-004',
      checklistType: 'daily',
      item: 'Confirm choking prevention poster displayed',
      citation: 'GBL §399-z',
      required: true,
    },
    {
      id: 'NY-CHK-005',
      checklistType: 'closing',
      item: 'No artificial trans fats used in cooking',
      citation: 'NYC §81.08',
      required: true,
    },
  ],
};

// ---- Washington (WA) --------------------------------------------------------

const washington: StateCode = {
  id: 'WA',
  name: 'Washington',
  primaryCode: 'Washington Food Safety Rules',
  citation: 'WAC 246-215',
  agency: 'Washington DOH',
  fdaFoodCodeBase: '2017',
  requirements: [
    {
      id: 'WA-REQ-001',
      category: 'food_safety',
      title: 'Food Worker Card Within 14 Days',
      description: 'All food workers must obtain a valid Food Worker Card within 14 days of hire.',
      citation: 'RCW 69.06.010',
      isAdditional: true,
    },
    {
      id: 'WA-REQ-002',
      category: 'food_safety',
      title: 'Food Worker Card Valid for 2 Years',
      description: 'Food Worker Cards are valid for 2 years from the date of issuance and must be renewed before expiration.',
      citation: 'WAC 246-215-02115',
      isAdditional: true,
    },
    {
      id: 'WA-REQ-003',
      category: 'food_safety',
      title: 'Permit Posted in Public View',
      description: 'The food establishment permit must be posted in a location clearly visible to the public.',
      citation: 'WAC 246-215-02225',
      isAdditional: false,
    },
    {
      id: 'WA-REQ-004',
      category: 'food_safety',
      title: 'Written Food Allergy Procedure',
      description: 'A written food allergy procedure must be developed and accessible to all food service staff.',
      citation: 'WAC 246-215-03660',
      isAdditional: true,
    },
    {
      id: 'WA-REQ-005',
      category: 'vendor_compliance',
      title: 'Mobile Food Unit Commissary Agreement',
      description: 'Mobile food units must maintain a current commissary agreement on file with an approved commissary facility.',
      citation: 'WAC 246-215-09140',
      isAdditional: true,
    },
  ],
  additionalChecklistItems: [
    {
      id: 'WA-CHK-001',
      checklistType: 'opening',
      item: 'Verify all staff have valid Food Worker Cards',
      citation: 'RCW 69.06.010',
      required: true,
    },
    {
      id: 'WA-CHK-002',
      checklistType: 'opening',
      item: 'Written allergy procedure accessible to staff',
      citation: 'WAC 246-215-03660',
      required: true,
    },
    {
      id: 'WA-CHK-003',
      checklistType: 'receiving',
      item: 'Food permit posted in public view',
      citation: 'WAC 246-215-02225',
      required: true,
    },
    {
      id: 'WA-CHK-004',
      checklistType: 'daily',
      item: 'Review Food Worker Card expiration dates — 2yr validity',
      citation: 'WAC 246-215-02115',
      required: true,
    },
  ],
};

// ---- Oregon (OR) ------------------------------------------------------------

const oregon: StateCode = {
  id: 'OR',
  name: 'Oregon',
  primaryCode: 'Oregon Food Sanitation Rules',
  citation: 'OAR 333-150',
  agency: 'OHA (Oregon Health Authority)',
  fdaFoodCodeBase: '2017',
  requirements: [
    {
      id: 'OR-REQ-001',
      category: 'food_safety',
      title: 'Oregon Food Handler Certification',
      description: 'All food handlers must obtain an Oregon-specific Food Handler certification card before handling food.',
      citation: 'ORS 624.570',
      isAdditional: true,
    },
    {
      id: 'OR-REQ-002',
      category: 'food_safety',
      title: 'Risk-Based Inspection Frequency',
      description: 'Establishments are inspected based on risk category: high-risk 3x/year, medium 2x/year, low 1x/year.',
      citation: 'OAR 333-150-0000',
      isAdditional: true,
    },
    {
      id: 'OR-REQ-003',
      category: 'vendor_compliance',
      title: 'Food Cart/Mobile Unit Permit Category',
      description: 'Food carts and mobile food units fall under a specific permit category with unique operational requirements.',
      citation: 'OAR 333-162',
      isAdditional: true,
    },
    {
      id: 'OR-REQ-004',
      category: 'food_safety',
      title: 'Written Allergen Training Documentation',
      description: 'Written documentation of allergen training must be maintained on file for all food service employees.',
      citation: 'OAR 333-150-0000',
      isAdditional: true,
    },
    {
      id: 'OR-REQ-005',
      category: 'vendor_compliance',
      title: 'Seasonal Operation Reporting',
      description: 'Intermittent and seasonal kitchens must report operational periods to the health authority for inspection scheduling.',
      citation: 'OAR 333-150-0000',
      isAdditional: true,
    },
  ],
  additionalChecklistItems: [
    {
      id: 'OR-CHK-001',
      checklistType: 'opening',
      item: 'Verify Oregon Food Handler cards current',
      citation: 'ORS 624.570',
      required: true,
    },
    {
      id: 'OR-CHK-002',
      checklistType: 'opening',
      item: 'Check allergen training documentation on file',
      citation: 'OAR 333-150',
      required: true,
    },
    {
      id: 'OR-CHK-003',
      checklistType: 'receiving',
      item: 'Seasonal operation permit verified if applicable',
      citation: 'OAR 333-162',
      required: true,
    },
    {
      id: 'OR-CHK-004',
      checklistType: 'daily',
      item: 'Risk-based self-inspection per category level',
      citation: 'OAR 333-150',
      required: true,
    },
  ],
};

// ---- Arizona (AZ) -----------------------------------------------------------

const arizona: StateCode = {
  id: 'AZ',
  name: 'Arizona',
  primaryCode: 'Arizona Food Code',
  citation: 'AAC R9-8',
  agency: 'ADHS (Arizona Department of Health Services) + county health departments',
  fdaFoodCodeBase: '2017',
  requirements: [
    {
      id: 'AZ-REQ-001',
      category: 'food_safety',
      title: 'Food Handler Certification Through County',
      description: 'All food handlers must obtain certification through their respective county health department.',
      citation: 'AAC R9-8-104',
      isAdditional: true,
    },
    {
      id: 'AZ-REQ-002',
      category: 'food_safety',
      title: 'Certified Food Protection Manager Required',
      description: 'A Certified Food Protection Manager must be employed and available during all hours of operation.',
      citation: 'AAC R9-8-105',
      isAdditional: true,
    },
    {
      id: 'AZ-REQ-003',
      category: 'food_safety',
      title: 'Swimming Pool Food Service Requirements',
      description: 'Food service operations adjacent to or within swimming pool facilities must meet additional sanitation and operational requirements.',
      citation: 'AAC R9-8-801',
      isAdditional: true,
    },
    {
      id: 'AZ-REQ-004',
      category: 'vendor_compliance',
      title: 'Maricopa County Plan Review for New Facilities',
      description: 'New food facilities in Maricopa County must undergo a plan review process before obtaining an operating permit.',
      citation: 'Maricopa County Code',
      isAdditional: true,
    },
    {
      id: 'AZ-REQ-005',
      category: 'food_safety',
      title: 'Written Food Safety Plan for High-Risk Operations',
      description: 'High-risk food operations must develop and maintain a written food safety plan accessible during inspections.',
      citation: 'AAC R9-8-116',
      isAdditional: true,
    },
    {
      id: 'AZ-REQ-006',
      category: 'vendor_compliance',
      title: 'Temporary Event Food Permits',
      description: 'Temporary food event permits are limited to a maximum of 14 consecutive days per event.',
      citation: 'AAC R9-8-118',
      isAdditional: true,
    },
  ],
  additionalChecklistItems: [
    {
      id: 'AZ-CHK-001',
      checklistType: 'opening',
      item: 'Verify Food Protection Manager on-site',
      citation: 'AAC R9-8-105',
      required: true,
    },
    {
      id: 'AZ-CHK-002',
      checklistType: 'opening',
      item: 'Food handler certifications current — county-issued',
      citation: 'AAC R9-8-104',
      required: true,
    },
    {
      id: 'AZ-CHK-003',
      checklistType: 'receiving',
      item: 'Temporary event permit verified if applicable',
      citation: 'AAC R9-8-118',
      required: true,
    },
    {
      id: 'AZ-CHK-004',
      checklistType: 'daily',
      item: 'Written food safety plan accessible',
      citation: 'AAC R9-8-116',
      required: true,
    },
  ],
};

// -----------------------------------------------------------------------------
// State Registry Map
// -----------------------------------------------------------------------------

const STATE_CODES: Record<string, StateCode> = {
  CA: california,
  TX: texas,
  FL: florida,
  NY: newYork,
  WA: washington,
  OR: oregon,
  AZ: arizona,
};

// -----------------------------------------------------------------------------
// Short-name labels for display (e.g., "California (CalCode)")
// -----------------------------------------------------------------------------

const STATE_LABELS: Record<string, string> = {
  CA: 'California (CalCode)',
  TX: 'Texas (TFER)',
  FL: 'Florida (Food Safety Act)',
  NY: 'New York (Sanitary Code)',
  WA: 'Washington (WAC 246-215)',
  OR: 'Oregon (OAR 333-150)',
  AZ: 'Arizona (AAC R9-8)',
};

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Returns the StateCode object for the given state ID, or null if not found.
 */
export function getStateCode(stateId: string | null | undefined): StateCode | null {
  if (!stateId) return null;
  return STATE_CODES[stateId.toUpperCase()] ?? null;
}

/**
 * Returns all registered StateCode objects as an array, sorted alphabetically
 * by state name.
 */
export function getAllStateCodes(): StateCode[] {
  return Object.values(STATE_CODES).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Returns a human-readable label for the state, e.g. "California (CalCode)".
 * Falls back to the raw stateId if not found in the registry.
 */
export function getStateLabel(stateId: string): string {
  return STATE_LABELS[stateId.toUpperCase()] ?? stateId;
}

/**
 * Returns checklist additions for a given state and checklist type.
 * Returns an empty array if the state is not found or has no additions for that type.
 */
export function getChecklistAdditions(
  stateId: string,
  checklistType: string
): ChecklistAddition[] {
  const state = getStateCode(stateId);
  if (!state) return [];
  return state.additionalChecklistItems.filter(
    (item) => item.checklistType === checklistType
  );
}

/**
 * Returns state requirements filtered by category for the given state.
 * Returns an empty array if the state is not found or has no requirements in that category.
 */
export function getStateRequirementsByCategory(
  stateId: string,
  category: string
): StateRequirement[] {
  const state = getStateCode(stateId);
  if (!state) return [];
  return state.requirements.filter((req) => req.category === category);
}
