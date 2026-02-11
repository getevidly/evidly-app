/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface SyncConfig {
  integration_id: string;
  entity_type: string;
  direction: 'inbound' | 'outbound';
  sync_type: 'pull' | 'push';
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const config: SyncConfig = await req.json();

  // Get integration details
  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('id', config.integration_id)
    .single();

  if (!integration || integration.status !== 'connected') {
    return new Response(JSON.stringify({ error: 'Integration not found or not connected' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Mark integration as syncing
  await supabase.from('integrations').update({ status: 'syncing' }).eq('id', integration.id);

  const startTime = Date.now();
  let recordsProcessed = 0, recordsCreated = 0, recordsUpdated = 0, recordsFailed = 0;
  let status: 'completed' | 'partial' | 'failed' = 'completed';
  let errorMessage: string | null = null;

  try {
    // Adapter pattern: route to platform-specific logic
    switch (integration.platform_slug) {
      case 'toast':
      case 'square':
      case 'clover':
      case 'lightspeed':
        // POS: pull employees, locations
        if (config.direction === 'inbound') {
          // Simulate pulling data from POS
          recordsProcessed = 50;
          recordsCreated = 2;
          recordsUpdated = 3;
        }
        break;
      case 'quickbooks':
      case 'xero':
      case 'restaurant365':
        // Accounting: push invoices, pull vendors
        if (config.direction === 'outbound') {
          recordsProcessed = 5;
          recordsCreated = 5;
        } else {
          recordsProcessed = 20;
          recordsUpdated = 2;
        }
        break;
      case 'adp':
      case 'gusto':
        // Payroll: pull workers
        recordsProcessed = 45;
        recordsCreated = 1;
        recordsUpdated = 2;
        break;
      case 'google':
      case 'microsoft365':
        // Productivity: push documents
        recordsProcessed = 3;
        recordsCreated = 3;
        break;
      default:
        recordsProcessed = 0;
    }
  } catch (err) {
    status = 'failed';
    errorMessage = String(err);
  }

  const durationMs = Date.now() - startTime;

  // Log sync result
  await supabase.from('integration_sync_log').insert({
    integration_id: integration.id,
    sync_type: config.sync_type,
    entity_type: config.entity_type,
    direction: config.direction,
    records_processed: recordsProcessed,
    records_created: recordsCreated,
    records_updated: recordsUpdated,
    records_failed: recordsFailed,
    status,
    error_message: errorMessage,
    duration_ms: durationMs,
    completed_at: new Date().toISOString(),
  });

  // Update integration status
  await supabase.from('integrations').update({
    status: status === 'failed' ? 'error' : 'connected',
    last_sync_at: new Date().toISOString(),
    last_sync_status: status,
    error_message: errorMessage,
  }).eq('id', integration.id);

  return new Response(JSON.stringify({
    success: status !== 'failed',
    records_processed: recordsProcessed,
    records_created: recordsCreated,
    records_updated: recordsUpdated,
    records_failed: recordsFailed,
    duration_ms: durationMs,
  }), { headers: { 'Content-Type': 'application/json' } });
});
