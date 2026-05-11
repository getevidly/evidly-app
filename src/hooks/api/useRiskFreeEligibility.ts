import { useCallback } from 'react';
import { useApiQuery } from './useApiQuery';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export interface RiskFreeEligibility {
  overall_status: 'pending' | 'eligible' | 'forfeited';
  criterion_a_status: 'pending' | 'met' | 'forfeited';
  criterion_a_met_at: string | null;
  criterion_b_status: 'pending' | 'met' | 'forfeited';
  criterion_b_activity_days: number;
  criterion_b_required_days: number;
  guarantee_window_start: string;
  guarantee_window_end: string;
  setup_deadline: string;
  locations_entered: number;
  locations_required: number;
  days_remaining: number;
  days_elapsed: number;
}

export function useRiskFreeEligibility() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const queryFn = useCallback(async (): Promise<RiskFreeEligibility | null> => {
    if (!orgId) return null;

    // Fetch eligibility row
    const { data: elig, error: eligError } = await supabase
      .from('risk_free_eligibility')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (eligError) throw new Error(eligError.message);
    if (!elig) return null;

    // Fetch config for thresholds
    const { data: config } = await supabase
      .from('risk_free_config')
      .select('setup_period_days, guarantee_window_days, required_activity_days')
      .eq('id', 1)
      .maybeSingle();

    const requiredDays = config?.required_activity_days ?? 36;

    const now = new Date();
    const windowEnd = new Date(elig.guarantee_window_end);
    const windowStart = new Date(elig.signup_date);
    const msPerDay = 86400000;
    const daysRemaining = Math.max(0, Math.ceil((windowEnd.getTime() - now.getTime()) / msPerDay));
    const daysElapsed = Math.min(
      config?.guarantee_window_days ?? 60,
      Math.max(0, Math.ceil((now.getTime() - windowStart.getTime()) / msPerDay))
    );

    return {
      overall_status: elig.overall_status,
      criterion_a_status: elig.criterion_a_status,
      criterion_a_met_at: elig.criterion_a_met_at,
      criterion_b_status: elig.criterion_b_status,
      criterion_b_activity_days: elig.activity_days ?? 0,
      criterion_b_required_days: elig.required_activity_days ?? requiredDays,
      guarantee_window_start: elig.signup_date,
      guarantee_window_end: elig.guarantee_window_end,
      setup_deadline: elig.setup_window_end,
      locations_entered: elig.actual_location_count ?? 0,
      locations_required: elig.declared_location_count ?? 1,
      days_remaining: daysRemaining,
      days_elapsed: daysElapsed,
    };
  }, [orgId]);

  return useApiQuery<RiskFreeEligibility | null>('risk_free_eligibility', queryFn, null);
}
