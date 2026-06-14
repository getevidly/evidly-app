// Trigger 7 — hood_cleaning_approaching
// Reads the grounded interval from pl_standards_registry (CFC Table 606.3.3.1)
// via ctx.standardsRegistry. Selects the interval by the location's cooking_type.
// Proportional lead-time: warns when elapsed >= interval * WARN_FRACTION (2/3).

import { TriggerContext, DriftCatchInsert, WARN_FRACTION } from '../shared/types.ts';

/** Map locations.cooking_type to the intervals_days key in the registry. */
function resolveIntervalKey(cookingType: string | null): string {
  if (cookingType === 'solid_fuel') return 'solid_fuel';
  if (cookingType === 'high_volume') return 'high_volume';
  if (cookingType === 'low_volume') return 'low_volume';
  // NULL or any unrecognized value → "all other cooking operations" (CFC residual category)
  return 'all_other';
}

function cookingTypeLabel(cookingType: string | null): string {
  if (cookingType === 'solid_fuel') return 'solid-fuel cooking';
  if (cookingType === 'high_volume') return 'high-volume cooking';
  if (cookingType === 'low_volume') return 'low-volume cooking';
  return 'all other cooking operations (unclassified)';
}

export async function detectHoodCleaningApproaching(ctx: TriggerContext): Promise<DriftCatchInsert[]> {
  const catches: DriftCatchInsert[] = [];

  // Find the hood_cleaning standard from the registry
  const hoodStd = ctx.standardsRegistry.find((r) => r.topic === 'hood_cleaning');
  if (!hoodStd) return catches; // Registry row missing — cannot evaluate

  const intervalsDays = hoodStd.requirement?.state?.['US-CA']?.frequency?.intervals_days;
  if (!intervalsDays) return catches; // No grounded intervals — cannot evaluate

  for (const loc of ctx.locations) {
    const intervalKey = resolveIntervalKey(loc.cooking_type);
    const intervalDays = intervalsDays[intervalKey];
    if (!intervalDays || intervalDays <= 0) continue;

    // Proportional threshold: warn when elapsed >= interval * 2/3
    const thresholdDays = Math.floor(intervalDays * WARN_FRACTION);

    const thresholdDate = new Date(ctx.now.getTime() - thresholdDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .substring(0, 10);

    // Find latest hood cleaning for this location
    const { data: latest, error } = await ctx.supabase
      .from('vendor_service_records')
      .select('id, service_date, next_due_date')
      .eq('organization_id', ctx.orgId)
      .eq('location_id', loc.id)
      .eq('safeguard_type', 'hood_cleaning')
      .order('service_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !latest) continue;
    if (!latest.service_date || latest.service_date > thresholdDate) continue;

    // Check if next_due_date is scheduled within the remaining window
    const remainingDays = intervalDays - thresholdDays;
    const windowEnd = new Date(ctx.now.getTime() + remainingDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .substring(0, 10);
    if (latest.next_due_date && latest.next_due_date <= windowEnd) continue;

    const daysSince = Math.floor(
      (ctx.now.getTime() - new Date(latest.service_date).getTime()) / (24 * 60 * 60 * 1000),
    );

    catches.push({
      org_id: ctx.orgId,
      location_id: loc.id,
      drift_type: 'hood_cleaning_approaching',
      pillar: 'fire_safety',
      source_table: 'vendor_service_records',
      source_record_id: latest.id,
      expected_value: `${intervalDays} days per CFC Table 606.3.3.1 (${cookingTypeLabel(loc.cooking_type)})`,
      actual_value: `${daysSince} days since last cleaning`,
      severity: 'medium',
      estimated_savings_cents: 0,
    });
  }

  return catches;
}
