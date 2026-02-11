/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const STALE_THRESHOLD_HOURS = 24;
const ERROR_THRESHOLD = 3;

Deno.serve(async (_req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: integrations } = await supabase
    .from('integrations')
    .select('*')
    .in('status', ['connected', 'error', 'syncing']);

  const results = [];

  for (const integration of integrations || []) {
    const checks: { name: string; status: 'pass' | 'warn' | 'fail'; detail: string }[] = [];

    // Check last sync recency
    if (integration.last_sync_at) {
      const hoursSinceSync = (Date.now() - new Date(integration.last_sync_at).getTime()) / 3600000;
      if (hoursSinceSync > STALE_THRESHOLD_HOURS) {
        checks.push({ name: 'sync_recency', status: 'warn', detail: `Last sync ${Math.round(hoursSinceSync)}h ago` });
      } else {
        checks.push({ name: 'sync_recency', status: 'pass', detail: `Last sync ${Math.round(hoursSinceSync)}h ago` });
      }
    } else {
      checks.push({ name: 'sync_recency', status: 'fail', detail: 'Never synced' });
    }

    // Check last sync status
    if (integration.last_sync_status === 'failed') {
      checks.push({ name: 'last_sync', status: 'fail', detail: integration.error_message || 'Last sync failed' });
    } else if (integration.last_sync_status === 'partial') {
      checks.push({ name: 'last_sync', status: 'warn', detail: 'Last sync partially succeeded' });
    } else {
      checks.push({ name: 'last_sync', status: 'pass', detail: 'Last sync succeeded' });
    }

    // Check recent error count
    const { count: recentErrors } = await supabase
      .from('integration_sync_log')
      .select('*', { count: 'exact', head: true })
      .eq('integration_id', integration.id)
      .eq('status', 'failed')
      .gte('started_at', new Date(Date.now() - 24 * 3600000).toISOString());

    if ((recentErrors || 0) >= ERROR_THRESHOLD) {
      checks.push({ name: 'error_rate', status: 'fail', detail: `${recentErrors} failures in last 24h` });
    } else if ((recentErrors || 0) > 0) {
      checks.push({ name: 'error_rate', status: 'warn', detail: `${recentErrors} failure(s) in last 24h` });
    } else {
      checks.push({ name: 'error_rate', status: 'pass', detail: 'No recent errors' });
    }

    // Check auth validity (token expiration)
    const authData = integration.auth_data as Record<string, unknown>;
    if (authData?.expires_at) {
      const expiresAt = new Date(authData.expires_at as string);
      if (expiresAt < new Date()) {
        checks.push({ name: 'auth_status', status: 'fail', detail: 'Token expired — re-authorization required' });
        await supabase.from('integrations').update({ status: 'error', error_message: 'OAuth token expired' }).eq('id', integration.id);
      } else {
        const hoursLeft = (expiresAt.getTime() - Date.now()) / 3600000;
        checks.push({ name: 'auth_status', status: hoursLeft < 1 ? 'warn' : 'pass', detail: `Token expires in ${Math.round(hoursLeft)}h` });
      }
    }

    const overallStatus = checks.some(c => c.status === 'fail') ? 'unhealthy' : checks.some(c => c.status === 'warn') ? 'degraded' : 'healthy';

    results.push({
      integration_id: integration.id,
      platform_slug: integration.platform_slug,
      overall_status: overallStatus,
      checks,
    });
  }

  return new Response(JSON.stringify({ checked: results.length, results }), { headers: { 'Content-Type': 'application/json' } });
});
