/**
 * countContentPublished — count content_schedule posts that are published
 * within a date period for a given channel_label.
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
): Promise<number> {
  const { data, error } = await supabase
    .from('content_schedule')
    .select('status, scheduled_date, scheduled_time')
    .eq('channel_label', channelLabel)
    .gte('scheduled_date', periodFrom)
    .lt('scheduled_date', periodTo);

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
