/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

// ============================================================
// pos-sync-all — Nightly sync orchestrator
// Triggered by pg_cron at 2am. Syncs all active POS connections.
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, ok, err } from '../_shared/posUtils.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find all active POS connections
    // POS integrations have category = 'pos' in the integrations catalog
    const { data: connections } = await supabase
      .from('integration_connections')
      .select('id, integration_id, integrations(slug, category)')
      .eq('status', 'active');

    const posConnections = (connections || []).filter(
      (c: Record<string, unknown>) => {
        const integration = c.integrations as Record<string, string> | null;
        return integration?.category === 'pos';
      }
    );

    const results: { id: string; type: string; locations?: unknown; employees?: unknown }[] = [];

    for (const conn of posConnections) {
      const integration = conn.integrations as Record<string, string>;
      const posType = integration.slug.replace(/-pos$/, '').replace('-ncr', '');

      // Sync locations
      const locResult = await supabase.functions.invoke('pos-sync-locations', {
        body: { connectionId: conn.id, posType }
      });

      // Sync employees
      const empResult = await supabase.functions.invoke('pos-sync-employees', {
        body: { connectionId: conn.id }
      });

      results.push({
        id:        conn.id,
        type:      posType,
        locations: locResult.data,
        employees: empResult.data,
      });
    }

    return ok({ synced: results.length, connections: results });

  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : String(e));
  }
});
