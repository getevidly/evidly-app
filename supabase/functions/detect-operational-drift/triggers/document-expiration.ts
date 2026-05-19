// Trigger 4 — document_expiration
// Document with expiration_date <= today + 30 days, status = 'active',
// and no replacement document with same category + later expiration.
// Pillar determined by document category.

import { TriggerContext, DriftCatchInsert } from '../shared/types.ts';

const FIRE_CATEGORIES = ['fire', 'hood', 'suppression', 'extinguisher', 'sprinkler', 'alarm', 'ansul'];

function determinePillar(category: string): 'food_safety' | 'fire_safety' {
  const lower = category.toLowerCase();
  return FIRE_CATEGORIES.some((fc) => lower.includes(fc)) ? 'fire_safety' : 'food_safety';
}

function determineSeverity(daysRemaining: number): 'critical' | 'high' | 'medium' {
  if (daysRemaining <= 7) return 'critical';
  if (daysRemaining <= 14) return 'high';
  return 'medium';
}

export async function detectDocumentExpiration(ctx: TriggerContext): Promise<DriftCatchInsert[]> {
  const catches: DriftCatchInsert[] = [];
  const today = ctx.now.toISOString().substring(0, 10);
  const thirtyDaysOut = new Date(ctx.now.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .substring(0, 10);

  const { data: docs, error } = await ctx.supabase
    .from('documents')
    .select('id, organization_id, category, expiration_date, location_id')
    .eq('organization_id', ctx.orgId)
    .eq('status', 'active')
    .gte('expiration_date', today)
    .lte('expiration_date', thirtyDaysOut);

  if (error || !docs?.length) return catches;

  for (const doc of docs) {
    // Check if a replacement document exists (same category, later expiration, active)
    const { count } = await ctx.supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', ctx.orgId)
      .eq('category', doc.category)
      .eq('status', 'active')
      .gt('expiration_date', doc.expiration_date);

    if (count && count > 0) continue; // Replacement exists

    const daysRemaining = Math.ceil(
      (new Date(doc.expiration_date).getTime() - ctx.now.getTime()) / (24 * 60 * 60 * 1000),
    );

    // Assign to a location — use doc.location_id, or first org location as fallback
    const locationId = doc.location_id || ctx.locations[0]?.id;
    if (!locationId) continue;

    catches.push({
      org_id: ctx.orgId,
      location_id: locationId,
      drift_type: 'document_expiration',
      pillar: determinePillar(doc.category),
      source_table: 'documents',
      source_record_id: doc.id,
      expected_value: doc.expiration_date,
      actual_value: `${daysRemaining} days remaining`,
      severity: determineSeverity(daysRemaining),
      estimated_savings_cents: 0,
    });
  }

  return catches;
}
