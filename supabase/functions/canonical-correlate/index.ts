import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let correlated = 0;
  let skipped = 0;

  // Get uncorrelated signals
  const { data: signals } = await supabase
    .from('intelligence_signals')
    .select('*')
    .eq('is_correlated', false)
    .limit(100);

  for (const signal of (signals || [])) {
    try {
      const counties = signal.counties_affected || [];
      const normalizedCounties = counties.map((c: string) =>
        c.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      );
      let jurisdictionIds: string[] = [];

      if (normalizedCounties.length > 0) {
        const { data: jurs } = await supabase
          .from('jurisdictions')
          .select('id')
          .in('county', normalizedCounties);
        jurisdictionIds = (jurs || []).map((j: any) => j.id);
      }

      // Look up orgs per jurisdiction for richer correlation
      let orgMap: Record<string, string[]> = {};
      if (jurisdictionIds.length > 0) {
        const { data: locs } = await supabase
          .from('locations')
          .select('organization_id, jurisdiction_id')
          .in('jurisdiction_id', jurisdictionIds);
        for (const loc of (locs || [])) {
          if (!loc.organization_id) continue;
          if (!orgMap[loc.jurisdiction_id]) orgMap[loc.jurisdiction_id] = [];
          if (!orgMap[loc.jurisdiction_id].includes(loc.organization_id)) {
            orgMap[loc.jurisdiction_id].push(loc.organization_id);
          }
        }
      }

      // One row per jurisdiction (with org if matched)
      const allOrgIds = new Set<string>();
      if (jurisdictionIds.length > 0) {
        for (const jId of jurisdictionIds) {
          const orgs = orgMap[jId] || [null];
          for (const orgId of orgs) {
            if (orgId) allOrgIds.add(orgId);
            await supabase.from('entity_correlations').upsert({
              source_type: 'intelligence_signal',
              source_id: signal.id,
              organization_id: orgId,
              jurisdiction_id: jId,
              correlation_type: orgId ? 'org_signal_match' : 'jurisdiction_only',
              correlation_strength: orgId ? 0.9 : 0.4,
              notes: `Type: ${signal.signal_type}`,
            }, { onConflict: 'source_type,source_id,jurisdiction_id' });
          }
        }
      } else {
        // No jurisdiction match — insert unassigned row
        await supabase.from('entity_correlations').upsert({
          source_type: 'intelligence_signal',
          source_id: signal.id,
          organization_id: null,
          jurisdiction_id: null,
          correlation_type: 'unmatched',
          correlation_strength: 0.1,
          notes: `Type: ${signal.signal_type}`,
        }, { onConflict: 'source_type,source_id,jurisdiction_id' });
      }

      await supabase.from('intelligence_signals')
        .update({ is_correlated: true, orgs_affected: allOrgIds.size })
        .eq('id', signal.id);

      correlated++;
    } catch (e) {
      console.error('Correlation error:', signal.id, e);
      skipped++;
    }
  }

  return new Response(
    JSON.stringify({ success: true, correlated, skipped }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
