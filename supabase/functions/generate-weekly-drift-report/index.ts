// generate-weekly-drift-report — Edge function
// C3 of Dashboard v10 build sequence
// Scheduled via pg_cron hourly. Fires weekly report on Monday 7 AM org-local.
// Aggregates drift_catches for prior week, sends role-filtered email + in-app
// notification per locked DM-role matrix.
// Service role connection bypasses RLS by design.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isMondaySevenAm, getPriorWeekBounds } from './shared/timezone.ts';
import { aggregateDriftCatches } from './shared/aggregate.ts';
import {
  getPillarFilter,
  filterCatchesByPillar,
  buildSubjectLine,
  buildReportEmail,
} from './shared/email-builder.ts';
import { createReportNotifications } from './shared/notify.ts';
import type { NotifyRecipient } from './shared/notify.ts';
import { sendEmail } from '../_shared/email.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DM_ROLES = [
  'owner_operator', 'executive', 'compliance_manager',
  'facilities_manager', 'chef',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  const now = new Date();

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Parse optional force parameters for manual testing
  let forceOrgId: string | null = null;
  let forceWeekStart: string | null = null;
  try {
    const body = await req.json();
    if (body?.force === true) {
      forceOrgId = body.org_id || null;
      forceWeekStart = body.week_start || null;
    }
  } catch {
    // No body or invalid JSON — normal cron invocation
  }

  const summary = {
    orgs_checked: 0,
    orgs_skipped_not_monday: 0,
    orgs_skipped_no_tz: 0,
    orgs_skipped_no_catches: 0,
    orgs_skipped_already_sent: 0,
    orgs_skipped_no_recipients: 0,
    reports_generated: 0,
    emails_sent: 0,
    emails_failed: 0,
    notifications_created: 0,
    errors: [] as Array<{ org_id?: string; message: string }>,
  };

  try {
    // Fetch organizations
    let orgQuery = supabase.from('organizations').select('id, name, timezone');
    if (forceOrgId) {
      orgQuery = orgQuery.eq('id', forceOrgId);
    }
    const { data: orgs, error: orgErr } = await orgQuery;

    if (orgErr) throw orgErr;
    if (!orgs?.length) {
      return jsonResponse({ ...summary, message: 'No organizations found' });
    }

    for (const org of orgs) {
      summary.orgs_checked++;

      try {
        // E3: Skip orgs with no timezone
        if (!org.timezone) {
          console.warn(`[weekly-report] Org ${org.id}: no timezone set, skipping`);
          summary.orgs_skipped_no_tz++;
          continue;
        }

        // Monday 7 AM check (skipped when force-invoked)
        if (!forceOrgId && !isMondaySevenAm(org.timezone, now)) {
          summary.orgs_skipped_not_monday++;
          continue;
        }

        // Calculate week boundaries
        const { weekStart, weekEnd } = forceWeekStart
          ? computeForcedBounds(forceWeekStart)
          : getPriorWeekBounds(org.timezone, now);

        // E5: Idempotency pre-check
        const { data: existing } = await supabase
          .from('weekly_drift_reports')
          .select('id')
          .eq('org_id', org.id)
          .eq('report_week_start', weekStart)
          .maybeSingle();

        if (existing) {
          summary.orgs_skipped_already_sent++;
          continue;
        }

        // Aggregate catches for the week
        const agg = await aggregateDriftCatches(supabase, org.id, weekStart, weekEnd);

        // E1: No catches → skip entirely (no empty reports)
        if (agg.total === 0) {
          summary.orgs_skipped_no_catches++;
          continue;
        }

        // Fetch location names for email body
        const { data: locations } = await supabase
          .from('locations')
          .select('id, name')
          .eq('organization_id', org.id);
        const locationMap = new Map((locations || []).map((l: { id: string; name: string }) => [l.id, l.name]));

        // Fetch DM-role recipients
        const { data: recipients } = await supabase
          .from('user_profiles')
          .select('id, email, full_name, role')
          .eq('organization_id', org.id)
          .in('role', DM_ROLES)
          .not('email', 'is', null);

        // E2: No recipients → insert failed report row
        if (!recipients?.length) {
          await supabase.from('weekly_drift_reports').insert({
            org_id: org.id,
            report_week_start: weekStart,
            report_week_end: weekEnd,
            generated_at: now.toISOString(),
            total_catches: agg.total,
            food_catches: agg.food,
            fire_catches: agg.fire,
            total_estimated_savings_cents: agg.savings,
            recipient_roles: [],
            delivery_status: 'failed',
          });
          summary.orgs_skipped_no_recipients++;
          continue;
        }

        // Send emails and create notifications per recipient
        const emailMessageIds: Record<string, string> = {};
        const notifyRecipients: NotifyRecipient[] = [];
        const recipientRoles = [...new Set(recipients.map((r: { role: string }) => r.role))];
        let reportHtml = '';

        for (const user of recipients) {
          try {
            const filter = getPillarFilter(user.role);
            const filteredCatches = filterCatchesByPillar(agg.catches, filter);

            // Skip if role-filtered view has 0 catches
            if (filteredCatches.length === 0) continue;

            const subject = buildSubjectLine(filteredCatches.length, org.name, filter);
            const html = buildReportEmail(
              user.full_name || 'Team',
              org.name,
              weekStart,
              weekEnd,
              filteredCatches,
              locationMap,
              filter,
            );

            // Store first full-portfolio HTML as report_body_html
            if (!reportHtml && filter === 'full') {
              reportHtml = html;
            }

            const result = await sendEmail({ to: user.email, subject, html });
            const emailSent = result !== null;

            if (emailSent) {
              emailMessageIds[user.email] = result!.id;
              summary.emails_sent++;
            } else {
              summary.emails_failed++;
            }

            notifyRecipients.push({ userId: user.id, emailSent });
          } catch (err) {
            summary.errors.push({
              org_id: org.id,
              message: `Recipient ${user.id}: ${(err as Error).message}`,
            });
            summary.emails_failed++;
            notifyRecipients.push({ userId: user.id, emailSent: false });
          }
        }

        // Create in-app notifications
        const notifIds = await createReportNotifications(
          supabase,
          org.id,
          agg.total,
          notifyRecipients,
        );
        summary.notifications_created += notifIds.length;

        // Determine delivery status
        const deliveryStatus = summary.emails_sent > 0 ? 'sent' : 'failed';

        // Insert weekly_drift_reports row
        await supabase.from('weekly_drift_reports').insert({
          org_id: org.id,
          report_week_start: weekStart,
          report_week_end: weekEnd,
          generated_at: now.toISOString(),
          total_catches: agg.total,
          food_catches: agg.food,
          fire_catches: agg.fire,
          total_estimated_savings_cents: agg.savings,
          recipient_roles: recipientRoles,
          delivery_status: deliveryStatus,
          delivered_at: deliveryStatus === 'sent' ? now.toISOString() : null,
          email_message_ids: Object.keys(emailMessageIds).length > 0 ? emailMessageIds : null,
          in_app_notification_ids: notifIds.length > 0 ? notifIds : null,
          report_body_html: reportHtml || null,
        });

        summary.reports_generated++;
      } catch (err) {
        summary.errors.push({ org_id: org.id, message: (err as Error).message });
      }
    }
  } catch (err) {
    summary.errors.push({ message: `Fatal: ${(err as Error).message}` });
    return jsonResponse(summary, 500);
  }

  const elapsed = Date.now() - startTime;
  console.log(
    `[weekly-report] Complete: ${summary.orgs_checked} checked, ` +
    `${summary.reports_generated} reports, ${summary.emails_sent} emails, ` +
    `${summary.notifications_created} notifications, ${summary.errors.length} errors, ${elapsed}ms`,
  );

  return jsonResponse({ ...summary, elapsed_ms: elapsed });
});

function computeForcedBounds(weekStart: string): { weekStart: string; weekEnd: string } {
  const start = new Date(weekStart + 'T00:00:00Z');
  const end = new Date(start.getTime() + 6 * 86400000);
  const y = end.getUTCFullYear();
  const m = String(end.getUTCMonth() + 1).padStart(2, '0');
  const d = String(end.getUTCDate()).padStart(2, '0');
  return { weekStart, weekEnd: `${y}-${m}-${d}` };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
