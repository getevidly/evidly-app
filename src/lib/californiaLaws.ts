import type { CaliforniaStateLaw, CityOrdinance } from './jurisdictions';

// ============================================================================
// California State Laws
// ============================================================================

export const CALIFORNIA_STATE_LAWS: CaliforniaStateLaw[] = [
  // ---------------------------------------------------------------------------
  // EFFECTIVE NOW
  // ---------------------------------------------------------------------------
  {
    id: 'calcode-114002-cooling',
    billNumber: 'CalCode §114002(a)',
    name: 'California Cooling Time Reduction',
    effectiveDate: '2026-04-01',
    description:
      'California has shortened the first-stage cooling window for cooked foods. Cooked foods must now reach 70°F within 2 hours from the actual cooked temperature (not 135°F as under the FDA Food Code), then reach 41°F within 4 additional hours (6 hours total). This is stricter than the FDA standard because the 2-hour clock starts at the cooked temperature, which may be well above 135°F.',
    requirements: [
      'Stage 1: Cooked food must cool from actual cooked temperature to 70°F within 2 hours (FDA starts clock at 135°F)',
      'Stage 2: Food must cool from 70°F to 41°F within 4 additional hours (6 hours total from start)',
      'Cooling logs must reflect the 2-hour first-stage window',
      'Staff must be trained on the shortened cooling timeline before April 1, 2026',
      'Review batch sizes — reduce if items regularly take more than 2 hours for Stage 1',
      'Ice baths, blast chillers, or shallow pans recommended for faster cooling',
      'Cooldown monitoring alerts must flag items exceeding the 2-hour mark',
    ],
    affectedBusinessTypes: [
      'ALL food service operations that cook and cool food for later service',
      'Restaurants',
      'Commercial kitchens',
      'Catering operations',
      'Institutional kitchens',
    ],
    penalties: 'Critical violation during health inspection. Repeated violations may result in permit suspension.',
    exemptions: undefined,
    status: 'upcoming',
  },
  {
    id: 'cfc-title24-part9',
    billNumber: 'CFC Title 24, Part 9',
    name: 'California Fire Code — Commercial Kitchen Requirements',
    effectiveDate: '2023-01-01',
    description:
      'California Fire Code (2022 edition, effective Jan 1, 2023) adopts NFPA 96 by reference with California amendments. Establishes fire suppression, extinguisher, hood cleaning, and fire prevention permit requirements for all commercial kitchens. Enforced by local fire authorities (AHJs), not state.',
    requirements: [
      'CFC Ch. 6: Fire suppression system required for ALL Type I commercial cooking hoods',
      'CFC Ch. 6: Automatic shutdown of fuel/electrical supply upon suppression activation',
      'CFC Ch. 6: Manual pull station within 10-20 ft travel distance of egress path',
      'CFC Ch. 6.07: UL 300 compliant wet chemical suppression systems mandatory',
      'CFC Ch. 6.07: Hood cleaning to bare metal standard per NFPA 96 schedule (monthly/quarterly/semi-annual/annual)',
      'CFC Ch. 6.07: Cleaning documentation MUST be maintained on-site and available for fire inspector',
      'CFC Ch. 9: Fire alarm system maintenance per NFPA 72',
      'CFC Ch. 9: Class K fire extinguisher mandatory in ALL commercial kitchens',
      'CFC Ch. 9: Annual extinguisher inspection + 6-year maintenance + 12-year hydrostatic test (per NFPA 10)',
      'CFC Ch. 50: Cleaning chemical storage per hazardous materials requirements',
      'CFC Ch. 50: SDS (Safety Data Sheets) accessible to all employees',
      'Fire prevention permit required from local fire authority (AHJ) — separate from health dept permit',
      'Annual fire inspection by local Authority Having Jurisdiction (AHJ)',
      'Enforced by local fire authorities — 58 counties + ~400+ AHJs statewide',
      'State Fire Marshal (SFM) has oversight authority; Cal Fire OSFM handles state-owned/occupied buildings',
    ],
    affectedBusinessTypes: [
      'ALL commercial kitchens',
      'Restaurants',
      'Food service establishments',
      'Institutional kitchens',
      'Hotels with commercial kitchens',
    ],
    penalties: 'Violations may result in immediate closure, fines, or criminal charges for willful non-compliance. Fire code violations are life-safety issues — weighted CRITICAL in compliance scoring.',
    exemptions: undefined,
    status: 'effective',
  },
  {
    id: 'sb-476',
    billNumber: 'SB 476',
    name: 'Food Handler Training Equity Act',
    effectiveDate: '2024-01-01',
    description:
      'Requires employers to bear all costs of food handler card/training and provide training during paid work hours.',
    requirements: [
      'Employers MUST pay all costs for food handler card and training',
      'Training must occur during work hours with relief from regular duties',
      'Cannot make food handler card a prerequisite for employment',
    ],
    affectedBusinessTypes: ['ALL food service operations'],
    penalties: undefined,
    exemptions: ['Certified farmers\' markets'],
    status: 'effective',
  },
  {
    id: 'ab-1228',
    billNumber: 'AB 1228',
    name: 'Fast Food Council',
    effectiveDate: '2024-04-01',
    description:
      'Establishes a Fast Food Council with authority to set wages and working conditions for national fast food chain employees in California.',
    requirements: [
      'National fast food chains with 60+ establishments nationally must pay $20/hr minimum wage',
      'Council can adjust wages annually, capped at 3.5% increase or CPI (whichever is lower)',
      'Council sunsets January 1, 2029',
    ],
    affectedBusinessTypes: [
      'National fast food chains with 60+ establishments',
    ],
    penalties: undefined,
    exemptions: [
      'Bakeries that produce and sell bread as a standalone menu item',
      'Grocery stores',
    ],
    status: 'effective',
  },
  {
    id: 'sb-1383',
    billNumber: 'SB 1383',
    name: 'Organic Waste / Edible Food Recovery',
    effectiveDate: '2022-01-01',
    description:
      'Mandates 75% organic waste reduction and 20% edible food recovery targets through phased requirements for commercial food generators.',
    requirements: [
      '75% organic waste reduction from 2014 levels',
      '20% edible food recovery by 2025',
      'Tier 1 (since Jan 2022): Supermarkets 10,000+ sqft, food service providers and distributors',
      'Tier 2 (since Jan 2024): Restaurants with 250+ seats OR 5,000+ sqft, Hotels with 200+ rooms, and similar large generators',
      'Written agreements with food recovery organizations',
      'Maintain edible food donation records',
      'Annual reporting to jurisdiction',
    ],
    affectedBusinessTypes: [
      'Supermarkets (10,000+ sqft)',
      'Food service providers and distributors',
      'Large restaurants (250+ seats or 5,000+ sqft)',
      'Hotels (200+ rooms)',
    ],
    penalties: undefined,
    exemptions: undefined,
    status: 'phased',
  },
  {
    id: 'cal-osha-3396',
    billNumber: 'Cal/OSHA §3396',
    name: 'Indoor Heat Illness Prevention',
    effectiveDate: '2024-07-23',
    description:
      'Requires all indoor workplaces, including restaurants and commercial kitchens, to implement heat illness prevention measures when temperatures reach specified thresholds.',
    requirements: [
      'At 82°F: Provide fresh cool water, cool-down areas, rest breaks, and heat illness training',
      'At 87°F (or 82°F for high-radiant-heat areas like commercial kitchens): Implement engineering and administrative controls',
      'Written Indoor Heat Illness Prevention Plan (IHIPP) required',
      'Temperature records must be maintained for 12 months',
    ],
    affectedBusinessTypes: [
      'ALL indoor workplaces',
      'Restaurants',
      'Commercial kitchens',
    ],
    penalties: '$20,000-$50,000+ per citation',
    exemptions: undefined,
    status: 'effective',
  },

  // ---------------------------------------------------------------------------
  // EFFECTIVE 2026
  // ---------------------------------------------------------------------------
  {
    id: 'ab-660',
    billNumber: 'AB 660',
    name: 'Food Date Label Standardization',
    effectiveDate: '2026-07-01',
    description:
      'Standardizes food date labeling in California, requiring "BEST if Used By" for quality and "USE By" for safety, and banning "Sell By" dates on consumer-facing labels.',
    requirements: [
      '"BEST if Used By" label indicates quality only — food is still safe after date',
      '"USE By" label indicates safety — food should be discarded after date',
      'BANS "Sell By" dates on consumer-facing labels',
      'Maximum 30-day refrigerated shelf life',
    ],
    affectedBusinessTypes: [
      'Food manufacturers',
      'Food distributors',
      'Restaurants',
      'Retailers',
      'ALL food businesses operating in California',
    ],
    penalties: undefined,
    exemptions: undefined,
    status: 'upcoming',
  },
  {
    id: 'sb-68',
    billNumber: 'SB 68',
    name: 'Allergen Disclosure for Dining Experiences Act',
    effectiveDate: '2026-07-01',
    description:
      'First-in-nation mandatory allergen disclosure on restaurant menus for chains with 20+ locations nationally.',
    requirements: [
      'Restaurant chains with 20+ locations nationally must disclose allergens',
      'Must disclose all 9 major allergens on physical or digital menus',
      'QR code option is permitted but MUST provide a non-digital alternative',
      'Oversight by California Department of Public Health (CDPH)',
    ],
    affectedBusinessTypes: [
      'Restaurant chains with 20+ locations nationally',
    ],
    penalties: undefined,
    exemptions: undefined,
    status: 'upcoming',
  },
  {
    id: 'sb-648',
    billNumber: 'SB 648',
    name: 'Tip Theft Enforcement',
    effectiveDate: '2026-01-01',
    description:
      'Strengthens enforcement of tip theft protections by empowering the Labor Commissioner to directly investigate and cite violations.',
    requirements: [
      'Labor Commissioner can directly investigate and cite tip violations',
      'Credit card tips must be paid by the next regular payday',
      'Tip pooling limited to eligible employees only (excludes managers/owners)',
    ],
    affectedBusinessTypes: [
      'Restaurants',
      'Bars',
      'Hotels',
      'ALL tipped service industries',
    ],
    penalties: undefined,
    exemptions: undefined,
    status: 'effective',
  },
  {
    id: 'ab-692',
    billNumber: 'AB 692',
    name: '"Stay or Pay" Training Contract Ban',
    effectiveDate: '2026-01-01',
    description:
      'Prohibits employers from requiring employees to repay training costs if they leave the company.',
    requirements: [
      'Prohibits repayment agreements for employer-provided training costs if employee quits',
      'Workers can recover $5,000 minimum plus actual damages plus attorney fees',
    ],
    affectedBusinessTypes: ['ALL employers in California'],
    penalties: '$5,000 minimum + actual damages + attorney fees',
    exemptions: [
      'Government loan programs',
      'Transferable credentials/certifications',
      'Registered apprenticeship programs',
    ],
    status: 'effective',
  },
  {
    id: 'ab-406',
    billNumber: 'AB 406',
    name: 'Expanded Paid Sick Leave',
    effectiveDate: '2026-01-01',
    description:
      'Expands qualifying reasons for paid sick leave to include crime victim proceedings and expanded jury duty leave.',
    requirements: [
      'Paid sick leave covers crime victim proceedings',
      'Expanded jury duty leave',
      'No advance notice required if not feasible',
    ],
    affectedBusinessTypes: ['ALL employers in California'],
    penalties: undefined,
    exemptions: undefined,
    status: 'effective',
  },
  {
    id: 'sb-617',
    billNumber: 'SB 617',
    name: 'WARN Act Updates',
    effectiveDate: '2026-01-01',
    description:
      'Updates the California WARN Act to require additional information in 60-day layoff notices.',
    requirements: [
      '60-day layoff notices must include workforce transition services information',
      'Must state if employer is coordinating with local workforce development board',
    ],
    affectedBusinessTypes: [
      'Employers subject to California WARN Act (75+ employees)',
    ],
    penalties: undefined,
    exemptions: undefined,
    status: 'effective',
  },
  {
    id: 'sb-642',
    billNumber: 'SB 642',
    name: 'Pay Equity & Transparency',
    effectiveDate: '2026-01-01',
    description:
      'Strengthens pay transparency requirements for job postings and extends the statute of limitations for equal pay claims.',
    requirements: [
      'Job postings must include realistic pay range based on good faith estimate',
      '"Wages" definition expanded to include bonuses, stock options, benefits, and vacation',
      'Equal pay claims statute of limitations extended to 3 years (relief up to 6 years)',
    ],
    affectedBusinessTypes: ['Employers with 15+ employees'],
    penalties: undefined,
    exemptions: undefined,
    status: 'effective',
  },
  {
    id: 'sb-858',
    billNumber: 'SB 858',
    name: 'Hospitality Worker Rehire Protections',
    effectiveDate: '2026-01-01',
    description:
      'Extends protections requiring hospitality employers to offer reinstatement to laid-off workers before hiring new employees. Extended through January 1, 2027.',
    requirements: [
      'Must offer reinstatement to laid-off workers before hiring new employees',
    ],
    affectedBusinessTypes: ['Hotels', 'Hospitality employers'],
    penalties: undefined,
    exemptions: undefined,
    status: 'effective',
  },
  {
    id: 'sb-294',
    billNumber: 'SB 294',
    name: '"Workplace Know Your Rights" Act',
    effectiveDate: '2026-01-01',
    description:
      'Requires employers to provide written notice of workplace rights to all current employees, with annual notices thereafter.',
    requirements: [
      'Written notice of rights to ALL current employees by February 1, 2026',
      'Annual notices required thereafter',
    ],
    affectedBusinessTypes: ['ALL employers in California'],
    penalties: undefined,
    exemptions: undefined,
    status: 'effective',
  },
  {
    id: 'ab-1147',
    billNumber: 'AB 1147',
    name: 'Pest Prevention Training',
    effectiveDate: '2026-01-01',
    description:
      'Requires restaurant employees to be trained on pest prevention, with written policies and documentation.',
    requirements: [
      'Restaurant employees must be trained on pest prevention',
      'Written pest prevention policy required',
      'Training records must be maintained',
      'Monitoring documentation required',
    ],
    affectedBusinessTypes: ['Restaurants', 'Food service establishments'],
    penalties: undefined,
    exemptions: undefined,
    status: 'effective',
  },
  {
    id: 'sb-1053',
    billNumber: 'SB 1053',
    name: 'Plastic Bag Ban',
    effectiveDate: '2026-01-01',
    description:
      'Eliminates single-use carry-out bags, including thick "reusable" plastic bags, from retail and food service.',
    requirements: [
      'Eliminates single-use carry-out bags including thick "reusable" type',
    ],
    affectedBusinessTypes: [
      'Retail stores',
      'Grocery stores',
      'Restaurants',
      'Food service establishments',
    ],
    penalties: undefined,
    exemptions: undefined,
    status: 'effective',
  },
  {
    id: 'ab-578',
    billNumber: 'AB 578',
    name: 'Food Delivery Platform Refunds',
    effectiveDate: '2026-01-01',
    description:
      'Requires food delivery platforms to provide full refunds including tips, taxes, and fees for undelivered or incorrect orders, and mandates human customer service.',
    requirements: [
      'Full refunds including tips, taxes, and fees for undelivered or wrong orders',
      'Human customer service must be available',
    ],
    affectedBusinessTypes: ['Food delivery platforms (DoorDash, Uber Eats, etc.)'],
    penalties: undefined,
    exemptions: undefined,
    status: 'effective',
  },

  // ---------------------------------------------------------------------------
  // EFFECTIVE 2027+
  // ---------------------------------------------------------------------------
  {
    id: 'ab-418',
    billNumber: 'AB 418',
    name: 'California Food Safety Act',
    effectiveDate: '2027-01-01',
    description:
      'Bans the manufacture, sale, delivery, distribution, holding, or offering of food products containing Red Dye 3, Potassium bromate, Brominated vegetable oil, or Propylparaben.',
    requirements: [
      'BANS: Red Dye 3 (Erythrosine)',
      'BANS: Potassium bromate',
      'BANS: Brominated vegetable oil (BVO)',
      'BANS: Propylparaben',
      'NO EXEMPTIONS for restaurants, bakeries, cafes, or retailers',
    ],
    affectedBusinessTypes: [
      'Restaurants',
      'Bakeries',
      'Cafes',
      'Retailers',
      'Food manufacturers',
      'ALL food businesses in California',
    ],
    penalties: '$5,000 first offense, $10,000 subsequent offenses',
    exemptions: [],
    status: 'upcoming',
  },
  {
    id: 'ab-2316',
    billNumber: 'AB 2316',
    name: 'California School Food Safety Act',
    effectiveDate: '2027-12-31',
    description:
      'Prohibits K-12 schools from serving foods containing synthetic dyes Red 40, Yellow 5, Yellow 6, Blue 1, Blue 2, and Green 3.',
    requirements: [
      'Prohibits K-12 schools from serving foods with Red 40, Yellow 5, Yellow 6, Blue 1, Blue 2, Green 3',
    ],
    affectedBusinessTypes: [
      'K-12 school food programs',
      'School food service vendors',
    ],
    penalties: undefined,
    exemptions: [
      'Food brought from home',
      'School fundraising events',
    ],
    status: 'upcoming',
  },
  {
    id: 'ab-1264',
    billNumber: 'AB 1264',
    name: 'Real Food, Healthy Kids Act',
    effectiveDate: '2027-12-31',
    description:
      'Establishes the first statutory definition of ultra-processed foods and phases out restricted foods and synthetic dyes from school meals over an 8-year period.',
    requirements: [
      'First statutory definition of ultra-processed foods',
      'December 31, 2027: Synthetic dye ban for school meals',
      'July 1, 2029: Schools begin phasing out restricted foods',
      'July 1, 2032: Vendors prohibited from offering restricted foods to schools',
      'July 1, 2035: Full exclusion of restricted foods from school meals',
    ],
    affectedBusinessTypes: [
      'K-12 school food programs',
      'School food service vendors',
      'Food manufacturers supplying schools',
    ],
    penalties: undefined,
    exemptions: undefined,
    status: 'phased',
  },
  {
    id: 'ab-1830',
    billNumber: 'AB 1830',
    name: 'Folic Acid Fortification',
    effectiveDate: '2026-01-01',
    description:
      'Requires folic acid fortification in corn masa flour to help prevent neural tube defects.',
    requirements: [
      'Requires folic acid in corn masa flour',
    ],
    affectedBusinessTypes: [
      'Corn masa flour manufacturers',
      'Food manufacturers using corn masa flour',
    ],
    penalties: undefined,
    exemptions: ['Small businesses'],
    status: 'effective',
  },
];

// ============================================================================
// California City Ordinances
// ============================================================================

export const CALIFORNIA_CITIES: CityOrdinance[] = [
  {
    cityName: 'San Francisco',
    county: 'San Francisco County',
    minimumWage: 19.18,
    minimumWageEffective: '2026-01-01',
    hasIndependentHealthDept: false,
    healthDeptName: undefined,
    healthDeptPhone: undefined,
    additionalOrdinances: [
      'Mandatory composting and recycling',
      'Health Care Security Ordinance',
      'Paid Parental Leave Ordinance',
      'Fair Chance Ordinance (ban the box)',
      'Formula Retail restrictions',
      'SCORES public inspection system',
    ],
  },
  {
    cityName: 'Berkeley',
    county: 'Alameda County',
    minimumWage: 18.67,
    minimumWageEffective: '2026-01-01',
    hasIndependentHealthDept: true,
    healthDeptName: 'Berkeley Environmental Health Division',
    healthDeptPhone: undefined,
    additionalOrdinances: [
      'Independent food inspection program (~29% inspection completion rate 2023)',
      'May transition to county oversight',
    ],
  },
  {
    cityName: 'Long Beach',
    county: 'Los Angeles County',
    minimumWage: 17.87,
    minimumWageEffective: '2025-07-01',
    hasIndependentHealthDept: true,
    healthDeptName: 'Long Beach Dept of Health and Human Services',
    healthDeptPhone: undefined,
    additionalOrdinances: [
      'Independent food inspection program (~70% completion rate 2023)',
      'Own health orders independent from LA County',
    ],
  },
  {
    cityName: 'Pasadena',
    county: 'Los Angeles County',
    minimumWage: undefined,
    minimumWageEffective: undefined,
    hasIndependentHealthDept: true,
    healthDeptName: 'Pasadena Public Health Department (est. 1892)',
    healthDeptPhone: '(626) 744-6004',
    additionalOrdinances: [
      'Independent food inspection (~99% completion rate 2023 — model program)',
      'Online database and public scoring placards',
    ],
  },
  {
    cityName: 'Vernon',
    county: 'Los Angeles County',
    minimumWage: undefined,
    minimumWageEffective: undefined,
    hasIndependentHealthDept: true,
    healthDeptName: 'Vernon Environmental Health',
    healthDeptPhone: undefined,
    additionalOrdinances: [
      'Small industrial city (~100 residents, many food processing facilities)',
      'Independent inspection program',
    ],
  },
  {
    cityName: 'Los Angeles',
    county: 'Los Angeles County',
    minimumWage: 17.87,
    minimumWageEffective: '2025-07-01',
    hasIndependentHealthDept: false,
    healthDeptName: undefined,
    healthDeptPhone: undefined,
    additionalOrdinances: [
      'Fair Work Week Ordinance (retail predictive scheduling)',
      'Hotel Workers Protection Ordinance',
    ],
  },
  {
    cityName: 'Santa Monica',
    county: 'Los Angeles County',
    minimumWage: 17.81,
    minimumWageEffective: undefined,
    hasIndependentHealthDept: false,
    healthDeptName: undefined,
    healthDeptPhone: undefined,
    additionalOrdinances: [
      'Hotel worker protections',
    ],
  },
  {
    cityName: 'San Jose',
    county: 'Santa Clara County',
    minimumWage: 18.45,
    minimumWageEffective: '2026-01-01',
    hasIndependentHealthDept: false,
    healthDeptName: undefined,
    healthDeptPhone: undefined,
    additionalOrdinances: [
      'Opportunity to Work Ordinance (offer hours to existing part-time before hiring new)',
    ],
  },
  {
    cityName: 'San Diego',
    county: 'San Diego County',
    minimumWage: 17.75,
    minimumWageEffective: undefined,
    hasIndependentHealthDept: false,
    healthDeptName: undefined,
    healthDeptPhone: undefined,
    additionalOrdinances: [],
  },
  {
    cityName: 'Oakland',
    county: 'Alameda County',
    minimumWage: 16.89,
    minimumWageEffective: undefined,
    hasIndependentHealthDept: false,
    healthDeptName: undefined,
    healthDeptPhone: undefined,
    additionalOrdinances: [
      'Measure Z restaurant service charge requirements',
    ],
  },
  {
    cityName: 'West Hollywood',
    county: 'Los Angeles County',
    minimumWage: 19.65,
    minimumWageEffective: '2025-07-01',
    hasIndependentHealthDept: false,
    healthDeptName: undefined,
    healthDeptPhone: undefined,
    additionalOrdinances: [
      'Highest minimum wage in state for hotel workers',
    ],
  },
  {
    cityName: 'Emeryville',
    county: 'Alameda County',
    minimumWage: 19.36,
    minimumWageEffective: undefined,
    hasIndependentHealthDept: false,
    healthDeptName: undefined,
    healthDeptPhone: undefined,
    additionalOrdinances: [
      'Fair Workweek Ordinance',
    ],
  },
];
