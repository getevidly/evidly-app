// SUPERPOWERS-APP-01: Daily readiness snapshot edge function
// Scheduled via pg_cron to run daily at 6am UTC
// Queries current compliance state per org/location and inserts a snapshot row

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active org/location pairs
    const { data: locations, error: locError } = await supabase
      .from('locations')
      .select('id, organization_id')
      .eq('is_active', true);

    if (locError) throw locError;
    if (!locations?.length) {
      return new Response(JSON.stringify({ message: 'No active locations' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const snapshots = [];

    for (const loc of locations) {
      // Count open corrective actions
      const { count: openCA } = await supabase
        .from('corrective_actions')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', loc.id)
        .in('status', ['open', 'in_progress']);

      // Count overdue temp checks (last 24 hours with failures)
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const { count: overdueTempChecks } = await supabase
        .from('temperature_logs')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', loc.id)
        .gte('reading_time', yesterday)
        .eq('temp_pass', false);

      // Count expired documents
      const { count: expiredDocs } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', loc.organization_id)
        .lt('expiration_date', today)
        .is('archived_at', null);

      // Simple readiness score: start at 100, deduct for issues
      const caDeduction = Math.min((openCA || 0) * 5, 30);
      const tempDeduction = Math.min((overdueTempChecks || 0) * 3, 20);
      const docDeduction = Math.min((expiredDocs || 0) * 5, 25);
      const overall = Math.max(0, 100 - caDeduction - tempDeduction - docDeduction);

      snapshots.push({
        org_id: loc.organization_id,
        location_id: loc.id,
        snapshot_date: today,
        overall_score: overall,
        open_violations: 0,
        pending_corrective_actions: openCA || 0,
        overdue_temp_checks: overdueTempChecks || 0,
        expired_documents: expiredDocs || 0,
      });
    }

    // Upsert snapshots (skip duplicates for same day)
    const { error: insertError } = await supabase
      .from('readiness_snapshots')
      .upsert(snapshots, { onConflict: 'org_id,location_id,snapshot_date' });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ message: `Snapshotted ${snapshots.length} locations` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
