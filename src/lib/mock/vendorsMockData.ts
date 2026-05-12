/**
 * vendorsMockData — single source of mock data for the vendors rebuild.
 * Consumed by useVendorsMock() and tab components.
 * When canonical queries land, swap the hook — no component changes required.
 */

/* ─── State types ───────────────────────────────────────────────────── */

export type VendorState = 'current' | 'attention' | 'action';
export type ServiceState = 'current' | 'attention' | 'action' | 'not_contracted';
export type RequestState = 'current' | 'attention' | 'action' | 'fulfilled';
export type DocReviewState = 'current' | 'attention' | 'action';

/* ─── Operator context ──────────────────────────────────────────────── */

export const OPERATOR = {
  name: 'Cleaning Pros Plus',
  locations: [
    { id: 'loc-1', name: 'Fresno', address: '2847 N Blackstone Ave', seats: 124 },
    { id: 'loc-2', name: 'Merced', address: '1120 W Main St', seats: null },
    { id: 'loc-3', name: 'Stockton', address: '4815 Pacific Ave', seats: null },
  ],
  jurisdictions: ['CalCode', 'NFPA 96', 'NFPA 17A', 'SB 1383'],
  pillars: ['Food safety', 'Fire safety', 'Sustainability', 'Operations'],
  nextAudit: 'June 18 (Fresno County EHD)',
};

/* ─── Vendors (5) ───────────────────────────────────────────────────── */

export interface MockVendor {
  id: string;
  name: string;
  initials: string;
  state: VendorState;
  services: string[];
  coverageLine: string;
  answerLine: string;
  cta: { label: string; variant: 'primary' | 'outline' };
  contact: { name: string; title: string; email: string; phone: string; lastReached: string };
  contract: { status: string; started: string; renews: string; termNotice: string; autoRenew: boolean };
  tenure: string;
  locationCoverage: { locationId: string; locationName: string; state: ServiceState; detail: string }[];
  kpi: { response: string; onTime: string; docsStatus: string; trend: 'up' | 'down' | 'flat' };
}

export const MOCK_VENDORS: MockVendor[] = [
  {
    id: 'v-mountain',
    name: 'Mountain Grease Recovery',
    initials: 'MG',
    state: 'action',
    services: ['Grease collection'],
    coverageLine: '1 of 3 locations \u00B7 3 of 4 docs',
    answerLine: 'Inactive 47 days \u00B7 3 missed collections \u00B7 find a replacement before your next county audit',
    cta: { label: 'Find replacement', variant: 'primary' },
    contact: { name: 'Mike Henderson', title: 'Operations Manager', email: 'm.henderson@mtngrease.example', phone: '(209) 555-2847', lastReached: 'Apr 11' },
    contract: { status: 'Active \u00B7 auto-renew', started: 'Jan 12, 2024', renews: 'Jan 12, 2027', termNotice: '60-day', autoRenew: true },
    tenure: '28 months',
    locationCoverage: [
      { locationId: 'loc-1', locationName: 'Fresno', state: 'action', detail: 'Inactive 47 days \u00B7 3 missed' },
      { locationId: 'loc-2', locationName: 'Merced', state: 'not_contracted', detail: 'Not contracted here' },
      { locationId: 'loc-3', locationName: 'Stockton', state: 'not_contracted', detail: 'Not contracted here' },
    ],
    kpi: { response: '21d', onTime: '0%', docsStatus: '3 of 4', trend: 'down' },
  },
  {
    id: 'v-aramark',
    name: 'Aramark Refreshments',
    initials: 'AR',
    state: 'attention',
    services: ['Coffee & vending'],
    coverageLine: '1 of 3 locations \u00B7 2 of 3 docs',
    answerLine: 'Insurance certificate expires in 8 days \u00B7 service is on schedule \u00B7 upload renewal to stay current',
    cta: { label: 'Review doc', variant: 'primary' },
    contact: { name: 'Jordan Kim', title: 'Account Contact', email: 'jordan.kim@aramark.example', phone: '(559) 555-1234', lastReached: 'May 8' },
    contract: { status: 'Active', started: 'Mar 1, 2024', renews: 'Mar 1, 2025', termNotice: '30-day', autoRenew: false },
    tenure: '14 months',
    locationCoverage: [
      { locationId: 'loc-1', locationName: 'Fresno', state: 'current', detail: 'On schedule' },
      { locationId: 'loc-2', locationName: 'Merced', state: 'not_contracted', detail: 'Not contracted' },
      { locationId: 'loc-3', locationName: 'Stockton', state: 'not_contracted', detail: 'Not contracted' },
    ],
    kpi: { response: '4.8d', onTime: '78%', docsStatus: '2 of 3', trend: 'down' },
  },
  {
    id: 'v-cpp',
    name: 'Cleaning Pros Plus',
    initials: 'CP',
    state: 'current',
    services: ['Hood cleaning', 'GFX'],
    coverageLine: '3 of 3 locations \u00B7 4 of 4 docs',
    answerLine: 'Top 1% on-time across your network \u00B7 0 incidents in 90 days \u00B7 next service Tuesday',
    cta: { label: 'View detail', variant: 'outline' },
    contact: { name: 'Sarah Chen', title: 'Service Manager', email: 's.chen@cleaningpros.example', phone: '(559) 555-9876', lastReached: 'May 10' },
    contract: { status: 'Active \u00B7 auto-renew', started: 'Jun 1, 2023', renews: 'Jun 1, 2026', termNotice: '90-day', autoRenew: true },
    tenure: '2.9 years',
    locationCoverage: [
      { locationId: 'loc-1', locationName: 'Fresno', state: 'current', detail: 'Last: Feb 11 \u00B7 next Tue' },
      { locationId: 'loc-2', locationName: 'Merced', state: 'current', detail: 'Last: Feb 11 \u00B7 next Tue' },
      { locationId: 'loc-3', locationName: 'Stockton', state: 'current', detail: 'Last: Feb 11 \u00B7 next Tue' },
    ],
    kpi: { response: '1.2d', onTime: '100%', docsStatus: '4 of 4', trend: 'up' },
  },
  {
    id: 'v-cintas',
    name: 'Cintas Corporation',
    initials: 'CT',
    state: 'current',
    services: ['Linen', 'Floor mats'],
    coverageLine: '2 of 3 locations \u00B7 3 of 3 docs',
    answerLine: '96% on-time over 90 days \u00B7 1 minor incident resolved \u00B7 expand floor mats to Fresno for full coverage',
    cta: { label: 'View detail', variant: 'outline' },
    contact: { name: 'Tom Garcia', title: 'Account Manager', email: 'tom.garcia@cintas.example', phone: '(800) 555-6543', lastReached: 'May 4' },
    contract: { status: 'Active', started: 'Sep 1, 2023', renews: 'Sep 1, 2025', termNotice: '60-day', autoRenew: false },
    tenure: '2.7 years',
    locationCoverage: [
      { locationId: 'loc-1', locationName: 'Fresno', state: 'not_contracted', detail: 'Not contracted' },
      { locationId: 'loc-2', locationName: 'Merced', state: 'current', detail: 'On schedule' },
      { locationId: 'loc-3', locationName: 'Stockton', state: 'current', detail: 'On schedule' },
    ],
    kpi: { response: '2.4d', onTime: '96%', docsStatus: '3 of 3', trend: 'flat' },
  },
  {
    id: 'v-pacific',
    name: 'Pacific Pest Control',
    initials: 'PP',
    state: 'current',
    services: ['Pest control'],
    coverageLine: '3 of 3 \u00B7 2 of 2 docs',
    answerLine: '14-month perfect streak \u00B7 100% on-time \u00B7 longest reliability streak in your network',
    cta: { label: 'View detail', variant: 'outline' },
    contact: { name: 'Diana Park', title: 'Service Director', email: 'd.park@pacificpest.example', phone: '(209) 555-3344', lastReached: 'Apr 28' },
    contract: { status: 'Active \u00B7 auto-renew', started: 'Mar 15, 2025', renews: 'Mar 15, 2027', termNotice: '30-day', autoRenew: true },
    tenure: '14 months',
    locationCoverage: [
      { locationId: 'loc-1', locationName: 'Fresno', state: 'current', detail: 'Last Apr 28 \u00B7 next May 28' },
      { locationId: 'loc-2', locationName: 'Merced', state: 'current', detail: 'Last Apr 28 \u00B7 next May 28' },
      { locationId: 'loc-3', locationName: 'Stockton', state: 'current', detail: 'Last Apr 28 \u00B7 next May 28' },
    ],
    kpi: { response: '1.8d', onTime: '100%', docsStatus: '2 of 2', trend: 'up' },
  },
];

/* ─── Services (6) ──────────────────────────────────────────────────── */

export interface MockService {
  id: string;
  name: string;
  category: string;
  cadence: string;
  state: ServiceState;
  vendorName: string | null;
  locations: { locationId: string; locationName: string; state: ServiceState; detail: string }[];
  answerLine: string;
  cta: { label: string; variant: 'primary' | 'outline' };
  citation: string | null;
}

export const MOCK_SERVICES: MockService[] = [
  {
    id: 'svc-hood',
    name: 'Hood cleaning',
    category: 'Fire safety',
    cadence: 'Quarterly',
    state: 'attention',
    vendorName: 'Cleaning Pros Plus',
    locations: [
      { locationId: 'loc-1', locationName: 'Fresno', state: 'attention', detail: 'Due Tuesday' },
      { locationId: 'loc-2', locationName: 'Merced', state: 'attention', detail: 'Due Tuesday' },
      { locationId: 'loc-3', locationName: 'Stockton', state: 'attention', detail: 'Due Tuesday' },
    ],
    answerLine: 'Due Tue \u00B7 CPP confirmed',
    cta: { label: 'Schedule', variant: 'primary' },
    citation: 'NFPA 96',
  },
  {
    id: 'svc-grease',
    name: 'Grease collection',
    category: 'Sustainability',
    cadence: 'Monthly',
    state: 'action',
    vendorName: 'Mountain Grease Recovery',
    locations: [
      { locationId: 'loc-1', locationName: 'Fresno', state: 'action', detail: 'Inactive 47d' },
      { locationId: 'loc-2', locationName: 'Merced', state: 'not_contracted', detail: 'No vendor' },
      { locationId: 'loc-3', locationName: 'Stockton', state: 'not_contracted', detail: 'No vendor' },
    ],
    answerLine: 'Inactive 47d \u00B7 no vendor at 2 locations',
    cta: { label: 'Find replacement', variant: 'primary' },
    citation: 'SB 1383',
  },
  {
    id: 'svc-floormats',
    name: 'Floor mats',
    category: 'Operations',
    cadence: 'Weekly',
    state: 'attention',
    vendorName: 'Cintas Corporation',
    locations: [
      { locationId: 'loc-1', locationName: 'Fresno', state: 'not_contracted', detail: 'No vendor' },
      { locationId: 'loc-2', locationName: 'Merced', state: 'current', detail: 'On schedule' },
      { locationId: 'loc-3', locationName: 'Stockton', state: 'current', detail: 'On schedule' },
    ],
    answerLine: 'Coverage gap at Fresno',
    cta: { label: 'Add coverage', variant: 'outline' },
    citation: null,
  },
  {
    id: 'svc-pest',
    name: 'Pest control',
    category: 'Food safety',
    cadence: 'Monthly',
    state: 'current',
    vendorName: 'Pacific Pest Control',
    locations: [
      { locationId: 'loc-1', locationName: 'Fresno', state: 'current', detail: 'Last Apr 28' },
      { locationId: 'loc-2', locationName: 'Merced', state: 'current', detail: 'Last Apr 28' },
      { locationId: 'loc-3', locationName: 'Stockton', state: 'current', detail: 'Last Apr 28' },
    ],
    answerLine: 'Last service Apr 28 \u00B7 next May 28 \u00B7 14-month streak',
    cta: { label: 'View detail', variant: 'outline' },
    citation: 'CalCode \u00A78-604',
  },
  {
    id: 'svc-linen',
    name: 'Linen',
    category: 'Operations',
    cadence: 'Weekly',
    state: 'current',
    vendorName: 'Cintas Corporation',
    locations: [
      { locationId: 'loc-1', locationName: 'Fresno', state: 'not_contracted', detail: 'Laundry on-site' },
      { locationId: 'loc-2', locationName: 'Merced', state: 'current', detail: 'On schedule' },
      { locationId: 'loc-3', locationName: 'Stockton', state: 'current', detail: 'On schedule' },
    ],
    answerLine: 'Not contracted at Fresno (laundry on-site)',
    cta: { label: 'View detail', variant: 'outline' },
    citation: null,
  },
  {
    id: 'svc-coffee',
    name: 'Coffee & vending',
    category: 'Operations',
    cadence: 'Monthly',
    state: 'current',
    vendorName: 'Aramark Refreshments',
    locations: [
      { locationId: 'loc-1', locationName: 'Fresno', state: 'current', detail: 'On schedule' },
      { locationId: 'loc-2', locationName: 'Merced', state: 'not_contracted', detail: 'Not contracted' },
      { locationId: 'loc-3', locationName: 'Stockton', state: 'not_contracted', detail: 'Not contracted' },
    ],
    answerLine: 'Not contracted at Merced and Stockton',
    cta: { label: 'View detail', variant: 'outline' },
    citation: null,
  },
];

/* ─── Requests (6) ──────────────────────────────────────────────────── */

export interface MockRequest {
  id: string;
  title: string;
  vendorName: string;
  state: RequestState;
  sentDate: string;
  answerLine: string;
  cta: { label: string; variant: 'primary' | 'outline' };
  viewedDate: string | null;
  reminders: number;
}

export const MOCK_REQUESTS: MockRequest[] = [
  {
    id: 'req-linen',
    title: 'Linen service agreement renewal',
    vendorName: 'Cintas Corporation',
    state: 'action',
    sentDate: 'Apr 30',
    viewedDate: 'May 4',
    reminders: 2,
    answerLine: 'Stalled 12 days \u00B7 2 reminders sent \u00B7 last viewed 8 days ago \u2014 escalate to account manager',
    cta: { label: 'Escalate', variant: 'primary' },
  },
  {
    id: 'req-insurance',
    title: 'Insurance certificate renewal',
    vendorName: 'Aramark Refreshments',
    state: 'attention',
    sentDate: 'May 5',
    viewedDate: null,
    reminders: 1,
    answerLine: 'Overdue 2 days \u00B7 current certificate expires May 20 \u00B7 auto-reminder sent today',
    cta: { label: 'Send nudge', variant: 'primary' },
  },
  {
    id: 'req-pestlog',
    title: 'Q1 pest activity log',
    vendorName: 'Pacific Pest Control',
    state: 'attention',
    sentDate: 'May 4',
    viewedDate: null,
    reminders: 0,
    answerLine: 'Overdue 1 day \u00B7 Pacific Pest typically responds inside 48 hours \u00B7 likely arriving today',
    cta: { label: 'View thread', variant: 'primary' },
  },
  {
    id: 'req-grease-quotes',
    title: 'Grease collection replacement quotes',
    vendorName: '3 vendors',
    state: 'current',
    sentDate: 'May 8',
    viewedDate: null,
    reminders: 0,
    answerLine: 'Sent 4 days ago \u00B7 Restaurant Recycling Services responded \u00B7 2 still awaiting \u00B7 due May 18',
    cta: { label: 'View thread', variant: 'outline' },
  },
  {
    id: 'req-ansul',
    title: 'ANSUL inspection report',
    vendorName: 'Cleaning Pros Plus',
    state: 'current',
    sentDate: 'May 11',
    viewedDate: null,
    reminders: 0,
    answerLine: 'Sent 1 day ago \u00B7 CPP avg fulfillment 1.2 days \u00B7 likely arriving by Wednesday',
    cta: { label: 'View thread', variant: 'outline' },
  },
  {
    id: 'req-floormats-fulfilled',
    title: 'Floor mats service log April',
    vendorName: 'Cintas Corporation',
    state: 'fulfilled',
    sentDate: 'May 9',
    viewedDate: 'May 11',
    reminders: 0,
    answerLine: 'Fulfilled in 2 days \u00B7 auto-filed to Cintas vendor folder \u00B7 ready for inspection if requested',
    cta: { label: 'View doc', variant: 'outline' },
  },
];

/* ─── Documents for review (6) ──────────────────────────────────────── */

export interface MockDocReview {
  id: string;
  title: string;
  vendorName: string;
  state: DocReviewState;
  aiFlagged: boolean;
  aiCaughtText: string | null;
  answerLine: string;
  cta: { label: string; variant: 'primary' | 'outline' };
  uploadedDate: string;
}

export const MOCK_DOC_REVIEWS: MockDocReview[] = [
  {
    id: 'doc-aramark-coi',
    title: 'Insurance certificate',
    vendorName: 'Aramark Refreshments',
    state: 'action',
    aiFlagged: true,
    aiCaughtText: 'General liability coverage limit is $1M. Fresno County requires $2M minimum for food service vendors operating at restaurants > 100 seats. Approving this filing creates a compliance gap.',
    answerLine: 'General liability $1M vs $2M required \u00B7 coverage gap at Fresno',
    cta: { label: 'Review & respond', variant: 'primary' },
    uploadedDate: 'May 12',
  },
  {
    id: 'doc-mountain-term',
    title: 'Service termination notice',
    vendorName: 'Mountain Grease Recovery',
    state: 'action',
    aiFlagged: true,
    aiCaughtText: 'Letter dated April 27 but received May 12 \u2014 15-day delivery gap. Termination effective date stated as May 11, which would put your operation out of compliance retroactively. Verify dates with vendor before filing.',
    answerLine: '15-day delivery gap \u00B7 effective date discrepancy \u00B7 verify before filing',
    cta: { label: 'Review & respond', variant: 'primary' },
    uploadedDate: 'May 12',
  },
  {
    id: 'doc-cintas-linen',
    title: 'Linen monthly log April',
    vendorName: 'Cintas Corporation',
    state: 'attention',
    aiFlagged: false,
    aiCaughtText: null,
    answerLine: 'Pending 4 days \u00B7 matches prior month format \u00B7 routine review \u00B7 Samuel typically handles Cintas docs',
    cta: { label: 'Preview & approve', variant: 'primary' },
    uploadedDate: 'May 8',
  },
  {
    id: 'doc-cpp-ansul',
    title: 'ANSUL inspection report',
    vendorName: 'Cleaning Pros Plus',
    state: 'attention',
    aiFlagged: false,
    aiCaughtText: null,
    answerLine: 'Pending 1 day \u00B7 all 8 inspection points pass \u00B7 matches CalCode + Fresno Fire requirements \u00B7 clean approval',
    cta: { label: 'Preview & approve', variant: 'primary' },
    uploadedDate: 'May 11',
  },
  {
    id: 'doc-pacific-pest-log',
    title: 'Pest activity log May',
    vendorName: 'Pacific Pest Control',
    state: 'attention',
    aiFlagged: false,
    aiCaughtText: null,
    answerLine: 'Pending 5 hours \u00B7 0 pest activity reported \u00B7 matches prior format \u00B7 routine \u2014 eligible for bulk approve',
    cta: { label: 'Preview & approve', variant: 'primary' },
    uploadedDate: 'May 12',
  },
  {
    id: 'doc-cpp-hood-approved',
    title: 'Hood cleaning report April',
    vendorName: 'Cleaning Pros Plus',
    state: 'current',
    aiFlagged: false,
    aiCaughtText: null,
    answerLine: 'Approved by Arthur 2 days ago \u00B7 filed to Compliance > Fire Safety > Hood Cleaning \u00B7 ready for next inspection',
    cta: { label: 'View doc', variant: 'outline' },
    uploadedDate: 'May 8',
  },
];

/* ─── AI synthesis messages ─────────────────────────────────────────── */

export const AI_MESSAGES = {
  vendorList: 'Mountain Grease needs replacing before your next county audit. Aramark\u2019s insurance lapses in 8 days. The other 3 vendors are running clean \u2014 Pacific Pest just hit a 14-month perfect streak.',
  services: 'Hood cleaning is due at all 3 locations Tuesday. Floor mats coverage gap at Fresno \u2014 Cintas only serves Merced and Stockton. Pest control, grease collection, linen, and coffee/vending are all on schedule.',
  performance: 'Mountain Grease is your biggest reliability risk \u2014 inactive 47 days, 3 missed collections. Aramark response time is up 67% this quarter. CPP, Cintas, and Pacific Pest are running clean.',
  requests: 'Cintas linen agreement has been stalled 12 days \u2014 time to escalate. Aramark insurance is 2 days overdue. CPP and Pacific Pest typically respond inside 48 hours, both will likely clear this week.',
  docReview: '2 documents arrived with issues that need your attention before filing \u2014 one coverage limit shortfall, one date discrepancy. 3 others are routine and waiting on a 30-second review.',
  dayOneVendorList: 'Based on your profile \u2014 3 California locations, fire safety + food safety pillars \u2014 operators your size typically run 5\u20137 vendors. Below are the starter categories most CA commercial kitchens stand up first, with suggested partners in your service area.',
  dayOneServices: 'Your three California locations sit under CalCode (food safety), NFPA 96 + 17A (fire safety), and SB 1383 (sustainability). Six services cover the recurring work \u2014 assign a vendor to each or invite vendors to self-fill.',
};

/* ─── Day-one starter categories ────────────────────────────────────── */

export interface StarterCategory {
  name: string;
  cadence: string;
  category: string;
  whyRequired: string;
  suggestedVendors: string[];
  moreCount: number;
}

export const STARTER_CATEGORIES: StarterCategory[] = [
  {
    name: 'Hood cleaning',
    cadence: 'Quarterly',
    category: 'Fire safety',
    whyRequired: 'NFPA 96 requires quarterly hood and duct cleaning for commercial cooking operations.',
    suggestedVendors: ['Cleaning Pros Plus', 'California Hood Service', 'NorCal Exhaust'],
    moreCount: 12,
  },
  {
    name: 'Pest control',
    cadence: 'Monthly',
    category: 'Food safety',
    whyRequired: 'CalCode \u00A78-604 requires ongoing pest management for all food facilities.',
    suggestedVendors: ['Pacific Pest Control', 'Orkin', 'Terminix'],
    moreCount: 8,
  },
  {
    name: 'Grease collection',
    cadence: 'Monthly',
    category: 'Sustainability',
    whyRequired: 'SB 1383 mandates organic waste diversion including used cooking oil.',
    suggestedVendors: ['Restaurant Recycling Services', 'Baker Commodities', 'Mahoney Environmental'],
    moreCount: 5,
  },
  {
    name: 'Linen & floor mats',
    cadence: 'Weekly',
    category: 'Operations',
    whyRequired: 'Regular linen and mat service supports health code compliance and workplace safety.',
    suggestedVendors: ['Cintas', 'Aramark', 'UniFirst'],
    moreCount: 6,
  },
];

/* ─── Day-one service requirements ──────────────────────────────────── */

export interface DayOneService {
  name: string;
  category: string;
  cadence: string;
  required: boolean;
  citation: string | null;
  suggestedVendors: string[];
}

export const DAY_ONE_SERVICES: DayOneService[] = [
  { name: 'Hood cleaning', category: 'Fire safety', cadence: 'Quarterly', required: true, citation: 'NFPA 96', suggestedVendors: ['Cleaning Pros Plus', 'California Hood Service'] },
  { name: 'Fire suppression inspection', category: 'Fire safety', cadence: 'Semi-annual', required: true, citation: 'NFPA 17A', suggestedVendors: ['SimplexGrinnell', 'Fire Protection Inc', 'Hiller'] },
  { name: 'Pest control', category: 'Food safety', cadence: 'Monthly', required: true, citation: 'CalCode \u00A78-604', suggestedVendors: ['Pacific Pest Control', 'Orkin'] },
  { name: 'Grease collection', category: 'Sustainability', cadence: 'Monthly', required: true, citation: 'SB 1383', suggestedVendors: ['Restaurant Recycling Services', 'Baker Commodities'] },
  { name: 'Linen & floor mats', category: 'Operations', cadence: 'Weekly', required: false, citation: null, suggestedVendors: ['Cintas', 'Aramark', 'UniFirst'] },
  { name: 'Coffee & vending', category: 'Operations', cadence: 'Monthly', required: false, citation: null, suggestedVendors: ['Aramark', 'Canteen'] },
];
