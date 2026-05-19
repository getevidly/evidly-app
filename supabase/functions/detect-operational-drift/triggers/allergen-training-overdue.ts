// Trigger 6 — allergen_training_overdue
// employee_certifications with certification_name ILIKE '%allergen%'
// AND created_at > 14 days ago AND status != 'active'.
// No assigned_at column — created_at is the proxy.

import { TriggerContext, DriftCatchInsert } from '../shared/types.ts';

export async function detectAllergenTrainingOverdue(ctx: TriggerContext): Promise<DriftCatchInsert[]> {
  const catches: DriftCatchInsert[] = [];
  const fourteenDaysAgo = new Date(ctx.now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: certs, error } = await ctx.supabase
    .from('employee_certifications')
    .select('id, user_id, certification_name, created_at, status')
    .eq('organization_id', ctx.orgId)
    .ilike('certification_name', '%allergen%')
    .lt('created_at', fourteenDaysAgo)
    .neq('status', 'active');

  if (error || !certs?.length) return catches;

  // Map users to locations via user_profiles — use first org location as fallback
  const defaultLocationId = ctx.locations[0]?.id;
  if (!defaultLocationId) return catches;

  for (const cert of certs) {
    catches.push({
      org_id: ctx.orgId,
      location_id: defaultLocationId,
      drift_type: 'allergen_training_overdue',
      pillar: 'food_safety',
      source_table: 'employee_certifications',
      source_record_id: cert.id,
      expected_value: 'active within 14 days',
      actual_value: `status: ${cert.status}, assigned ${cert.created_at?.substring(0, 10)}`,
      severity: 'medium',
      estimated_savings_cents: 0,
    });
  }

  return catches;
}
