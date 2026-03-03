/**
 * Demo Generator — Static demo data for the prospect pipeline display.
 * Used in demo mode to show sample prospects at various pipeline stages.
 */

export interface DemoSession {
  id: string;
  created_by_type: 'prospect' | 'sales_rep';
  sales_rep_email?: string;
  prospect_name: string;
  prospect_email: string;
  prospect_phone: string;
  company_name: string;
  company_type: string;
  address: string;
  city: string;
  county: string;
  state: string;
  zip_code: string;
  health_authority: string;
  fire_authority: string;
  num_locations: number;
  operation_type: 'light' | 'moderate' | 'heavy' | 'institutional';
  demo_duration_days: number;
  status: 'pending_scheduling' | 'scheduled' | 'generating' | 'ready' | 'active' | 'expired' | 'converted' | 'deleted';
  scheduled_at: string | null;
  calendly_event_url: string | null;
  assigned_rep_email: string;
  expires_at: string | null;
  converted_at: string | null;
  total_logins: number;
  pages_visited: string[];
  created_at: string;
  updated_at: string;
}

// ── Competitor blocked domains (for demo display) ──
export const BLOCKED_DOMAINS = [
  { domain: 'zenput.com', company_name: 'Zenput/Crunchtime' },
  { domain: 'crunchtime.com', company_name: 'Crunchtime' },
  { domain: 'compliancetrak.com', company_name: 'ComplianceTrak' },
  { domain: 'jfranco.com', company_name: 'J. Franco' },
  { domain: 'steritech.com', company_name: 'Steritech' },
  { domain: 'ecosure.com', company_name: 'EcoSure' },
  { domain: 'safefoodalliance.com', company_name: 'Safe Food Alliance' },
  { domain: 'francoisassociates.com', company_name: 'Francois Associates' },
];

// ── Disposable email domains ──
export const DISPOSABLE_DOMAINS = [
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'maildrop.cc', 'dispostable.com', 'temp-mail.org',
  'fakeinbox.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'trashmail.com', '10minutemail.com', 'getnada.com',
];

/** Check if an email domain is blocked */
export function isBlockedDomain(email: string): { blocked: boolean; reason?: string } {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return { blocked: false };

  const competitor = BLOCKED_DOMAINS.find(b => domain === b.domain || domain.endsWith('.' + b.domain));
  if (competitor) {
    return { blocked: true, reason: 'competitor' };
  }

  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { blocked: true, reason: 'disposable' };
  }

  return { blocked: false };
}

// ── Kitchen type options ──
export const KITCHEN_TYPES = [
  { value: 'restaurant', label: 'Full-Service Restaurant' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'school_k12', label: 'K-12 School' },
  { value: 'university', label: 'University' },
  { value: 'catering', label: 'Catering' },
  { value: 'ghost_kitchen', label: 'Ghost Kitchen' },
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'corporate_dining', label: 'Corporate Dining' },
  { value: 'other', label: 'Other' },
] as const;

export const OPERATION_VOLUMES = [
  { value: 'light', label: 'Light', description: 'Bakery, cafe, small prep kitchen' },
  { value: 'moderate', label: 'Moderate', description: 'Full-service restaurant, standard kitchen' },
  { value: 'heavy', label: 'Heavy', description: '24-hour operation, high-volume kitchen' },
  { value: 'institutional', label: 'Institutional', description: 'Hospital, school, large-scale cafeteria' },
] as const;

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
] as const;

// ── Demo pipeline sample data ──
const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();

export const demoPipelineData: DemoSession[] = [
  // ── Scheduled ──
  {
    id: 'demo-001',
    created_by_type: 'prospect',
    prospect_name: 'Mario Benedetti',
    prospect_email: 'mario@mariospizza.com',
    prospect_phone: '(559) 555-1234',
    company_name: "Mario's Pizza",
    company_type: 'restaurant',
    address: '445 Fulton St',
    city: 'Fresno',
    county: 'Fresno',
    state: 'CA',
    zip_code: '93721',
    health_authority: 'Fresno County Department of Public Health',
    fire_authority: 'Fresno Fire Department',
    num_locations: 1,
    operation_type: 'moderate',
    demo_duration_days: 14,
    status: 'scheduled',
    scheduled_at: daysFromNow(3),
    calendly_event_url: null,
    assigned_rep_email: 'arthur@getevidly.com',
    expires_at: null,
    converted_at: null,
    total_logins: 0,
    pages_visited: [],
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },
  {
    id: 'demo-002',
    created_by_type: 'prospect',
    prospect_name: 'Diana Chen',
    prospect_email: 'admin@valleyhosp.org',
    prospect_phone: '(209) 555-5678',
    company_name: 'Valley Hospital',
    company_type: 'hospital',
    address: '1025 W 16th St',
    city: 'Merced',
    county: 'Merced',
    state: 'CA',
    zip_code: '95340',
    health_authority: 'Merced County Department of Public Health',
    fire_authority: 'Merced Fire Department',
    num_locations: 3,
    operation_type: 'institutional',
    demo_duration_days: 14,
    status: 'scheduled',
    scheduled_at: daysFromNow(4),
    calendly_event_url: null,
    assigned_rep_email: 'arthur@getevidly.com',
    expires_at: null,
    converted_at: null,
    total_logins: 0,
    pages_visited: [],
    created_at: daysAgo(3),
    updated_at: daysAgo(3),
  },
  {
    id: 'demo-003',
    created_by_type: 'sales_rep',
    sales_rep_email: 'arthur@getevidly.com',
    prospect_name: 'James Rodriguez',
    prospect_email: 'james@sunsetbistro.com',
    prospect_phone: '(415) 555-9012',
    company_name: 'Sunset Bistro',
    company_type: 'restaurant',
    address: '2100 Irving St',
    city: 'San Francisco',
    county: 'San Francisco',
    state: 'CA',
    zip_code: '94122',
    health_authority: 'San Francisco Dept of Public Health',
    fire_authority: 'San Francisco Fire Department',
    num_locations: 2,
    operation_type: 'moderate',
    demo_duration_days: 14,
    status: 'scheduled',
    scheduled_at: daysFromNow(6),
    calendly_event_url: null,
    assigned_rep_email: 'arthur@getevidly.com',
    expires_at: null,
    converted_at: null,
    total_logins: 0,
    pages_visited: [],
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },

  // ── Ready ──
  {
    id: 'demo-004',
    created_by_type: 'prospect',
    prospect_name: 'Carlos Mendoza',
    prospect_email: 'carlos@tacoloco.com',
    prospect_phone: '(559) 555-3456',
    company_name: 'Taco Loco',
    company_type: 'restaurant',
    address: '380 E Yosemite Ave',
    city: 'Madera',
    county: 'Madera',
    state: 'CA',
    zip_code: '93638',
    health_authority: 'Madera County Department of Public Health',
    fire_authority: 'Madera Fire Department',
    num_locations: 1,
    operation_type: 'moderate',
    demo_duration_days: 14,
    status: 'ready',
    scheduled_at: daysFromNow(1),
    calendly_event_url: null,
    assigned_rep_email: 'arthur@getevidly.com',
    expires_at: daysFromNow(15),
    converted_at: null,
    total_logins: 0,
    pages_visited: [],
    created_at: daysAgo(5),
    updated_at: daysAgo(1),
  },
  {
    id: 'demo-005',
    created_by_type: 'sales_rep',
    sales_rep_email: 'arthur@getevidly.com',
    prospect_name: 'Sarah Kim',
    prospect_email: 'sarah@campusdining.edu',
    prospect_phone: '(209) 555-7890',
    company_name: 'Campus Dining Services',
    company_type: 'university',
    address: '1 University Circle',
    city: 'Turlock',
    county: 'Stanislaus',
    state: 'CA',
    zip_code: '95382',
    health_authority: 'Stanislaus County Environmental Resources',
    fire_authority: 'Turlock Fire Department',
    num_locations: 4,
    operation_type: 'institutional',
    demo_duration_days: 30,
    status: 'ready',
    scheduled_at: daysFromNow(2),
    calendly_event_url: null,
    assigned_rep_email: 'arthur@getevidly.com',
    expires_at: daysFromNow(30),
    converted_at: null,
    total_logins: 0,
    pages_visited: [],
    created_at: daysAgo(7),
    updated_at: daysAgo(2),
  },

  // ── Active ──
  {
    id: 'demo-006',
    created_by_type: 'prospect',
    prospect_name: 'Emily Nguyen',
    prospect_email: 'emily@phohouse.com',
    prospect_phone: '(408) 555-2345',
    company_name: 'Pho House',
    company_type: 'restaurant',
    address: '1550 Meridian Ave',
    city: 'San Jose',
    county: 'Santa Clara',
    state: 'CA',
    zip_code: '95125',
    health_authority: 'Santa Clara County Dept of Environmental Health',
    fire_authority: 'San Jose Fire Department',
    num_locations: 1,
    operation_type: 'heavy',
    demo_duration_days: 14,
    status: 'active',
    scheduled_at: daysAgo(2),
    calendly_event_url: null,
    assigned_rep_email: 'arthur@getevidly.com',
    expires_at: daysFromNow(12),
    converted_at: null,
    total_logins: 3,
    pages_visited: ['dashboard', 'temp-logs', 'checklists', 'compliance-index'],
    created_at: daysAgo(8),
    updated_at: daysAgo(0),
  },

  // ── Converted ──
  {
    id: 'demo-007',
    created_by_type: 'prospect',
    prospect_name: 'Robert Park',
    prospect_email: 'robert@seoulkitchen.com',
    prospect_phone: '(510) 555-6789',
    company_name: 'Seoul Kitchen',
    company_type: 'restaurant',
    address: '3200 Telegraph Ave',
    city: 'Oakland',
    county: 'Alameda',
    state: 'CA',
    zip_code: '94609',
    health_authority: 'Alameda County Dept of Environmental Health',
    fire_authority: 'Oakland Fire Department',
    num_locations: 1,
    operation_type: 'moderate',
    demo_duration_days: 14,
    status: 'converted',
    scheduled_at: daysAgo(14),
    calendly_event_url: null,
    assigned_rep_email: 'arthur@getevidly.com',
    expires_at: null,
    converted_at: daysAgo(5),
    total_logins: 6,
    pages_visited: ['dashboard', 'temp-logs', 'checklists', 'documents', 'insurance-risk', 'compliance-index'],
    created_at: daysAgo(20),
    updated_at: daysAgo(5),
  },
  {
    id: 'demo-008',
    created_by_type: 'sales_rep',
    sales_rep_email: 'arthur@getevidly.com',
    prospect_name: 'Lisa Thompson',
    prospect_email: 'lisa@morningcafe.com',
    prospect_phone: '(916) 555-0123',
    company_name: 'Morning Cafe',
    company_type: 'restaurant',
    address: '1400 J St',
    city: 'Sacramento',
    county: 'Sacramento',
    state: 'CA',
    zip_code: '95814',
    health_authority: 'Sacramento County Environmental Mgmt Dept',
    fire_authority: 'Sacramento Fire Department',
    num_locations: 2,
    operation_type: 'light',
    demo_duration_days: 14,
    status: 'converted',
    scheduled_at: daysAgo(21),
    calendly_event_url: null,
    assigned_rep_email: 'arthur@getevidly.com',
    expires_at: null,
    converted_at: daysAgo(10),
    total_logins: 4,
    pages_visited: ['dashboard', 'temp-logs', 'checklists', 'vendors'],
    created_at: daysAgo(28),
    updated_at: daysAgo(10),
  },

  // ── Expired ──
  {
    id: 'demo-009',
    created_by_type: 'prospect',
    prospect_name: 'Michael Brown',
    prospect_email: 'mike@brownsgrill.com',
    prospect_phone: '(661) 555-4567',
    company_name: "Brown's Grill",
    company_type: 'restaurant',
    address: '1800 Chester Ave',
    city: 'Bakersfield',
    county: 'Kern',
    state: 'CA',
    zip_code: '93301',
    health_authority: 'Kern County Public Health Services',
    fire_authority: 'Bakersfield Fire Department',
    num_locations: 1,
    operation_type: 'moderate',
    demo_duration_days: 14,
    status: 'expired',
    scheduled_at: daysAgo(25),
    calendly_event_url: null,
    assigned_rep_email: 'arthur@getevidly.com',
    expires_at: daysAgo(3),
    converted_at: null,
    total_logins: 1,
    pages_visited: ['dashboard'],
    created_at: daysAgo(30),
    updated_at: daysAgo(3),
  },
];

/** Get pipeline counts by status */
export function getPipelineCounts(sessions: DemoSession[]) {
  return {
    pending: sessions.filter(s => s.status === 'pending_scheduling').length,
    scheduled: sessions.filter(s => s.status === 'scheduled').length,
    ready: sessions.filter(s => s.status === 'ready').length,
    active: sessions.filter(s => s.status === 'active').length,
    converted: sessions.filter(s => s.status === 'converted').length,
    expired: sessions.filter(s => s.status === 'expired').length,
  };
}

/** Get label for kitchen type */
export function getKitchenTypeLabel(value: string): string {
  return KITCHEN_TYPES.find(t => t.value === value)?.label || value;
}

/** Get label for operation type */
export function getOperationLabel(value: string): string {
  return OPERATION_VOLUMES.find(v => v.value === value)?.label || value;
}
