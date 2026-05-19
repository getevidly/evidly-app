// Trigger 13 — streak_break
// Org maintained 30+ consecutive days of evidence (at least one checklist
// completion or temperature reading per day) and most recent day has no evidence.
// Uses org timezone for day boundaries.

import { TriggerContext, DriftCatchInsert } from '../shared/types.ts';

export async function detectStreakBreak(ctx: TriggerContext): Promise<DriftCatchInsert[]> {
  const catches: DriftCatchInsert[] = [];
  const orgTz = ctx.orgTimezone || 'America/Los_Angeles';

  // We need evidence per day for the last 35 days to check a 30-day streak + today
  const thirtyFiveDaysAgo = new Date(ctx.now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch distinct evidence dates from checklist_completions
  const { data: ccDates, error: ccErr } = await ctx.supabase
    .from('checklist_completions')
    .select('completed_at')
    .gte('completed_at', thirtyFiveDaysAgo);

  // Fetch distinct evidence dates from temperature_logs (via locations)
  const locationIds = ctx.locations.map((l) => l.id);
  let tempDates: Array<{ reading_time: string }> = [];
  if (locationIds.length > 0) {
    const { data, error: tempErr } = await ctx.supabase
      .from('temperature_logs')
      .select('reading_time')
      .in('facility_id', locationIds)
      .gte('reading_time', thirtyFiveDaysAgo);
    if (!tempErr && data) tempDates = data;
  }

  // Combine and deduplicate by date in org timezone
  const evidenceDays = new Set<string>();

  for (const row of ccDates || []) {
    if (!row.completed_at) continue;
    const d = new Date(row.completed_at);
    const dateStr = d.toLocaleDateString('en-CA', { timeZone: orgTz }); // YYYY-MM-DD
    evidenceDays.add(dateStr);
  }
  for (const row of tempDates) {
    if (!row.reading_time) continue;
    const d = new Date(row.reading_time);
    const dateStr = d.toLocaleDateString('en-CA', { timeZone: orgTz });
    evidenceDays.add(dateStr);
  }

  // Check today
  const todayStr = ctx.now.toLocaleDateString('en-CA', { timeZone: orgTz });
  const todayHasEvidence = evidenceDays.has(todayStr);

  if (todayHasEvidence) return catches; // No break today

  // Count consecutive days before today (going backwards)
  let streak = 0;
  for (let i = 1; i <= 35; i++) {
    const checkDate = new Date(ctx.now.getTime() - i * 24 * 60 * 60 * 1000);
    const checkStr = checkDate.toLocaleDateString('en-CA', { timeZone: orgTz });
    if (evidenceDays.has(checkStr)) {
      streak++;
    } else {
      break;
    }
  }

  if (streak < 30) return catches; // No 30+ day streak to break

  // Assign to first location as org-level event
  const locationId = ctx.locations[0]?.id;
  if (!locationId) return catches;

  catches.push({
    org_id: ctx.orgId,
    location_id: locationId,
    drift_type: 'streak_break',
    pillar: 'food_safety',
    source_table: 'checklist_completions',
    source_record_id: null,
    expected_value: `${streak}+ day evidence streak`,
    actual_value: 'no evidence logged today',
    severity: 'medium',
    estimated_savings_cents: 0,
  });

  return catches;
}
