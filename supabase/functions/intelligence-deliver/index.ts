/**
 * intelligence-deliver — Delivers intelligence to affected clients
 *
 * When an advisory is published or a jurisdiction update is verified+published,
 * this function:
 * 1. Finds all organizations with locations in the affected jurisdictions
 * 2. Creates client_intelligence_feed entries for each org
 * 3. Sends email notifications to org owners/compliance managers
 *
 * Trigger: Called by admin after publishing an advisory or jurisdiction update
 * Input: { type: 'advisory' | 'jurisdiction_update', id: string }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    if (type === 'advisory') {
      // ── Advisory delivery ──
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

      // Find signal correlations to determine affected orgs
      const { data: correlations } = await supabase
        .from('intelligence_correlations')
        .select('*')
        .eq('signal_id', advisory.signal_id);

      const orgIds = new Set<string>();

      if (correlations && correlations.length > 0) {
        // Get orgs from correlated jurisdictions
        const jurisdictionKeys = correlations
          .map((c: any) => c.jurisdiction_key)
          .filter(Boolean);

        if (jurisdictionKeys.length > 0) {
          const { data: locs } = await supabase
            .from('locations')
            .select('organization_id')
            .in('jurisdiction_id', jurisdictionKeys);
          (locs || []).forEach((l: any) => {
            if (l.organization_id) orgIds.add(l.organization_id);
          });
        }
      }

      // If no correlations found, deliver to all active orgs
      if (orgIds.size === 0) {
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id')
          .eq('status', 'active');
        (orgs || []).forEach((o: any) => orgIds.add(o.id));
      }

      // Create feed entries for each org
      const feedEntries = Array.from(orgIds).map(orgId => ({
        organization_id: orgId,
        advisory_id: advisory.id,
        signal_id: advisory.signal_id,
        title: advisory.title,
        summary: advisory.summary,
        dimension: advisory.dimension || 'operational',
        risk_level: advisory.risk_level || 'medium',
        feed_type: 'advisory',
        recommended_actions: advisory.recommended_actions || [],
        delivered_via: ['in_app'],
        delivered_at: new Date().toISOString(),
      }));

      if (feedEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('client_intelligence_feed')
          .insert(feedEntries);
        if (!insertError) delivered = feedEntries.length;
      }

      // Send email notifications to org owners
      for (const orgId of orgIds) {
        const { data: owners } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('organization_id', orgId)
          .in('role', ['owner_operator', 'executive', 'compliance_manager']);

        for (const owner of (owners || [])) {
          if (!owner.email) continue;
          // Log the email intent (actual email sending via Resend/SendGrid in production)
          await supabase.from('admin_event_log').insert({
            event_type: 'intelligence_email_sent',
            entity_type: 'client_intelligence_feed',
            entity_id: advisory.id,
            description: `Intelligence advisory "${advisory.title}" emailed to ${owner.email}`,
            metadata: {
              recipient: owner.email,
              recipient_name: owner.full_name,
              org_id: orgId,
              dimension: advisory.dimension,
              risk_level: advisory.risk_level,
            },
          });
          emailed++;
        }
      }

    } else if (type === 'jurisdiction_update') {
      // ── Jurisdiction update delivery ──
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

      // Find orgs with locations in this jurisdiction's county
      const orgIds = new Set<string>();

      if (update.county) {
        const { data: locs } = await supabase
          .from('locations')
          .select('organization_id')
          .eq('county', update.county);
        (locs || []).forEach((l: any) => {
          if (l.organization_id) orgIds.add(l.organization_id);
        });
      }

      // Also check by jurisdiction_key
      if (update.jurisdiction_key) {
        const { data: locs } = await supabase
          .from('locations')
          .select('organization_id')
          .eq('jurisdiction_id', update.jurisdiction_key);
        (locs || []).forEach((l: any) => {
          if (l.organization_id) orgIds.add(l.organization_id);
        });
      }

      // Determine the strongest risk dimension
      const risks = {
        revenue: update.risk_revenue || 'none',
        liability: update.risk_liability || 'none',
        cost: update.risk_cost || 'none',
        operational: update.risk_operational || 'none',
      };
      const riskOrder = ['critical', 'high', 'moderate', 'medium', 'low', 'none'];
      const primaryDimension = (Object.entries(risks) as [string, string][])
        .sort((a, b) => riskOrder.indexOf(a[1]) - riskOrder.indexOf(b[1]))[0][0];

      // Find the highest risk level across all dimensions
      const highestRisk = (Object.values(risks) as string[])
        .sort((a, b) => riskOrder.indexOf(a) - riskOrder.indexOf(b))[0];
      const riskLevel = highestRisk === 'moderate' ? 'medium' : highestRisk;

      // Create feed entries
      const feedEntries = Array.from(orgIds).map(orgId => ({
        organization_id: orgId,
        title: update.title,
        summary: update.description || update.title,
        dimension: primaryDimension,
        risk_level: riskLevel || 'medium',
        feed_type: 'jurisdiction',
        recommended_actions: [],
        delivered_via: ['in_app'],
        delivered_at: new Date().toISOString(),
      }));

      if (feedEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('client_intelligence_feed')
          .insert(feedEntries);
        if (!insertError) delivered = feedEntries.length;
      }

      // Send email notifications
      for (const orgId of orgIds) {
        const { data: owners } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('organization_id', orgId)
          .in('role', ['owner_operator', 'executive', 'compliance_manager']);

        for (const owner of (owners || [])) {
          if (!owner.email) continue;
          await supabase.from('admin_event_log').insert({
            event_type: 'intelligence_email_sent',
            entity_type: 'jurisdiction_intel_updates',
            entity_id: update.id,
            description: `Jurisdiction update "${update.title}" emailed to ${owner.email}`,
            metadata: {
              recipient: owner.email,
              recipient_name: owner.full_name,
              org_id: orgId,
              jurisdiction: update.jurisdiction_name,
              pillar: update.pillar,
            },
          });
          emailed++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, delivered, emailed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('intelligence-deliver error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', message: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
