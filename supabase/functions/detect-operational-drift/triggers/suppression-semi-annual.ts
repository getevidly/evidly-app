// Trigger 8 — suppression_semi_annual_due
// Reads the grounded interval from pl_standards_registry (CFC §904.13.5.2)
// via ctx.standardsRegistry. No cooking-type split — single default interval.
// Proportional lead-time: warns when elapsed >= interval * WARN_FRACTION (2/3).

import { TriggerContext, DriftCatchInsert, WARN_FRACTION } from '../shared/types.ts';

export async function detectSuppressionSemiAnnual(ctx: TriggerContext): Promise<DriftCatchInsert[]> {
  const catches: DriftCatchInsert[] = [];

  // Find the suppression standard from the registry
  const suppStd = ctx.standardsRegistry.find((r) => r.topic === 'suppression');
  if (!suppStd) return catches; // Registry row missing — cannot evaluate

  // Check pending_fields — if frequency is pending, skip monitoring
  if (suppStd.pending_fields?.includes('frequency')) return catches;

  const intervalsDays = suppStd.requirement?.state?.['US-CA']?.frequency?.intervals_days;
  const intervalDays = intervalsDays?.default;
  if (!intervalDays || intervalDays <= 0) return catches; // No grounded interval

  // Proportional threshold: warn when elapsed >= interval * 2/3
  const thresholdDays = Math.floor(intervalDays * WARN_FRACTION);

  const thresholdDate = new Date(ctx.now.getTime() - thresholdDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .substring(0, 10);

  for (const loc of ctx.locations) {
    const { data: latest, error } = await ctx.supabase
      .from('vendor_service_records')
      .select('id, service_date')
      .eq('organization_id', ctx.orgId)
      .eq('location_id', loc.id)
      .eq('safeguard_type', 'fire_suppression')
      .order('service_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !latest) continue;
    if (!latest.service_date || latest.service_date > thresholdDate) continue;

    const daysSince = Math.floor(
      (ctx.now.getTime() - new Date(latest.service_date).getTime()) / (24 * 60 * 60 * 1000),
    );

    catches.push({
      org_id: ctx.orgId,
      location_id: loc.id,
      drift_type: 'suppression_semi_annual_due',
      pillar: 'fire_safety',
      source_table: 'vendor_service_records',
      source_record_id: latest.id,
      expected_value: `${intervalDays} days per CFC §904.13.5.2`,
      actual_value: `${daysSince} days since last service`,
      severity: 'high',
      estimated_savings_cents: 0,
    });
  }

  return catches;
}
