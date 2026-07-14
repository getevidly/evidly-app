// supabase/functions/mark-record-viewed/index.ts
//
// WHAT THIS DOES
//   One job: stamp journey_stages.record_viewed_at.
//   Runs on service_role because journey_stages RLS forbids client writes —
//   deliberately, so nobody can set their own billing date.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: 'token required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // service_role — bypasses RLS. journey_stages is not client-writable.
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Resolve the invite. Only a live invite counts as a view.
    const { data: invite, error: inviteErr } = await db
      .from('evidly_client_invites')
      .select('organization_id, status')
      .eq('token', token)
      .maybeSingle();

    if (inviteErr) throw inviteErr;
    if (!invite?.organization_id) {
      return new Response(JSON.stringify({ error: 'invite not found' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (invite.status !== 'pending') {
      // revoked / expired / already accepted — not a view worth recording
      return new Response(JSON.stringify({ ok: true, skipped: invite.status }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const orgId = invite.organization_id;

    // Read the current stage. Never move a journey backwards.
    const { data: stage } = await db
      .from('journey_stages')
      .select('record_viewed_at, current_stage')
      .eq('org_id', orgId)
      .maybeSingle();

    // Already viewed — idempotent, do nothing.
    if (stage?.record_viewed_at) {
      return new Response(JSON.stringify({ ok: true, already: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();

    if (!stage) {
      // No journey row yet — the invite was sent before journey_stages existed.
      await db.from('journey_stages').insert({
        org_id: orgId,
        invited_at: now,
        record_viewed_at: now,
        current_stage: 'record_viewed',
      });
    } else {
      // Only advance current_stage if we're still at 'invited'.
      // A kitchen further along must not be dragged back.
      const advance = stage.current_stage === 'invited';
      await db
        .from('journey_stages')
        .update({
          record_viewed_at: now,
          ...(advance ? { current_stage: 'record_viewed' } : {}),
        })
        .eq('org_id', orgId);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('mark-record-viewed:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
