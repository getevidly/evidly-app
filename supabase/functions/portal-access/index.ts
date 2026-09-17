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

/* Written by buildCertLinkForRecipient (county-briefing/index.ts:131, 210).
 * Must match that string exactly — it is how a warm outreach certificate link
 * is told apart from a staff document send or a third-party share. */
const OUTREACH_CERT_PURPOSE = 'Outreach step 2 — certificate link';

/** Onward shares expire sooner than the link they came from. */
const SHARE_EXPIRY_DAYS = 14;
/** Public endpoint — cap onward shares per originating token. */
const SHARE_MAX_PER_WINDOW = 5;
const SHARE_WINDOW_SECONDS = 3600;

/* Canonical service names. Same values as SAFEGUARD_LABELS in
 * src/pages/PublicVerification.tsx:66-70 — keep the two in step. A safeguard
 * type absent here falls back to the document's cleaned name; never invent a
 * label. */
const SAFEGUARD_LABELS: Record<string, string> = {
  hood_cleaning: 'Kitchen Exhaust Cleaning',
  fire_suppression: 'Fire Suppression System',
  fire_extinguisher: 'Fire Extinguisher Service',
};

function escHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* Bridge-written names carry a raw ISO timestamp
 * ("… — 2026-09-15T00:00:00+00:00"). Same cleaning PortalPage applies. */
function cleanDocName(name: string): string {
  return String(name || '').replace(
    /(\d{4}-\d{2}-\d{2})T[\d:.+-]+/,
    (_m, d: string) => formatDateOnly(d),
  );
}

/* service_date and expiry_date are DATE columns arriving as "YYYY-MM-DD".
 * Formatting via the local zone would shift the day, so the parts are read
 * directly and rendered in UTC — the stored day is the displayed day. */
function formatDateOnly(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
  const d = m
    ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
    : new Date(value);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

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
    // `purpose` identifies a warm outreach certificate link — see OUTREACH_CERT_PURPOSE below.
    .select('id, organization_id, recipient_name, recipient_type, purpose, cover_message, sent_at, secure_token_expires_at, revoked_at, opened_at, opened_count, download_count')
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

    /* Sealed first, newest seal first; unsealed keep their original order
     * behind them. A stable comparator, so equal keys do not reshuffle. */
    documents.sort((a, b) => {
      const aSealed = a.seal ? 1 : 0;
      const bSealed = b.seal ? 1 : 0;
      if (aSealed !== bSealed) return bSealed - aSealed;
      if (!a.seal || !b.seal) return 0;
      return new Date(b.seal.sealed_at).getTime() - new Date(a.seal.sealed_at).getTime();
    });

    /* A warm outreach certificate link is about ONE certificate — the newest
     * sealed one. Older certs were listed with their own Download button, and
     * those downloads 404 when the earlier file is gone. Every other
     * send-record (staff document sends, third-party shares) still returns
     * every included document, now in the sorted order. */
    const visibleDocuments = record.purpose === OUTREACH_CERT_PURPOSE
      ? documents.slice(0, 1)
      : documents;

    return jsonResponse({
      status: 'valid',
      record: {
        recipient_name: record.recipient_name,
        cover_message: record.cover_message,
        sent_at: record.sent_at,
        expires_at: record.secure_token_expires_at,
        org_name: org?.name || 'Organization',
      },
      documents: visibleDocuments,
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

    /* Resolve what the sharing page is showing, fetch every file, and only
     * then create the send-record. A file that cannot be fetched must leave
     * nothing behind, so nothing is written until all bytes are in hand. */
    const { data: srcItems } = await supabase
      .from('compliance_document_send_items')
      .select('document_id, recommendation_tier, compliance_documents(id, name, expiry_date, storage_path, external_id, bridged_service_id)')
      .eq('send_record_id', record.id)
      .eq('included_in_send', true);

    let shareItems = (srcItems || []).filter((i: Record<string, unknown>) => i.compliance_documents);

    if (shareItems.length === 0) {
      return jsonResponse({ error: 'Could not share this document' }, 500);
    }

    // Seal facts for every candidate, so ordering and naming use real data.
    const bridgedIds = shareItems
      // deno-lint-ignore no-explicit-any
      .map((i: any) => i.compliance_documents?.bridged_service_id as string | null)
      .filter((id: string | null): id is string => Boolean(id));

    const sealByRecordId = new Map<string, Record<string, unknown>>();
    if (bridgedIds.length > 0) {
      const { data: seals } = await supabase
        .from('vendor_service_records')
        .select('id, cert_number, service_date, sealed_at, safeguard_type, content_hash')
        .in('id', bridgedIds)
        .not('sealed_at', 'is', null);
      for (const s of seals || []) sealByRecordId.set(s.id as string, s);
    }

    // deno-lint-ignore no-explicit-any
    const sealOf = (i: any): Record<string, unknown> | undefined => {
      const b = i.compliance_documents?.bridged_service_id as string | null;
      return b ? sealByRecordId.get(b) : undefined;
    };

    /* Same ordering and warm-link slice the load action applies: the third
     * party only ever receives what the sharer was actually shown. */
    shareItems = [...shareItems].sort((a, b) => {
      const av = sealOf(a)?.sealed_at as string | undefined;
      const bv = sealOf(b)?.sealed_at as string | undefined;
      if (!!av !== !!bv) return av ? -1 : 1;
      if (!av || !bv) return 0;
      return new Date(bv).getTime() - new Date(av).getTime();
    });
    if (record.purpose === OUTREACH_CERT_PURPOSE) {
      shareItems = shareItems.slice(0, 1);
    }

    // ── Name, reference line and attachment for each shared document ──
    interface SharedDoc {
      documentId: string;
      recommendationTier: string;
      name: string;
      refLine: string;
      sealed: boolean;
      filename: string;
      storagePath: string;
    }

    const sharedDocs: SharedDoc[] = [];
    for (const item of shareItems) {
      // deno-lint-ignore no-explicit-any
      const doc = (item as any).compliance_documents as Record<string, unknown>;
      const seal = sealOf(item);
      const sealed = Boolean(seal);

      let name: string;
      let refLine = '';

      if (sealed) {
        const label = SAFEGUARD_LABELS[(seal!.safeguard_type as string) || ''];
        /* external_id is `${event}:${id}` — 'document.cert:…' or
         * 'document.report:…' (hoodops-webhook/index.ts:930,1016). It is the
         * only stored field that tells a certificate from a report; the name
         * is not authoritative. */
        const externalId = (doc.external_id as string | null) || '';
        const kind = externalId.startsWith('document.report:')
          ? 'Report of Service'
          : 'Certificate of Service';

        // No label for this safeguard type — fall back, never invent one.
        name = label ? `${label} ${kind}` : cleanDocName(doc.name as string);

        const certNumber = (seal!.cert_number as string | null) || null;
        const servicedAt = (seal!.service_date as string | null) || null;
        refLine = [
          certNumber,
          servicedAt ? `Serviced ${formatDateOnly(servicedAt)}` : null,
        ].filter(Boolean).join(' &middot; ');
      } else {
        name = cleanDocName(doc.name as string);
        const expiry = (doc.expiry_date as string | null) || null;
        refLine = expiry ? `Expires ${formatDateOnly(expiry)}` : '';
      }

      const storagePath = (doc.storage_path as string | null) || '';
      if (!storagePath) {
        console.error('Share aborted — document has no stored file:', doc.id);
        return jsonResponse({ error: 'Could not send to that address' }, 502);
      }

      const certNumberForFile = sealed ? ((seal!.cert_number as string | null) || null) : null;
      const filename = `${name.replace(/\s+/g, '-')}${certNumberForFile ? `-${certNumberForFile}` : ''}.pdf`;

      sharedDocs.push({
        documentId: doc.id as string,
        recommendationTier: ((item as Record<string, unknown>).recommendation_tier as string) || 'manual',
        name,
        refLine,
        sealed,
        filename,
        storagePath,
      });
    }

    /* The STORED bytes, never a re-render — for a sealed certificate the file
     * is what the seal was computed over. Any failure aborts before a record
     * exists. */
    const attachments: { filename: string; content: string }[] = [];
    for (const d of sharedDocs) {
      const { data: fileData, error: fileErr } = await supabase.storage
        .from('documents')
        .download(d.storagePath);

      if (fileErr || !fileData) {
        console.error('Share aborted — could not fetch file:', d.storagePath, fileErr?.message);
        return jsonResponse({ error: 'Could not send to that address' }, 502);
      }

      const bytes = new Uint8Array(await fileData.arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      attachments.push({ filename: d.filename, content: btoa(bin) });
    }

    // ── Every file is in hand: now create the share ──
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
        // Never the outreach marker — the recipient's page uses the normal path.
        purpose: 'Shared from portal',
        cover_message: `${escHtml(orgName)} has shared a record with you.`,
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

    const { error: itemsCopyErr } = await supabase
      .from('compliance_document_send_items')
      .insert(sharedDocs.map((d) => ({
        send_record_id: newRecord.id,
        document_id: d.documentId,
        recommendation_tier: d.recommendationTier,
        included_in_send: true,
      })));

    if (itemsCopyErr) {
      console.error('DB error copying send items:', itemsCopyErr.message);
      return jsonResponse({ error: 'Could not share this document' }, 500);
    }

    // ── Compose: one template, three shapes ──
    const portalUrl = `${PORTAL_BASE}/${newToken}`;
    const orgEsc = escHtml(orgName);
    const n = sharedDocs.length;
    const anySealed = sharedDocs.some((d) => d.sealed);

    const SEAL_SENTENCE_ONE =
      'The record is tamper-evident: it carries a cryptographic seal, so you can confirm it has not been altered since it was filed.';
    const SEAL_SENTENCE_MANY =
      'Records marked Sealed are tamper-evident: each carries a cryptographic seal, so you can confirm it has not been altered since it was filed.';

    let subject: string;
    let bodyHtml: string;
    let ctaText: string;

    if (n === 1) {
      const d = sharedDocs[0];
      const nameEsc = escHtml(d.name);
      if (d.sealed) {
        subject = `${orgName} has shared a sealed ${d.name} with you`;
        bodyHtml = `<p>${orgEsc} has shared a sealed ${nameEsc} with you.</p>
        <p>${SEAL_SENTENCE_ONE}</p>`;
        ctaText = 'View the Sealed Record';
      } else {
        subject = `${orgName} has shared a ${d.name} with you`;
        bodyHtml = `<p>${orgEsc} has shared a ${nameEsc} with you.</p>`;
        ctaText = 'View the Record';
      }
    } else {
      subject = `${orgName} has shared ${n} records with you`;
      const rows = sharedDocs.map((d) => {
        const tag = d.sealed
          ? '<span style="color:#2E7D32;font-weight:700;">Sealed</span>'
          : '<span style="color:#8A8F99;">On file</span>';
        const ref = d.refLine
          ? `<br><span style="font-family:Consolas,Menlo,monospace;font-size:11.5px;color:#8A8F99;">${escHtml(d.refLine).replace(/&amp;middot;/g, '&middot;')}</span>`
          : '';
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;border-top:1px solid #E5E0D8;">
         <tr>
           <td style="padding:10px 0;border-bottom:1px solid #E5E0D8;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#1E2D4D;"><b>${escHtml(d.name)}</b>${ref}</td>
           <td align="right" valign="top" style="padding:10px 0;border-bottom:1px solid #E5E0D8;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;white-space:nowrap;">${tag}</td>
         </tr>
       </table>`;
      }).join('');

      bodyHtml = `<p>${orgEsc} has shared ${n} records with you:</p>${rows}` +
        (anySealed ? `<p>${SEAL_SENTENCE_MANY}</p>` : '');
      ctaText = 'View the Records';
    }

    const html = buildEmailHtml({
      recipientName: 'there',
      category: 'Commercial Kitchen Risk Management',
      bodyHtml,
      ctaText,
      ctaUrl: portalUrl,
      footerNote: `This link expires in ${SHARE_EXPIRY_DAYS} days.`,
    });

    const result = await sendEmail({ to, subject, html, attachments });

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
