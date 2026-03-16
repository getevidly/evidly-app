/**
 * _shared/notify.ts — NOTIFICATION-SUPER-01
 *
 * Server-side helper for creating notifications.
 * - Inserts into notifications table
 * - Checks user notification_preferences
 * - Sends email if critical priority OR user opted in for high
 * - Returns the notification ID
 */

import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "./email.ts";
import { logger } from "./logger.ts";

// ── Types ────────────────────────────────────────────────────

export type NotificationCategory =
  | 'compliance'
  | 'safety'
  | 'documents'
  | 'vendors'
  | 'team'
  | 'system';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export type NotificationSeverity = 'info' | 'advisory' | 'urgent';

export interface CreateNotificationParams {
  supabase: SupabaseClient;
  organizationId: string;
  userId?: string;
  type: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  actionUrl?: string;
  actionLabel?: string;
  priority?: NotificationPriority;
  severity?: NotificationSeverity;
  sourceType?: string;
  sourceId?: string;
  signalId?: string;
  cicPillar?: string;
  signalType?: string;
  deduplicate?: boolean;
}

export interface NotifyResult {
  notificationId: string | null;
  emailSent: boolean;
  deduplicated: boolean;
}

// ── Main function ────────────────────────────────────────────

export async function createNotification(
  params: CreateNotificationParams
): Promise<NotifyResult> {
  const {
    supabase,
    organizationId,
    userId,
    type,
    category,
    title,
    body,
    actionUrl,
    actionLabel,
    priority = 'medium',
    severity = 'info',
    sourceType,
    sourceId,
    signalId,
    cicPillar,
    signalType,
    deduplicate = true,
  } = params;

  try {
    // ── 1. Deduplication check ──────────────────────────────
    if (deduplicate && sourceType && sourceId) {
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('source_type', sourceType)
        .eq('source_id', sourceId)
        .maybeSingle();

      if (existing) {
        logger.info('[NOTIFY] Deduplicated', type, sourceType, sourceId);
        return { notificationId: existing.id, emailSent: false, deduplicated: true };
      }
    }

    // ── 2. Insert notification row ──────────────────────────
    const row: Record<string, unknown> = {
      organization_id: organizationId,
      user_id: userId || null,
      type,
      category,
      title,
      body: body || null,
      action_url: actionUrl || null,
      action_label: actionLabel || null,
      priority,
      severity,
      source_type: sourceType || null,
      source_id: sourceId || null,
      signal_id: signalId || null,
      cic_pillar: cicPillar || null,
      signal_type: signalType || null,
    };

    const { data: notification, error: insertErr } = await supabase
      .from('notifications')
      .insert(row)
      .select('id')
      .single();

    if (insertErr || !notification) {
      logger.error('[NOTIFY] Insert failed', insertErr?.message || 'unknown');
      return { notificationId: null, emailSent: false, deduplicated: false };
    }

    // ── 3. Check if email should be sent ────────────────────
    let emailSent = false;

    if (userId && (priority === 'critical' || priority === 'high')) {
      // Critical always sends; high sends if preference not disabled
      let shouldSend = priority === 'critical';

      if (!shouldSend) {
        const { data: pref } = await supabase
          .from('notification_preferences')
          .select('email_enabled')
          .eq('user_id', userId)
          .eq('category', category)
          .maybeSingle();

        // Default: email enabled if no preference row exists
        shouldSend = pref?.email_enabled !== false;
      }

      if (shouldSend) {
        emailSent = await sendNotificationEmail(
          supabase, userId, title, body, actionUrl, actionLabel, severity
        );

        if (emailSent) {
          await supabase
            .from('notifications')
            .update({ email_sent: true })
            .eq('id', notification.id);
        }
      }
    }

    return { notificationId: notification.id, emailSent, deduplicated: false };
  } catch (err) {
    logger.error('[NOTIFY] Unexpected error', (err as Error).message);
    return { notificationId: null, emailSent: false, deduplicated: false };
  }
}

// ── Email helper ─────────────────────────────────────────────

async function sendNotificationEmail(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  body?: string,
  actionUrl?: string,
  actionLabel?: string,
  severity?: NotificationSeverity,
): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    if (!userData?.user?.email) return false;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    const urgencyBanner = severity === 'urgent'
      ? { text: 'Requires Attention', color: '#dc2626' }
      : severity === 'advisory'
        ? { text: 'Advisory Notice', color: '#d97706' }
        : undefined;

    const fullActionUrl = actionUrl
      ? (actionUrl.startsWith('http') ? actionUrl : `https://app.getevidly.com${actionUrl}`)
      : undefined;

    const html = buildEmailHtml({
      recipientName: profile?.full_name || 'there',
      bodyHtml: `<p>${body || title}</p>`,
      ctaText: actionLabel || (fullActionUrl ? 'View in EvidLY' : undefined),
      ctaUrl: fullActionUrl,
      urgencyBanner,
    });

    const result = await sendEmail({
      to: userData.user.email,
      subject: title,
      html,
    });

    return result !== null;
  } catch (err) {
    logger.error('[NOTIFY] Email send failed', (err as Error).message);
    return false;
  }
}

// ── Batch org-wide notification ──────────────────────────────

export async function createOrgNotification(
  params: Omit<CreateNotificationParams, 'userId'> & { roleFilter?: string[] }
): Promise<{ count: number; emailCount: number }> {
  const { supabase, organizationId, roleFilter, ...rest } = params;

  let query = supabase
    .from('user_profiles')
    .select('id')
    .eq('organization_id', organizationId);

  if (roleFilter && roleFilter.length > 0) {
    query = query.in('role', roleFilter);
  }

  const { data: users } = await query;
  if (!users || users.length === 0) return { count: 0, emailCount: 0 };

  let count = 0;
  let emailCount = 0;

  for (const user of users) {
    const result = await createNotification({
      ...rest,
      supabase,
      organizationId,
      userId: user.id,
    });
    if (result.notificationId && !result.deduplicated) count++;
    if (result.emailSent) emailCount++;
  }

  return { count, emailCount };
}
