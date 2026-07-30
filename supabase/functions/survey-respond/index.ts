/**
 * survey-respond — public edge function for the Kitchen Safety Study.
 *
 * POST { response_id, patch }   → upsert response + answers
 * POST { response_id, contact } → write contact row (opt-in only)
 *
 * Called after EVERY answer, not on submit. A session that dies at
 * question seven must leave a usable partial.
 *
 * Auth: service_role (internal). No user session required.
 * CORS: public (wildcard) — the /study page is unauthenticated.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PUBLIC_CORS_HEADERS } from '../_shared/cors.ts';

const cors = PUBLIC_CORS_HEADERS;

const VALID_SOURCES = new Set(['call', 'show', 'email', 'social', 'page', 'cra', 'other']);

/* Study kitchen_type → gtmReference SEGMENTS key (so ICP scoring works).
 * 'Hospital or senior living' maps to 'Senior Living' (fit 16). The survey
 * answer covers two canonical segments (Hospital 14, Senior Living 16) that
 * can only be separated by asking — which is not on the instrument. Do not
 * "correct" this to Hospital without splitting the question.
 * 'Other' is explicitly null — segment unknown, not a non-canonical string. */
const SEG_MAP: Record<string, string | null> = {
  'Full service restaurant':      'Full-Service Restaurant',
  'Quick service or fast casual': 'QSR',
  'Bar, brewery or tavern':       'Full-Service Restaurant',
  'Hotel, banquet or catering':   'Hotel F&B',
  'School or campus':             'K-12 / University',
  'Hospital or senior living':    'Senior Living',
  'Grocery, deli or commissary':  'Grocery Prepared',
  'Other':                        null,
};

/* Study kitchen_count text → numeric location_count for pipeline */
function locCount(kc: string | null): number {
  const m: Record<string, number> = {
    '1': 1, '2\u20133': 2, '4\u20139': 6, '10\u201324': 16, '25 or more': 25,
  };
  return m[kc ?? ''] ?? 1;
}

/* Create-or-update sales_pipeline row from study response + contact email */
async function writePipeline(
  sb: ReturnType<typeof createClient>,
  responseId: string,
  email: string,
) {
  const { data: resp } = await sb
    .from('market_research_responses')
    .select('kitchen_type, kitchen_count, county')
    .eq('id', responseId)
    .single();
  if (!resp) return;

  const pipelineSegment = resp.kitchen_type in SEG_MAP
    ? SEG_MAP[resp.kitchen_type]
    : (resp.kitchen_type || null);
  const locationCount = locCount(resp.kitchen_count);
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await sb
    .from('sales_pipeline')
    .select('id, notes')
    .ilike('contact_email', email)
    .limit(1);

  if (existing && existing.length > 0) {
    const noteAppend = `Study completed ${today}`;
    const existingNotes = existing[0].notes || '';
    const updates: Record<string, unknown> = {
      segment: pipelineSegment,
      location_count: locationCount,
      updated_at: new Date().toISOString(),
      notes: existingNotes ? `${existingNotes}\n${noteAppend}` : noteAppend,
    };
    if (resp.county) updates.county = resp.county;
    await sb.from('sales_pipeline').update(updates).eq('id', existing[0].id);
  } else {
    // org_name is NOT NULL — derive from email domain
    const orgName = email.split('@')[1]?.split('.')[0] || 'Unknown';
    await sb.from('sales_pipeline').insert({
      org_name: orgName,
      contact_email: email,
      segment: pipelineSegment,
      location_count: locationCount,
      county: resp.county || null,
      stage: 'prospect',
      source: 'study',
      notes: `Study completed ${today}`,
    });
  }
}

// Simple IP-based rate limiter: max 60 requests per minute per IP
const rateMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW = 60_000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// Columns allowed in a response patch — prevents injection of unexpected fields
const RESPONSE_FIELDS = new Set([
  'status', 'instrument_version', 'source', 'source_platform', 'source_method',
  'scope', 'county', 'kitchen_type', 'kitchen_count', 'system', 'record_owner',
  'speed', 'askers', 'completed_at', 'duration_seconds', 'interviewer_id',
]);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: cors });
  }

  try {
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

    // Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('cf-connecting-ip')
      || 'unknown';
    if (isRateLimited(ip)) {
      return json({ error: 'Rate limited' }, 429);
    }

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();

    // ── counties action (CA jurisdiction list for dropdown) ─────
    if (body.action === 'counties') {
      const { data, error } = await sb
        .from('jurisdictions')
        .select('id, county')
        .eq('state', 'CA')
        .eq('is_active', true)
        .order('county');
      if (error) return json({ error: error.message }, 500);
      const seen = new Set<string>();
      const unique = (data || []).filter((r: { county: string }) => {
        if (seen.has(r.county)) return false;
        seen.add(r.county);
        return true;
      });
      return json({ counties: unique });
    }

    const { response_id } = body;

    if (!response_id) {
      return json({ error: 'Missing response_id' }, 400);
    }

    // ── Contact payload ─────────────────────────────────────────
    if (body.contact) {
      const c = body.contact;
      // Only write if at least one consent flag is true
      const hasConsent = c.wants_findings || c.wants_county_report
        || c.wants_referral_link || c.wants_meeting;
      if (!hasConsent) {
        return json({ ok: true, response_id });
      }

      const { error } = await sb
        .from('market_research_contacts')
        .upsert({
          response_id,
          email: c.email || null,
          wants_findings: !!c.wants_findings,
          wants_county_report: !!c.wants_county_report,
          wants_referral_link: !!c.wants_referral_link,
          wants_meeting: !!c.wants_meeting,
        }, { onConflict: 'response_id' });
      // Note: onConflict on response_id needs a unique index; for now we just insert
      // since each response should only have one contact row.
      if (error) {
        // If duplicate, try update instead
        if (error.code === '23505') {
          await sb
            .from('market_research_contacts')
            .update({
              email: c.email || null,
              wants_findings: !!c.wants_findings,
              wants_county_report: !!c.wants_county_report,
              wants_referral_link: !!c.wants_referral_link,
              wants_meeting: !!c.wants_meeting,
            })
            .eq('response_id', response_id);
        } else {
          return json({ error: error.message }, 500);
        }
      }

      // Pipeline write — only when the respondent opts into a meeting (sales consent)
      if (c.wants_meeting && c.email) {
        try { await writePipeline(sb, response_id, c.email.trim()); } catch { /* best-effort */ }
      }
      return json({ ok: true, response_id });
    }

    // ── Response + answers patch ─────────────────────────────────
    const patch = body.patch;
    if (!patch) {
      return json({ error: 'Missing patch or contact' }, 400);
    }

    // Build the response row update
    const responsePatch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const [key, value] of Object.entries(patch)) {
      if (key === 'answers') continue; // handled separately
      if (!RESPONSE_FIELDS.has(key)) continue; // ignore unknown fields

      if (key === 'source') {
        // Validate source against enum
        responsePatch.source = VALID_SOURCES.has(value as string) ? value : 'other';
      } else {
        responsePatch[key] = value;
      }
    }

    // Upsert the response row (insert if new, update if exists)
    const { error: upsertErr } = await sb
      .from('market_research_responses')
      .upsert({
        id: response_id,
        ...responsePatch,
      }, { onConflict: 'id' });

    if (upsertErr) {
      return json({ error: upsertErr.message }, 500);
    }

    // Pipeline write on completion — only if a contact with wants_meeting exists
    if (responsePatch.status === 'completed') {
      try {
        const { data: contact } = await sb
          .from('market_research_contacts')
          .select('email, wants_meeting')
          .eq('response_id', response_id)
          .single();
        if (contact?.wants_meeting && contact?.email) {
          await writePipeline(sb, response_id, contact.email);
        }
      } catch { /* best-effort — contact may not exist yet */ }
    }

    // Upsert answers if present
    const answers = patch.answers;
    if (answers && Array.isArray(answers)) {
      for (const ans of answers) {
        if (!ans.question_id || !ans.value) continue;

        const { error: ansErr } = await sb
          .from('market_research_answers')
          .upsert({
            response_id,
            question_id: ans.question_id,
            value: ans.value,
            answered_at: new Date().toISOString(),
          }, { onConflict: 'response_id,question_id' });

        if (ansErr) {
          console.error('Answer upsert error:', ansErr.message);
          // Continue — don't fail the whole request for one answer
        }
      }
    }

    return json({ ok: true, response_id });

  } catch (err) {
    console.error('survey-respond error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
