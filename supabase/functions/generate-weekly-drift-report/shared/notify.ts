// generate-weekly-drift-report — in-app notification creation

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface NotifyRecipient {
  userId: string;
  emailSent: boolean;
}

/**
 * Create in-app notifications for weekly drift report recipients.
 * Returns array of inserted notification IDs.
 */
export async function createReportNotifications(
  supabase: SupabaseClient,
  orgId: string,
  catchCount: number,
  recipients: NotifyRecipient[],
): Promise<string[]> {
  if (recipients.length === 0) return [];

  const rows = recipients.map((r) => ({
    organization_id: orgId,
    user_id: r.userId,
    type: 'weekly_drift_report',
    title: 'Your weekly drift report is ready',
    body: `${catchCount} drift${catchCount !== 1 ? 's' : ''} caught last week \u2014 review on Dashboard`,
    action_url: '/dashboard',
    priority: 'medium',
    email_sent: r.emailSent,
  }));

  const { data, error } = await supabase
    .from('notifications')
    .insert(rows)
    .select('id');

  if (error) {
    console.error('[weekly-report-notify] Error inserting notifications:', error.message);
    return [];
  }

  return (data || []).map((n: { id: string }) => n.id);
}
