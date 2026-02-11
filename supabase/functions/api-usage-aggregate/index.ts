/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const { application_id, period_days = 30 } = await req.json();

  const since = new Date(Date.now() - period_days * 86400000).toISOString();

  // Total request count
  const { count: totalRequests } = await supabase
    .from('api_request_log')
    .select('*', { count: 'exact', head: true })
    .eq('application_id', application_id)
    .gte('created_at', since);

  // Error count (4xx + 5xx)
  const { count: errorCount } = await supabase
    .from('api_request_log')
    .select('*', { count: 'exact', head: true })
    .eq('application_id', application_id)
    .gte('created_at', since)
    .gte('status_code', 400);

  // Average response time
  const { data: avgData } = await supabase.rpc('avg_response_ms', { app_id: application_id, since_date: since }).maybeSingle();

  // Top endpoints
  const { data: topEndpoints } = await supabase
    .from('api_request_log')
    .select('method, path')
    .eq('application_id', application_id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1000);

  const endpointCounts: Record<string, number> = {};
  for (const row of topEndpoints || []) {
    const key = `${row.method} ${row.path}`;
    endpointCounts[key] = (endpointCounts[key] || 0) + 1;
  }
  const sorted = Object.entries(endpointCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([endpoint, count]) => ({ endpoint, count }));

  // Webhook deliveries
  const { count: webhookCount } = await supabase
    .from('api_webhook_deliveries')
    .select('*, api_webhook_subscriptions!inner(application_id)', { count: 'exact', head: true })
    .eq('api_webhook_subscriptions.application_id', application_id)
    .gte('created_at', since);

  const total = totalRequests || 0;
  const errors = errorCount || 0;

  return new Response(JSON.stringify({
    period: `Last ${period_days} days`,
    request_count: total,
    webhook_deliveries: webhookCount || 0,
    error_rate: total > 0 ? +((errors / total) * 100).toFixed(2) : 0,
    avg_response_ms: avgData?.avg_ms || 0,
    top_endpoints: sorted,
  }), { headers: { 'Content-Type': 'application/json' } });
});
