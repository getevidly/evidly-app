// portal-access — Edge function
// C16a-1: Public endpoint for document portal link access.
// No auth required — anonymous recipients access documents via secure_token.
// Service role bypasses RLS for all DB operations.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { PUBLIC_CORS_HEADERS } from '../_shared/cors.ts';

interface RequestBody {
  token: string;
  action: 'load' | 'open' | 'download';
  document_id?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const { token, action, document_id } = body;

  if (!token || typeof token !== 'string') {
    return jsonResponse({ error: 'Missing token' }, 400);
  }
  if (!action || !['load', 'open', 'download'].includes(action)) {
    return jsonResponse({ error: 'Invalid action' }, 400);
  }
  if (action === 'download' && (!document_id || !UUID_RE.test(document_id))) {
    return jsonResponse({ error: 'Missing or invalid document_id' }, 400);
  }

  // ── Look up send record by token ──────────────────────────────
  const { data: record, error: recErr } = await supabase
    .from('compliance_document_send_records')
    .select('id, organization_id, recipient_name, cover_message, sent_at, secure_token_expires_at, revoked_at, opened_at, opened_count, download_count')
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
      .select('document_id, compliance_documents(id, name, type, expiration_date, storage_path)')
      .eq('send_record_id', record.id)
      .eq('included_in_send', true);

    if (itemsErr) {
      console.error('DB error fetching send items:', itemsErr.message);
      return jsonResponse({ error: 'Internal error' }, 500);
    }

    const documents = (items || []).map((item: Record<string, unknown>) => {
      const doc = item.compliance_documents as Record<string, unknown> | null;
      if (!doc) return null;
      return {
        id: doc.id as string,
        name: doc.name as string,
        type: doc.type as string | null,
        expiration_date: doc.expiration_date as string | null,
        has_file: !!(doc.storage_path),
      };
    }).filter(Boolean);

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

  return jsonResponse({ error: 'Unknown action' }, 400);
});

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...PUBLIC_CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
