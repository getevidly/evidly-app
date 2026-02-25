// ── RFP Intelligence Monitor — Type Definitions ─────────

export type RfpSourceType = 'government' | 'k12' | 'healthcare' | 'enterprise';
export type RfpCoverage = 'national' | 'state' | 'county' | 'district';
export type RfpCrawlFrequency = 'daily' | 'weekly';
export type RfpSourceStatus = 'active' | 'paused' | 'error';

export interface RfpSource {
  id: string;
  name: string;
  url: string;
  source_type: RfpSourceType;
  coverage: RfpCoverage;
  states_covered: string[] | null;
  crawl_frequency: RfpCrawlFrequency;
  last_crawled_at: string | null;
  status: RfpSourceStatus;
  config_json: Record<string, unknown>;
  created_at: string;
}

export type RfpEntityType =
  | 'federal' | 'state' | 'county' | 'city'
  | 'school_district' | 'healthcare_system' | 'enterprise';

export type RfpSetAsideType =
  | 'small_business' | 'veteran' | '8a' | 'hubzone'
  | 'wosb' | 'sdvosb' | 'none' | 'unknown';

export type RfpListingStatus =
  | 'open' | 'closed' | 'awarded' | 'unknown';

export interface RfpListing {
  id: string;
  source_id: string;
  title: string;
  description: string | null;
  issuing_entity: string;
  entity_type: RfpEntityType;
  state: string | null;
  county: string | null;
  city: string | null;
  region: string | null;
  url: string | null;
  document_urls: string[];
  posted_date: string | null;
  due_date: string | null;
  estimated_value: number | null;
  naics_code: string | null;
  set_aside_type: RfpSetAsideType | null;
  status: RfpListingStatus;
  raw_content: string | null;
  created_at: string;
}

export type RfpRelevanceTier = 'high' | 'medium' | 'low' | 'irrelevant';
export type RfpRecommendedAction = 'pursue' | 'monitor' | 'skip';

export type RfpModule =
  | 'food_safety' | 'sb1383' | 'fire_safety' | 'k12_production'
  | 'compliance_intelligence' | 'insurance_risk' | 'vendor_management'
  | 'temp_monitoring' | 'haccp' | 'training' | 'document_management';

export interface RfpClassification {
  id: string;
  rfp_id: string;
  relevance_score: number;
  relevance_tier: RfpRelevanceTier;
  matched_modules: string[];
  matched_keywords: string[];
  competition_notes: string | null;
  recommended_action: RfpRecommendedAction;
  ai_reasoning: string;
  classification_model_version: string;
  tokens_used: number;
  classification_cost: number;
  classified_at: string;
}

export type RfpActionType =
  | 'pursuing' | 'proposal_submitted' | 'won' | 'lost'
  | 'declined' | 'watching';

export interface RfpAction {
  id: string;
  rfp_id: string;
  action: RfpActionType;
  notes: string | null;
  assigned_to: string | null;
  deadline: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Joined listing with classification, source, and action history */
export interface RfpListingWithDetails extends RfpListing {
  classification: RfpClassification | null;
  source: RfpSource | null;
  actions: RfpAction[];
}

export interface RfpDashboardStats {
  total_active: number;
  high_relevance: number;
  pursuing: number;
  due_this_week: number;
  won_count: number;
  lost_count: number;
  veteran_set_asides: number;
  classifications_this_month: number;
  tokens_this_month: number;
  estimated_cost_this_month: number;
  budget_remaining: number;
}

export interface RfpFilterState {
  search: string;
  relevance_tier: RfpRelevanceTier[];
  source_type: RfpSourceType[];
  state: string[];
  entity_type: RfpEntityType[];
  matched_module: string[];
  naics_code: string;
  set_aside_type: RfpSetAsideType[];
  status: RfpListingStatus[];
  date_from: string | null;
  date_to: string | null;
}

export const EMPTY_FILTERS: RfpFilterState = {
  search: '',
  relevance_tier: [],
  source_type: [],
  state: [],
  entity_type: [],
  matched_module: [],
  naics_code: '',
  set_aside_type: [],
  status: [],
  date_from: null,
  date_to: null,
};

// ── NAICS Codes relevant to EvidLY ──────────────────────

export const EVIDLY_NAICS_CODES: Record<string, string> = {
  '722310': 'Food Service Contractors',
  '722511': 'Full-Service Restaurants',
  '722513': 'Limited-Service Restaurants',
  '722514': 'Cafeterias/Buffets',
  '561720': 'Janitorial Services',
  '541990': 'Environmental Consulting',
  '541512': 'Computer Systems Design',
  '511210': 'Software Publishers',
  '611710': 'Educational Support Services',
  '621999': 'Health Services',
};

// ── Module display labels ───────────────────────────────

export const MODULE_LABELS: Record<string, string> = {
  food_safety: 'Food Safety',
  fire_safety: 'Fire Safety',
  sb1383: 'SB 1383',
  k12_production: 'K-12 Production',
  compliance_intelligence: 'Compliance Intelligence',
  insurance_risk: 'Insurance Risk',
  vendor_management: 'Vendor Management',
  temp_monitoring: 'Temp Monitoring',
  haccp: 'HACCP',
  training: 'Training',
  document_management: 'Document Management',
};

// ── US States for dropdown ──────────────────────────────

export const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};
