// detect-operational-drift — Edge function
// C2 of Dashboard v10 build sequence
// Scheduled via pg_cron every 15 minutes.
// Runs 13 confirmed drift detection triggers per org.
// Idempotent INSERTs into drift_catches (partial unique index handles dedup).
// Creates notifications for DM roles per visibility matrix.
// Service role connection bypasses RLS by design.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { TriggerContext, DriftCatchInsert, LocationRow, DmUserRow, OrgRow } from './shared/types.ts';
import { insertDriftCatches, createNotifications } from './shared/insert.ts';
import { autoResolveDriftCatches } from './shared/auto-resolve.ts';

// Trigger imports
import { detectTemperatureOutOfRange } from './triggers/temperature-out-of-range.ts';
import { detectTemperatureTrendDrift } from './triggers/temperature-trend-drift.ts';
import { detectMissedChecklist } from './triggers/missed-checklist.ts';
import { detectDocumentExpiration } from './triggers/document-expiration.ts';
import { detectReceivingLogMissing } from './triggers/receiving-log-missing.ts';
import { detectAllergenTrainingOverdue } from './triggers/allergen-training-overdue.ts';
import { detectHoodCleaningApproaching } from './triggers/hood-cleaning-approaching.ts';
import { detectSuppressionSemiAnnual } from './triggers/suppression-semi-annual.ts';
import { detectExtinguisherMonthly } from './triggers/extinguisher-monthly.ts';
import { detectVendorCoiExpiring } from './triggers/vendor-coi-expiring.ts';
import { detectInspectionReadinessGap } from './triggers/inspection-readiness-gap.ts';
import { detectTeamMissClustering } from './triggers/team-miss-clustering.ts';
import { detectStreakBreak } from './triggers/streak-break.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// All 13 triggers with their detection functions
const TRIGGERS: Array<{
  name: string;
  detect: (ctx: TriggerContext) => Promise<DriftCatchInsert[]>;
}> = [
  { name: 'temperature_out_of_range', detect: detectTemperatureOutOfRange },
  { name: 'temperature_trend_drift', detect: detectTemperatureTrendDrift },
  { name: 'missed_checklist', detect: detectMissedChecklist },
  { name: 'document_expiration', detect: detectDocumentExpiration },
  { name: 'receiving_log_missing', detect: detectReceivingLogMissing },
  { name: 'allergen_training_overdue', detect: detectAllergenTrainingOverdue },
  { name: 'hood_cleaning_approaching', detect: detectHoodCleaningApproaching },
  { name: 'suppression_semi_annual_due', detect: detectSuppressionSemiAnnual },
  { name: 'extinguisher_monthly_missed', detect: detectExtinguisherMonthly },
  { name: 'vendor_coi_expiring', detect: detectVendorCoiExpiring },
  { name: 'inspection_readiness_gap', detect: detectInspectionReadinessGap },
  { name: 'team_miss_clustering', detect: detectTeamMissClustering },
  { name: 'streak_break', detect: detectStreakBreak },
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

  const summary = {
    orgs_processed: 0,
    orgs_skipped: 0,
    catches_detected: 0,
    catches_inserted: 0,
    catches_auto_resolved: 0,
    notifications_created: 0,
    errors: [] as Array<{ org_id?: string; trigger?: string; message: string }>,
  };

  try {
    // Fetch all organizations
    const { data: orgs, error: orgErr } = await supabase
      .from('organizations')
      .select('id, timezone');

    if (orgErr) throw orgErr;
    if (!orgs?.length) {
      return jsonResponse({ ...summary, message: 'No organizations found' });
    }

    for (const org of orgs as OrgRow[]) {
      try {
        const orgTimezone = org.timezone || 'America/Los_Angeles';

        // Fetch active locations for this org
        const { data: locations, error: locErr } = await supabase
          .from('locations')
          .select('id, organization_id, name, business_hours_timezone, business_hours_start, business_hours_end')
          .eq('organization_id', org.id)
          .eq('status', 'active');

        if (locErr) {
          summary.errors.push({ org_id: org.id, message: `Location fetch: ${locErr.message}` });
          summary.orgs_skipped++;
          continue;
        }

        // E1: Empty org with no locations → no-op
        if (!locations?.length) {
          summary.orgs_skipped++;
          continue;
        }

        // Fetch DM-role users for notifications
        const { data: dmUsers, error: userErr } = await supabase
          .from('user_profiles')
          .select('id, organization_id, role')
          .eq('organization_id', org.id)
          .in('role', [
            'owner_operator', 'executive', 'compliance_manager',
            'facilities_manager', 'chef',
          ]);

        if (userErr) {
          summary.errors.push({ org_id: org.id, message: `User fetch: ${userErr.message}` });
        }

        // E2: No DM users — catches still created, no notifications
        if (!dmUsers?.length) {
          console.warn(`[drift] Org ${org.id}: no DM-role users found, notifications will be skipped`);
        }

        // Auto-resolve pass on existing open catches
        const autoResolved = await autoResolveDriftCatches(supabase, org.id);
        summary.catches_auto_resolved += autoResolved;

        // Build trigger context
        const ctx: TriggerContext = {
          supabase,
          orgId: org.id,
          orgTimezone,
          locations: locations as LocationRow[],
          now,
        };

        // Run all 13 triggers with per-trigger isolation
        const allCatches: DriftCatchInsert[] = [];

        for (const trigger of TRIGGERS) {
          try {
            const triggerCatches = await trigger.detect(ctx);
            allCatches.push(...triggerCatches);
          } catch (err) {
            summary.errors.push({
              org_id: org.id,
              trigger: trigger.name,
              message: (err as Error).message,
            });
          }
        }

        summary.catches_detected += allCatches.length;

        // Batch insert with idempotency
        if (allCatches.length > 0) {
          const inserted = await insertDriftCatches(supabase, allCatches);
          summary.catches_inserted += inserted.length;

          // Create notifications for actually-inserted catches
          if (inserted.length > 0 && dmUsers?.length) {
            const notifCount = await createNotifications(
              supabase,
              inserted,
              dmUsers as DmUserRow[],
              locations as LocationRow[],
            );
            summary.notifications_created += notifCount;
          }
        }

        summary.orgs_processed++;
      } catch (err) {
        summary.errors.push({ org_id: org.id, message: (err as Error).message });
        summary.orgs_skipped++;
      }
    }
  } catch (err) {
    summary.errors.push({ message: `Fatal: ${(err as Error).message}` });
    return jsonResponse(summary, 500);
  }

  const elapsed = Date.now() - startTime;
  console.log(
    `[drift] Complete: ${summary.orgs_processed} orgs, ` +
    `${summary.catches_inserted} catches, ${summary.notifications_created} notifications, ` +
    `${summary.catches_auto_resolved} auto-resolved, ${summary.errors.length} errors, ${elapsed}ms`,
  );

  return jsonResponse({ ...summary, elapsed_ms: elapsed });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
