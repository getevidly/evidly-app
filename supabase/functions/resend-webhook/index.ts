// resend-webhook — Edge function
// C16a-3: Receives Resend delivery events and updates email tracking
// in both inspection_package_deliveries and compliance_document_send_records.
// Public endpoint — auth via Svix HMAC-SHA256 signature verification.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { PUBLIC_CORS_HEADERS } from '../_shared/cors.ts';

interface ResendEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    bounce_type?: string;
    [key: string]: unknown;
  };
}

// ── Svix signature verification ──────────────────────────────────

async function verifySvixSignature(
  body: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string,
): Promise<boolean> {
  // Replay protection: reject events older than 5 minutes
  const ts = parseInt(svixTimestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return false;
  }

  // Strip whsec_ prefix and base64-decode the secret
  const secretBytes = Uint8Array.from(
    atob(secret.replace('whsec_', '')),
    (c) => c.charCodeAt(0),
  );

  const signedContent = `${svixId}.${svixTimestamp}.${body}`;

  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signedContent),
  );

  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));

  // svix-signature format: "v1,<base64> v1,<base64>"
  const provided = svixSignature.split(' ').map((s) => s.split(',')[1]).filter(Boolean);
  return provided.some((s) => s === computed);
}

// ── Status mapping ────────────────────────────────────────────────

const STATUS_MAP: Record<string, string> = {
  'email.delivered': 'delivered',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.opened': 'opened',
};

// ── Handler ───────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: PUBLIC_CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // ── Signature verification ──────────────────────────────────────
  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return json({ error: 'Missing webhook signature headers' }, 401);
  }

  const rawBody = await req.text();
  const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');

  if (webhookSecret) {
    const valid = await verifySvixSignature(rawBody, svixId, svixTimestamp, svixSignature, webhookSecret);
    if (!valid) {
      console.warn('[resend-webhook] Signature verification failed');
      return json({ error: 'Invalid signature' }, 401);
    }
  } else {
    console.warn('[resend-webhook] RESEND_WEBHOOK_SECRET not configured — skipping signature verification');
  }

  // ── Parse event ─────────────────────────────────────────────────
  let event: ResendEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: 'Invalid JSON' });
  }

  const eventType = event.type;
  const emailId = event.data?.email_id;
  const eventTime = event.created_at;

  console.log(`[resend-webhook] ${eventType} for ${emailId}`);

  if (!emailId) {
    return json({ ok: true, skipped: 'no email_id' });
  }

  const newStatus = STATUS_MAP[eventType];
  if (!newStatus) {
    // Acknowledge unhandled events (email.sent, email.clicked, email.delivery_delayed)
    return json({ ok: true, event: eventType, action: 'logged' });
  }

  // ── DB updates ──────────────────────────────────────────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ── Update inspection_package_deliveries ────────────────────────
  if (newStatus === 'opened') {
    // Read current to preserve first opened_at and increment count
    const { data: ipd } = await supabase
      .from('inspection_package_deliveries')
      .select('opened_at, opened_count')
      .eq('email_message_id', emailId)
      .maybeSingle();

    if (ipd) {
      const update: Record<string, unknown> = {
        delivery_status: 'opened',
        opened_count: (ipd.opened_count || 0) + 1,
      };
      if (!ipd.opened_at) update.opened_at = eventTime;

      const { error } = await supabase
        .from('inspection_package_deliveries')
        .update(update)
        .eq('email_message_id', emailId);

      if (error) console.error('[resend-webhook] IPD opened update error:', error.message);
    }
  } else {
    const update: Record<string, unknown> = { delivery_status: newStatus };
    if (newStatus === 'delivered') update.delivered_at = eventTime;
    if (newStatus === 'bounced') update.failure_reason = event.data.bounce_type || 'bounced';

    const { error } = await supabase
      .from('inspection_package_deliveries')
      .update(update)
      .eq('email_message_id', emailId);

    if (error) console.error('[resend-webhook] IPD update error:', error.message);
  }

  // ── Update compliance_document_send_records ─────────────────────
  const { error: cdsrErr } = await supabase
    .from('compliance_document_send_records')
    .update({ email_status: newStatus })
    .eq('email_message_id', emailId);

  if (cdsrErr) console.error('[resend-webhook] CDSR update error:', cdsrErr.message);

  return json({ ok: true, event: eventType, status: newStatus });
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...PUBLIC_CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
