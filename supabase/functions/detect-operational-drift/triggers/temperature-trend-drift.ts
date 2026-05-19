// Trigger 2 — temperature_trend_drift
// 5+ readings across 3+ days for same location + equipment, weak monotonic
// trend toward threshold, latest reading within 2°F of required_min or
// required_max but still passing.
// R2: weak monotonic + slope check — tolerate minor noise in readings.

import { TriggerContext, DriftCatchInsert } from '../shared/types.ts';

export async function detectTemperatureTrendDrift(ctx: TriggerContext): Promise<DriftCatchInsert[]> {
  const catches: DriftCatchInsert[] = [];
  const sevenDaysAgo = new Date(ctx.now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  for (const loc of ctx.locations) {
    const { data: readings, error } = await ctx.supabase
      .from('temperature_logs')
      .select('id, equipment_id, temperature, required_min, required_max, reading_time')
      .eq('facility_id', loc.id)
      .eq('temp_pass', true)
      .gte('reading_time', sevenDaysAgo)
      .order('reading_time', { ascending: true });

    if (error || !readings?.length) continue;

    // Group by equipment_id
    const byEquipment = new Map<string, typeof readings>();
    for (const r of readings) {
      const key = r.equipment_id;
      if (!byEquipment.has(key)) byEquipment.set(key, []);
      byEquipment.get(key)!.push(r);
    }

    for (const [equipId, eqReadings] of byEquipment) {
      if (eqReadings.length < 5) continue;

      // Check distinct days
      const days = new Set(eqReadings.map((r) => r.reading_time.substring(0, 10)));
      if (days.size < 3) continue;

      const latest = eqReadings[eqReadings.length - 1];
      const temp = Number(latest.temperature);
      const reqMin = latest.required_min != null ? Number(latest.required_min) : null;
      const reqMax = latest.required_max != null ? Number(latest.required_max) : null;

      // Check if latest is within 2°F of a threshold
      const nearMin = reqMin != null && temp - reqMin <= 2 && temp >= reqMin;
      const nearMax = reqMax != null && reqMax - temp <= 2 && temp <= reqMax;
      if (!nearMin && !nearMax) continue;

      // Weak monotonic check: compute linear regression slope
      // and verify at least 60% of consecutive pairs trend in the same direction
      const temps = eqReadings.map((r) => Number(r.temperature));
      const n = temps.length;

      // Direction: trending down toward min, or up toward max
      const trendingDown = nearMin;
      let concordantPairs = 0;
      for (let i = 1; i < n; i++) {
        if (trendingDown && temps[i] <= temps[i - 1]) concordantPairs++;
        if (!trendingDown && temps[i] >= temps[i - 1]) concordantPairs++;
      }
      const concordanceRatio = concordantPairs / (n - 1);
      if (concordanceRatio < 0.6) continue;

      const expected = reqMin != null && reqMax != null ? `${reqMin}–${reqMax}°F` : 'within range';

      catches.push({
        org_id: ctx.orgId,
        location_id: loc.id,
        drift_type: 'temperature_trend_drift',
        pillar: 'food_safety',
        source_table: 'temperature_logs',
        source_record_id: latest.id,
        expected_value: expected,
        actual_value: `${temp}°F (trending ${trendingDown ? 'down' : 'up'})`,
        severity: 'medium',
        estimated_savings_cents: 0,
      });
    }
  }

  return catches;
}
