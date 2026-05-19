// Trigger 11 — inspection_readiness_gap
// Redesigned: jurisdictions has no inspection_window_start/end columns.
// Detection: location has open corrective actions (open > 7 days, per R1)
// OR expired documents (expired > 0 days).
// R1: minimum age threshold — only fire if open CA has been open > 7 days
// OR document expired > 0 days. Prevents instant-fire on every new CA.

import { TriggerContext, DriftCatchInsert } from '../shared/types.ts';

export async function detectInspectionReadinessGap(ctx: TriggerContext): Promise<DriftCatchInsert[]> {
  const catches: DriftCatchInsert[] = [];
  const today = ctx.now.toISOString().substring(0, 10);
  const sevenDaysAgo = new Date(ctx.now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  for (const loc of ctx.locations) {
    let hasGap = false;
    let gapDetail = '';

    // Check for open corrective actions older than 7 days
    const { count: openCaCount, error: caErr } = await ctx.supabase
      .from('corrective_actions')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', ctx.orgId)
      .eq('location_id', loc.id)
      .not('status', 'in', '("completed","verified","closed","archived")')
      .lt('created_at', sevenDaysAgo);

    if (!caErr && openCaCount && openCaCount > 0) {
      hasGap = true;
      gapDetail = `${openCaCount} open corrective action(s) > 7 days`;
    }

    // Check for expired documents
    const { count: expiredCount, error: docErr } = await ctx.supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', ctx.orgId)
      .eq('status', 'active')
      .lt('expiration_date', today)
      .or(`location_id.eq.${loc.id},location_id.is.null`);

    if (!docErr && expiredCount && expiredCount > 0) {
      const docMsg = `${expiredCount} expired document(s)`;
      gapDetail = hasGap ? `${gapDetail}, ${docMsg}` : docMsg;
      hasGap = true;
    }

    if (!hasGap) continue;

    catches.push({
      org_id: ctx.orgId,
      location_id: loc.id,
      drift_type: 'inspection_readiness_gap',
      pillar: 'food_safety',
      source_table: 'corrective_actions',
      source_record_id: loc.id, // location as source reference
      expected_value: 'all CAs resolved, all documents current',
      actual_value: gapDetail,
      severity: 'high',
      estimated_savings_cents: 0,
    });
  }

  return catches;
}
