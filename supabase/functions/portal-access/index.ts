// portal-access — Edge function
// C16a-1: Public endpoint for document portal link access.
// No auth required — anonymous recipients access documents via secure_token.
// Service role bypasses RLS for all DB operations.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { PUBLIC_CORS_HEADERS } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { sendEmail, buildEmailHtml } from '../_shared/email.ts';

interface RequestBody {
  token: string;
  action: 'load' | 'open' | 'download' | 'share';
  document_id?: string;
  recipient_email?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const PORTAL_BASE = 'https://app.getevidly.com/portal';

/** Onward shares expire sooner than the link they came from. */
const SHARE_EXPIRY_DAYS = 14;
/** Public endpoint — cap onward shares per originating token. */
const SHARE_MAX_PER_WINDOW = 5;
const SHARE_WINDOW_SECONDS = 3600;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: PUBLIC_CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { token, action, document_id, recipient_email } = body;

  if (!token || typeof token !== 'string') {
    return jsonResponse({ error: 'Missing token' }, 400);
  }
  if (!action || !['load', 'open', 'download', 'share'].includes(action)) {
    return jsonResponse({ error: 'Invalid action' }, 400);
  }
  if (action === 'download' && (!document_id || !UUID_RE.test(document_id))) {
    return jsonResponse({ error: 'Missing or invalid document_id' }, 400);
  }
  if (action === 'share' && (!recipient_email || !EMAIL_RE.test(recipient_email.trim()))) {
    return jsonResponse({ error: 'Please enter a valid email address' }, 400);
  }

  // ── Look up send record by token ──────────────────────────────
  const { data: record, error: recErr } = await supabase
    .from('compliance_document_send_records')
    .select('id, organization_id, recipient_name, recipient_type, cover_message, sent_at, secure_token_expires_at, revoked_at, opened_at, opened_count, download_count')
    .eq('secure_token', token)
    .limit(1)
    .maybeSingle();

  if (recErr) {
    console.error('DB error looking up token:', recErr.message);
    return jsonResponse({ error: 'Internal error' }, 500);
  }

  if (!record) {
    return jsonResponse({ status: 'invalid' }, 200);
  }

  if (record.revoked_at) {
    return jsonResponse({ status: 'revoked' }, 200);
  }

  const expiresAt = new Date(record.secure_token_expires_at);
  if (expiresAt < new Date()) {
    return jsonResponse({
      status: 'expired',
      expires_at: record.secure_token_expires_at,
    }, 200);
  }

  // ── Token is valid — handle action ────────────────────────────

  if (action === 'load') {
    // Fetch org name
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', record.organization_id)
      .single();

    // Fetch documents via send_items → compliance_documents
    const { data: items, error: itemsErr } = await supabase
      .from('compliance_document_send_items')
      // expiry_date, not expiration_date — the latter does not exist on
      // compliance_documents, so this select threw 42703 and the load action
      // returned 500 for every token.
      .select('document_id, compliance_documents(id, name, type, expiry_date, storage_path, service_type_code, bridged_service_id)')
      .eq('send_record_id', record.id)
      .eq('included_in_send', true);

    if (itemsErr) {
      console.error('DB error fetching send items:', itemsErr.message);
      return jsonResponse({ error: 'Internal error' }, 500);
    }

    const docRows = (items || [])
      .map((item: Record<string, unknown>) => item.compliance_documents as Record<string, unknown> | null)
      .filter(Boolean) as Record<string, unknown>[];

    /* Seal evidence. compliance_documents.bridged_service_id is a bare uuid with
     * no FK, so PostgREST cannot embed vendor_service_records — hence a second,
     * batched lookup rather than a join.
     *
     * The badge is gated on sealed_at, NOT on the link existing: the bridge is
     * bidirectional, and a record synthesized from an uploaded document
     * (source 'document_bridge') also sets bridged_service_id but carries no
     * seal. Only a real seal produces a content_hash worth showing. */
    const sealIds = docRows
      .map((d) => d.bridged_service_id as string | null)
      .filter((id): id is string => Boolean(id));

    const sealById = new Map<string, Record<string, unknown>>();
    if (sealIds.length > 0) {
      const { data: seals, error: sealErr } = await supabase
        .from('vendor_service_records')
        .select('id, content_hash, sealed_at, cert_number, service_date, next_due_date')
        .in('id', sealIds);

      if (sealErr) {
        // Non-fatal: the package still lists, just without seal evidence.
        console.error('DB error fetching seal records:', sealErr.message);
      } else {
        for (const s of seals || []) sealById.set(s.id as string, s);
      }
    }

    const documents = docRows.map((doc) => {
      const bridgedId = doc.bridged_service_id as string | null;
      const seal = bridgedId ? sealById.get(bridgedId) : undefined;
      const isSealed = Boolean(seal && seal.sealed_at && seal.content_hash);

      return {
        id: doc.id as string,
        name: doc.name as string,
        type: doc.type as string | null,
        // Response field keeps its name so PortalPage is unaffected.
        expiration_date: doc.expiry_date as string | null,
        has_file: !!(doc.storage_path),
        seal: isSealed
          ? {
            hash: seal!.content_hash as string,
            sealed_at: seal!.sealed_at as string,
            cert_number: (seal!.cert_number as string | null) || null,
            service_date: (seal!.service_date as string | null) || null,
            next_due_date: (seal!.next_due_date as string | null) || null,
          }
          : null,
      };
    });

    return jsonResponse({
      status: 'valid',
      record: {
        recipient_name: record.recipient_name,
        cover_message: record.cover_message,
        sent_at: record.sent_at,
        expires_at: record.secure_token_expires_at,
        org_name: org?.name || 'Organization',
      },
      documents,
    }, 200);
  }

  if (action === 'open') {
    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('compliance_document_send_records')
      .update({
        opened_at: record.opened_at || now,
        opened_count: (record.opened_count || 0) + 1,
        last_opened_at: now,
      })
      .eq('id', record.id);

    if (updateErr) {
      console.error('DB error updating open tracking:', updateErr.message);
    }

    return jsonResponse({ status: 'ok' }, 200);
  }

  if (action === 'download') {
    // Verify document belongs to this send record
    const { data: sendItem, error: siErr } = await supabase
      .from('compliance_document_send_items')
      .select('document_id')
      .eq('send_record_id', record.id)
      .eq('document_id', document_id!)
      .eq('included_in_send', true)
      .maybeSingle();

    if (siErr || !sendItem) {
      return jsonResponse({ error: 'Document not found in this package' }, 404);
    }

    // Get storage path
    const { data: doc, error: docErr } = await supabase
      .from('compliance_documents')
      .select('name, storage_path')
      .eq('id', document_id!)
      .single();

    if (docErr || !doc) {
      return jsonResponse({ error: 'Document not found' }, 404);
    }

    if (!doc.storage_path) {
      return jsonResponse({ error: 'No file available for this document' }, 404);
    }

    // Generate signed URL (5 minute expiry)
    const { data: signedData, error: signErr } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.storage_path, 300);

    if (signErr || !signedData) {
      console.error('Storage signed URL error:', signErr?.message);
      return jsonResponse({ error: 'Could not generate download link' }, 500);
    }

    // Increment download count
    const { error: dlErr } = await supabase
      .from('compliance_document_send_records')
      .update({ download_count: (record.download_count || 0) + 1 })
      .eq('id', record.id);

    if (dlErr) {
      console.error('DB error updating download count:', dlErr.message);
    }

    return jsonResponse({
      status: 'ok',
      url: signedData.signedUrl,
      filename: doc.name,
    }, 200);
  }

  /* ── share ────────────────────────────────────────────────────
   * A visitor forwards the sealed record onward. EvidLY sends the mail
   * server-side; nothing opens the visitor's mail client.
   *
   * The recipient gets a BRAND NEW token, never the one in the visitor's
   * address bar: echoing it would let anyone who received a forward revoke
   * or outlive the original, and would make the two links indistinguishable
   * in the audit trail. The new link also expires sooner. The original
   * record is not mutated. */
  if (action === 'share') {
    const to = recipient_email!.trim();

    const { allowed } = await checkRateLimit({
      key: `portal_share:${token}`,
      maxRequests: SHARE_MAX_PER_WINDOW,
      windowSeconds: SHARE_WINDOW_SECONDS,
      supabase,
    });
    if (!allowed) {
      return jsonResponse({
        error: 'This link has been shared several times recently. Please try again later.',
      }, 429);
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', record.organization_id)
      .single();
    const orgName = org?.name || 'A kitchen';

    // Same org, same documents, fresh token, shorter life.
    const newToken = crypto.randomUUID();
    const newExpiry = new Date(Date.now() + SHARE_EXPIRY_DAYS * 86400000).toISOString();

    const { data: newRecord, error: newRecErr } = await supabase
      .from('compliance_document_send_records')
      .insert({
        organization_id: record.organization_id,
        /* Inherit the source record's type. 'custom' appears in migration
         * 20260520100001's CHECK list but is NOT in the live constraint, so
         * hardcoding it failed every share with 23514. Inheriting a value that
         * already passed the constraint cannot violate it. */
        recipient_type: record.recipient_type || 'client_legal',
        recipient_name: to,
        recipient_email: to,
        purpose: 'Shared from portal',
        cover_message: `${orgName} has shared a sealed Certificate of Service with you.`,
        secure_token: newToken,
        secure_token_expires_at: newExpiry,
        metadata: { shared_from_send_record_id: record.id },
      })
      .select('id')
      .single();

    if (newRecErr || !newRecord) {
      console.error('DB error creating shared send record:', newRecErr?.message);
      return jsonResponse({ error: 'Could not share this document' }, 500);
    }

    const { data: srcItems } = await supabase
      .from('compliance_document_send_items')
      .select('document_id, recommendation_tier')
      .eq('send_record_id', record.id)
      .eq('included_in_send', true);

    if (srcItems && srcItems.length > 0) {
      const { error: itemsCopyErr } = await supabase
        .from('compliance_document_send_items')
        .insert(srcItems.map((i: Record<string, unknown>) => ({
          send_record_id: newRecord.id,
          document_id: i.document_id,
          recommendation_tier: i.recommendation_tier || 'manual',
          included_in_send: true,
        })));

      if (itemsCopyErr) {
        console.error('DB error copying send items:', itemsCopyErr.message);
        return jsonResponse({ error: 'Could not share this document' }, 500);
      }
    }

    const portalUrl = `${PORTAL_BASE}/${newToken}`;
    const html = buildEmailHtml({
      recipientName: 'there',
      category: 'Commercial Kitchen Risk Management',
      bodyHtml: `
        <p>${orgName} has shared a sealed Certificate of Service with you.</p>
        <p>The record is tamper-evident: it carries a cryptographic seal, so you
        can confirm it has not been altered since it was filed.</p>
      `,
      ctaText: 'View the Sealed Record',
      ctaUrl: portalUrl,
      footerNote: `This link expires in ${SHARE_EXPIRY_DAYS} days.`,
    });

    const result = await sendEmail({
      to,
      subject: `${orgName} has shared a sealed Certificate of Service with you`,
      html,
    });

    if (!result) {
      console.error('Share email failed to send to', to);
      return jsonResponse({ error: 'Could not send to that address' }, 502);
    }

    return jsonResponse({ status: 'shared', recipient: to }, 200);
  }

  return jsonResponse({ error: 'Unknown action' }, 400);
});

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...PUBLIC_CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
