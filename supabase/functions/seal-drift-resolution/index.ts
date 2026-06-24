// seal-drift-resolution — Prove step for Operational Intelligence
//
// Transitions a drift_catch open→proven AND creates an immutable sealed
// resolution record in drift_resolutions via the EXISTING SHA-256 engine.
//
// Input:  { drift_catch_id: uuid, resolution_note?: string }
// Auth:   JWT required. resolved_by / sealed_by = verified session user.
// Output: { id, content_hash, sealed_at, drift_catch_id } on success.
//
// The seal proves WHAT was resolved: the canonical hash includes the
// drift facts (drift_catch_id, drift_type, pillar, requirement_source,
// source_table, source_record_id, resolved_at, resolved_by).
//
// Both writes (INSERT drift_resolutions + UPDATE drift_catches.status)
// must succeed before returning success. No success-on-unconfirmed.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  canonicalTimestamp,
  buildCanonicalResolutionJson,
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // ── STEP 1: AUTHENTICATE ───────────────────────────────────────────
  // Extract auth.uid() from the caller's JWT. resolved_by / sealed_by
  // come ONLY from the verified token, never from client input.
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
  let body: { drift_catch_id?: string; resolution_note?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { drift_catch_id, resolution_note } = body;
  if (!drift_catch_id) {
    return jsonResponse({ error: 'drift_catch_id is required' }, 400);
  }

  // Service-role client for writes (bypasses RLS)
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

  // ── STEP 4: LOAD DRIFT CATCH ──────────────────────────────────────
  const { data: drift, error: driftErr } = await supabase
    .from('drift_catches')
    .select('id, drift_type, pillar, requirement_source, source_table, source_record_id, org_id, location_id, severity, status')
    .eq('id', drift_catch_id)
    .single();

  if (driftErr || !drift) {
    return jsonResponse({ error: 'Drift catch not found' }, 404);
  }

  // Verify drift belongs to caller's org
  if (drift.org_id !== profile.organization_id) {
    return jsonResponse({ error: 'Drift catch does not belong to your organization' }, 403);
  }

  // Only resolve open or reduced drift
  if (drift.status !== 'open' && drift.status !== 'reduced') {
    return jsonResponse({ error: `Drift catch is already ${drift.status} — cannot resolve` }, 409);
  }

  // ── STEP 5: BUILD CANONICAL SEAL ──────────────────────────────────
  const now = new Date();
  const sealedAtCanonical = canonicalTimestamp(now);
  const resolvedAtCanonical = sealedAtCanonical; // same moment

  const canonicalJson = buildCanonicalResolutionJson({
    drift_catch_id: drift.id,
    drift_type: drift.drift_type,
    pillar: drift.pillar,
    requirement_source: drift.requirement_source ?? null,
    source_table: drift.source_table,
    source_record_id: drift.source_record_id ?? null,
    resolved_at: resolvedAtCanonical,
    resolved_by: sealedBy,
  });

  // No document bytes for a resolution seal (empty ArrayBuffer)
  const emptyDoc = new ArrayBuffer(0);
  const predecessorHash = ''; // No supersession chain for resolutions

  const hashInput = buildSealHashInput(
    emptyDoc,
    canonicalJson,
    sealedAtCanonical,
    sealedBy,
    predecessorHash,
  );

  const contentHash = await sha256(hashInput.buffer as ArrayBuffer);

  // ── STEP 6: WRITE RESOLUTION + TRANSITION STATUS ──────────────────
  // Both writes must succeed. Insert the sealed resolution first, then
  // transition the drift catch. If either fails, return error.

  const { data: resolution, error: insertErr } = await supabase
    .from('drift_resolutions')
    .insert({
      drift_catch_id: drift.id,
      organization_id: drift.org_id,
      location_id: drift.location_id,
      pillar: drift.pillar,
      drift_type: drift.drift_type,
      requirement_source: drift.requirement_source,
      resolution_note: resolution_note || null,
      resolved_by: sealedBy,
      resolved_at: sealedAtCanonical,
      sealed_at: sealedAtCanonical,
      sealed_by: sealedBy,
      content_hash: contentHash,
    })
    .select('id, content_hash, sealed_at, drift_catch_id')
    .single();

  if (insertErr || !resolution) {
    console.error('[seal-drift-resolution] Insert failed:', insertErr?.message);
    return jsonResponse({ error: 'Failed to create resolution record' }, 500);
  }

  const { data: updatedDrift, error: updateErr } = await supabase
    .from('drift_catches')
    .update({
      status: 'proven',
      resolved_at: sealedAtCanonical,
      resolution_type: 'manual_resolve',
      updated_at: new Date().toISOString(),
    })
    .eq('id', drift.id)
    .select('id, status')
    .single();

  if (updateErr || !updatedDrift) {
    console.error('[seal-drift-resolution] Status update failed:', updateErr?.message);
    return jsonResponse({ error: 'Resolution created but status transition failed' }, 500);
  }

  // ── STEP 7: CONFIRMED SUCCESS ─────────────────────────────────────
  console.log(
    `[seal-drift-resolution] Sealed: drift=${drift.id} resolution=${resolution.id} ` +
    `hash=${contentHash.substring(0, 16)}… pillar=${drift.pillar}`,
  );

  return jsonResponse({
    id: resolution.id,
    content_hash: resolution.content_hash,
    sealed_at: resolution.sealed_at,
    drift_catch_id: resolution.drift_catch_id,
    status: updatedDrift.status,
  });
});
