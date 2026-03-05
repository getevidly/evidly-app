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
      let jurisdictionIds: string[] = [];

      if (counties.length > 0) {
        const { data: jurs } = await supabase
          .from('jurisdictions')
          .select('id')
          .in('county', counties);
        jurisdictionIds = (jurs || []).map((j: any) => j.id);
      }

      let orgIds: string[] = [];
      if (jurisdictionIds.length > 0) {
        const { data: locs } = await supabase
          .from('locations')
          .select('organization_id')
          .in('jurisdiction_id', jurisdictionIds);
        orgIds = [...new Set((locs || []).map((l: any) => l.organization_id).filter(Boolean))];
      }

      for (const orgId of (orgIds.length > 0 ? orgIds : [null])) {
        const jurisdiction_id = jurisdictionIds[0] || null;
        await supabase.from('entity_correlations').upsert({
          source_type: 'intelligence_signal',
          source_id: signal.id,
          organization_id: orgId,
          jurisdiction_id,
          correlation_type: orgId ? 'org_signal_match' : 'jurisdiction_only',
          correlation_strength: orgId ? 0.9 : 0.4,
          notes: `Type: ${signal.signal_type}`,
        }, { onConflict: 'source_type,source_id' });
      }

      await supabase.from('intelligence_signals')
        .update({ is_correlated: true, orgs_affected: orgIds.length })
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
