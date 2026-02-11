/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const { event_type, data, organization_id } = await req.json();

  // Find all active subscriptions matching this event
  const { data: subs } = await supabase
    .from('api_webhook_subscriptions')
    .select('*, api_applications!inner(organization_id)')
    .eq('status', 'active')
    .contains('events', [event_type]);

  const filtered = (subs || []).filter((s: any) => s.api_applications.organization_id === organization_id);
  const results = [];

  for (const sub of filtered) {
    const payload = JSON.stringify({
      id: `evt_${crypto.randomUUID().slice(0, 12)}`,
      type: event_type,
      created_at: new Date().toISOString(),
      data,
    });

    const signature = await signPayload(payload, sub.secret_hash);
    const start = Date.now();

    try {
      const resp = await fetch(sub.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-EvidLY-Signature': `sha256=${signature}`,
          'X-EvidLY-Event': event_type,
        },
        body: payload,
      });

      const duration = Date.now() - start;
      const success = resp.status >= 200 && resp.status < 300;

      await supabase.from('api_webhook_deliveries').insert({
        subscription_id: sub.id,
        event_type,
        payload: JSON.parse(payload),
        response_code: resp.status,
        duration_ms: duration,
        success,
      });

      if (!success) {
        await supabase.from('api_webhook_subscriptions').update({ failure_count: sub.failure_count + 1 }).eq('id', sub.id);
      } else {
        await supabase.from('api_webhook_subscriptions').update({ last_delivery_at: new Date().toISOString(), failure_count: 0 }).eq('id', sub.id);
      }

      results.push({ subscription_id: sub.id, success, status: resp.status, duration });
    } catch (err) {
      const duration = Date.now() - start;
      await supabase.from('api_webhook_deliveries').insert({
        subscription_id: sub.id, event_type, payload: JSON.parse(payload),
        response_code: 0, duration_ms: duration, success: false,
      });
      results.push({ subscription_id: sub.id, success: false, error: String(err) });
    }
  }

  return new Response(JSON.stringify({ dispatched: results.length, results }), { headers: { 'Content-Type': 'application/json' } });
});
