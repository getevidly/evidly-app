/**
 * intelligence-deliver — Delivers intelligence to affected clients
 *
 * When an advisory is published, a jurisdiction update is verified+published,
 * or a regulatory update is published, this function:
 * 1. Finds all organizations with locations in the affected jurisdictions
 * 2. Creates client_intelligence_feed entries for each org with full
 *    8-dimensional risk/opportunity data
 * 3. Sends email notifications for critical/high priority signals
 *
 * INTELLIGENCE-PIPELINE-ALIGN-01: Now sends actual email via Resend API
 * for critical/high priority signals. Medium/low = in-app feed only.
 *
 * Trigger: Called by admin after publishing an advisory, jurisdiction update,
 *          or regulatory update
 * Input: { type: 'advisory' | 'jurisdiction_update' | 'regulatory_update', id: string }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail, buildEmailHtml } from '../_shared/email.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RISK_ORDER = ['critical', 'high', 'moderate', 'medium', 'low', 'none'];

function computePriority(levels: string[]): string {
  if (levels.includes('critical')) return 'critical';
  if (levels.includes('high')) return 'high';
  if (levels.includes('moderate')) return 'normal';
  return 'low';
}

function buildRelevanceReason(
  county: string | null,
  signalType: string,
  title: string,
): string {
  const typeLabel = signalType === 'advisory' ? 'intelligence advisory'
    : signalType === 'jurisdiction' ? 'jurisdiction update'
    : 'regulatory update';
  if (county) {
    return `Your location in ${county} County is directly affected by this ${typeLabel}.`;
  }
  return `This statewide ${typeLabel} affects all California commercial kitchens.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const body = await req.json();
    const { type, id, signal_id, manual_retry } = body;

    // Support both { type, id } and { signal_id, manual_retry } for re-delivery
    const effectiveType = type || (signal_id ? 'signal' : null);
    const effectiveId = id || signal_id;

    if (!effectiveType || !effectiveId) {
      return new Response(
        JSON.stringify({ error: 'Missing type or id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let delivered = 0;
    let emailed = 0;

    // ── ADVISORY DELIVERY ────────────────────────────────────────
    if (effectiveType === 'advisory') {
      const { data: advisory } = await supabase
        .from('client_advisories')
        .select('*')
        .eq('id', effectiveId)
        .single();

      if (!advisory) {
        return new Response(
          JSON.stringify({ error: 'Advisory not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Fetch the full signal to get rich risk/opportunity data
      let signal: any = null;
      if (advisory.signal_id) {
        const { data } = await supabase
          .from('intelligence_signals')
          .select('*')
          .eq('id', advisory.signal_id)
          .single();
        signal = data;
      }

      // Find affected orgs via correlations
      const orgCountyMap = new Map<string, string | null>();

      const { data: correlations } = await supabase
        .from('intelligence_correlations')
        .select('*')
        .eq('signal_id', advisory.signal_id);

      if (correlations && correlations.length > 0) {
        const jurisdictionKeys = correlations
          .map((c: any) => c.jurisdiction_key)
          .filter(Boolean);

        if (jurisdictionKeys.length > 0) {
          const { data: locs } = await supabase
            .from('locations')
            .select('organization_id, county')
            .in('jurisdiction_id', jurisdictionKeys);
          (locs || []).forEach((l: any) => {
            if (l.organization_id) orgCountyMap.set(l.organization_id, l.county || null);
          });
        }
      }

      // Fallback: all active orgs
      if (orgCountyMap.size === 0) {
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id')
          .eq('status', 'active');
        (orgs || []).forEach((o: any) => orgCountyMap.set(o.id, null));
      }

      // Build feed entries with full dimensional data
      const riskLevels = [
        signal?.risk_revenue || 'none',
        signal?.risk_liability || 'none',
        signal?.risk_cost || 'none',
        signal?.risk_operational || 'none',
      ];

      const priority = computePriority(riskLevels);

      const feedEntries = Array.from(orgCountyMap.entries()).map(([orgId, county]) => ({
        organization_id: orgId,
        advisory_id: advisory.id,
        signal_id: advisory.signal_id,
        title: advisory.title,
        summary: advisory.summary,
        category: signal?.category || 'food_safety',
        signal_type: signal?.signal_type || signal?.type || 'intelligence_signal',
        source_name: signal?.source_name || signal?.source || null,
        priority,
        feed_type: 'advisory',
        // 4 risk dimensions
        revenue_risk_level: signal?.risk_revenue || 'none',
        revenue_risk_note: signal?.revenue_risk_note || null,
        liability_risk_level: signal?.risk_liability || 'none',
        liability_risk_note: signal?.liability_risk_note || null,
        cost_risk_level: signal?.risk_cost || 'none',
        cost_risk_note: signal?.cost_risk_note || null,
        operational_risk_level: signal?.risk_operational || 'none',
        operational_risk_note: signal?.operational_risk_note || null,
        // 4 opportunity dimensions
        opp_revenue_level: signal?.opp_revenue || 'none',
        opp_revenue_note: signal?.opp_revenue_note || null,
        opp_liability_level: signal?.opp_liability || 'none',
        opp_liability_note: signal?.opp_liability_note || null,
        opp_cost_level: signal?.opp_cost || 'none',
        opp_cost_note: signal?.opp_cost_note || null,
        opp_operational_level: signal?.opp_operational || 'none',
        opp_operational_note: signal?.opp_operational_note || null,
        // Action
        recommended_action: signal?.recommended_action || null,
        action_deadline: signal?.action_deadline || null,
        // Relevance
        relevance_reason: buildRelevanceReason(county, 'advisory', advisory.title),
        // Legacy compat
        dimension: advisory.dimension || 'operational',
        risk_level: advisory.risk_level || 'medium',
        recommended_actions: advisory.recommended_actions || [],
        delivered_via: ['in_app'],
        delivered_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        is_read: false,
        is_actioned: false,
        is_dismissed: false,
      }));

      if (feedEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('client_intelligence_feed')
          .insert(feedEntries);
        if (!insertError) delivered = feedEntries.length;
      }

      emailed = await sendEmailNotifications(
        supabase, orgCountyMap, advisory.id, 'client_intelligence_feed',
        advisory.title, advisory.summary, priority, signal?.recommended_action || null,
      );

      // AUDIT-FIX-05 / P-1: Update delivery status on the source signal
      if (advisory.signal_id) {
        await supabase.from('intelligence_signals').update({
          delivery_status: delivered > 0 ? 'delivered' : 'failed',
          delivered_at: delivered > 0 ? new Date().toISOString() : null,
          delivery_error: delivered === 0 ? 'No feed entries created' : null,
          delivery_attempt_count: supabase.rpc ? 1 : 1,
        }).eq('id', advisory.signal_id);
      }

    // ── JURISDICTION UPDATE DELIVERY ─────────────────────────────
    } else if (effectiveType === 'jurisdiction_update') {
      const { data: update } = await supabase
        .from('jurisdiction_intel_updates')
        .select('*')
        .eq('id', effectiveId)
        .single();

      if (!update) {
        return new Response(
          JSON.stringify({ error: 'Jurisdiction update not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Find orgs by county + jurisdiction_key
      const orgCountyMap = new Map<string, string | null>();

      if (update.county) {
        const { data: locs } = await supabase
          .from('locations')
          .select('organization_id, county')
          .eq('county', update.county);
        (locs || []).forEach((l: any) => {
          if (l.organization_id) orgCountyMap.set(l.organization_id, l.county || null);
        });
      }
      if (update.jurisdiction_key) {
        const { data: locs } = await supabase
          .from('locations')
          .select('organization_id, county')
          .eq('jurisdiction_id', update.jurisdiction_key);
        (locs || []).forEach((l: any) => {
          if (l.organization_id) orgCountyMap.set(l.organization_id, l.county || null);
        });
      }

      const riskLevels = [
        update.risk_revenue || 'none',
        update.risk_liability || 'none',
        update.risk_cost || 'none',
        update.risk_operational || 'none',
      ];

      const priority = computePriority(riskLevels);

      const feedEntries = Array.from(orgCountyMap.entries()).map(([orgId, county]) => ({
        organization_id: orgId,
        title: update.title,
        summary: update.description || update.title,
        category: update.pillar || 'food_safety',
        signal_type: 'jurisdiction_change',
        source_name: update.jurisdiction_name || update.county || null,
        priority,
        feed_type: 'jurisdiction',
        // 4 risk dimensions
        revenue_risk_level: update.risk_revenue || 'none',
        revenue_risk_note: update.revenue_risk_note || null,
        liability_risk_level: update.risk_liability || 'none',
        liability_risk_note: update.liability_risk_note || null,
        cost_risk_level: update.risk_cost || 'none',
        cost_risk_note: update.cost_risk_note || null,
        operational_risk_level: update.risk_operational || 'none',
        operational_risk_note: update.operational_risk_note || null,
        // 4 opportunity dimensions
        opp_revenue_level: update.opp_revenue || 'none',
        opp_revenue_note: update.opp_revenue_note || null,
        opp_liability_level: update.opp_liability || 'none',
        opp_liability_note: update.opp_liability_note || null,
        opp_cost_level: update.opp_cost || 'none',
        opp_cost_note: update.opp_cost_note || null,
        opp_operational_level: update.opp_operational || 'none',
        opp_operational_note: update.opp_operational_note || null,
        // Action
        recommended_action: update.recommended_action || null,
        action_deadline: update.action_deadline || null,
        // Relevance
        relevance_reason: buildRelevanceReason(county, 'jurisdiction', update.title),
        // Legacy compat
        dimension: (() => {
          const risks = { revenue: update.risk_revenue || 'none', liability: update.risk_liability || 'none', cost: update.risk_cost || 'none', operational: update.risk_operational || 'none' };
          return (Object.entries(risks) as [string, string][])
            .sort((a, b) => RISK_ORDER.indexOf(a[1]) - RISK_ORDER.indexOf(b[1]))[0][0];
        })(),
        risk_level: (() => {
          const highest = riskLevels.sort((a, b) => RISK_ORDER.indexOf(a) - RISK_ORDER.indexOf(b))[0];
          return highest === 'moderate' ? 'medium' : highest;
        })(),
        recommended_actions: [],
        delivered_via: ['in_app'],
        delivered_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        is_read: false,
        is_actioned: false,
        is_dismissed: false,
      }));

      if (feedEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('client_intelligence_feed')
          .insert(feedEntries);
        if (!insertError) delivered = feedEntries.length;
      }

      emailed = await sendEmailNotifications(
        supabase, orgCountyMap, update.id, 'jurisdiction_intel_updates',
        update.title, update.description || update.title, priority, update.recommended_action || null,
      );

    // ── REGULATORY UPDATE DELIVERY ───────────────────────────────
    } else if (effectiveType === 'regulatory_update') {
      const { data: update } = await supabase
        .from('regulatory_changes')
        .select('*')
        .eq('id', effectiveId)
        .single();

      if (!update) {
        return new Response(
          JSON.stringify({ error: 'Regulatory update not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Find orgs by affected states (default: all CA orgs)
      const orgCountyMap = new Map<string, string | null>();
      const affectedStates = update.affected_states || ['CA'];

      const { data: locs } = await supabase
        .from('locations')
        .select('organization_id, county, state')
        .in('state', affectedStates);
      (locs || []).forEach((l: any) => {
        if (l.organization_id) orgCountyMap.set(l.organization_id, l.county || null);
      });

      // If no state-based matches, deliver to all active orgs
      if (orgCountyMap.size === 0) {
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id')
          .eq('status', 'active');
        (orgs || []).forEach((o: any) => orgCountyMap.set(o.id, null));
      }

      const impactLevel = update.impact_level || 'moderate';
      const priority = impactLevel === 'critical' ? 'critical' : impactLevel === 'high' ? 'high' : 'normal';

      const feedEntries = Array.from(orgCountyMap.entries()).map(([orgId, county]) => ({
        organization_id: orgId,
        title: update.title,
        summary: update.summary || update.title,
        category: 'regulatory',
        signal_type: 'regulatory_change',
        source_name: update.source || update.agency || null,
        priority,
        feed_type: 'regulatory',
        // 4 risk dimensions from regulatory analysis
        revenue_risk_level: update.risk_revenue || (impactLevel === 'critical' ? 'high' : 'moderate'),
        revenue_risk_note: null,
        liability_risk_level: update.risk_liability || (impactLevel === 'critical' ? 'critical' : 'high'),
        liability_risk_note: null,
        cost_risk_level: update.risk_cost || 'low',
        cost_risk_note: null,
        operational_risk_level: update.risk_operational || 'moderate',
        operational_risk_note: null,
        // Opportunities
        opp_revenue_level: 'none',
        opp_revenue_note: null,
        opp_liability_level: 'moderate',
        opp_liability_note: 'Early compliance reduces regulatory risk',
        opp_cost_level: 'none',
        opp_cost_note: null,
        opp_operational_level: 'none',
        opp_operational_note: null,
        // Action
        recommended_action: update.recommended_action || `Review ${update.title} and update procedures before ${update.effective_date || 'deadline'}.`,
        action_deadline: update.effective_date || null,
        // Relevance
        relevance_reason: buildRelevanceReason(county, 'regulatory', update.title),
        // Legacy compat
        dimension: 'liability',
        risk_level: impactLevel === 'moderate' ? 'medium' : impactLevel,
        recommended_actions: [],
        delivered_via: ['in_app'],
        delivered_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        is_read: false,
        is_actioned: false,
        is_dismissed: false,
      }));

      if (feedEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('client_intelligence_feed')
          .insert(feedEntries);
        if (!insertError) delivered = feedEntries.length;
      }

      // Mark as published
      await supabase.from('regulatory_changes')
        .update({ published: true, published_at: new Date().toISOString() })
        .eq('id', effectiveId);

      emailed = await sendEmailNotifications(
        supabase, orgCountyMap, update.id, 'regulatory_changes',
        update.title, update.summary || update.title, priority,
        update.recommended_action || `Review ${update.title} and update procedures before ${update.effective_date || 'deadline'}.`,
      );

    // ── DIRECT SIGNAL DELIVERY (publish flow + manual re-deliver) ─────
    } else if (effectiveType === 'signal') {
      const { data: signal } = await supabase
        .from('intelligence_signals')
        .select('*')
        .eq('id', effectiveId)
        .single();

      if (!signal) {
        return new Response(
          JSON.stringify({ error: 'Signal not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Increment attempt count
      const attemptCount = (signal.delivery_attempt_count || 0) + 1;

      try {
        // Find affected orgs via correlations
        const orgCountyMap = new Map<string, string | null>();

        const { data: correlations } = await supabase
          .from('intelligence_correlations')
          .select('*')
          .eq('signal_id', effectiveId);

        if (correlations && correlations.length > 0) {
          const jurisdictionKeys = correlations.map((c: any) => c.jurisdiction_key).filter(Boolean);
          if (jurisdictionKeys.length > 0) {
            const { data: locs } = await supabase
              .from('locations')
              .select('organization_id, county')
              .in('jurisdiction_id', jurisdictionKeys);
            (locs || []).forEach((l: any) => {
              if (l.organization_id) orgCountyMap.set(l.organization_id, l.county || null);
            });
          }
        }

        // Fallback: if signal has org_id, deliver to that org
        if (orgCountyMap.size === 0 && signal.org_id) {
          orgCountyMap.set(signal.org_id, null);
        }

        // Fallback: all active orgs
        if (orgCountyMap.size === 0) {
          const { data: orgs } = await supabase
            .from('organizations')
            .select('id')
            .eq('status', 'active');
          (orgs || []).forEach((o: any) => orgCountyMap.set(o.id, null));
        }

        const riskLevels = [
          signal.risk_revenue || signal.revenue_risk_level || 'none',
          signal.risk_liability || signal.liability_risk_level || 'none',
          signal.risk_cost || signal.cost_risk_level || 'none',
          signal.risk_operational || signal.operational_risk_level || 'none',
        ];
        const priority = computePriority(riskLevels);

        const feedEntries = Array.from(orgCountyMap.entries()).map(([orgId, county]) => ({
          organization_id: orgId,
          signal_id: signal.id,
          title: signal.title,
          summary: signal.content_summary || signal.title,
          category: signal.category || 'food_safety',
          signal_type: signal.signal_type || 'intelligence_signal',
          source_name: signal.source_name || signal.source_key || null,
          priority,
          feed_type: 'signal',
          revenue_risk_level: signal.revenue_risk_level || 'none',
          revenue_risk_note: signal.revenue_risk_note || null,
          liability_risk_level: signal.liability_risk_level || 'none',
          liability_risk_note: signal.liability_risk_note || null,
          cost_risk_level: signal.cost_risk_level || 'none',
          cost_risk_note: signal.cost_risk_note || null,
          operational_risk_level: signal.operational_risk_level || 'none',
          operational_risk_note: signal.operational_risk_note || null,
          opp_revenue_level: 'none', opp_revenue_note: null,
          opp_liability_level: 'none', opp_liability_note: null,
          opp_cost_level: 'none', opp_cost_note: null,
          opp_operational_level: 'none', opp_operational_note: null,
          recommended_action: signal.recommended_action || null,
          action_deadline: null,
          relevance_reason: buildRelevanceReason(county, 'advisory', signal.title),
          dimension: 'operational',
          risk_level: priority === 'normal' ? 'medium' : priority,
          recommended_actions: [],
          delivered_via: ['in_app'],
          delivered_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
          is_read: false,
          is_actioned: false,
          is_dismissed: false,
        }));

        if (feedEntries.length > 0) {
          const { error: insertError } = await supabase
            .from('client_intelligence_feed')
            .insert(feedEntries);
          if (!insertError) delivered = feedEntries.length;
        }

        emailed = await sendEmailNotifications(
          supabase, orgCountyMap, signal.id, 'intelligence_signals',
          signal.title, signal.content_summary || signal.title,
          priority, signal.recommended_action || null,
        );

        // AUDIT-FIX-05 / P-1: Mark delivery success
        await supabase.from('intelligence_signals').update({
          delivery_status: delivered > 0 ? 'delivered' : 'failed',
          delivered_at: delivered > 0 ? new Date().toISOString() : null,
          delivery_error: delivered === 0 ? 'No feed entries created' : null,
          delivery_attempt_count: attemptCount,
        }).eq('id', effectiveId);

      } catch (deliveryErr) {
        // AUDIT-FIX-05 / P-1: Mark delivery failure
        await supabase.from('intelligence_signals').update({
          delivery_status: 'failed',
          delivery_error: String(deliveryErr),
          delivery_attempt_count: attemptCount,
        }).eq('id', effectiveId);
        console.error('[intelligence-deliver] Signal delivery failed:', deliveryErr);
      }

    } else {
      return new Response(
        JSON.stringify({ error: `Unknown type: ${effectiveType}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, delivered, emailed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('intelligence-deliver error:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

/**
 * Send email notifications for critical/high priority signals.
 * Medium/low priority = in-app feed entry only, no email.
 * Never throws — logs errors and continues.
 */
async function sendEmailNotifications(
  supabase: any,
  orgCountyMap: Map<string, string | null>,
  entityId: string,
  entityType: string,
  title: string,
  summary: string,
  priority: string,
  recommendedAction: string | null,
): Promise<number> {
  // Only send email for critical or high priority
  if (priority !== 'critical' && priority !== 'high') {
    return 0;
  }

  let emailed = 0;

  for (const orgId of orgCountyMap.keys()) {
    try {
      // Get org users with notification-eligible roles
      const { data: users } = await supabase
        .from('user_profiles')
        .select('id, full_name, role')
        .eq('organization_id', orgId)
        .in('role', ['owner_operator', 'executive', 'compliance_manager']);

      for (const user of (users || [])) {
        try {
          // Get email from auth.users (user_profiles has no email column)
          const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
          const email = authUser?.user?.email;
          if (!email) continue;

          // Build branded email
          const urgencyBanner = priority === 'critical'
            ? { text: 'CRITICAL INTELLIGENCE ALERT', color: '#DC2626' }
            : { text: 'HIGH PRIORITY INTELLIGENCE', color: '#D97706' };

          const actionBlock = recommendedAction
            ? `<div style="background: #FEF3C7; border-left: 4px solid #D97706; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                <p style="margin: 0; font-weight: 600; font-size: 13px; color: #92400E;">Recommended Action</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #78350F;">${recommendedAction}</p>
              </div>`
            : '';

          const html = buildEmailHtml({
            recipientName: user.full_name || 'there',
            bodyHtml: `
              <h2 style="color: #1E2D4D; margin: 0 0 12px 0; font-size: 20px;">${title}</h2>
              <p style="color: #3D5068; font-size: 14px; line-height: 1.6;">${summary}</p>
              ${actionBlock}
            `,
            ctaText: 'View in EvidLY',
            ctaUrl: 'https://www.getevidly.com/insights/intelligence',
            urgencyBanner,
          });

          const result = await sendEmail({
            to: email,
            subject: `New Intelligence Alert: ${title}`,
            html,
          });

          // Log to admin_event_log (audit trail)
          await supabase.from('admin_event_log').insert({
            event_type: 'intelligence_email_sent',
            entity_type: entityType,
            entity_id: entityId,
            description: result
              ? `"${title}" emailed to ${email}`
              : `"${title}" email FAILED to ${email}`,
            metadata: {
              recipient: email,
              recipient_name: user.full_name,
              org_id: orgId,
              resend_id: result?.id || null,
              priority,
            },
          });

          if (result) emailed++;
        } catch (userErr) {
          console.error(`[intelligence-deliver] Email error for user ${user.id}:`, userErr);
        }
      }

      // Update feed entries with notification status
      await supabase
        .from('client_intelligence_feed')
        .update({
          notification_sent: true,
          notification_sent_at: new Date().toISOString(),
          notification_channel: 'email',
        })
        .eq('organization_id', orgId)
        .eq(entityType === 'client_intelligence_feed' ? 'advisory_id' : 'title', entityType === 'client_intelligence_feed' ? entityId : title);

    } catch (orgErr) {
      console.error(`[intelligence-deliver] Email error for org ${orgId}:`, orgErr);
    }
  }

  return emailed;
}
