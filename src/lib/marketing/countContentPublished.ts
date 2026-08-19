/**
 * countContentPublished — count content_schedule posts that are published
 * within a date period for a given channel_label.
 *
 * channelLabel may be comma-separated (e.g. 'Blog,Articles') to match
 * multiple labels. An optional brands param (also comma-separated) scopes
 * the count to specific brands; when omitted no brand filter is applied.
 *
 * "Published" uses the same rule as displayStatus / isAlreadyPosted in
 * ContentScheduleTab: status === 'published', OR the post's datetime
 * (scheduled_date + scheduled_time || '23:59') is in the past AND
 * status === 'scheduled'.
 */
import { supabase } from '../supabase';

export async function countContentPublished(
  channelLabel: string,
  periodFrom: string,   // inclusive, YYYY-MM-DD
  periodTo: string,     // exclusive, YYYY-MM-DD
  brands?: string | null,
): Promise<number> {
  const labels = channelLabel.split(',').map(s => s.trim()).filter(Boolean);

  let query = supabase
    .from('content_schedule')
    .select('status, scheduled_date, scheduled_time')
    .in('channel_label', labels)
    .gte('scheduled_date', periodFrom)
    .lt('scheduled_date', periodTo);

  if (brands) {
    const brandsArray = brands.split(',').map(s => s.trim()).filter(Boolean);
    if (brandsArray.length > 0) {
      query = query.in('brand', brandsArray);
    }
  }

  const { data, error } = await query;

  if (error || !data) return 0;

  const now = new Date();
  let count = 0;
  for (const row of data) {
    if (row.status === 'published') { count++; continue; }
    if (row.status === 'scheduled') {
      const time = row.scheduled_time || '23:59';
      const postDt = new Date(`${row.scheduled_date}T${time}`);
      if (postDt < now) count++;
    }
  }
  return count;
}
