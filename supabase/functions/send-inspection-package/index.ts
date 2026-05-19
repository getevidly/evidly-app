// send-inspection-package — Edge function
// C4 of Dashboard v10 build sequence
// HTTP-triggered (not cron). Role-gated to owner_operator/executive/compliance_manager.
// Invokes generate-compliance-package to build PDF, emails it as attachment via Resend,
// logs delivery to inspection_package_deliveries, notifies sender in-app.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { buildEmailHtml } from '../_shared/email.ts';

let corsHeaders = getCorsHeaders(null);

const ALLOWED_ROLES = ['owner_operator', 'executive', 'compliance_manager'];

const PACKAGE_TYPES = ['inspection', 'insurance', 'landlord', 'custom'] as const;
const RECIPIENT_TYPES = ['inspector', 'insurer', 'internal', 'landlord'] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Package type → email subject (customer-facing, no banned terms)
const SUBJECT_MAP: Record<string, string> = {
  inspection: 'Inspection Evidence Package from EvidLY',
  insurance: 'Insurance Evidence Package from EvidLY',
  landlord: 'Landlord Evidence Package from EvidLY',
  custom: 'Evidence Package from EvidLY',
};

// Package type → PDF filename prefix
const FILENAME_MAP: Record<string, string> = {
  inspection: 'Inspection-Evidence-Package',
  insurance: 'Insurance-Evidence-Package',
  landlord: 'Landlord-Evidence-Package',
  custom: 'Evidence-Package',
};

interface RequestBody {
  org_id: string;
  location_id: string;
  package_type: string;
  recipient_email: string;
  recipient_name: string;
  recipient_type: string;
  message: string | null;
  document_ids: string[];
  include_score_report: boolean;
  include_temp_summary: boolean;
}

Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // ── Auth gate ──────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt) return jsonResponse({ error: 'Missing authorization' }, 401);

  const authClient = createClient(supabaseUrl, serviceKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await authClient.auth.getUser();
  if (authErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

  // ── Parse body ─────────────────────────────────────────────────
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  // ── Role check ─────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, organization_id, full_name')
    .eq('id', user.id)
    .eq('organization_id', body.org_id)
    .single();

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    return jsonResponse({ error: 'Forbidden: insufficient role' }, 403);
  }

  // ── Input validation ───────────────────────────────────────────
  const errors: string[] = [];
  if (!body.org_id || !UUID_RE.test(body.org_id)) errors.push('org_id: invalid uuid');
  if (!body.location_id || !UUID_RE.test(body.location_id)) errors.push('location_id: invalid uuid');
  if (!PACKAGE_TYPES.includes(body.package_type as typeof PACKAGE_TYPES[number])) {
    errors.push(`package_type: must be one of ${PACKAGE_TYPES.join(', ')}`);
  }
  if (!body.recipient_email || !EMAIL_RE.test(body.recipient_email)) errors.push('recipient_email: invalid');
  if (!body.recipient_name?.trim()) errors.push('recipient_name: required');
  if (!RECIPIENT_TYPES.includes(body.recipient_type as typeof RECIPIENT_TYPES[number])) {
    errors.push(`recipient_type: must be one of ${RECIPIENT_TYPES.join(', ')}`);
  }
  if (!Array.isArray(body.document_ids) || body.document_ids.length === 0) {
    errors.push('document_ids: must be non-empty array');
  } else {
    for (const id of body.document_ids) {
      if (!UUID_RE.test(id)) { errors.push(`document_ids: invalid uuid ${id}`); break; }
    }
  }
  if (errors.length > 0) return jsonResponse({ error: 'Validation failed', details: errors }, 400);

  // ── Invoke generate-compliance-package ──────────────────────────
  let pdfUrl: string | null = null;
  let orgName = '';
  try {
    const genRes = await fetch(
      `${supabaseUrl}/functions/v1/generate-compliance-package`,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          package_type: body.package_type,
          location_id: body.location_id,
          document_ids: body.document_ids,
          include_score_report: body.include_score_report ?? false,
          include_temp_summary: body.include_temp_summary ?? false,
        }),
      },
    );

    const genData = await genRes.json();

    if (!genRes.ok || !genData.success) {
      // Insert failed delivery row
      const { data: failRow } = await supabase
        .from('inspection_package_deliveries')
        .insert({
          org_id: body.org_id,
          location_id: body.location_id,
          package_type: body.package_type,
          recipient_email: body.recipient_email,
          recipient_name: body.recipient_name,
          recipient_type: body.recipient_type,
          sent_by: user.id,
          delivery_status: 'failed',
          failure_reason: genData.error || 'Package generation failed',
          message_body: body.message || null,
          document_ids: JSON.stringify(body.document_ids),
        })
        .select('id')
        .single();

      return jsonResponse({
        error: 'Package generation failed',
        delivery_id: failRow?.id || null,
      }, 502);
    }

    pdfUrl = genData.package?.pdf_url || null;
    orgName = genData.package?.organization || '';
  } catch (err) {
    const { data: failRow } = await supabase
      .from('inspection_package_deliveries')
      .insert({
        org_id: body.org_id,
        location_id: body.location_id,
        package_type: body.package_type,
        recipient_email: body.recipient_email,
        recipient_name: body.recipient_name,
        recipient_type: body.recipient_type,
        sent_by: user.id,
        delivery_status: 'failed',
        failure_reason: (err as Error).message,
        message_body: body.message || null,
        document_ids: JSON.stringify(body.document_ids),
      })
      .select('id')
      .single();

    return jsonResponse({
      error: 'Package generation error',
      delivery_id: failRow?.id || null,
    }, 502);
  }

  // ── Fetch PDF bytes from storage URL ───────────────────────────
  let pdfBase64: string | null = null;
  if (pdfUrl) {
    try {
      const pdfRes = await fetch(pdfUrl);
      if (pdfRes.ok) {
        const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());
        pdfBase64 = btoa(String.fromCharCode(...pdfBytes));
      }
    } catch (err) {
      console.warn('[send-inspection-package] Failed to fetch PDF:', (err as Error).message);
    }
  }

  // ── Build email ────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const subject = SUBJECT_MAP[body.package_type] || SUBJECT_MAP.custom;
  const filename = `${FILENAME_MAP[body.package_type] || FILENAME_MAP.custom}-${today}.pdf`;

  const messageBlock = body.message
    ? `<p style="font-size: 14px; color: #475569; background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #1e4d6b;">${body.message}</p>`
    : '';

  const emailHtml = buildEmailHtml({
    recipientName: body.recipient_name,
    bodyHtml: `
      <p style="font-size: 15px; color: #334155;">
        ${orgName || 'Your organization'} has sent you an evidence package via EvidLY.
      </p>
      ${messageBlock}
      <p style="font-size: 14px; color: #475569;">
        ${pdfBase64 ? 'The evidence package is attached as a PDF.' : 'The evidence package is being prepared.'}
      </p>`,
  });

  // ── Send email via Resend (with attachment) ────────────────────
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  let emailMessageId: string | null = null;
  let emailFailed = false;

  if (resendApiKey) {
    try {
      const emailBody: Record<string, unknown> = {
        from: 'EvidLY <founders@getevidly.com>',
        to: [body.recipient_email],
        subject,
        html: emailHtml,
      };

      if (pdfBase64) {
        emailBody.attachments = [{ filename, content: pdfBase64 }];
      }

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailBody),
      });

      const emailData = await emailRes.json();
      if (emailRes.ok && emailData.id) {
        emailMessageId = emailData.id;
      } else {
        console.error('[send-inspection-package] Resend error:', emailData);
        emailFailed = true;
      }
    } catch (err) {
      console.error('[send-inspection-package] Email send failed:', (err as Error).message);
      emailFailed = true;
    }
  } else {
    console.warn('[send-inspection-package] RESEND_API_KEY not set');
    emailFailed = true;
  }

  // ── Insert delivery row ────────────────────────────────────────
  const deliveryStatus = emailFailed ? 'failed' : 'sent';
  const failureReason = emailFailed ? 'Email delivery failed' : null;

  const { data: deliveryRow, error: insertErr } = await supabase
    .from('inspection_package_deliveries')
    .insert({
      org_id: body.org_id,
      location_id: body.location_id,
      package_type: body.package_type,
      recipient_email: body.recipient_email,
      recipient_name: body.recipient_name,
      recipient_type: body.recipient_type,
      sent_by: user.id,
      delivery_status: deliveryStatus,
      email_message_id: emailMessageId,
      message_body: body.message || null,
      document_ids: JSON.stringify(body.document_ids),
      failure_reason: failureReason,
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('[send-inspection-package] DB insert failed after email sent:', insertErr.message);
    return jsonResponse({
      error: 'Delivery logged partially — email was sent but record failed',
      email_message_id: emailMessageId,
    }, 500);
  }

  // ── In-app notification to sender ──────────────────────────────
  const typeLabel = body.package_type === 'custom' ? 'Evidence' : body.package_type.charAt(0).toUpperCase() + body.package_type.slice(1);
  await supabase.from('notifications').insert({
    organization_id: body.org_id,
    user_id: user.id,
    type: 'inspection_package_sent',
    title: `${typeLabel} package sent`,
    body: `${typeLabel} evidence package sent to ${body.recipient_name}`,
    action_url: '/dashboard',
    priority: 'low',
    email_sent: false,
  });

  // ── Response ───────────────────────────────────────────────────
  if (emailFailed) {
    return jsonResponse({
      delivery_id: deliveryRow.id,
      email_message_id: null,
      delivery_status: 'failed',
    }, 502);
  }

  return jsonResponse({
    delivery_id: deliveryRow.id,
    email_message_id: emailMessageId,
    delivery_status: 'sent',
  });
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
