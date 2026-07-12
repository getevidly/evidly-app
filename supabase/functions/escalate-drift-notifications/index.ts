// escalate-drift-notifications — Edge function
// Scheduled via pg_cron every 5 minutes.
// Finds drift notifications past their escalation_deadline that are unacked,
// marks them escalated, and creates new notifications for the next role tier.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Escalation chain per pillar — ordered lowest to highest authority.
// When a role's notification goes unacked, escalate to ALL roles above it.
const ESCALATION_CHAIN: Record<string, string[]> = {
  food_safety: ['chef', 'compliance_manager', 'executive', 'owner_operator'],
  fire_safety: ['facilities_manager', 'compliance_manager', 'executive', 'owner_operator'],
};

// Severity-based deadlines for escalated notifications (same as initial)
const ESCALATION_MINUTES: Record<string, number> = {
  urgent: 30,
  high: 60,
  medium: 120,
  low: 480,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const summary = {
    checked: 0,
    escalated: 0,
    notifications_created: 0,
    errors: [] as string[],
  };

  try {
    // Find overdue notifications: past deadline, unacked, unescalated
    const { data: overdue, error: fetchErr } = await supabase
      .from('notifications')
      .select('id, organization_id, user_id, source_id, priority, title, body, action_url')
      .eq('source_type', 'drift_catch')
      .is('acknowledged_at', null)
      .is('escalated_at', null)
      .not('escalation_deadline', 'is', null)
      .lt('escalation_deadline', new Date().toISOString())
      .limit(50);

    if (fetchErr) {
      summary.errors.push(`Fetch overdue: ${fetchErr.message}`);
      return jsonResponse(summary, 500);
    }

    if (!overdue || overdue.length === 0) {
      return jsonResponse({ ...summary, message: 'No overdue notifications' });
    }

    summary.checked = overdue.length;

    // Group by source_id (drift_catch_id) to avoid duplicate escalations
    const byDrift = new Map<string, typeof overdue>();
    for (const n of overdue) {
      const key = n.source_id as string;
      if (!byDrift.has(key)) byDrift.set(key, []);
      byDrift.get(key)!.push(n);
    }

    for (const [driftCatchId, notifications] of byDrift) {
      const orgId = notifications[0].organization_id as string;

      // Look up drift catch pillar
      const { data: drift, error: driftErr } = await supabase
        .from('drift_catches')
        .select('pillar')
        .eq('id', driftCatchId)
        .maybeSingle();

      if (driftErr || !drift) {
        summary.errors.push(`Drift lookup ${driftCatchId}: ${driftErr?.message || 'not found'}`);
        continue;
      }

      const pillar = drift.pillar as string;
      const chain = ESCALATION_CHAIN[pillar];
      if (!chain) {
        summary.errors.push(`No chain for pillar: ${pillar}`);
        continue;
      }

      // Determine which roles already have notifications for this drift
      const { data: existingNotifs } = await supabase
        .from('notifications')
        .select('user_id')
        .eq('source_type', 'drift_catch')
        .eq('source_id', driftCatchId);

      const existingUserIds = new Set((existingNotifs || []).map(n => n.user_id as string));

      // Find the highest role in the chain among the overdue notifications
      const { data: overdueUsers } = await supabase
        .from('user_profiles')
        .select('id, role')
        .in('id', notifications.map(n => n.user_id as string));

      const overdueRoles = new Set((overdueUsers || []).map(u => u.role as string));
      let highestOverdueIdx = -1;
      for (const role of overdueRoles) {
        const idx = chain.indexOf(role);
        if (idx > highestOverdueIdx) highestOverdueIdx = idx;
      }

      // Escalate to all roles ABOVE the highest overdue role
      const escalateToRoles = chain.slice(highestOverdueIdx + 1);
      if (escalateToRoles.length === 0) {
        // Already at top of chain — mark as escalated, no further escalation possible
        const ids = notifications.map(n => n.id as string);
        await supabase
          .from('notifications')
          .update({ escalated_at: new Date().toISOString() })
          .in('id', ids);
        summary.escalated += ids.length;
        continue;
      }

      // Find users in escalation target roles for this org
      const { data: targetUsers } = await supabase
        .from('user_profiles')
        .select('id, role')
        .eq('organization_id', orgId)
        .in('role', escalateToRoles);

      if (!targetUsers || targetUsers.length === 0) {
        // No higher-tier users exist — mark escalated anyway
        const ids = notifications.map(n => n.id as string);
        await supabase
          .from('notifications')
          .update({ escalated_at: new Date().toISOString() })
          .in('id', ids);
        summary.escalated += ids.length;
        continue;
      }

      // Filter out users who already have a notification for this drift
      const newTargets = targetUsers.filter(u => !existingUserIds.has(u.id as string));

      if (newTargets.length > 0) {
        const priority = (notifications[0].priority as string) || 'medium';
        const escalationMinutes = ESCALATION_MINUTES[priority] || 120;
        const escalationDeadline = new Date(Date.now() + escalationMinutes * 60_000).toISOString();

        const newNotifs = newTargets.map(user => ({
          organization_id: orgId,
          user_id: user.id as string,
          type: 'drift_catch',
          title: `[Escalated] ${notifications[0].title || 'Drift alert'}`,
          body: notifications[0].body as string,
          action_url: notifications[0].action_url as string,
          priority,
          source_type: 'drift_catch',
          source_id: driftCatchId,
          escalation_deadline: escalationDeadline,
        }));

        const { error: insertErr } = await supabase.from('notifications').insert(newNotifs);
        if (insertErr) {
          summary.errors.push(`Insert escalation for ${driftCatchId}: ${insertErr.message}`);
        } else {
          summary.notifications_created += newNotifs.length;
        }
      }

      // Mark original overdue notifications as escalated
      const ids = notifications.map(n => n.id as string);
      const { error: updateErr } = await supabase
        .from('notifications')
        .update({ escalated_at: new Date().toISOString() })
        .in('id', ids);

      if (updateErr) {
        summary.errors.push(`Update escalated_at for ${driftCatchId}: ${updateErr.message}`);
      } else {
        summary.escalated += ids.length;
      }
    }
  } catch (err) {
    summary.errors.push(`Fatal: ${(err as Error).message}`);
    return jsonResponse(summary, 500);
  }

  console.log(
    `[escalate-drift] Complete: ${summary.checked} checked, ` +
    `${summary.escalated} escalated, ${summary.notifications_created} new notifications, ` +
    `${summary.errors.length} errors`
  );

  return jsonResponse(summary);
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
