/**
 * intelligence-deliver — Delivers intelligence to affected clients
 *
 * When an advisory is published, a jurisdiction update is verified+published,
 * or a regulatory update is published, this function:
 * 1. Finds all organizations with locations in the affected jurisdictions
 * 2. Creates client_intelligence_feed entries for each org with full
 *    8-dimensional risk/opportunity data
 * 3. Logs email notification intents
 *
 * Trigger: Called by admin after publishing an advisory, jurisdiction update,
 *          or regulatory update
 * Input: { type: 'advisory' | 'jurisdiction_update' | 'regulatory_update', id: string }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { type, id } = await req.json();

    if (!type || !id) {
      return new Response(
        JSON.stringify({ error: 'Missing type or id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let delivered = 0;
    let emailed = 0;

    // ── ADVISORY DELIVERY ────────────────────────────────────────
    if (type === 'advisory') {
      const { data: advisory } = await supabase
        .from('client_advisories')
        .select('*')
        .eq('id', id)
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

      const feedEntries = Array.from(orgCountyMap.entries()).map(([orgId, county]) => ({
        organization_id: orgId,
        advisory_id: advisory.id,
        signal_id: advisory.signal_id,
        title: advisory.title,
        summary: advisory.summary,
        category: signal?.category || 'food_safety',
        signal_type: signal?.signal_type || signal?.type || 'intelligence_signal',
        source_name: signal?.source_name || signal?.source || null,
        priority: computePriority(riskLevels),
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

      emailed = await logEmailIntents(supabase, orgCountyMap, advisory.id, 'client_intelligence_feed', advisory.title);

    // ── JURISDICTION UPDATE DELIVERY ─────────────────────────────
    } else if (type === 'jurisdiction_update') {
      const { data: update } = await supabase
        .from('jurisdiction_intel_updates')
        .select('*')
        .eq('id', id)
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

      const feedEntries = Array.from(orgCountyMap.entries()).map(([orgId, county]) => ({
        organization_id: orgId,
        title: update.title,
        summary: update.description || update.title,
        category: update.pillar || 'food_safety',
        signal_type: 'jurisdiction_change',
        source_name: update.jurisdiction_name || update.county || null,
        priority: computePriority(riskLevels),
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

      emailed = await logEmailIntents(supabase, orgCountyMap, update.id, 'jurisdiction_intel_updates', update.title);

    // ── REGULATORY UPDATE DELIVERY ───────────────────────────────
    } else if (type === 'regulatory_update') {
      const { data: update } = await supabase
        .from('regulatory_changes')
        .select('*')
        .eq('id', id)
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

      const feedEntries = Array.from(orgCountyMap.entries()).map(([orgId, county]) => ({
        organization_id: orgId,
        title: update.title,
        summary: update.summary || update.title,
        category: 'regulatory',
        signal_type: 'regulatory_change',
        source_name: update.source || update.agency || null,
        priority: impactLevel === 'critical' ? 'critical' : impactLevel === 'high' ? 'high' : 'normal',
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
        .eq('id', id);

      emailed = await logEmailIntents(supabase, orgCountyMap, update.id, 'regulatory_changes', update.title);
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

/** Log email notification intents for all affected orgs */
async function logEmailIntents(
  supabase: any,
  orgCountyMap: Map<string, string | null>,
  entityId: string,
  entityType: string,
  title: string,
): Promise<number> {
  let emailed = 0;
  for (const orgId of orgCountyMap.keys()) {
    const { data: owners } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('organization_id', orgId)
      .in('role', ['owner_operator', 'executive', 'compliance_manager']);

    for (const owner of (owners || [])) {
      if (!owner.email) continue;
      await supabase.from('admin_event_log').insert({
        event_type: 'intelligence_email_sent',
        entity_type: entityType,
        entity_id: entityId,
        description: `"${title}" emailed to ${owner.email}`,
        metadata: { recipient: owner.email, recipient_name: owner.full_name, org_id: orgId },
      });
      emailed++;
    }
  }
  return emailed;
}
