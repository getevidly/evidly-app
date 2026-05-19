// Trigger 3 — missed_checklist
// Checklist with frequency = 'daily' and no checklist_completions row for today.
// Weekly: no completion this ISO week. Monthly: no completion this calendar month.
// checklists has no due_time column — detection is day-boundary only.
// checklists has no location_id — completions carry location_id.

import { TriggerContext, DriftCatchInsert } from '../shared/types.ts';

export async function detectMissedChecklist(ctx: TriggerContext): Promise<DriftCatchInsert[]> {
  const catches: DriftCatchInsert[] = [];

  // Fetch all non-template checklists for this org
  const { data: checklists, error } = await ctx.supabase
    .from('checklists')
    .select('id, frequency, title')
    .eq('organization_id', ctx.orgId)
    .in('frequency', ['daily', 'weekly', 'monthly'])
    .or('is_template.eq.false,is_template.is.null');

  if (error || !checklists?.length) return catches;

  for (const loc of ctx.locations) {
    const locTz = loc.business_hours_timezone || ctx.orgTimezone;
    const nowInTz = new Date(ctx.now.toLocaleString('en-US', { timeZone: locTz }));
    const todayStr = nowInTz.toISOString().substring(0, 10);

    // Only check after business hours have started (avoid false positives early AM)
    const currentHour = nowInTz.getHours();
    const startHour = parseInt(loc.business_hours_start?.substring(0, 2) || '7', 10);
    if (currentHour < startHour + 1) continue; // Grace: 1 hour after open

    for (const cl of checklists) {
      let periodStart: string;
      let periodLabel: string;

      if (cl.frequency === 'daily') {
        periodStart = `${todayStr}T00:00:00`;
        periodLabel = todayStr;
      } else if (cl.frequency === 'weekly') {
        // ISO week start (Monday)
        const day = nowInTz.getDay();
        const diff = day === 0 ? 6 : day - 1;
        const weekStart = new Date(nowInTz);
        weekStart.setDate(weekStart.getDate() - diff);
        periodStart = `${weekStart.toISOString().substring(0, 10)}T00:00:00`;
        periodLabel = `week of ${periodStart.substring(0, 10)}`;
        // Only flag weekly on Thursday or later
        if (diff < 3) continue;
      } else if (cl.frequency === 'monthly') {
        periodStart = `${todayStr.substring(0, 7)}-01T00:00:00`;
        periodLabel = todayStr.substring(0, 7);
        // Only flag monthly after the 25th
        if (nowInTz.getDate() < 25) continue;
      } else {
        continue;
      }

      const { count, error: compErr } = await ctx.supabase
        .from('checklist_completions')
        .select('*', { count: 'exact', head: true })
        .eq('checklist_id', cl.id)
        .eq('location_id', loc.id)
        .gte('completed_at', periodStart);

      if (compErr) continue;
      if (count && count > 0) continue;

      catches.push({
        org_id: ctx.orgId,
        location_id: loc.id,
        drift_type: 'missed_checklist',
        pillar: 'food_safety',
        source_table: 'checklists',
        source_record_id: cl.id,
        expected_value: `${cl.frequency} completion by ${periodLabel}`,
        actual_value: 'missed',
        severity: 'medium',
        estimated_savings_cents: 0,
      });
    }
  }

  return catches;
}
