/**
 * survey-response — public edge function for the market research survey.
 *
 * Actions:
 *   counties      → list CA jurisdictions for the county dropdown
 *   start         → create a response row, return its id
 *   save-section  → upsert one section's answers (save-per-section)
 *   complete      → stamp completed_at + create-or-update sales_pipeline row
 *
 * Auth: service_role (internal). No user session required.
 * CORS: public (wildcard) — the survey page is unauthenticated.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PUBLIC_CORS_HEADERS } from '../_shared/cors.ts';

const cors = PUBLIC_CORS_HEADERS;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

/* Survey segment → gtmReference SEGMENTS key (so ICP scoring works) */
const SEG_MAP: Record<string, string> = {
  'Independent restaurant':    'Full-Service Restaurant',
  'Multi-unit group':          'Multi-Location / Franchisee',
  'Hotel / resort / venue':    'Hotel F&B',
  'Healthcare / senior':       'Senior Living',
  'School / university':       'K-12 / University',
  'Grocery / casino / other':  'Grocery Prepared',
};

/* Survey kitchen_count text → numeric location_count for pipeline */
function locCount(kc: string | null): number {
  const m: Record<string, number> = { '1': 1, '2-5': 3, '6-20': 12, '21+': 25 };
  return m[kc ?? ''] ?? 1;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: cors });
  }

  try {
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    const action: string = body.action;

    // ── counties ─────────────────────────────────────────────
    if (action === 'counties') {
      const { data, error } = await sb
        .from('jurisdictions')
        .select('id, county')
        .eq('state', 'CA')
        .eq('is_active', true)
        .order('county');
      if (error) return json({ error: error.message }, 500);

      // Dedupe — some counties have multiple jurisdiction rows
      const seen = new Set<string>();
      const unique = (data || []).filter((r: { county: string }) => {
        if (seen.has(r.county)) return false;
        seen.add(r.county);
        return true;
      });
      return json({ counties: unique });
    }

    // ── start ────────────────────────────────────────────────
    if (action === 'start') {
      const { data, error } = await sb
        .from('market_research_responses')
        .insert({
          prospect_token: body.prospect_token || null,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ response_id: data.id });
    }

    // ── save-section ─────────────────────────────────────────
    if (action === 'save-section') {
      const { response_id, section, answers } = body;
      if (!response_id || !section || !answers) {
        return json({ error: 'Missing response_id, section, or answers' }, 400);
      }

      let patch: Record<string, unknown> = {};

      if (section === 1) {
        patch = {
          org_name:      answers.org_name      || null,
          contact_name:  answers.contact_name  || null,
          contact_email: answers.contact_email || null,
          segment:       answers.segment       || null,
          kitchen_count: answers.kitchen_count || null,
          county_id:     answers.county_id     || null,
          role:          answers.role           || null,
        };
      } else if (section === 2) {
        patch = {
          record_locations: answers.record_locations || null,
          due_discovery:    answers.due_discovery    || null,
          hardest_parts:    answers.hardest_parts    || null,
          asked_by:         answers.asked_by         || null,
        };
      } else if (section === 3) {
        patch = {
          would_pay_for: answers.would_pay_for || null,
          open_answer:   answers.open_answer   || null,
        };
      }

      const { error } = await sb
        .from('market_research_responses')
        .update(patch)
        .eq('id', response_id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // ── complete ─────────────────────────────────────────────
    if (action === 'complete') {
      const { response_id } = body;
      if (!response_id) return json({ error: 'Missing response_id' }, 400);

      // 1. Stamp completed_at
      const { error: stampErr } = await sb
        .from('market_research_responses')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', response_id);
      if (stampErr) return json({ error: stampErr.message }, 500);

      // 2. Read the completed response
      const { data: resp, error: readErr } = await sb
        .from('market_research_responses')
        .select('*')
        .eq('id', response_id)
        .single();
      if (readErr || !resp) return json({ ok: true, county: null });

      // 3. Resolve county name from jurisdiction id
      let countyName: string | null = null;
      if (resp.county_id) {
        const { data: jur } = await sb
          .from('jurisdictions')
          .select('county')
          .eq('id', resp.county_id)
          .single();
        countyName = jur?.county ?? null;
      }

      // 4. Create-or-update sales_pipeline row
      //    DEDUPE: case-insensitive match on org_name.
      //    If a row already exists → update (don't overwrite stage).
      //    If not → insert at stage 'prospect'.
      const orgName = (resp.org_name || '').trim();
      if (orgName) {
        const pipelineSegment = SEG_MAP[resp.segment] || resp.segment || null;
        const locationCount = locCount(resp.kitchen_count);
        const today = new Date().toISOString().split('T')[0];

        const { data: existing } = await sb
          .from('sales_pipeline')
          .select('id, stage')
          .ilike('org_name', orgName)
          .limit(1);

        if (existing && existing.length > 0) {
          // Existing row — enrich, don't downgrade stage
          const updates: Record<string, unknown> = {
            contact_name:  resp.contact_name  || undefined,
            contact_email: resp.contact_email || undefined,
            contact_title: resp.role          || undefined,
            segment:       pipelineSegment,
            location_count: locationCount,
            updated_at:    new Date().toISOString(),
          };
          // Strip undefined so we don't null-out existing data
          for (const k of Object.keys(updates)) {
            if (updates[k] === undefined) delete updates[k];
          }
          // Append a note rather than overwriting
          const noteAppend = `Survey completed ${today}`;
          const { data: current } = await sb
            .from('sales_pipeline')
            .select('notes')
            .eq('id', existing[0].id)
            .single();
          const existingNotes = current?.notes || '';
          updates.notes = existingNotes
            ? `${existingNotes}\n${noteAppend}`
            : noteAppend;

          await sb.from('sales_pipeline')
            .update(updates)
            .eq('id', existing[0].id);
        } else {
          // New row — insert at prospect stage
          await sb.from('sales_pipeline').insert({
            org_name:       orgName,
            contact_name:   resp.contact_name  || null,
            contact_email:  resp.contact_email || null,
            contact_title:  resp.role          || null,
            segment:        pipelineSegment,
            location_count: locationCount,
            stage:          'prospect',
            notes:          `Survey completed ${today}`,
          });
        }
      }

      return json({ ok: true, county: countyName });
    }

    return json({ error: `Unknown action: ${action}` }, 400);

  } catch (err) {
    console.error('survey-response error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
