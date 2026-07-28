/**
 * useLocationRequirements — single source of truth for a location's
 * resolved requirement set and counts from pillar_requirements + overrides.
 *
 * Resolution rule:
 *   counting set = catalog rows where counts_toward_total = true
 *     MINUS rows overridden applicable=false for this location
 *     PLUS  conditional rows overridden applicable=true for this location
 *
 * Both the Documents page and the dashboard consume this hook.
 */
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface CatalogRequirement {
  id: string;
  state_code: string;
  pillar: string;
  requirement_code: string;
  label: string;
  description: string | null;
  citation: string | null;
  action_type: string;
  typical_role: string;
  sort_order: number;
  is_conditional: boolean;
  conditional_reason: string | null;
  scope: string;
  counts_toward_total: boolean;
}

export interface RequirementOverride {
  requirement_code: string;
  applicable: boolean;
}

export interface PillarCounts {
  total: number;
  counting: number;
}

export interface LocationRequirementsResult {
  /** All catalog rows for this state */
  catalog: CatalogRequirement[];
  /** Per-location overrides */
  overrides: RequirementOverride[];
  /** Resolved counting set (after applying overrides) */
  countingSet: CatalogRequirement[];
  /** Per-pillar counts from the resolved counting set */
  pillarCounts: Record<string, PillarCounts>;
  /** Per-kitchen denominator: fire counting + food counting */
  kitchenDenominator: number;
  /** Flat list of counting requirement_codes for quick lookup */
  countingCodes: Set<string>;
  loading: boolean;
  stateCode: string | null;
  locationId: string | null;
}

/**
 * Map from pillar → Documents page tab.
 * fire_safety requirements are vendor-serviced → 'service' tab.
 * food_safety requirements are kitchen-held → 'kitchen' tab.
 * business_records → 'business' tab.
 * vendor_business → 'business' tab.
 */
export const PILLAR_TO_TAB: Record<string, string> = {
  fire_safety: 'service',
  food_safety: 'kitchen',
  business_records: 'business',
  vendor_business: 'business',
};

export function useLocationRequirements(
  locationIdOverride?: string | null,
): LocationRequirementsResult {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [catalog, setCatalog] = useState<CatalogRequirement[]>([]);
  const [overrides, setOverrides] = useState<RequirementOverride[]>([]);
  const [stateCode, setStateCode] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      setLoading(true);

      // 1. Resolve location + state
      let locQuery = supabase
        .from('locations')
        .select('id, state')
        .eq('organization_id', orgId)
        .limit(1);
      if (locationIdOverride) {
        locQuery = locQuery.eq('id', locationIdOverride);
      }
      const { data: locData } = await locQuery.maybeSingle();
      if (cancelled) return;

      const state = locData?.state || null;
      const locId = locData?.id || null;
      setStateCode(state);
      setLocationId(locId);

      if (!state) {
        setCatalog([]);
        setOverrides([]);
        setLoading(false);
        return;
      }

      // 2. Fetch catalog for this state
      const { data: reqs } = await supabase
        .from('pillar_requirements')
        .select('*')
        .eq('state_code', state)
        .order('pillar')
        .order('sort_order');
      if (cancelled) return;

      setCatalog((reqs || []) as CatalogRequirement[]);

      // 3. Fetch overrides for this location
      if (locId) {
        const { data: ovr } = await supabase
          .from('location_requirement_overrides')
          .select('requirement_code, applicable')
          .eq('location_id', locId);
        if (cancelled) return;
        setOverrides((ovr || []) as RequirementOverride[]);
      } else {
        setOverrides([]);
      }

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [orgId, locationIdOverride]);

  // Resolve counting set
  const { countingSet, pillarCounts, kitchenDenominator, countingCodes } = useMemo(() => {
    const overrideMap = new Map(overrides.map(o => [o.requirement_code, o.applicable]));

    const resolved = catalog.filter(req => {
      const override = overrideMap.get(req.requirement_code);
      if (override !== undefined) return override;
      return req.counts_toward_total;
    });

    const counts: Record<string, PillarCounts> = {};
    for (const req of catalog) {
      if (!counts[req.pillar]) counts[req.pillar] = { total: 0, counting: 0 };
      counts[req.pillar].total++;
    }
    for (const req of resolved) {
      if (!counts[req.pillar]) counts[req.pillar] = { total: 0, counting: 0 };
      counts[req.pillar].counting++;
    }

    const fireCounting = counts['fire_safety']?.counting || 0;
    const foodCounting = counts['food_safety']?.counting || 0;

    return {
      countingSet: resolved,
      pillarCounts: counts,
      kitchenDenominator: fireCounting + foodCounting,
      countingCodes: new Set(resolved.map(r => r.requirement_code)),
    };
  }, [catalog, overrides]);

  return {
    catalog,
    overrides,
    countingSet,
    pillarCounts,
    kitchenDenominator,
    countingCodes,
    loading,
    stateCode,
    locationId,
  };
}
