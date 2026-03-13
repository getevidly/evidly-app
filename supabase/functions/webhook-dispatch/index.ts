/**
 * webhook-dispatch — Sends webhook notifications to EvidLY.
 * HoodOps NEVER writes to EvidLY — only notifies. EvidLY pulls full details.
 *
 * Events: service.completed, service.scheduled, service.cancelled,
 *         certificate.issued, deficiency.created, deficiency.resolved
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';

const EVIDLY_WEBHOOK_URL = Deno.env.get('EVIDLY_WEBHOOK_URL');
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || '';

interface WebhookPayload {
  event: string;
  timestamp: string;
  vendor_id: string;
  data: {
    id: string;
    type: string;
    location_id?: string;
    service_date?: string;
    [key: string]: unknown;
  };
}

serve(async (req) => {
  try {
    const { event, data } = await req.json();

    if (!event || !data?.id) {
      return new Response(JSON.stringify({ error: 'Missing event or data.id' }), { status: 400 });
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      vendor_id: data.vendor_id,
      data: {
        id: data.id,
        type: data.type || event.split('.')[0],
        location_id: data.location_id,
        service_date: data.service_date,
      },
    };

    // Sign the payload with HMAC-SHA256
    const signature = createHmac('sha256', WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');

    let responseStatus = 0;
    let errorMessage: string | null = null;

    if (EVIDLY_WEBHOOK_URL) {
      try {
        const response = await fetch(EVIDLY_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-HoodOps-Signature': signature,
            'X-HoodOps-Timestamp': payload.timestamp,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000),
        });
        responseStatus = response.status;
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : 'Fetch failed';
      }
    } else {
      errorMessage = 'EVIDLY_WEBHOOK_URL not configured';
    }

    // Log the webhook attempt
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    await supabase.from('webhook_logs').insert({
      event,
      payload,
      response_status: responseStatus || null,
      error_message: errorMessage,
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: !errorMessage, response_status: responseStatus }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
