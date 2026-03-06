/**
 * Correlation Engine — client-side impact preview for publish modal
 *
 * Used by EvidLYIntelligence.tsx to show which orgs/locations
 * will be affected before a signal is published.
 */

export const INDUSTRY_LABELS: Record<string, string> = {
  restaurant:      'Restaurant',
  healthcare:      'Healthcare',
  hospitality:     'Hospitality',
  institutional:   'Institutional',
  k12_education:   'K-12 Education',
  other:           'Other',
};

export const SCOPE_LABELS: Record<string, string> = {
  national:  'National',
  statewide: 'Statewide',
  regional:  'Regional',
  county:    'County',
  facility:  'Facility',
};

export type RiskLevel = 'critical' | 'high' | 'moderate' | 'low' | 'none';

export interface SignalTargeting {
  target_industries: string[];
  target_all_industries: boolean;
  target_counties: string[];
  signal_scope: string;
}

export interface CorrelationPreview {
  total_orgs: number;
  total_locations: number;
  orgs: { name: string; county: string | null; industry: string | null }[];
  confidence: number;
}

/**
 * Preview which orgs/locations a signal will reach based on targeting.
 * Runs client-side in the publish modal.
 */
export async function correlateSignal(
  targeting: SignalTargeting,
  supabase: any,
  isDemoMode: boolean,
): Promise<CorrelationPreview> {
  // Demo mode: return realistic preview
  if (isDemoMode) {
    return {
      total_orgs: 3,
      total_locations: 5,
      orgs: [
        { name: 'Central Valley Kitchen Co.', county: 'Fresno', industry: 'restaurant' },
        { name: 'Valley Fresh Catering', county: 'Merced', industry: 'restaurant' },
        { name: 'Yosemite Lodge F&B', county: 'Mariposa', industry: 'hospitality' },
      ],
      confidence: calculateConfidence(targeting),
    };
  }

  // Production: query real orgs + locations
  let orgIds: Set<string> = new Set();
  const orgMap: Map<string, { name: string; industry: string | null }> = new Map();

  // 1. Find orgs matching industry filter
  if (!targeting.target_all_industries && targeting.target_industries.length > 0) {
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, industry_type')
      .in('industry_type', targeting.target_industries)
      .limit(200);
    for (const o of orgs || []) {
      orgIds.add(o.id);
      orgMap.set(o.id, { name: o.name, industry: o.industry_type });
    }
  }

  // 2. Find locations matching county filter
  let locCount = 0;
  if (targeting.target_counties.length > 0) {
    const { data: locs } = await supabase
      .from('locations')
      .select('id, organization_id, county, organizations(name, industry_type)')
      .in('county', targeting.target_counties)
      .limit(500);

    for (const l of locs || []) {
      if (targeting.target_all_industries || orgIds.has(l.organization_id)) {
        orgIds.add(l.organization_id);
        if (!orgMap.has(l.organization_id) && l.organizations) {
          orgMap.set(l.organization_id, {
            name: l.organizations.name,
            industry: l.organizations.industry_type,
          });
        }
        locCount++;
      }
    }
  } else if (targeting.signal_scope === 'national' || targeting.signal_scope === 'statewide') {
    // Statewide/national: count all active orgs
    if (targeting.target_all_industries) {
      const { count } = await supabase
        .from('organizations')
        .select('id', { count: 'exact', head: true });
      return {
        total_orgs: count || 0,
        total_locations: 0,
        orgs: [],
        confidence: calculateConfidence(targeting),
      };
    }
  }

  const orgs = Array.from(orgMap.entries()).slice(0, 5).map(([, v]) => ({
    name: v.name,
    county: null,
    industry: v.industry,
  }));

  return {
    total_orgs: orgIds.size,
    total_locations: locCount || orgIds.size,
    orgs,
    confidence: calculateConfidence(targeting),
  };
}

export function calculateConfidence(targeting: SignalTargeting): number {
  let score = 50;
  if (targeting.target_counties.length > 0) score += 20;
  if (!targeting.target_all_industries && targeting.target_industries.length > 0) score += 20;
  if (targeting.signal_scope === 'county' || targeting.signal_scope === 'facility') score += 10;
  return Math.min(score, 100);
}

export function buildRelevanceReason(
  orgIndustry: string | null,
  locationCounty: string | null,
  targeting: SignalTargeting,
): string {
  const parts: string[] = [];
  if (locationCounty && targeting.target_counties.includes(locationCounty)) {
    parts.push(`Your ${locationCounty} County location is directly affected`);
  }
  if (
    !targeting.target_all_industries &&
    orgIndustry &&
    targeting.target_industries.includes(orgIndustry)
  ) {
    parts.push(`applies to ${INDUSTRY_LABELS[orgIndustry] || orgIndustry} operations`);
  }
  if (targeting.signal_scope === 'national') {
    parts.push('national scope — affects all facilities');
  } else if (targeting.signal_scope === 'statewide') {
    parts.push('statewide — all California locations');
  }
  if (parts.length === 0) return 'This intelligence item is relevant to your operations.';
  return parts.join('. ') + '.';
}
