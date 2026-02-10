/**
 * Scheduled Weekly Digest Trigger
 *
 * This function is designed to be called by:
 *   - Supabase pg_cron (recommended for production)
 *   - Vercel Cron (/api/cron/weekly-digest)
 *   - Manual trigger from the WeeklyDigest settings page
 *
 * In production, it should:
 *   1. Query all organizations that have digest enabled
 *   2. For each org, gather their compliance data from Supabase
 *   3. Generate the digest email
 *   4. Send via Resend
 *
 * For now, the function structure is implemented with hardcoded demo data.
 * TODO: Replace demo data with actual Supabase queries.
 */

import { sendWeeklyDigest, type DigestData } from './sendWeeklyDigest';

interface OrgDigestConfig {
  orgId: string;
  orgName: string;
  recipients: string[];
  scheduleDay: string; // e.g. 'monday'
  scheduleTime: string; // e.g. '08:00'
  contentToggles: {
    complianceScores: boolean;
    highlightsConcerns: boolean;
    tempCheckDetails: boolean;
    checklistDetails: boolean;
    actionItems: boolean;
    vendorUpdates: boolean;
  };
}

/**
 * Fetch all orgs with digest enabled
 * TODO: Replace with actual Supabase query
 *   SELECT o.*, d.* FROM organizations o
 *   JOIN digest_settings d ON d.org_id = o.id
 *   WHERE d.enabled = true
 */
async function getEnabledOrgs(): Promise<OrgDigestConfig[]> {
  // TODO: query supabase for orgs with digest_settings.enabled = true
  // For now, return empty — the demo page handles its own preview data
  return [];
}

/**
 * Gather compliance data for an organization
 * TODO: Replace with actual Supabase queries for:
 *   - compliance_scores (current + previous week)
 *   - location_scores with sub-pillar breakdown
 *   - temperature_logs aggregated for the week
 *   - checklist_completions aggregated for the week
 *   - action_items with assignees and due dates
 *   - vendor_services with statuses
 */
async function gatherDigestData(org: OrgDigestConfig): Promise<DigestData> {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() - weekEnd.getDay()); // last Sunday
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // TODO: Replace with actual data queries
  return {
    orgName: org.orgName,
    weekStart: fmt(weekStart),
    weekEnd: fmt(weekEnd),
    overallScore: 0,
    scoreTrend: 0,
    locations: [],
    highlights: [],
    concerns: [],
    tempStats: { total: 0, onTimePercent: 0, outOfRange: 0, weekOverWeek: 0 },
    checklistStats: { completed: 0, required: 0, percent: 0, weekOverWeek: 0 },
    missedItems: [],
    actionItems: [],
    vendorUpdates: [],
  };
}

/**
 * Main entry point — called by cron trigger.
 * Iterates all enabled orgs, gathers data, sends emails.
 */
export async function runWeeklyDigests(): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const orgs = await getEnabledOrgs();
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const org of orgs) {
    try {
      const data = await gatherDigestData(org);
      const result = await sendWeeklyDigest(org.recipients, data);
      if (result.success) {
        sent++;
      } else {
        failed++;
        errors.push(`${org.orgName}: ${result.error}`);
      }
    } catch (err: any) {
      failed++;
      errors.push(`${org.orgName}: ${err?.message || 'Unknown error'}`);
    }
  }

  return { sent, failed, errors };
}
