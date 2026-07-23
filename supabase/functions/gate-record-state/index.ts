// supabase/functions/gate-record-state/index.ts
//
// Returns compliance record state for the /gate/:token prospect page.
// Token-authorized, service_role read — no anon access to compliance tables.
// Follows the mark-record-viewed pattern: validate token → resolve org → read.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { token } = await req.json();
    if (!token) return json({ error: 'token required' }, 400);

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── 1. Resolve invite → org ────────────────────────────────
    const { data: invite, error: invErr } = await db
      .from('evidly_client_invites')
      .select('organization_id, status')
      .eq('token', token)
      .maybeSingle();

    if (invErr) throw invErr;
    if (!invite?.organization_id) return json({ error: 'invite not found' }, 404);

    // Allow pending + accepted invites (accepted users may still view gate)
    if (!['pending', 'accepted'].includes(invite.status)) {
      return json({ error: 'invite expired or revoked' }, 410);
    }

    const orgId = invite.organization_id;

    // ── 2. Fetch compliance_documents for this org ─────────────
    //    Only current + expiring count as "on file".
    //    Select the fields the gate needs: type, category, status,
    //    expiry_date, vendor name (via vendor_id join), service_type_code.
    const { data: docs, error: docErr } = await db
      .from('compliance_documents')
      .select(`
        type,
        name,
        category,
        status,
        expiry_date,
        issued_date,
        service_type_code,
        vendor:vendors(name)
      `)
      .eq('organization_id', orgId)
      .in('status', ['current', 'expiring']);

    if (docErr) throw docErr;

    // ── 3. Fetch vendor_service_records for fire safeguards ────
    //    These prove a service was performed (e.g. hood cleaning).
    const { data: svcRecs, error: svcErr } = await db
      .from('vendor_service_records')
      .select(`
        safeguard_type,
        service_type_code,
        service_date,
        vendor:vendors(name)
      `)
      .eq('organization_id', orgId);

    if (svcErr) throw svcErr;

    // ── 4. Build a lookup of what's on file ────────────────────
    //    Each entry: { type/code → { on_file: true, date, vendor } }
    interface Filed {
      on_file: boolean;
      date?: string;
      vendor?: string;
    }
    const filed: Record<string, Filed> = {};

    // Helper: mark a key as on-file
    const mark = (key: string, date?: string | null, vendor?: string | null) => {
      if (!key) return;
      filed[key] = {
        on_file: true,
        ...(date ? { date } : {}),
        ...(vendor ? { vendor } : {}),
      };
    };

    // Map compliance_documents by type code
    for (const doc of docs ?? []) {
      const vendorName = Array.isArray(doc.vendor) ? doc.vendor[0]?.name : doc.vendor?.name;
      // Mark by document type code (e.g. PHP, CFPM, PEST, etc.)
      mark(doc.type, doc.expiry_date || doc.issued_date, vendorName);
      // Also mark by service_type_code if bridged (e.g. KEC, FS, FA, SP)
      if (doc.service_type_code) {
        mark(doc.service_type_code, doc.expiry_date || doc.issued_date, vendorName);
      }
      // Mark by category for broader matching
      mark(`cat:${doc.category}:${doc.type}`, doc.expiry_date || doc.issued_date, vendorName);
    }

    // Map vendor_service_records by safeguard_type and service_type_code
    for (const rec of svcRecs ?? []) {
      const vendorName = Array.isArray(rec.vendor) ? rec.vendor[0]?.name : rec.vendor?.name;
      if (rec.safeguard_type) mark(`safeguard:${rec.safeguard_type}`, rec.service_date, vendorName);
      if (rec.service_type_code) mark(rec.service_type_code, rec.service_date, vendorName);
    }

    return json({ ok: true, filed }, 200);
  } catch (e) {
    console.error('gate-record-state:', e);
    return json({ error: 'internal error' }, 500);
  }
});
