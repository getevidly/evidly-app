// ═══════════════════════════════════════════════════════════
// CASINO-JIE-01 — Tribal dual-jurisdiction resolver
// Tribal casinos have split sovereignty:
//   food_safety  → Tribal TEHO (advisory mode)
//   fire_safety  → County AHJ  (full compliance)
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { supabase } from './supabase';

// ── Types ─────────────────────────────────────────────────

export interface TribalOrg {
  is_tribal?: boolean;
  tribal_jurisdiction_id?: string | null;
  county_jurisdiction_id?: string | null;
  food_safety_mode?: string | null;
  food_safety_authority?: string | null;
  food_safety_advisory_text?: string | null;
}

export interface ResolvedJurisdictions {
  foodJurisdictionId: string;
  fireJurisdictionId: string;
  isAdvisory: boolean;
  tribalEntityName: string | null;
  foodSafetyAuthority: string | null;
  advisoryText: string | null;
}

export interface TribalJurisdictionRecord {
  id: string;
  agency_name: string;
  tribal_entity_name: string | null;
  tribal_food_authority: string | null;
  food_code_basis: string | null;
  sovereignty_type: string | null;
  nigc_overlay: boolean;
  county: string;
  grading_config: Record<string, any>;
}

export interface OrgJurisdictionState {
  tribalJurisdiction: TribalJurisdictionRecord | null;
  countyJurisdictionId: string | null;
  isAdvisory: boolean;
  tribalEntityName: string | null;
  loading: boolean;
}

// ── Pure resolver ─────────────────────────────────────────

/**
 * Resolve dual-jurisdiction for a tribal org.
 * Returns null for non-tribal orgs (use existing location-level jurisdiction).
 */
export function resolveJurisdictions(org: TribalOrg): ResolvedJurisdictions | null {
  if (
    !org.is_tribal ||
    !org.tribal_jurisdiction_id ||
    !org.county_jurisdiction_id
  ) {
    return null;
  }

  return {
    foodJurisdictionId: org.tribal_jurisdiction_id,
    fireJurisdictionId: org.county_jurisdiction_id,
    isAdvisory: true,
    tribalEntityName: null, // Resolved from jurisdiction record when needed
    foodSafetyAuthority: org.food_safety_authority || 'TEHO',
    advisoryText: org.food_safety_advisory_text || null,
  };
}

// ── React hook ────────────────────────────────────────────

/**
 * Hook for tribal org jurisdiction resolution.
 * Fetches org record + tribal jurisdiction details from Supabase.
 * Returns null state for non-tribal orgs.
 */
export function useOrgJurisdiction(
  orgId: string | null | undefined,
  isDemoMode: boolean,
): OrgJurisdictionState {
  const [state, setState] = useState<OrgJurisdictionState>({
    tribalJurisdiction: null,
    countyJurisdictionId: null,
    isAdvisory: false,
    tribalEntityName: null,
    loading: true,
  });

  useEffect(() => {
    if (!orgId) {
      setState(s => ({ ...s, loading: false }));
      return;
    }

    if (isDemoMode) {
      // Demo mode: check sessionStorage for tribal demo org
      try {
        const stored = sessionStorage.getItem('demo_org_type');
        if (stored === 'tribal_casino') {
          setState({
            tribalJurisdiction: null,
            countyJurisdictionId: null,
            isAdvisory: true,
            tribalEntityName: 'Demo Tribal Casino',
            loading: false,
          });
          return;
        }
      } catch { /* ignore */ }
      setState(s => ({ ...s, loading: false }));
      return;
    }

    let cancelled = false;

    (async () => {
      const { data: org } = await supabase
        .from('organizations')
        .select('is_tribal, tribal_jurisdiction_id, county_jurisdiction_id, food_safety_mode, food_safety_authority, food_safety_advisory_text')
        .eq('id', orgId)
        .maybeSingle();

      if (cancelled || !org) {
        if (!cancelled) setState(s => ({ ...s, loading: false }));
        return;
      }

      const resolved = resolveJurisdictions(org);

      if (!resolved) {
        setState({ tribalJurisdiction: null, countyJurisdictionId: null, isAdvisory: false, tribalEntityName: null, loading: false });
        return;
      }

      // Fetch the tribal jurisdiction record for entity name + details
      const { data: tribalJ } = await supabase
        .from('jurisdictions')
        .select('id, agency_name, tribal_entity_name, tribal_food_authority, food_code_basis, sovereignty_type, nigc_overlay, county, grading_config')
        .eq('id', resolved.foodJurisdictionId)
        .maybeSingle();

      if (cancelled) return;

      setState({
        tribalJurisdiction: tribalJ || null,
        countyJurisdictionId: resolved.fireJurisdictionId,
        isAdvisory: true,
        tribalEntityName: tribalJ?.tribal_entity_name || null,
        loading: false,
      });
    })();

    return () => { cancelled = true; };
  }, [orgId, isDemoMode]);

  return state;
}
