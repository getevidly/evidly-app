// Trigger 7 — hood_cleaning_approaching
// vendor_service_records with safeguard_type = 'hood_cleaning',
// last service_date > 75 days ago, and no scheduled next_due_date
// within the next 14 days.

import { TriggerContext, DriftCatchInsert } from '../shared/types.ts';

export async function detectHoodCleaningApproaching(ctx: TriggerContext): Promise<DriftCatchInsert[]> {
  const catches: DriftCatchInsert[] = [];
  const today = ctx.now.toISOString().substring(0, 10);
  const seventyFiveDaysAgo = new Date(ctx.now.getTime() - 75 * 24 * 60 * 60 * 1000)
    .toISOString()
    .substring(0, 10);
  const fourteenDaysOut = new Date(ctx.now.getTime() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .substring(0, 10);

  for (const loc of ctx.locations) {
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
    if (!latest.service_date || latest.service_date > seventyFiveDaysAgo) continue;

    // Check if next_due_date is scheduled within 14 days
    if (latest.next_due_date && latest.next_due_date <= fourteenDaysOut) continue;

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
      expected_value: 'quarterly (90-day cycle)',
      actual_value: `${daysSince} days since last cleaning`,
      severity: 'medium',
      estimated_savings_cents: 0,
    });
  }

  return catches;
}
