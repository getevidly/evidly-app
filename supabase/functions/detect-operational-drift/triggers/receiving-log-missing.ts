// Trigger 5 — receiving_log_missing
// Location business hours have passed for today AND no receiving_temp_logs
// entry created today. Uses delivery_time with fallback to created_at.
// source_record_id is NULL — partial unique index uses COALESCE.

import { TriggerContext, DriftCatchInsert } from '../shared/types.ts';

export async function detectReceivingLogMissing(ctx: TriggerContext): Promise<DriftCatchInsert[]> {
  const catches: DriftCatchInsert[] = [];

  for (const loc of ctx.locations) {
    const locTz = loc.business_hours_timezone || ctx.orgTimezone;

    // Current time in location's timezone
    const nowInTz = new Date(ctx.now.toLocaleString('en-US', { timeZone: locTz }));
    const endHour = parseInt(loc.business_hours_end?.substring(0, 2) || '22', 10);
    const endMin = parseInt(loc.business_hours_end?.substring(3, 5) || '0', 10);

    // Only fire after business hours end
    const currentMinutes = nowInTz.getHours() * 60 + nowInTz.getMinutes();
    const endMinutes = endHour * 60 + endMin;
    if (currentMinutes < endMinutes) continue;

    // Check for receiving logs today in this location
    const todayStr = nowInTz.toISOString().substring(0, 10);
    const dayStart = `${todayStr}T00:00:00`;

    const { count, error } = await ctx.supabase
      .from('receiving_temp_logs')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', loc.id)
      .gte('created_at', dayStart);

    if (error) continue;
    if (count && count > 0) continue;

    catches.push({
      org_id: ctx.orgId,
      location_id: loc.id,
      drift_type: 'receiving_log_missing',
      pillar: 'food_safety',
      source_table: 'receiving_temp_logs',
      source_record_id: null,
      expected_value: `receiving log by ${loc.business_hours_end}`,
      actual_value: 'no log today',
      severity: 'medium',
      estimated_savings_cents: 0,
    });
  }

  return catches;
}
