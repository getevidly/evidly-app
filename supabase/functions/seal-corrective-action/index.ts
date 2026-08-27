// seal-corrective-action — evidentiary seal over a resolved/verified CA
//
// Input:  { corrective_action_id: uuid, verification_note?: string }
// Auth:   JWT required. sealed_by / verified_by = verified session user.
// Output: { seal_id, content_hash, sealed_at } on success.
//
// Same engine as seal-incident and seal-drift-resolution. A corrective action
// carries no photo evidence, so there are no document bytes and no photo
// hashes — the canonical hash covers the substantive columns, the history
// rows, and the notes jsonb.
//
// Both writes (INSERT corrective_action_seals + UPDATE corrective_actions
// .seal_id) must succeed before returning success. No success-on-unconfirmed.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  canonicalTimestamp,
  buildCanonicalCorrectiveActionJson,
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

// The substantive columns the seal attests to, plus notes and the current
// seal_id needed for the precondition.
const CA_COLUMNS =
  'id, organization_id, location_id, title, description, category, pillar, severity, ' +
  'status, source, source_type, source_id, assignee_id, assignee_name, ' +
  'assigned_by_user_id, assigned_at, root_cause, corrective_steps, ' +
  'preventive_measures, regulation_reference, due_date, completed_at, resolved_at, ' +
  'resolved_by, resolution_note, verified_at, verified_by, verification_note, ' +
  'created_by, created_at, notes, seal_id';

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
  let body: { corrective_action_id?: string; verification_note?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { corrective_action_id, verification_note } = body;
  if (!corrective_action_id) {
    return jsonResponse({ error: 'corrective_action_id is required' }, 400);
  }

  // Service-role client for reads/writes (bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceKey);

  // ── STEP 3: VERIFY ORG MEMBERSHIP ─────────────────────────────────
  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('organization_id, full_name')
    .eq('id', sealedBy)
    .single();

  if (profileErr || !profile) {
    return jsonResponse({ error: 'User profile not found' }, 403);
  }

  // ── STEP 4: LOAD CORRECTIVE ACTION ────────────────────────────────
  const { data: action, error: actionErr } = await supabase
    .from('corrective_actions')
    .select(CA_COLUMNS)
    .eq('id', corrective_action_id)
    .single();

  if (actionErr || !action) {
    return jsonResponse({ error: 'Corrective action not found' }, 404);
  }

  if (action.organization_id !== profile.organization_id) {
    return jsonResponse(
      { error: 'Corrective action does not belong to your organization' },
      403,
    );
  }

  // ── STEP 5: STATE PRECONDITION ────────────────────────────────────
  if (action.seal_id) {
    return jsonResponse(
      { error: `Corrective action is already sealed (seal ${action.seal_id}) — corrections supersede, never mutate` },
      409,
    );
  }

  if (action.status !== 'resolved' && action.status !== 'verified') {
    return jsonResponse(
      { error: `Corrective action is ${action.status} — only a resolved or verified action can be sealed` },
      409,
    );
  }

  // ── STEP 6: TRANSITION resolved → verified ────────────────────────
  // Sealing is the verification act. The history row matches the shape the
  // detail page writes (CorrectiveActionDetail.tsx status_changed entry).
  const now = new Date();
  const sealedAtCanonical = canonicalTimestamp(now);

  let sealed = action;

  if (action.status === 'resolved') {
    const verifyPatch: Record<string, unknown> = {
      status: 'verified',
      verified_at: sealedAtCanonical,
      verified_by: sealedBy,
    };
    if (verification_note) verifyPatch.verification_note = verification_note;

    const { error: verifyErr } = await supabase
      .from('corrective_actions')
      .update(verifyPatch)
      .eq('id', action.id);

    if (verifyErr) {
      console.error('[seal-corrective-action] Verify transition failed:', verifyErr.message);
      return jsonResponse({ error: 'Failed to verify corrective action before sealing' }, 500);
    }

    const { error: historyErr } = await supabase
      .from('corrective_action_history')
      .insert({
        corrective_action_id: action.id,
        action: 'status_changed',
        from_value: 'resolved',
        to_value: 'verified',
        performed_by: sealedBy,
        performed_by_name: profile.full_name || null,
        detail: verification_note || 'Status changed to verified',
      });

    if (historyErr) {
      console.error('[seal-corrective-action] History insert failed:', historyErr.message);
      return jsonResponse(
        { error: 'Corrective action verified but the history row could not be written' },
        500,
      );
    }

    const { data: reread, error: rereadErr } = await supabase
      .from('corrective_actions')
      .select(CA_COLUMNS)
      .eq('id', action.id)
      .single();

    if (rereadErr || !reread) {
      console.error('[seal-corrective-action] Re-read after verify failed:', rereadErr?.message);
      return jsonResponse(
        { error: 'Corrective action verified but could not be re-read for sealing' },
        500,
      );
    }
    sealed = reread;
  }

  // ── STEP 7: LOAD HISTORY ──────────────────────────────────────────
  const { data: history, error: historyReadErr } = await supabase
    .from('corrective_action_history')
    .select('id, action, from_value, to_value, performed_by, performed_by_name, detail, created_at')
    .eq('corrective_action_id', sealed.id)
    .order('created_at', { ascending: true });

  if (historyReadErr) {
    console.error('[seal-corrective-action] History read failed:', historyReadErr.message);
    return jsonResponse({ error: 'Failed to read corrective action history' }, 500);
  }

  // ── STEP 8: CANONICALIZE + HASH ───────────────────────────────────
  const canonicalJson = buildCanonicalCorrectiveActionJson({
    id: sealed.id,
    organization_id: sealed.organization_id,
    location_id: sealed.location_id,
    title: sealed.title,
    description: sealed.description,
    category: sealed.category,
    pillar: sealed.pillar,
    severity: sealed.severity,
    status: sealed.status,
    source: sealed.source,
    source_type: sealed.source_type,
    source_id: sealed.source_id,
    assignee_id: sealed.assignee_id,
    assignee_name: sealed.assignee_name,
    assigned_by_user_id: sealed.assigned_by_user_id,
    assigned_at: sealed.assigned_at,
    root_cause: sealed.root_cause,
    corrective_steps: sealed.corrective_steps,
    preventive_measures: sealed.preventive_measures,
    regulation_reference: sealed.regulation_reference,
    due_date: sealed.due_date,
    completed_at: sealed.completed_at,
    resolved_at: sealed.resolved_at,
    resolved_by: sealed.resolved_by,
    resolution_note: sealed.resolution_note,
    verified_at: sealed.verified_at,
    verified_by: sealed.verified_by,
    verification_note: sealed.verification_note,
    created_by: sealed.created_by,
    created_at: sealed.created_at,
    history: history ?? [],
    notes: sealed.notes ?? null,
  });

  // No document bytes for a corrective-action seal, and no supersession chain
  // on a first seal — same conventions as seal-drift-resolution.
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

  // ── STEP 9: INSERT SEAL ───────────────────────────────────────────
  const { data: seal, error: insertErr } = await supabase
    .from('corrective_action_seals')
    .insert({
      organization_id: sealed.organization_id,
      location_id: sealed.location_id,
      corrective_action_id: sealed.id,
      canonical_json: JSON.parse(canonicalJson),
      content_hash: contentHash,
      sealed_at: sealedAtCanonical,
      sealed_by: sealedBy,
    })
    .select('id, content_hash, sealed_at')
    .single();

  if (insertErr || !seal) {
    console.error('[seal-corrective-action] Seal insert failed:', insertErr?.message);
    return jsonResponse({ error: 'Failed to write corrective action seal' }, 500);
  }

  // ── STEP 10: POINT THE ACTION AT ITS SEAL ─────────────────────────
  // Only seal_id moves — the lock trigger permits exactly that column.
  const { data: linked, error: linkErr } = await supabase
    .from('corrective_actions')
    .update({ seal_id: seal.id })
    .eq('id', sealed.id)
    .select('id, seal_id')
    .single();

  if (linkErr || !linked?.seal_id) {
    console.error('[seal-corrective-action] seal_id link failed:', linkErr?.message);
    return jsonResponse(
      { error: 'Seal written but corrective action could not be linked to it' },
      500,
    );
  }

  // ── STEP 11: CONFIRMED SUCCESS ────────────────────────────────────
  console.log(
    `[seal-corrective-action] Sealed: action=${sealed.id} seal=${seal.id} ` +
    `hash=${contentHash.substring(0, 16)}… history=${(history ?? []).length}`,
  );

  return jsonResponse({
    seal_id: seal.id,
    content_hash: seal.content_hash,
    sealed_at: seal.sealed_at,
  });
});
