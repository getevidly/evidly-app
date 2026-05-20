import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface OpenItem {
  source: string;
  source_id: string;
  pillar: 'food_safety' | 'fire_safety' | null;
  urgency: 'urgent' | 'pulling' | 'review';
  title: string;
  location_id: string | null;
  detected_at: string;
}

export interface AdvisorBriefing {
  id: string;
  advisor_type: 'compliance_officer' | 'food_safety' | 'fire_safety';
  briefing_text: string;
  posture: 'solid' | 'watch' | 'alarm';
  open_items: OpenItem[];
  generated_at: string;
  valid_until: string;
  template_version: number;
}

type AdvisorType = 'compliance_officer' | 'food_safety' | 'fire_safety';
const ADVISOR_TYPES: AdvisorType[] = ['compliance_officer', 'food_safety', 'fire_safety'];

interface UseAdvisorBriefingsResult {
  compliance_officer: AdvisorBriefing | null;
  food_safety: AdvisorBriefing | null;
  fire_safety: AdvisorBriefing | null;
  loading: boolean;
  error: Error | null;
}

export function useAdvisorBriefings(): UseAdvisorBriefingsResult {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [briefings, setBriefings] = useState<Record<AdvisorType, AdvisorBriefing | null>>({
    compliance_officer: null,
    food_safety: null,
    fire_safety: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        const { data, error: qErr } = await supabase
          .from('advisor_briefings')
          .select('*')
          .eq('org_id', orgId)
          .is('location_id', null)
          .gt('valid_until', new Date().toISOString())
          .order('generated_at', { ascending: false });

        if (cancelled) return;
        if (qErr) throw new Error(qErr.message);

        const grouped: Record<AdvisorType, AdvisorBriefing | null> = {
          compliance_officer: null,
          food_safety: null,
          fire_safety: null,
        };

        for (const row of data || []) {
          const at = row.advisor_type as AdvisorType;
          if (ADVISOR_TYPES.includes(at) && !grouped[at]) {
            grouped[at] = {
              id: row.id,
              advisor_type: at,
              briefing_text: row.briefing_text,
              posture: row.posture,
              open_items: Array.isArray(row.open_items) ? row.open_items : [],
              generated_at: row.generated_at,
              valid_until: row.valid_until,
              template_version: row.template_version,
            };
          }
        }

        setBriefings(grouped);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [orgId]);

  return { ...briefings, loading, error };
}
