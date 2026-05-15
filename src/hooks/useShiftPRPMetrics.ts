import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ShiftPRPMetrics {
  predict: number;
  reduce: number;
  prove: { ready: number; total: number; pct: number };
}

interface UseShiftPRPMetricsArgs {
  locationId: string | null;
  organizationId: string | null;
}

export function useShiftPRPMetrics({ locationId, organizationId }: UseShiftPRPMetricsArgs) {
  const [metrics, setMetrics] = useState<ShiftPRPMetrics>({
    predict: 0, reduce: 0, prove: { ready: 0, total: 0, pct: 0 },
  });
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    if (!locationId || !organizationId) { setLoading(false); return; }
    setLoading(true);

    try {
      const today = new Date().toISOString().slice(0, 10);
      const in14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

      const [schedRes, docExpRes, caRes, docTotalRes, docCurrentRes] = await Promise.all([
        // Predict: service schedules coming due in 14 days
        supabase.from('location_service_schedules').select('id', { count: 'exact' })
          .eq('location_id', locationId).eq('is_active', true)
          .gte('next_due_date', today).lte('next_due_date', in14),

        // Predict: compliance documents expiring in 14 days
        supabase.from('compliance_documents').select('id', { count: 'exact' })
          .eq('location_id', locationId).in('status', ['current', 'expiring'])
          .gte('expiry_date', today).lte('expiry_date', in14),

        // Reduce: open corrective actions
        supabase.from('corrective_actions').select('id', { count: 'exact' })
          .eq('location_id', locationId)
          .in('status', ['reported', 'assigned', 'in_progress']),

        // Prove: total active documents
        supabase.from('compliance_documents').select('id', { count: 'exact' })
          .eq('location_id', locationId)
          .in('status', ['current', 'expiring', 'expired', 'pending']),

        // Prove: current documents (not expired)
        supabase.from('compliance_documents').select('id', { count: 'exact' })
          .eq('location_id', locationId).eq('status', 'current')
          .gt('expiry_date', today),
      ]);

      const predict = (schedRes.count ?? 0) + (docExpRes.count ?? 0);
      const reduce = caRes.count ?? 0;
      const total = docTotalRes.count ?? 0;
      const ready = docCurrentRes.count ?? 0;
      const pct = total > 0 ? Math.round((ready / total) * 100) : 0;

      setMetrics({ predict, reduce, prove: { ready, total, pct } });
    } catch (err) {
      console.error('[ShiftPRP]', err);
    } finally {
      setLoading(false);
    }
  }, [locationId, organizationId]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  return { metrics, loading };
}
