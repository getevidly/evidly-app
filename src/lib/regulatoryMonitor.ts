// ============================================================
// EvidLY Regulatory Change Monitor
// ============================================================
// Monitors federal, state, county, and industry regulatory changes
// and generates AI-powered plain-language summaries for kitchen operators.
//
// TODO: Wire to pg_cron for weekly automated checks
// TODO: Each source needs its actual data feed (RSS, API, or scraper)
// TODO: Store alerts in Supabase `regulatory_alerts` table
// TODO: Publish alert summaries to getevidly.com/blog for SEO —
//       each alert becomes a post: "What [Change] Means for Your
//       Commercial Kitchen — And What to Do About It."
// ============================================================

// ── Types ─────────────────────────────────────────────────────

export type RegulatorySource = 'FDA' | 'California' | 'County' | 'NFPA' | 'OSHA';

export type ImpactLevel = 'action_required' | 'awareness' | 'informational';

export type AlertStatus = 'new' | 'reviewed' | 'action_taken';

export interface AutoAction {
  text: string;
  completed: boolean;
  actionType?: 'upload' | 'link';
  linkTo?: string;
}

export interface RegulatoryAlert {
  id: string;
  source: RegulatorySource;
  sourceDetail: string;
  impactLevel: ImpactLevel;
  status: AlertStatus;
  title: string;
  effectiveDate: string;
  postedDate: string;
  summary: string;
  actionItems: string[];
  affectedAreas: string[];
  affectedLocations: string[];
  autoActions: AutoAction[];
  fullRegulatoryText: string;
  sourceUrl: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface MonitoredSource {
  name: string;
  abbreviation: string;
  type: 'federal' | 'state' | 'county' | 'industry';
  lastChecked: string;
  url: string;
}

export interface Jurisdiction {
  name: string;
  state: string;
  type: 'county' | 'city' | 'state';
}

// ── Monitored Sources ─────────────────────────────────────────

export const MONITORED_SOURCES: MonitoredSource[] = [
  { name: 'FDA Food Code', abbreviation: 'FDA', type: 'federal', lastChecked: '2026-02-08', url: 'https://www.fda.gov/food/retail-food-protection/fda-food-code' },
  { name: 'California Retail Food Code (CalCode)', abbreviation: 'CalCode', type: 'state', lastChecked: '2026-02-08', url: 'https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx' },
  { name: 'NFPA 96 (Hood & Ventilation)', abbreviation: 'NFPA 96', type: 'industry', lastChecked: '2026-02-07', url: 'https://www.nfpa.org/codes-and-standards/nfpa-96-standard-development/96' },
  { name: 'NFPA 10 (Fire Extinguishers)', abbreviation: 'NFPA 10', type: 'industry', lastChecked: '2026-02-07', url: 'https://www.nfpa.org/codes-and-standards/nfpa-10-standard-development/10' },
  { name: 'Cal/OSHA Workplace Safety', abbreviation: 'Cal/OSHA', type: 'state', lastChecked: '2026-02-06', url: 'https://www.dir.ca.gov/dosh/' },
  { name: 'Fresno County Health Department', abbreviation: 'Fresno Co.', type: 'county', lastChecked: '2026-02-08', url: 'https://www.co.fresno.ca.us/departments/public-health' },
  { name: 'Merced County Division of Environmental Health', abbreviation: 'Merced Co.', type: 'county', lastChecked: '2026-02-08', url: 'https://www.co.merced.ca.us/departments/community-and-economic-development/environmental-health' },
  { name: 'Stanislaus County Environmental Resources', abbreviation: 'Stanislaus Co.', type: 'county', lastChecked: '2026-02-08', url: 'https://www.stancounty.com/er/environmental-health.shtm' },
];

// ── Customer Jurisdictions (auto-populated from location addresses) ──

export const CUSTOMER_JURISDICTIONS: Jurisdiction[] = [
  { name: 'Fresno County', state: 'CA', type: 'county' },
  { name: 'Merced County', state: 'CA', type: 'county' },
  { name: 'Stanislaus County', state: 'CA', type: 'county' },
  { name: 'California', state: 'CA', type: 'state' },
];

// ── Demo Alerts ───────────────────────────────────────────────

export const DEMO_ALERTS: RegulatoryAlert[] = [
  // ── ACTION REQUIRED ────────────────────────────────
  {
    id: 'RA-2026-001',
    source: 'California',
    sourceDetail: 'California Retail Food Code (CalCode) §114002',
    impactLevel: 'action_required',
    status: 'new',
    title: 'California Updates Cooling Requirements for Cooked Foods',
    effectiveDate: '2026-04-01',
    postedDate: '2026-02-05',
    summary: 'California has shortened the first-stage cooling window for cooked foods from 2.5 hours to 2 hours. All cooked foods must now reach 70°F within 2 hours (previously 2.5 hours), then reach 41°F within an additional 4 hours. This affects every kitchen that cooks and cools food for later service.',
    actionItems: [
      'Update all cooling logs to reflect the new 2-hour first-stage window',
      'Train kitchen staff on the shortened cooling timeline before April 1',
      'Review your current cooling procedures — if any items regularly take more than 2 hours for stage 1, adjust batch sizes or use ice baths',
      'Verify your cooldown monitoring alerts are set to flag items exceeding the 2-hour mark',
    ],
    affectedAreas: ['Food Safety', 'Training', 'Documentation'],
    affectedLocations: ['Downtown Kitchen', 'Airport Cafe', 'University Dining'],
    autoActions: [
      { text: 'Cooldown checklist template updated — first-stage window changed to 2 hours', completed: true },
      { text: 'Temperature threshold alert adjusted to 2-hour window', completed: true },
      { text: 'Staff training needed — schedule training session', completed: false, actionType: 'link', linkTo: '/team' },
    ],
    fullRegulatoryText: 'CalCode Section 114002(a) — Potentially hazardous food shall be cooled from 135°F to 70°F within 2 hours, and from 70°F to 41°F or below within the following 4 hours. [Previously: 135°F to 70°F within 2.5 hours.] Effective April 1, 2026. Enforcement begins May 1, 2026.',
    sourceUrl: 'https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx',
  },
  {
    id: 'RA-2026-002',
    source: 'County',
    sourceDetail: 'Fresno County Health Department Ordinance 2026-03',
    impactLevel: 'action_required',
    status: 'new',
    title: 'Fresno County Requires Digital Temperature Records',
    effectiveDate: '2026-06-01',
    postedDate: '2026-01-28',
    summary: 'Fresno County now requires all food establishments to maintain temperature records in a digital format that can be produced during inspection. Paper-only logs will no longer be accepted as primary records starting June 1, 2026. EvidLY customers are already compliant since all temperature logs are stored digitally.',
    actionItems: [
      'Confirm all locations are logging temperatures through EvidLY (not just paper)',
      'Ensure your EvidLY account is set up to export records on demand for inspectors',
      'Keep paper logs as backup if desired, but digital must be the primary record',
    ],
    affectedAreas: ['Documentation', 'Equipment'],
    affectedLocations: ['Downtown Kitchen'],
    autoActions: [
      { text: 'Your EvidLY digital temperature logs already meet this requirement', completed: true },
      { text: 'Inspector export feature enabled — one-click PDF export available', completed: true },
      { text: 'Upload county notification letter for your records', completed: false, actionType: 'upload' },
    ],
    fullRegulatoryText: 'Fresno County Health Department Ordinance 2026-03: All food establishments holding a valid health permit shall maintain temperature monitoring records in an electronic/digital format accessible for review during routine inspections. Paper records may supplement but not replace digital records. Effective June 1, 2026.',
    sourceUrl: 'https://www.co.fresno.ca.us/departments/public-health',
  },
  {
    id: 'RA-2026-003',
    source: 'NFPA',
    sourceDetail: 'NFPA 96 Standard for Ventilation Control (2026 Edition)',
    impactLevel: 'action_required',
    status: 'reviewed',
    title: 'NFPA 96 Updates Hood Cleaning Frequency for High-Volume Kitchens',
    effectiveDate: '2026-07-01',
    postedDate: '2026-01-15',
    summary: 'NFPA 96 now requires monthly hood cleaning for kitchens cooking more than 500 meals per day, up from the previous quarterly requirement. Kitchens cooking fewer than 500 meals/day remain on the quarterly schedule. Check your daily meal count to determine if any of your locations qualify for the higher frequency.',
    actionItems: [
      'Check average daily meal count for each location — if any exceed 500 meals/day, they need monthly cleaning',
      'Contact your hood cleaning vendor to update the schedule if needed',
      'Update your vendor service calendar to reflect any frequency changes',
      'Document your daily meal counts to justify your cleaning frequency during inspections',
    ],
    affectedAreas: ['Equipment', 'Fire Safety'],
    affectedLocations: ['Downtown Kitchen', 'University Dining'],
    autoActions: [
      { text: 'Vendor service calendar flagged for review', completed: true },
      { text: 'New document required — upload updated hood cleaning contract', completed: false, actionType: 'upload' },
    ],
    fullRegulatoryText: 'NFPA 96 §11.4.1.1 (2026 Edition): Type I hoods serving cooking operations producing more than 500 meals per day shall have exhaust systems inspected and cleaned monthly. Type I hoods serving operations producing fewer than 500 meals per day shall follow the inspection frequency in Table 11.4. Effective July 1, 2026.',
    sourceUrl: 'https://www.nfpa.org/codes-and-standards/nfpa-96-standard-development/96',
    reviewedBy: 'Sarah Chen',
    reviewedAt: '2026-01-20T14:30:00Z',
  },

  // ── AWARENESS ──────────────────────────────────────
  {
    id: 'RA-2026-004',
    source: 'FDA',
    sourceDetail: 'FDA Food Code Revision — Federal Register Notice',
    impactLevel: 'awareness',
    status: 'new',
    title: 'FDA Proposes Updated Food Code — Comment Period Open',
    effectiveDate: '2026-05-15',
    postedDate: '2026-02-01',
    summary: 'The FDA has proposed updates to the Model Food Code with key changes to allergen labeling requirements and date marking for ready-to-eat foods. The public comment period is open through May 15, 2026. While the Food Code is not directly enforceable (states adopt it individually), California typically adopts FDA code changes within 12-18 months.',
    actionItems: [
      'Review the proposed allergen labeling changes to understand future requirements',
      'Consider submitting comments if changes would significantly impact your operations',
      'No immediate action needed — monitor for California adoption timeline',
    ],
    affectedAreas: ['Food Safety', 'Documentation'],
    affectedLocations: ['Downtown Kitchen', 'Airport Cafe', 'University Dining'],
    autoActions: [
      { text: 'Monitoring California adoption timeline — will alert when CalCode updates', completed: true },
    ],
    fullRegulatoryText: 'Federal Register Notice — FDA Model Food Code 2026 Proposed Revision. Key changes: (1) Expanded allergen labeling requirements for foods prepared on premises; (2) Date marking requirements for ready-to-eat potentially hazardous foods reduced from 7 days to 5 days; (3) Enhanced employee health reporting requirements. Comment period: February 1 through May 15, 2026.',
    sourceUrl: 'https://www.fda.gov/food/retail-food-protection/fda-food-code',
  },
  {
    id: 'RA-2026-005',
    source: 'California',
    sourceDetail: 'California Assembly Bill AB-1247',
    impactLevel: 'awareness',
    status: 'reviewed',
    title: 'California Considering Mandatory Food Handler Certification Renewal Every 2 Years',
    effectiveDate: '2027-01-01',
    postedDate: '2026-01-10',
    summary: 'A bill in the California Assembly would require food handler certifications to be renewed every 2 years instead of the current 3-year cycle. If passed, this would affect all food service employees in California. The bill is currently in committee and has not yet been voted on.',
    actionItems: [
      'No immediate action required — bill is still in committee',
      'Review your current food handler certification tracking to ensure renewal dates are monitored',
      'If passed, you will need to update renewal schedules for all staff',
    ],
    affectedAreas: ['Training', 'Documentation'],
    affectedLocations: ['Downtown Kitchen', 'Airport Cafe', 'University Dining'],
    autoActions: [
      { text: 'Monitoring bill status — will alert if it passes committee', completed: true },
    ],
    fullRegulatoryText: 'Assembly Bill 1247 (introduced January 2026): Amends California Health and Safety Code §113948 to require food handler certification renewal every 24 months (currently 36 months). Applies to all food handler cards issued under an accredited program. Proposed effective date: January 1, 2027.',
    sourceUrl: 'https://leginfo.legislature.ca.gov/',
    reviewedBy: 'James Wilson',
    reviewedAt: '2026-01-12T09:00:00Z',
  },
  {
    id: 'RA-2026-006',
    source: 'NFPA',
    sourceDetail: 'NFPA 10 Standard for Portable Fire Extinguishers (2026 Edition)',
    impactLevel: 'awareness',
    status: 'new',
    title: 'NFPA 10 Fire Extinguisher Inspection Record Requirements Updated',
    effectiveDate: '2026-07-01',
    postedDate: '2026-01-20',
    summary: 'NFPA 10 now explicitly allows digital records for fire extinguisher inspections, replacing the previous requirement for physical tags. Monthly visual inspection records and annual professional service records can both be maintained electronically. This is a minor but helpful change for kitchens already tracking fire equipment digitally.',
    actionItems: [
      'Good news — digital records are now explicitly accepted for fire extinguisher inspections',
      'Ensure your EvidLY equipment tracking includes monthly visual inspection records',
      'Inform your fire protection vendor that digital records are now standard-approved',
    ],
    affectedAreas: ['Fire Safety', 'Documentation'],
    affectedLocations: ['Downtown Kitchen', 'Airport Cafe', 'University Dining'],
    autoActions: [
      { text: 'Equipment tracking module already supports digital fire extinguisher records', completed: true },
    ],
    fullRegulatoryText: 'NFPA 10 §7.2.1.2.1 (2026 Edition): Records of inspections shall be maintained. Electronic/digital records are an acceptable alternative to physical inspection tags attached to extinguishers, provided records are accessible on-site during inspections. Monthly inspections per §7.2.1 and annual maintenance per §7.3.1 may both utilize electronic record systems.',
    sourceUrl: 'https://www.nfpa.org/codes-and-standards/nfpa-10-standard-development/10',
  },

  // ── INFORMATIONAL ──────────────────────────────────
  {
    id: 'RA-2026-007',
    source: 'FDA',
    sourceDetail: 'FDA Center for Food Safety and Applied Nutrition',
    impactLevel: 'informational',
    status: 'reviewed',
    title: 'FDA Releases Annual Foodborne Illness Report',
    effectiveDate: '2026-01-15',
    postedDate: '2026-01-15',
    summary: 'The FDA has published its annual report on foodborne illness trends for 2025. Key findings: Norovirus remains the leading cause of restaurant-associated outbreaks, temperature abuse during cooling was cited in 23% of incidents, and handwashing compliance continues to be the most common critical violation. No new regulations result from this report.',
    actionItems: [
      'No action required — this is for informational purposes only',
      'Consider reviewing your handwashing and cooling procedures as these remain top-cited issues nationwide',
    ],
    affectedAreas: ['Food Safety'],
    affectedLocations: [],
    autoActions: [],
    fullRegulatoryText: 'FDA Annual Report on Foodborne Illness Trends (2025 Data). Published January 15, 2026. This report summarizes foodborne illness data collected through CDC FoodNet and FDA inspection data. Not a regulatory action.',
    sourceUrl: 'https://www.fda.gov/food/foodborne-pathogens/foodborne-illness-surveillance',
    reviewedBy: 'Sarah Chen',
    reviewedAt: '2026-01-16T10:00:00Z',
  },
  {
    id: 'RA-2026-008',
    source: 'FDA',
    sourceDetail: 'National Restaurant Association / ServSafe',
    impactLevel: 'informational',
    status: 'new',
    title: 'National Restaurant Association Updates ServSafe Curriculum',
    effectiveDate: '2026-03-01',
    postedDate: '2026-02-03',
    summary: 'The National Restaurant Association has updated the ServSafe Food Protection Manager curriculum for 2026. Updates include expanded sections on allergen management, updated cooling time references, and new content on digital food safety record-keeping. The new materials will be available starting March 1, 2026.',
    actionItems: [
      'No action required — awareness for training planning',
      'If you plan to schedule ServSafe certifications, the new curriculum may be worth waiting for',
    ],
    affectedAreas: ['Training'],
    affectedLocations: [],
    autoActions: [],
    fullRegulatoryText: 'ServSafe Food Protection Manager Certification Program — 2026 Curriculum Update. Published by the National Restaurant Association. New exam version available March 1, 2026. Updates align with FDA Food Code proposed revisions and recent USDA guidance.',
    sourceUrl: 'https://www.servsafe.com/',
  },
];

// ── Functions (stubs for production) ──────────────────────────

/**
 * Check regulatory sources for updates.
 * TODO: Implement actual API/RSS/scraper calls for each source.
 * TODO: Wire to pg_cron to run weekly on Sundays.
 */
export async function checkForUpdates(_jurisdictions: Jurisdiction[]): Promise<RegulatoryAlert[]> {
  // TODO: For each source in MONITORED_SOURCES:
  //   - FDA: Check FDA Food Code RSS feed
  //   - CalCode: Scrape CDPH website for CalCode amendments
  //   - NFPA: Check NFPA standards update API
  //   - Cal/OSHA: Check DIR website for new regulations
  //   - County: Check county health department sites per jurisdiction
  //
  // For each new change found, call generateAlertSummary() to get
  // AI-powered plain-language summary and action items.
  //
  // For now, return demo data:
  return DEMO_ALERTS;
}

/**
 * Call Claude API to generate a plain-language alert summary.
 * TODO: Wire to Supabase Edge Function /api/regulatory-alert-summary
 *
 * System prompt for Claude (claude-sonnet-4-20250514):
 *   "You are EvidLY's regulatory compliance analyst. When given a regulatory
 *    change, produce: 1) A plain-language title (under 15 words), 2) A 2-3
 *    sentence summary a kitchen manager can understand without legal knowledge,
 *    3) Specific action items the operator needs to take, 4) Which EvidLY
 *    modules are affected (Temperature Logs, Checklists, Documents, Equipment,
 *    Training), 5) Impact level: Action Required, Awareness, or Informational.
 *    Be specific and actionable. Never use legal jargon."
 */
export async function generateAlertSummary(
  _rawChangeText: string,
  _customerContext: { locations: string[]; jurisdictions: Jurisdiction[] },
): Promise<{
  title: string;
  summary: string;
  actionItems: string[];
  affectedModules: string[];
  impactLevel: ImpactLevel;
  effectiveDate: string;
}> {
  // TODO: POST to /api/regulatory-alert-summary edge function
  // which calls Claude API with the system prompt above
  throw new Error('Not implemented — use demo data');
}

/**
 * Determine which customer locations are affected by a regulatory change
 * based on jurisdiction matching.
 */
export function determineImpact(
  change: { source: RegulatorySource; sourceDetail: string },
  customerLocations: { name: string; jurisdiction: Jurisdiction }[],
): string[] {
  // Federal (FDA) affects all locations
  if (change.source === 'FDA') {
    return customerLocations.map(l => l.name);
  }
  // State-level affects all locations in that state
  if (change.source === 'California' || change.source === 'OSHA') {
    return customerLocations
      .filter(l => l.jurisdiction.state === 'CA')
      .map(l => l.name);
  }
  // County-level affects locations in that county
  if (change.source === 'County') {
    const countyName = change.sourceDetail.toLowerCase();
    return customerLocations
      .filter(l => countyName.includes(l.jurisdiction.name.toLowerCase()))
      .map(l => l.name);
  }
  // NFPA (industry standard) affects all locations
  if (change.source === 'NFPA') {
    return customerLocations.map(l => l.name);
  }
  return [];
}

/**
 * When a threshold or requirement changes, auto-update relevant checklist templates.
 * TODO: Implement for production — match change type to checklist templates in DB
 * and update threshold values automatically.
 */
export async function autoUpdateChecklists(
  _change: RegulatoryAlert,
): Promise<{ updated: string[]; requiresManualReview: string[] }> {
  // TODO: Query checklist_templates table for related templates
  // TODO: Update threshold values, time windows, etc.
  // TODO: Log changes to audit trail
  // TODO: Notify template owners of auto-updates
  return { updated: [], requiresManualReview: [] };
}
