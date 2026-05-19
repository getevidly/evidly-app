// Trigger 12 — team_miss_clustering
// Same completed_by user has 3+ incomplete checklist completions within
// 14 days, clustering within a 2-hour daily window.
//
// NOTE: checklist_completions has 0 rows in PROD as of C2. items_data JSONB
// structure is not yet populated by any frontend code. This trigger is coded
// to work correctly when data exists — for now it returns empty results.
// Detection: users with 3+ completions where items_data contains incomplete items
// OR where the completion itself may represent a partial/missed submission.

import { TriggerContext, DriftCatchInsert } from '../shared/types.ts';

export async function detectTeamMissClustering(ctx: TriggerContext): Promise<DriftCatchInsert[]> {
  const catches: DriftCatchInsert[] = [];

  for (const loc of ctx.locations) {
    const fourteenDaysAgo = new Date(ctx.now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch completions for this location in the last 14 days
    const { data: completions, error } = await ctx.supabase
      .from('checklist_completions')
      .select('id, completed_by, completed_at, items_data')
      .eq('location_id', loc.id)
      .gte('completed_at', fourteenDaysAgo);

    if (error || !completions?.length) continue;

    // Group by user
    const byUser = new Map<string, typeof completions>();
    for (const c of completions) {
      if (!c.completed_by) continue;
      if (!byUser.has(c.completed_by)) byUser.set(c.completed_by, []);
      byUser.get(c.completed_by)!.push(c);
    }

    for (const [userId, userCompletions] of byUser) {
      // Look for completions with missed/incomplete items in items_data
      const missCompletions = userCompletions.filter((c) => {
        if (!c.items_data || !Array.isArray(c.items_data)) return false;
        return c.items_data.some(
          (item: Record<string, unknown>) =>
            item.status === 'missed' ||
            item.status === 'incomplete' ||
            item.status === 'skipped' ||
            item.completed === false,
        );
      });

      if (missCompletions.length < 3) continue;

      // Check 2-hour window clustering
      const hours = missCompletions.map((c) => new Date(c.completed_at).getHours());
      const minHour = Math.min(...hours);
      const maxHour = Math.max(...hours);
      if (maxHour - minHour > 2) continue; // Not clustered

      catches.push({
        org_id: ctx.orgId,
        location_id: loc.id,
        drift_type: 'team_miss_clustering',
        pillar: 'food_safety',
        source_table: 'checklist_completions',
        source_record_id: null,
        expected_value: 'no clustering pattern',
        actual_value: `${missCompletions.length} misses by same team member within ${minHour}:00–${maxHour + 1}:00`,
        severity: 'medium',
        estimated_savings_cents: 0,
      });
    }
  }

  return catches;
}
