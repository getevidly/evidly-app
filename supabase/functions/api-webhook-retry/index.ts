/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MAX_RETRIES = 5;
const BACKOFF_BASE_MS = 30000; // 30s, 60s, 120s, 240s, 480s

Deno.serve(async (_req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);

  // Find failed deliveries that need retry
  const { data: failedDeliveries } = await supabase
    .from('api_webhook_deliveries')
    .select('*, api_webhook_subscriptions(url, secret_hash, status)')
    .eq('success', false)
    .lt('attempt_number', MAX_RETRIES)
    .lte('next_retry_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(50);

  const results = [];

  for (const delivery of failedDeliveries || []) {
    const sub = delivery.api_webhook_subscriptions;
    if (sub.status !== 'active') continue;

    const payload = JSON.stringify(delivery.payload);
    const start = Date.now();

    try {
      const resp = await fetch(sub.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-EvidLY-Event': delivery.event_type, 'X-EvidLY-Retry': String(delivery.attempt_number) },
        body: payload,
      });

      const duration = Date.now() - start;
      const success = resp.status >= 200 && resp.status < 300;
      const nextAttempt = delivery.attempt_number + 1;
      const nextRetry = success ? null : new Date(Date.now() + BACKOFF_BASE_MS * Math.pow(2, nextAttempt - 1)).toISOString();

      await supabase.from('api_webhook_deliveries').update({
        response_code: resp.status, duration_ms: duration, success,
        attempt_number: nextAttempt, next_retry_at: nextRetry,
      }).eq('id', delivery.id);

      // Disable subscription after MAX_RETRIES consecutive failures
      if (!success && nextAttempt >= MAX_RETRIES) {
        await supabase.from('api_webhook_subscriptions').update({ status: 'disabled' }).eq('id', delivery.subscription_id);
      }

      results.push({ delivery_id: delivery.id, success, attempt: nextAttempt });
    } catch (err) {
      results.push({ delivery_id: delivery.id, success: false, error: String(err) });
    }
  }

  return new Response(JSON.stringify({ retried: results.length, results }), { headers: { 'Content-Type': 'application/json' } });
});
