// generate-weekly-drift-report — drift catches aggregation
// Fetches and summarises drift_catches for a given org and week range.

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface CatchRow {
  id: string;
  drift_type: string;
  pillar: string;
  location_id: string;
  severity: string;
  status: string;
  resolution_type: string | null;
  expected_value: string;
  actual_value: string;
  estimated_savings_cents: number;
}

export interface AggregateResult {
  total: number;
  food: number;
  fire: number;
  savings: number;
  catches: CatchRow[];
}

/**
 * Fetch and aggregate drift_catches for one org over a week.
 * weekStart/weekEnd are YYYY-MM-DD date strings in the org's local timezone.
 * We query detected_at::date between those boundaries.
 */
export async function aggregateDriftCatches(
  supabase: SupabaseClient,
  orgId: string,
  weekStart: string,
  weekEnd: string,
): Promise<AggregateResult> {
  const { data, error } = await supabase
    .from('drift_catches')
    .select(
      'id, drift_type, pillar, location_id, severity, status, resolution_type, expected_value, actual_value, estimated_savings_cents',
    )
    .eq('org_id', orgId)
    .gte('detected_at', `${weekStart}T00:00:00`)
    .lte('detected_at', `${weekEnd}T23:59:59`);

  if (error) throw error;
  const catches = (data || []) as CatchRow[];

  return {
    total: catches.length,
    food: catches.filter((c) => c.pillar === 'food_safety').length,
    fire: catches.filter((c) => c.pillar === 'fire_safety').length,
    savings: catches.reduce((sum, c) => sum + (c.estimated_savings_cents || 0), 0),
    catches,
  };
}
