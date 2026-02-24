/**
 * INTEL-06 — Business Impact Context
 *
 * Builds a rich client profile used to personalize every intelligence insight.
 * Demo mode: returns DEMO_CLIENT_PROFILE (generic demo organization).
 * Live mode: derives profile from org/locations/complianceData/profile.
 *
 * For personalized demos, swap DEMO_CLIENT_PROFILE with the client's real data.
 * Do NOT import from demoData.ts or demoJurisdictions.ts.
 */

import { supabase } from './supabase';

// ── Types ────────────────────────────────────────────────────────

export interface ClientLocation {
  id: string;
  name: string;
  county: string;
  state: string;
  type: 'restaurant' | 'cafe' | 'concession' | 'catering' | 'commissary' | 'dining_hall' | 'fine_dining' | 'quick_service';
  avg_daily_covers: number;
  food_safety_score: number;
  fire_safety_score: number;
  active_vulnerabilities: string[];
  jurisdiction_authorities: string[];
}

export interface ClientProfile {
  organization_name: string;
  segment: 'national_park_concession' | 'multi_unit_restaurant' | 'healthcare' | 'k12' | 'university' | 'corporate_dining' | 'hotel' | 'independent' | 'casual_dining';
  industry_multiplier: number;
  total_locations: number;
  locations: ClientLocation[];
  primary_counties: string[];
  /** Alias for primary_counties — used by intelligence hub jurisdiction filtering */
  counties: string[];
  dual_jurisdiction: boolean;
  jurisdiction_notes: string;
  key_suppliers: string[];
  annual_revenue_range: { low: number; high: number };
  avg_employees_per_location: number;
  peak_season_months: number[];
  cuisine_types: string[];
  active_vulnerabilities: string[];
  compliance_priorities: string[];
}

// ── Industry Multipliers ─────────────────────────────────────────

export const INDUSTRY_MULTIPLIERS: Record<ClientProfile['segment'], number> = {
  healthcare: 2.5,
  national_park_concession: 2.0,
  k12: 3.0,
  university: 1.8,
  corporate_dining: 1.5,
  hotel: 1.6,
  multi_unit_restaurant: 1.3,
  casual_dining: 1.2,
  independent: 1.0,
};

// ── Demo Profile: Generic Demo Organization ─────────────────────
// For personalized demos, swap this profile with the client's real data.

export const DEMO_CLIENT_PROFILE: ClientProfile = {
  organization_name: 'Demo Organization',
  segment: 'casual_dining',
  industry_multiplier: INDUSTRY_MULTIPLIERS.casual_dining,
  total_locations: 7,
  locations: [
    {
      id: 'demo-org-loc-1',
      name: 'Location 1',
      county: 'fresno',
      state: 'CA',
      type: 'restaurant',
      avg_daily_covers: 450,
      food_safety_score: 92,
      fire_safety_score: 88,
      active_vulnerabilities: ['cooler_trending_warm'],
      jurisdiction_authorities: ['Fresno County Environmental Health'],
    },
    {
      id: 'demo-org-loc-2',
      name: 'Location 2',
      county: 'fresno',
      state: 'CA',
      type: 'quick_service',
      avg_daily_covers: 600,
      food_safety_score: 87,
      fire_safety_score: 82,
      active_vulnerabilities: ['cooler_trending_warm', 'hood_cleaning_approaching'],
      jurisdiction_authorities: ['Fresno County Environmental Health'],
    },
    {
      id: 'demo-org-loc-3',
      name: 'Location 3',
      county: 'fresno',
      state: 'CA',
      type: 'restaurant',
      avg_daily_covers: 280,
      food_safety_score: 96,
      fire_safety_score: 91,
      active_vulnerabilities: [],
      jurisdiction_authorities: ['Fresno County Environmental Health'],
    },
    {
      id: 'demo-org-loc-4',
      name: 'Location 4',
      county: 'fresno',
      state: 'CA',
      type: 'restaurant',
      avg_daily_covers: 350,
      food_safety_score: 89,
      fire_safety_score: 84,
      active_vulnerabilities: ['hood_cleaning_approaching'],
      jurisdiction_authorities: ['Fresno County Environmental Health'],
    },
    {
      id: 'demo-org-loc-5',
      name: 'Location 5',
      county: 'fresno',
      state: 'CA',
      type: 'cafe',
      avg_daily_covers: 180,
      food_safety_score: 90,
      fire_safety_score: 85,
      active_vulnerabilities: ['temp_log_documentation_gaps'],
      jurisdiction_authorities: ['Fresno County Environmental Health'],
    },
    {
      id: 'demo-org-loc-6',
      name: 'Location 6',
      county: 'fresno',
      state: 'CA',
      type: 'catering',
      avg_daily_covers: 800,
      food_safety_score: 85,
      fire_safety_score: 79,
      active_vulnerabilities: ['poultry_temp_variance', 'cross_contamination_risk'],
      jurisdiction_authorities: ['Fresno County Environmental Health'],
    },
    {
      id: 'demo-org-loc-7',
      name: 'Location 7',
      county: 'fresno',
      state: 'CA',
      type: 'restaurant',
      avg_daily_covers: 220,
      food_safety_score: 91,
      fire_safety_score: 86,
      active_vulnerabilities: [],
      jurisdiction_authorities: ['Fresno County Environmental Health'],
    },
  ],
  primary_counties: ['fresno'],
  counties: ['fresno'],
  dual_jurisdiction: false,
  jurisdiction_notes: '',
  key_suppliers: [],
  annual_revenue_range: { low: 8_000_000, high: 12_000_000 },
  avg_employees_per_location: 25,
  peak_season_months: [5, 6, 7, 8],
  cuisine_types: ['American', 'Casual Dining', 'Quick Service', 'Catering'],
  active_vulnerabilities: [
    'cooler_trending_warm',
    'hood_cleaning_approaching',
    'poultry_temp_variance',
    'temp_log_documentation_gaps',
    'cross_contamination_risk',
  ],
  compliance_priorities: [
    'Fire safety NFPA 96 compliance',
    'Food handler certification management',
    'Temperature monitoring consistency',
    'Hood cleaning schedule adherence',
    'Cross-contamination prevention',
  ],
};

// ── Build Client Profile (Live Mode) ────────────────────────────

export async function buildClientProfile(organizationId: string): Promise<ClientProfile | null> {
  try {
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('name, metadata')
      .eq('id', organizationId)
      .single();

    if (orgErr || !org) return null;

    const { data: locs, error: locErr } = await supabase
      .from('locations')
      .select('id, name, county, state, metadata')
      .eq('organization_id', organizationId);

    if (locErr) return null;

    const locations: ClientLocation[] = (locs || []).map((l: any) => ({
      id: l.id,
      name: l.name,
      county: (l.county || '').toLowerCase(),
      state: l.state || 'CA',
      type: l.metadata?.location_type || 'restaurant',
      avg_daily_covers: l.metadata?.avg_daily_covers || 100,
      food_safety_score: l.metadata?.food_safety_score || 70,
      fire_safety_score: l.metadata?.fire_safety_score || 70,
      active_vulnerabilities: l.metadata?.active_vulnerabilities || [],
      jurisdiction_authorities: l.metadata?.jurisdiction_authorities || [],
    }));

    const segment = (org as any).metadata?.segment || 'independent';
    const counties = [...new Set(locations.map(l => l.county).filter(Boolean))];

    return {
      organization_name: (org as any).name,
      segment,
      industry_multiplier: INDUSTRY_MULTIPLIERS[segment as keyof typeof INDUSTRY_MULTIPLIERS] || 1.0,
      total_locations: locations.length,
      locations,
      primary_counties: counties,
      counties,
      dual_jurisdiction: (org as any).metadata?.dual_jurisdiction || false,
      jurisdiction_notes: (org as any).metadata?.jurisdiction_notes || '',
      key_suppliers: (org as any).metadata?.key_suppliers || [],
      annual_revenue_range: (org as any).metadata?.annual_revenue_range || { low: 0, high: 0 },
      avg_employees_per_location: (org as any).metadata?.avg_employees_per_location || 20,
      peak_season_months: (org as any).metadata?.peak_season_months || [],
      cuisine_types: (org as any).metadata?.cuisine_types || [],
      active_vulnerabilities: [...new Set(locations.flatMap(l => l.active_vulnerabilities))],
      compliance_priorities: (org as any).metadata?.compliance_priorities || [],
    };
  } catch {
    return null;
  }
}

// ── Demo Jurisdiction Filter (sessionStorage) ───────────────

const DEMO_JURISDICTION_FILTER_KEY = 'demo-jurisdiction-filter';

export const setDemoJurisdictionFilter = (counties: string[]) => {
  sessionStorage.setItem(DEMO_JURISDICTION_FILTER_KEY, JSON.stringify(counties));
};

export const getDemoJurisdictionFilter = (): string[] => {
  const stored = sessionStorage.getItem(DEMO_JURISDICTION_FILTER_KEY);
  return stored ? JSON.parse(stored) : [];
};

// ── Personalized Demo Client Profile (sessionStorage) ───────

const DEMO_CLIENT_PROFILE_KEY = 'demo-client-profile';

export const setDemoClientProfile = (overrides: Partial<ClientProfile>) => {
  sessionStorage.setItem(DEMO_CLIENT_PROFILE_KEY, JSON.stringify(overrides));
};

export const getDemoClientProfile = (): ClientProfile => {
  try {
    const stored = sessionStorage.getItem(DEMO_CLIENT_PROFILE_KEY);
    if (!stored) return DEMO_CLIENT_PROFILE;
    const overrides = JSON.parse(stored) as Partial<ClientProfile>;
    return { ...DEMO_CLIENT_PROFILE, ...overrides };
  } catch {
    return DEMO_CLIENT_PROFILE;
  }
};
