// Trigger 1 — temperature_out_of_range
// 2 consecutive readings where temp_pass = false within a 4-hour window
// for the same location + equipment.
// temperature_logs uses facility_id (not location_id) and temperature (not reading_value).
// No organization_id on temperature_logs — JOIN through locations.

import { TriggerContext, DriftCatchInsert } from '../shared/types.ts';

export async function detectTemperatureOutOfRange(ctx: TriggerContext): Promise<DriftCatchInsert[]> {
  const catches: DriftCatchInsert[] = [];
  const fourHoursAgo = new Date(ctx.now.getTime() - 4 * 60 * 60 * 1000).toISOString();

  for (const loc of ctx.locations) {
    const { data: failures, error } = await ctx.supabase
      .from('temperature_logs')
      .select('id, facility_id, equipment_id, temperature, required_min, required_max, reading_time')
      .eq('facility_id', loc.id)
      .eq('temp_pass', false)
      .gte('reading_time', fourHoursAgo)
      .order('reading_time', { ascending: false });

    if (error || !failures?.length) continue;

    // Group by equipment_id
    const byEquipment = new Map<string, typeof failures>();
    for (const f of failures) {
      const key = f.equipment_id;
      if (!byEquipment.has(key)) byEquipment.set(key, []);
      byEquipment.get(key)!.push(f);
    }

    for (const [equipId, readings] of byEquipment) {
      if (readings.length < 2) continue;

      const latest = readings[0];
      const temp = Number(latest.temperature);
      const reqMin = latest.required_min != null ? Number(latest.required_min) : null;
      const reqMax = latest.required_max != null ? Number(latest.required_max) : null;

      // Severity: high if exceeds threshold by >5°F, medium otherwise
      let overshoot = 0;
      if (reqMin != null && temp < reqMin) overshoot = reqMin - temp;
      if (reqMax != null && temp > reqMax) overshoot = temp - reqMax;
      const severity = overshoot > 5 ? 'high' : 'medium';

      const expected = reqMin != null && reqMax != null ? `${reqMin}–${reqMax}°F` : 'within range';

      catches.push({
        org_id: ctx.orgId,
        location_id: loc.id,
        drift_type: 'temperature_out_of_range',
        pillar: 'food_safety',
        source_table: 'temperature_logs',
        source_record_id: latest.id,
        expected_value: expected,
        actual_value: `${temp}°F`,
        severity: severity as 'high' | 'medium',
        estimated_savings_cents: 0,
      });
    }
  }

  return catches;
}
