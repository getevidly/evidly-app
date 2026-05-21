// send-portal-link — Edge function
// C16a-2: Sends the portal link email to the recipient after SendToThirdPartyModal
// creates the compliance_document_send_records row.
// Auth required — validates user belongs to the send record's org.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { sendEmail, buildEmailHtml } from '../_shared/email.ts';

const PORTAL_BASE = 'https://app.getevidly.com/portal';

let corsHeaders = getCorsHeaders(null);

Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // ── Auth gate ─────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authErr || !user) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  // ── Parse body ────────────────────────────────────────────────
  let body: { send_record_id: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const { send_record_id } = body;
  if (!send_record_id || typeof send_record_id !== 'string') {
    return json({ ok: false, error: 'Missing send_record_id' }, 400);
  }

  // ── Fetch send record ─────────────────────────────────────────
  const { data: record, error: recErr } = await supabase
    .from('compliance_document_send_records')
    .select('id, organization_id, recipient_name, recipient_email, cover_message, secure_token, secure_token_expires_at, revoked_at')
    .eq('id', send_record_id)
    .single();

  if (recErr || !record) {
    return json({ ok: false, error: 'Send record not found' }, 404);
  }

  // Verify caller belongs to this org
  const { data: callerProfile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!callerProfile || callerProfile.organization_id !== record.organization_id) {
    return json({ ok: false, error: 'Forbidden' }, 403);
  }

  // Validate record state
  if (record.revoked_at) {
    return json({ ok: false, error: 'Send record has been revoked' }, 400);
  }

  const expiresAt = new Date(record.secure_token_expires_at);
  if (expiresAt < new Date()) {
    return json({ ok: false, error: 'Send record has expired' }, 400);
  }

  const portalUrl = `${PORTAL_BASE}/${record.secure_token}`;

  // ── No email address — return URL only ────────────────────────
  if (!record.recipient_email) {
    return json({
      ok: true,
      portal_url: portalUrl,
      email_sent: false,
      note: 'No recipient email on file. Share the link manually.',
    }, 200);
  }

  // ── Fetch org name ────────────────────────────────────────────
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', record.organization_id)
    .single();

  const orgName = org?.name || 'Your organization';

  // ── Build email ───────────────────────────────────────────────
  const expiryLabel = expiresAt.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const coverBlock = record.cover_message
    ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;color:#334155;line-height:1.6;white-space:pre-wrap;">${escapeHtml(record.cover_message)}</div>`
    : '';

  const bodyHtml = `
    <p style="font-size:15px;color:#334155;">
      ${escapeHtml(orgName)} has shared compliance documents with you via EvidLY.
    </p>
    ${coverBlock}
    <p style="font-size:14px;color:#475569;">
      Click the button below to view and download the documents. This link expires on ${expiryLabel}.
    </p>
    <p style="font-size:12px;color:#94a3b8;margin-top:16px;">
      Direct link: <a href="${portalUrl}" style="color:#2563eb;">${portalUrl}</a>
    </p>`;

  const html = buildEmailHtml({
    recipientName: record.recipient_name,
    bodyHtml,
    ctaText: 'View Documents',
    ctaUrl: portalUrl,
    footerNote: `This link expires on ${expiryLabel}. If you did not expect this, you can safely ignore this email.`,
  });

  const subject = `${orgName} shared compliance documents with you`;

  // ── Send via Resend ───────────────────────────────────────────
  const result = await sendEmail({
    to: record.recipient_email,
    subject,
    html,
  });

  if (result?.id) {
    // Update record with email tracking
    await supabase
      .from('compliance_document_send_records')
      .update({
        email_sent_at: new Date().toISOString(),
        email_message_id: result.id,
        email_status: 'sent',
      })
      .eq('id', record.id);

    return json({
      ok: true,
      portal_url: portalUrl,
      email_sent: true,
      email_message_id: result.id,
    }, 200);
  }

  // Email failed — still return portal URL for manual share
  return json({
    ok: true,
    portal_url: portalUrl,
    email_sent: false,
    note: 'Email delivery failed. Share the link manually.',
  }, 200);
});

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
