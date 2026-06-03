/**
 * useJurisdictionOptions — live query against the jurisdictions table.
 * Returns grouped options for JurisdictionSelect.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

// ── Types ────────────────────────────────────────────────────

export interface JurisdictionOption {
  id: string;
  label: string;
  group: 'counties' | 'cities' | 'tribal';
  county: string;
  city: string | null;
  agencyName: string;
  fireAhjName: string | null;
  fireCodeEdition: string | null;
  nfpa96Edition: string | null;
  agencyType: string;
}

interface UseJurisdictionOptionsResult {
  options: JurisdictionOption[];
  loading: boolean;
  error: string | null;
}

// ── Grouping + label derivation ──────────────────────────────

function deriveGroup(row: { agency_type: string; city: string | null }): JurisdictionOption['group'] {
  if (row.agency_type === 'tribal_health_authority') return 'tribal';
  if (row.city) return 'cities';
  return 'counties';
}

function deriveLabel(row: { county: string; city: string | null; agency_name: string }, group: JurisdictionOption['group']): string {
  if (group === 'tribal') return row.agency_name;
  if (group === 'cities') return row.city!;
  return `${row.county} County`;
}

// ── Hook ─────────────────────────────────────────────────────

export function useJurisdictionOptions(): UseJurisdictionOptionsResult {
  const [options, setOptions] = useState<JurisdictionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('jurisdictions')
        .select('id, state, county, city, agency_name, fire_ahj_name, fire_code_edition, nfpa96_edition, agency_type, is_active')
        .eq('is_active', true)
        .order('county')
        .order('city');

      if (cancelled) return;

      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      const mapped: JurisdictionOption[] = (data || []).map(row => {
        const group = deriveGroup(row);
        return {
          id: row.id,
          label: deriveLabel(row, group),
          group,
          county: row.county,
          city: row.city,
          agencyName: row.agency_name,
          fireAhjName: row.fire_ahj_name,
          fireCodeEdition: row.fire_code_edition,
          nfpa96Edition: row.nfpa96_edition,
          agencyType: row.agency_type,
        };
      });

      // Sort alphabetically within each group
      mapped.sort((a, b) => {
        if (a.group !== b.group) {
          const order = { counties: 0, cities: 1, tribal: 2 };
          return order[a.group] - order[b.group];
        }
        return a.label.localeCompare(b.label);
      });

      setOptions(mapped);
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { options, loading, error };
}
