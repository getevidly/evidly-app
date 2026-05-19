// Trigger 8 — suppression_semi_annual_due
// vendor_service_records with safeguard_type = 'fire_suppression',
// last service_date > 165 days ago.

import { TriggerContext, DriftCatchInsert } from '../shared/types.ts';

export async function detectSuppressionSemiAnnual(ctx: TriggerContext): Promise<DriftCatchInsert[]> {
  const catches: DriftCatchInsert[] = [];
  const oneHundredSixtyFiveDaysAgo = new Date(ctx.now.getTime() - 165 * 24 * 60 * 60 * 1000)
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
    if (!latest.service_date || latest.service_date > oneHundredSixtyFiveDaysAgo) continue;

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
      expected_value: 'semi-annual (180-day cycle)',
      actual_value: `${daysSince} days since last service`,
      severity: 'high',
      estimated_savings_cents: 0,
    });
  }

  return catches;
}
