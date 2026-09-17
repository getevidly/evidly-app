import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PUBLIC_CORS_HEADERS } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import {
  canonicalTimestamp,
  buildCanonicalServiceJson,
  buildSealHashInput,
  sha256,
} from '../_shared/seal-canonicalization.ts';

// ═══════════════════════════════════════════════════════════════════════════
// verify-certificate — PUBLIC certificate verification
//
// Deliberately open: anyone holding a certificate — an insurer, a landlord, a
// fire marshal — can confirm it is genuine without an account.
//
// Two modes:
//   1. { cert_number }              → does a sealed record exist?
//   2. { cert_number, pdf_base64 }  → does THIS document match its seal?
//
// Mode 2 is the real claim. It recomputes SHA-256 over
//   (uploaded PDF bytes ‖ canonical JSON ‖ sealed_at ‖ sealed_by ‖ predecessor)
// using the same shared module as seal-service-record and
// verify-service-record, then compares to the stored content_hash. A single
// altered byte changes the digest.
//
// READ-ONLY: never writes to vendor_service_records.
//
// Disclosure rules — this endpoint is unauthenticated and cert numbers are
// sequential, so it returns ONLY seal-confirmation fields. Never
// organization_id, location_id, vendor_id, sealed_by, certificate_url or the
// client's name. Not-found and never-sealed return an identical shape so the
// endpoint cannot be used to enumerate which numbers exist.
// ═══════════════════════════════════════════════════════════════════════════

const RATE_MAX = 20;
const RATE_WINDOW_SECONDS = 600;

/** Uploaded certificates are ~400 KB; cap well above that, far below abuse. */
const MAX_PDF_BYTES = 12 * 1024 * 1024;

interface RequestBody {
  cert_number?: string;
  pdf_base64?: string;
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...PUBLIC_CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/** Identical for unknown, unsealed and malformed — nothing to enumerate. */
function notFound() {
  return jsonResponse({ found: false }, 200);
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(',') ? b64.slice(b64.indexOf(',') + 1) : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: PUBLIC_CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const certNumber = (body.cert_number || '').trim();
  if (!certNumber || certNumber.length > 64) {
    return jsonResponse({ error: 'Please enter a certificate number' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Keyed on IP, not cert number: the guessable input is the thing being
  // enumerated, so limiting per-number would not slow an attacker down.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const { allowed } = await checkRateLimit({
    key: `verify_cert:${ip}`,
    maxRequests: RATE_MAX,
    windowSeconds: RATE_WINDOW_SECONDS,
    supabase,
  });
  if (!allowed) {
    return jsonResponse({ error: 'Too many verification attempts. Please try again shortly.' }, 429);
  }

  // ── Look up the sealed record ────────────────────────────────────────
  // Ordered newest-first: if a correction ever reuses a cert number, the
  // current record is the one that should answer.
  const { data: rows, error: rowErr } = await supabase
    .from('vendor_service_records')
    .select(
      'id, organization_id, location_id, safeguard_type, service_type_code, ' +
      'vendor_name, vendor_id, technician_name, cert_number, service_date, ' +
      'next_due_date, sealed_at, sealed_by, content_hash, supersedes_id',
    )
    .eq('cert_number', certNumber)
    .not('sealed_at', 'is', null)
    .order('sealed_at', { ascending: false })
    .limit(1);

  if (rowErr) {
    console.error('[verify-certificate] Lookup failed:', rowErr.message);
    return jsonResponse({ error: 'Verification is temporarily unavailable' }, 500);
  }

  const row = rows?.[0];
  if (!row || !row.content_hash) return notFound();

  // Superseded records must not read as simply valid.
  const { data: supersessionEntry } = await supabase
    .from('service_supersession_log')
    .select('superseding_id')
    .eq('superseded_id', row.id)
    .maybeSingle();

  let supersededByCertNumber: string | null = null;
  if (supersessionEntry?.superseding_id) {
    const { data: newer } = await supabase
      .from('vendor_service_records')
      .select('cert_number')
      .eq('id', supersessionEntry.superseding_id)
      .maybeSingle();
    supersededByCertNumber = newer?.cert_number ?? null;
  }

  // Narrow projection — everything returned to an anonymous caller.
  const record = {
    cert_number: row.cert_number,
    content_hash: row.content_hash,
    sealed_at: row.sealed_at,
    service_date: row.service_date,
    next_due_date: row.next_due_date ?? null,
    vendor_name: row.vendor_name,
    safeguard_type: row.safeguard_type,
    service_type_code: row.service_type_code,
    superseded: Boolean(supersessionEntry),
    superseded_by_cert_number: supersededByCertNumber,
  };

  // ── MODE 1: existence only ───────────────────────────────────────────
  if (!body.pdf_base64) {
    return jsonResponse({ found: true, checked_document: false, record }, 200);
  }

  // ── MODE 2: recompute over the uploaded document ─────────────────────
  let documentBytes: Uint8Array;
  try {
    documentBytes = base64ToBytes(body.pdf_base64);
  } catch {
    return jsonResponse({ error: 'That file could not be read' }, 400);
  }
  if (documentBytes.byteLength === 0 || documentBytes.byteLength > MAX_PDF_BYTES) {
    return jsonResponse({ error: 'That file is empty or too large to verify' }, 400);
  }

  // A correction chains off its predecessor's hash.
  let predecessorHash = '';
  if (row.supersedes_id) {
    const { data: pred } = await supabase
      .from('vendor_service_records')
      .select('content_hash')
      .eq('id', row.supersedes_id)
      .maybeSingle();
    if (pred?.content_hash) predecessorHash = pred.content_hash;
  }

  const canonicalJson = buildCanonicalServiceJson({
    location_id: row.location_id,
    safeguard_type: row.safeguard_type,
    service_type_code: row.service_type_code,
    vendor_name: row.vendor_name,
    vendor_id: row.vendor_id ?? null,
    technician_name: row.technician_name ?? null,
    cert_number: row.cert_number,
    service_date: row.service_date,
    organization_id: row.organization_id,
  });

  const hashInput = buildSealHashInput(
    documentBytes.buffer as ArrayBuffer,
    canonicalJson,
    canonicalTimestamp(new Date(row.sealed_at as string)),
    row.sealed_by as string,
    predecessorHash,
  );

  const recomputed = await sha256(hashInput.buffer as ArrayBuffer);
  const match = recomputed === row.content_hash;

  return jsonResponse({
    found: true,
    checked_document: true,
    match,
    record,
  }, 200);
});
