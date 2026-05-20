/**
 * useWeeklyDriftReport — C12
 *
 * Fetches latest weekly_drift_reports row for the org.
 * Computes next scheduled Monday 7 AM in org timezone.
 */

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOrgSummary } from './useOrgSummary';

export interface WeeklyDriftReportRow {
  generated_at: string;
  delivered_at: string | null;
  delivery_status: string;
  food_catches: number;
  fire_catches: number;
  total_catches: number;
  total_estimated_savings_cents: number;
}

interface UseWeeklyDriftReportResult {
  lastReport: WeeklyDriftReportRow | null;
  nextScheduled: string;
  loading: boolean;
  error: Error | null;
}

function computeNextMonday7am(tz: string): string {
  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
    const parts = fmt.formatToParts(now);
    const weekday = parts.find(p => p.type === 'weekday')?.value || '';
    const dayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
    const currentDay = dayMap[weekday] ?? 0;
    const daysUntilMonday = currentDay === 0 ? 1 : currentDay === 1 ? 7 : (8 - currentDay);
    const nextMon = new Date(now);
    nextMon.setDate(nextMon.getDate() + daysUntilMonday);
    const dateFmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' });
    return `${dateFmt.format(nextMon)} 7:00 AM`;
  } catch {
    return 'next Monday 7:00 AM';
  }
}

export function useWeeklyDriftReport(): UseWeeklyDriftReportResult {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const { timezone } = useOrgSummary();

  const [lastReport, setLastReport] = useState<WeeklyDriftReportRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        const { data, error: qErr } = await supabase
          .from('weekly_drift_reports')
          .select('generated_at, delivered_at, delivery_status, food_catches, fire_catches, total_catches, total_estimated_savings_cents')
          .eq('org_id', orgId)
          .order('generated_at', { ascending: false })
          .limit(1);

        if (cancelled) return;
        if (qErr) throw new Error(qErr.message);

        if (data && data.length > 0) {
          const row = data[0];
          setLastReport({
            generated_at: row.generated_at,
            delivered_at: row.delivered_at,
            delivery_status: row.delivery_status,
            food_catches: row.food_catches,
            fire_catches: row.fire_catches,
            total_catches: row.total_catches,
            total_estimated_savings_cents: row.total_estimated_savings_cents,
          });
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [orgId]);

  const nextScheduled = useMemo(() => computeNextMonday7am(timezone || 'America/Los_Angeles'), [timezone]);

  return { lastReport, nextScheduled, loading, error };
}
