// seal-incident — evidentiary seal over a resolved/verified incident
//
// Input:  { incident_id: uuid }
// Auth:   JWT required. sealed_by / verified_by = verified session user.
// Output: { seal_id, content_hash, sealed_at } on success.
//
// The seal proves WHAT was resolved: the canonical hash covers the incident
// substantive columns, its timeline rows, and a hash per photo of evidence.
//
// Photo hashing is DUAL-MODE, because the columns hold two forms side by side:
//   storage path  -> download the object from compliance-photos, sha256 the bytes
//   "data:" URL   -> sha256 the decoded base64 bytes (legacy inline evidence)
// Every photo is hashed BEFORE any write. A missing or unreadable object is a
// 422 that leaves the incident exactly as it was — no partial seal, no orphaned
// status transition.
//
// Both writes (INSERT incident_seals + UPDATE incidents.seal_id) must succeed
// before returning success. No success-on-unconfirmed.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  canonicalTimestamp,
  buildCanonicalIncidentJson,
  buildSealHashInput,
  sha256,
} from '../_shared/seal-canonicalization.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Bucket the incident photo path writes to (src/lib/photoUpload.ts).
const PHOTO_BUCKET = 'compliance-photos';

// The substantive columns the seal attests to, plus the two photo arrays and
// the current seal_id needed for the precondition.
const INCIDENT_COLUMNS =
  'id, organization_id, location_id, location_name, incident_number, category, type, ' +
  'severity, status, title, description, urgency_label, source_type, source_id, ' +
  'source_label, assigned_to, reported_by, requires_regulatory_report, ' +
  'regulatory_citation, root_cause, corrective_action, resolution_summary, ' +
  'resolved_at, resolved_by, verified_at, verified_by, linked_corrective_action_id, ' +
  'created_at, photos, resolution_photos, seal_id';

interface PhotoHash {
  mode: string;
  sha256: string;
  path?: string;
  index?: number;
}

/** Decode the base64 payload of a data: URL into raw bytes. */
function decodeDataUrl(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  if (comma === -1) throw new Error('data URL has no payload separator');
  const payload = dataUrl.slice(comma + 1);
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // ── STEP 1: AUTHENTICATE ───────────────────────────────────────────
  // sealed_by comes ONLY from the verified token, never from client input.
  const authHeader = req.headers.get('Authorization');
  const supabaseAuth = createClient(supabaseUrl, serviceKey, {
    global: { headers: { Authorization: authHeader || '' } },
  });
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (!user) {
    return jsonResponse({ error: 'Unauthorized — valid JWT required' }, 401);
  }
  const sealedBy: string = user.id;

  // ── STEP 2: PARSE INPUT ────────────────────────────────────────────
  let body: { incident_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { incident_id } = body;
  if (!incident_id) {
    return jsonResponse({ error: 'incident_id is required' }, 400);
  }

  // Service-role client for reads/writes (bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceKey);

  // ── STEP 3: VERIFY ORG MEMBERSHIP ─────────────────────────────────
  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', sealedBy)
    .single();

  if (profileErr || !profile) {
    return jsonResponse({ error: 'User profile not found' }, 403);
  }

  // ── STEP 4: LOAD INCIDENT ─────────────────────────────────────────
  const { data: incident, error: incidentErr } = await supabase
    .from('incidents')
    .select(INCIDENT_COLUMNS)
    .eq('id', incident_id)
    .single();

  if (incidentErr || !incident) {
    return jsonResponse({ error: 'Incident not found' }, 404);
  }

  if (incident.organization_id !== profile.organization_id) {
    return jsonResponse({ error: 'Incident does not belong to your organization' }, 403);
  }

  // ── STEP 5: STATE PRECONDITION ────────────────────────────────────
  if (incident.seal_id) {
    return jsonResponse(
      { error: `Incident is already sealed (seal ${incident.seal_id}) — corrections supersede, never mutate` },
      409,
    );
  }

  if (incident.status !== 'resolved' && incident.status !== 'verified') {
    return jsonResponse(
      { error: `Incident is ${incident.status} — only a resolved or verified incident can be sealed` },
      409,
    );
  }

  // ── STEP 6: HASH EVERY PHOTO (before any write) ───────────────────
  // photos first, then resolution_photos. `index` on an inline entry is the
  // position in that concatenated order, so it is unique across the seal.
  const allPhotos: string[] = [
    ...((incident.photos as string[] | null) ?? []),
    ...((incident.resolution_photos as string[] | null) ?? []),
  ];

  const photoHashes: PhotoHash[] = [];

  for (let i = 0; i < allPhotos.length; i++) {
    const entry = allPhotos[i];
    if (!entry) {
      return jsonResponse(
        { error: `Photo entry ${i} is empty — cannot seal an incomplete evidence set` },
        422,
      );
    }

    if (entry.startsWith('data:')) {
      // Legacy inline evidence — hash the decoded bytes.
      try {
        const bytes = decodeDataUrl(entry);
        photoHashes.push({
          mode: 'inline',
          index: i,
          sha256: await sha256(bytes.buffer as ArrayBuffer),
        });
      } catch (err) {
        console.error(`[seal-incident] Inline photo ${i} failed to decode:`, err);
        return jsonResponse(
          { error: `Inline photo at index ${i} could not be decoded — no seal written` },
          422,
        );
      }
      continue;
    }

    // Storage path — download the object and hash the real bytes.
    const { data: file, error: downloadErr } = await supabase.storage
      .from(PHOTO_BUCKET)
      .download(entry);

    if (downloadErr || !file) {
      console.error(`[seal-incident] Storage object missing: ${entry}`, downloadErr?.message);
      return jsonResponse(
        { error: `Photo object could not be read from storage: ${entry} — no seal written` },
        422,
      );
    }

    const bytes = await file.arrayBuffer();
    photoHashes.push({
      mode: 'storage',
      path: entry,
      sha256: await sha256(bytes),
    });
  }

  // ── STEP 7: TRANSITION resolved → verified ────────────────────────
  // Sealing is the verification act. A resolved incident becomes verified in
  // the same call, then is re-read so the hash covers the state being sealed.
  const now = new Date();
  const sealedAtCanonical = canonicalTimestamp(now);

  let sealed = incident;

  if (incident.status === 'resolved') {
    const { error: verifyErr } = await supabase
      .from('incidents')
      .update({
        status: 'verified',
        verified_at: sealedAtCanonical,
        verified_by: sealedBy,
      })
      .eq('id', incident.id);

    if (verifyErr) {
      console.error('[seal-incident] Verify transition failed:', verifyErr.message);
      return jsonResponse({ error: 'Failed to verify incident before sealing' }, 500);
    }

    const { data: reread, error: rereadErr } = await supabase
      .from('incidents')
      .select(INCIDENT_COLUMNS)
      .eq('id', incident.id)
      .single();

    if (rereadErr || !reread) {
      console.error('[seal-incident] Re-read after verify failed:', rereadErr?.message);
      return jsonResponse({ error: 'Incident verified but could not be re-read for sealing' }, 500);
    }
    sealed = reread;
  }

  // ── STEP 8: LOAD TIMELINE ─────────────────────────────────────────
  const { data: timeline, error: timelineErr } = await supabase
    .from('incident_timeline')
    .select('id, action, status, performed_by, notes, created_at')
    .eq('incident_id', sealed.id)
    .order('created_at', { ascending: true });

  if (timelineErr) {
    console.error('[seal-incident] Timeline read failed:', timelineErr.message);
    return jsonResponse({ error: 'Failed to read incident timeline' }, 500);
  }

  // ── STEP 9: CANONICALIZE + HASH ───────────────────────────────────
  const canonicalJson = buildCanonicalIncidentJson({
    id: sealed.id,
    organization_id: sealed.organization_id,
    location_id: sealed.location_id,
    location_name: sealed.location_name,
    incident_number: sealed.incident_number,
    category: sealed.category,
    type: sealed.type,
    severity: sealed.severity,
    status: sealed.status,
    title: sealed.title,
    description: sealed.description,
    urgency_label: sealed.urgency_label,
    source_type: sealed.source_type,
    source_id: sealed.source_id,
    source_label: sealed.source_label,
    assigned_to: sealed.assigned_to,
    reported_by: sealed.reported_by,
    requires_regulatory_report: sealed.requires_regulatory_report,
    regulatory_citation: sealed.regulatory_citation,
    root_cause: sealed.root_cause,
    corrective_action: sealed.corrective_action,
    resolution_summary: sealed.resolution_summary,
    resolved_at: sealed.resolved_at,
    resolved_by: sealed.resolved_by,
    verified_at: sealed.verified_at,
    verified_by: sealed.verified_by,
    linked_corrective_action_id: sealed.linked_corrective_action_id,
    created_at: sealed.created_at,
    timeline: timeline ?? [],
    photo_hashes: photoHashes,
  });

  // No document bytes for an incident seal, and no supersession chain on a
  // first seal — same conventions as seal-drift-resolution.
  const emptyDoc = new ArrayBuffer(0);
  const predecessorHash = '';

  const hashInput = buildSealHashInput(
    emptyDoc,
    canonicalJson,
    sealedAtCanonical,
    sealedBy,
    predecessorHash,
  );

  const contentHash = await sha256(hashInput.buffer as ArrayBuffer);

  // ── STEP 10: INSERT SEAL ──────────────────────────────────────────
  const { data: seal, error: insertErr } = await supabase
    .from('incident_seals')
    .insert({
      organization_id: sealed.organization_id,
      location_id: sealed.location_id,
      incident_id: sealed.id,
      canonical_json: JSON.parse(canonicalJson),
      content_hash: contentHash,
      photo_hashes: photoHashes,
      sealed_at: sealedAtCanonical,
      sealed_by: sealedBy,
    })
    .select('id, content_hash, sealed_at')
    .single();

  if (insertErr || !seal) {
    console.error('[seal-incident] Seal insert failed:', insertErr?.message);
    return jsonResponse({ error: 'Failed to write incident seal' }, 500);
  }

  // ── STEP 11: POINT THE INCIDENT AT ITS SEAL ───────────────────────
  // Only seal_id moves — the lock trigger permits exactly that column.
  const { data: linked, error: linkErr } = await supabase
    .from('incidents')
    .update({ seal_id: seal.id })
    .eq('id', sealed.id)
    .select('id, seal_id')
    .single();

  if (linkErr || !linked?.seal_id) {
    console.error('[seal-incident] seal_id link failed:', linkErr?.message);
    return jsonResponse({ error: 'Seal written but incident could not be linked to it' }, 500);
  }

  // ── STEP 12: CONFIRMED SUCCESS ────────────────────────────────────
  console.log(
    `[seal-incident] Sealed: incident=${sealed.id} seal=${seal.id} ` +
    `hash=${contentHash.substring(0, 16)}… photos=${photoHashes.length}`,
  );

  return jsonResponse({
    seal_id: seal.id,
    content_hash: seal.content_hash,
    sealed_at: seal.sealed_at,
  });
});
