// Trigger 13 — task_drift (task_overdue + task_skipped)
// Reads task_instances for skipped or overdue tasks.
// task_overdue: status='overdue' OR (status='pending' AND due_at < now())
// task_skipped: status='skipped'
// Pillar set from task_instances.pillar per row — never blended.
// Scoped to last 30 days to avoid querying full history every 15-min cron run.

import { TriggerContext, DriftCatchInsert } from '../shared/types.ts';

export async function detectTaskDrift(ctx: TriggerContext): Promise<DriftCatchInsert[]> {
  const catches: DriftCatchInsert[] = [];
  const nowIso = ctx.now.toISOString();
  const thirtyDaysAgo = new Date(ctx.now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .substring(0, 10);

  // ── Skipped tasks ──
  const { data: skipped, error: skipErr } = await ctx.supabase
    .from('task_instances')
    .select('id, location_id, pillar, date, due_at')
    .eq('organization_id', ctx.orgId)
    .eq('status', 'skipped')
    .gte('date', thirtyDaysAgo);

  if (!skipErr && skipped?.length) {
    for (const task of skipped) {
      if (!task.location_id) continue;
      catches.push({
        org_id: ctx.orgId,
        location_id: task.location_id,
        drift_type: 'task_skipped',
        pillar: task.pillar || 'food_safety',
        source_table: 'task_instances',
        source_record_id: task.id,
        expected_value: `task due ${task.due_at || task.date}`,
        actual_value: 'skipped',
        severity: 'high',
        estimated_savings_cents: 0,
      });
    }
  }

  // ── Overdue tasks: explicit status='overdue' ──
  const { data: overdue, error: odErr } = await ctx.supabase
    .from('task_instances')
    .select('id, location_id, pillar, date, due_at')
    .eq('organization_id', ctx.orgId)
    .eq('status', 'overdue')
    .gte('date', thirtyDaysAgo);

  // ── Overdue tasks: status='pending' with due_at in the past ──
  const { data: pendingPastDue, error: pdErr } = await ctx.supabase
    .from('task_instances')
    .select('id, location_id, pillar, date, due_at')
    .eq('organization_id', ctx.orgId)
    .eq('status', 'pending')
    .not('due_at', 'is', null)
    .lt('due_at', nowIso)
    .gte('date', thirtyDaysAgo);

  const overdueAll = [
    ...(!odErr && overdue ? overdue : []),
    ...(!pdErr && pendingPastDue ? pendingPastDue : []),
  ];

  for (const task of overdueAll) {
    if (!task.location_id) continue;

    const dueTime = task.due_at ? new Date(task.due_at).getTime() : null;
    const hoursOverdue = dueTime
      ? Math.floor((ctx.now.getTime() - dueTime) / (60 * 60 * 1000))
      : 0;

    catches.push({
      org_id: ctx.orgId,
      location_id: task.location_id,
      drift_type: 'task_overdue',
      pillar: task.pillar || 'food_safety',
      source_table: 'task_instances',
      source_record_id: task.id,
      expected_value: `due ${task.due_at || task.date}`,
      actual_value: `${hoursOverdue}h overdue`,
      severity: hoursOverdue > 24 ? 'high' : 'medium',
      estimated_savings_cents: 0,
    });
  }

  return catches;
}
