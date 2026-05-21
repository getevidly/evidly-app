import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOrgSummary } from './useOrgSummary';

export interface DriftCatch {
  id: string;
  location_name: string;
  pillar: 'food_safety' | 'fire_safety';
  drift_type: string;
  estimated_savings_cents: number;
  severity: string;
  resolution_type: string | null;
  resolved_at: string | null;
}

interface YesterdayCatches {
  catches: DriftCatch[];
  totalSavingsUsd: number;
  loading: boolean;
  error: Error | null;
}

function getYesterdayRange(tz: string): { start: string; end: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const todayStr = formatter.format(new Date());
  const todayDate = new Date(todayStr + 'T00:00:00');
  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);

  const toIso = (d: Date) => d.toISOString().split('T')[0];
  return { start: toIso(yesterdayDate), end: toIso(todayDate) };
}

export function useYesterdayCatches(): YesterdayCatches {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const { timezone, loading: orgLoading } = useOrgSummary();
  const [catches, setCatches] = useState<DriftCatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orgId || orgLoading) return;
    let cancelled = false;

    async function fetch() {
      try {
        const { start, end } = getYesterdayRange(timezone);

        const { data, error: qErr } = await supabase
          .from('drift_catches')
          .select('id, location_id, pillar, drift_type, estimated_savings_cents, severity, resolution_type, resolved_at')
          .eq('org_id', orgId)
          .gte('detected_at', start + 'T00:00:00')
          .lt('detected_at', end + 'T00:00:00');

        if (cancelled) return;
        if (qErr) throw new Error(qErr.message);

        if (!data || data.length === 0) {
          setCatches([]);
          setLoading(false);
          return;
        }

        const locationIds = [...new Set(data.map((d: { location_id: string }) => d.location_id))];
        const { data: locs } = await supabase
          .from('locations')
          .select('id, name')
          .in('id', locationIds);

        if (cancelled) return;

        const locMap = new Map((locs || []).map((l: { id: string; name: string }) => [l.id, l.name]));

        setCatches(
          data.map((d: { id: string; location_id: string; pillar: 'food_safety' | 'fire_safety'; drift_type: string; estimated_savings_cents: number; severity: string; resolution_type: string | null; resolved_at: string | null }) => ({
            id: d.id,
            location_name: locMap.get(d.location_id) || 'Unknown',
            pillar: d.pillar,
            drift_type: d.drift_type,
            estimated_savings_cents: d.estimated_savings_cents || 0,
            severity: d.severity,
            resolution_type: d.resolution_type ?? null,
            resolved_at: d.resolved_at ?? null,
          }))
        );
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [orgId, timezone, orgLoading]);

  const totalSavingsUsd = catches.reduce((sum, c) => sum + c.estimated_savings_cents, 0) / 100;

  return { catches, totalSavingsUsd, loading, error };
}
