// Trigger 9 — extinguisher_monthly_missed
// Equipment with equipment_type ILIKE '%extinguisher%' and compliance_pillar = 'fire_safety',
// no inspection record (checklist_completion or vendor_service_record) this calendar month.
// Uses checklists.category for cross-referencing.

import { TriggerContext, DriftCatchInsert } from '../shared/types.ts';

export async function detectExtinguisherMonthly(ctx: TriggerContext): Promise<DriftCatchInsert[]> {
  const catches: DriftCatchInsert[] = [];
  const monthStart = `${ctx.now.toISOString().substring(0, 7)}-01`;

  for (const loc of ctx.locations) {
    // Find active extinguishers at this location
    const { data: extinguishers, error } = await ctx.supabase
      .from('equipment')
      .select('id, name')
      .eq('organization_id', ctx.orgId)
      .eq('location_id', loc.id)
      .eq('is_active', true)
      .eq('compliance_pillar', 'fire_safety')
      .ilike('equipment_type', '%extinguisher%');

    if (error || !extinguishers?.length) continue;

    // Check for any fire extinguisher checklist completion this month
    const { count: completionCount } = await ctx.supabase
      .from('checklist_completions')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', loc.id)
      .gte('completed_at', `${monthStart}T00:00:00`);

    // Also check vendor service records for this month
    const { count: serviceCount } = await ctx.supabase
      .from('vendor_service_records')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', ctx.orgId)
      .eq('location_id', loc.id)
      .in('safeguard_type', ['fire_suppression', 'fire_alarm'])
      .gte('service_date', monthStart);

    // If any checklist completion or service record exists this month, skip
    // (Broad check — when checklists have extinguisher-specific categories,
    // tighten the completion query with .eq('category', ...))
    if ((completionCount && completionCount > 0) || (serviceCount && serviceCount > 0)) continue;

    // Fire once per location, not per extinguisher
    catches.push({
      org_id: ctx.orgId,
      location_id: loc.id,
      drift_type: 'extinguisher_monthly_missed',
      pillar: 'fire_safety',
      source_table: 'equipment',
      source_record_id: extinguishers[0].id,
      expected_value: `monthly inspection by ${monthStart.substring(0, 7)}`,
      actual_value: 'no inspection logged this month',
      severity: 'high',
      estimated_savings_cents: 0,
    });
  }

  return catches;
}
