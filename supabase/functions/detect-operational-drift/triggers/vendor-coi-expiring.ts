// Trigger 10 — vendor_coi_expiring
// Documents with category matching insurance/COI, expiration_date <= today + 15 days,
// and no renewal upload.

import { TriggerContext, DriftCatchInsert } from '../shared/types.ts';

export async function detectVendorCoiExpiring(ctx: TriggerContext): Promise<DriftCatchInsert[]> {
  const catches: DriftCatchInsert[] = [];
  const today = ctx.now.toISOString().substring(0, 10);
  const fifteenDaysOut = new Date(ctx.now.getTime() + 15 * 24 * 60 * 60 * 1000)
    .toISOString()
    .substring(0, 10);

  const { data: docs, error } = await ctx.supabase
    .from('documents')
    .select('id, category, expiration_date, location_id')
    .eq('organization_id', ctx.orgId)
    .eq('status', 'active')
    .gte('expiration_date', today)
    .lte('expiration_date', fifteenDaysOut);

  if (error || !docs?.length) return catches;

  // Filter to insurance/COI documents
  const coiDocs = docs.filter((d) => {
    const cat = d.category?.toLowerCase() || '';
    return cat.includes('insurance') || cat.includes('coi') || cat.includes('certificate of insurance');
  });

  for (const doc of coiDocs) {
    // Check for renewal (newer doc, same category, later expiration)
    const { count } = await ctx.supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', ctx.orgId)
      .eq('category', doc.category)
      .eq('status', 'active')
      .gt('expiration_date', doc.expiration_date);

    if (count && count > 0) continue;

    const daysRemaining = Math.ceil(
      (new Date(doc.expiration_date).getTime() - ctx.now.getTime()) / (24 * 60 * 60 * 1000),
    );
    const locationId = doc.location_id || ctx.locations[0]?.id;
    if (!locationId) continue;

    catches.push({
      org_id: ctx.orgId,
      location_id: locationId,
      drift_type: 'vendor_coi_expiring',
      pillar: 'fire_safety',
      source_table: 'documents',
      source_record_id: doc.id,
      expected_value: `COI renewal before ${doc.expiration_date}`,
      actual_value: `${daysRemaining} days remaining`,
      severity: 'high',
      estimated_savings_cents: 0,
    });
  }

  return catches;
}
