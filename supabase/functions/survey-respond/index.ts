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
import { sendEmail, buildEmailHtml } from '../_shared/email.ts';
import { QUESTION_META } from '../_shared/study-questions.ts';

const cors = PUBLIC_CORS_HEADERS;

const VALID_SOURCES = new Set(['call', 'show', 'email', 'social', 'page', 'cra', 'referral', 'client', 'other', 'research', 'stovio-home', 'stovio-food', 'stovio-fire', 'stovio-article']);

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

/* ── Study email senders ─────────────────────────────────────────── */

/* QUESTION_META imported from ../_shared/study-questions.ts */

const ANSWER_RANK: Record<string, number> = { no: 0, gap: 1, untracked: 2, tracked: 3 };
const ANSWER_LABEL: Record<string, string> = {
  no: 'Not on file', gap: 'Not in my hands',
  untracked: 'Have to find it', tracked: 'Ready to send',
};
const ANSWER_BG: Record<string, string> = {
  no: '#fef2f2', gap: '#fff7ed', untracked: '#fefce8', tracked: '#f0fdf4',
};

function freqLabel(f: string): string {
  const m: Record<string, string> = {
    monthly: 'Monthly', quarterly: 'Quarterly',
    semi_annual: 'Every 6 months', annual: 'Annually',
  };
  return m[f] || f;
}

function h3(text: string): string {
  return `<h3 style="color:#1E2D4D;border-bottom:2px solid #B24A2E;padding-bottom:4px;margin-top:28px;">${text}</h3>`;
}

function buildGapReportBody(
  county: string,
  // deno-lint-ignore no-explicit-any
  jur: Record<string, any> | null,
  answers: Array<{ question_id: string; value: string }>,
): string {
  const p: string[] = [];
  p.push(
    `<p>Here is your personalized gap report for <strong>${county} County</strong>, ` +
    `based on how this jurisdiction evaluates commercial kitchens and the answers ` +
    `you provided in the California Commercial Kitchen Safety Study.</p>`,
  );

  // deno-lint-ignore no-explicit-any
  const fc = jur?.fire_jurisdiction_config as Record<string, any> | null;

  /* ── Who inspects you ──────────────────────────────────────── */
  const fireAhj = fc?.fire_ahj_name || jur?.fire_ahj_name;
  if (jur?.agency_name || fireAhj) {
    let s = h3('Who Inspects You');
    if (jur.agency_name) s += `<p><strong>Food safety:</strong> ${jur.agency_name}</p>`;
    if (fireAhj) {
      s += `<p><strong>Fire safety:</strong> ${fireAhj}</p>`;
      if (fc?.ahj_split_notes) {
        s += `<p style="font-size:13px;color:#64748b;margin-top:2px;">${fc.ahj_split_notes}</p>`;
      }
    }
    p.push(s);
  }

  /* ── How this county grades ────────────────────────────────── */
  if (jur?.grading_type || jur?.grading_config) {
    const labels: Record<string, string> = {
      letter_grade: 'letter grades', pass_fail: 'pass / fail scoring',
      color_placard: 'color-coded placards', numeric: 'numeric scoring',
    };
    let s = h3('How This County Grades');
    s += `<p>This county uses <strong>${labels[jur.grading_type] || 'standard inspection reports'}</strong> to evaluate food safety inspections.</p>`;
    if (jur.scoring_methodology) {
      s += `<p style="font-size:13px;color:#475569;">${jur.scoring_methodology}</p>`;
    }
    p.push(s);
  }

  /* ── What it weights heaviest (violation_weight_map is nested JSONB) ── */
  const wm = jur?.violation_weight_map as Record<string, unknown> | null;
  if (wm && typeof wm === 'object' && Object.keys(wm).length > 0) {
    const desc = wm.methodology_description || wm.deduction_methodology;
    const rows: Array<{ label: string; pts: number }> = [];
    for (const [key, val] of Object.entries(wm)) {
      if (!val || typeof val !== 'object') continue;
      const v = val as Record<string, unknown>;
      const pts = typeof v.points === 'number' ? v.points
                : typeof v.points_max === 'number' ? v.points_max
                : typeof v.major === 'number' ? v.major
                : typeof v.out === 'number' ? v.out
                : null;
      if (pts !== null && pts > 0) {
        rows.push({ label: key.replace(/_/g, ' '), pts });
      }
    }
    rows.sort((a, b) => b.pts - a.pts);

    if (typeof desc === 'string' || rows.length > 0) {
      let s = h3('What It Weights Heaviest');
      if (typeof desc === 'string') {
        s += `<p style="font-size:13px;color:#475569;">${desc}</p>`;
      }
      if (rows.length > 0) {
        s += '<table style="width:100%;border-collapse:collapse;font-size:14px;">';
        for (const r of rows) {
          s += `<tr><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${r.label}</td>` +
            `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${r.pts} pts</td></tr>`;
        }
        s += '</table>';
      }
      p.push(s);
    }
  }

  /* ── Hood cleaning frequency ───────────────────────────────── */
  if (fc) {
    let s = h3('Hood Cleaning Frequency');
    if (jur?.hood_cleaning_default) {
      s += `<p>This county enforces <strong>${freqLabel(jur.hood_cleaning_default)}</strong> hood cleaning as the default schedule.</p>`;
    }
    // deno-lint-ignore no-explicit-any
    const t124 = fc.nfpa_96_table_12_4 as Record<string, any> | undefined;
    if (t124) {
      s += '<p style="margin-top:8px;">Your specific frequency depends on cooking volume (NFPA 96 Table 12.4):</p>';
      s += '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:4px;">';
      s += '<tr style="background:#f1f5f9;"><th style="padding:6px 8px;text-align:left;">Hood / Cooking Type</th>' +
        '<th style="padding:6px 8px;text-align:right;">Frequency</th></tr>';
      const rows: [string, string][] = [
        ['Type I \u2014 Heavy volume', t124.type_i_heavy_volume],
        ['Type I \u2014 Moderate volume', t124.type_i_moderate_volume],
        ['Type I \u2014 Low volume', t124.type_i_low_volume],
        ['Type II hood', t124.type_ii],
        ['Solid fuel cooking', t124.solid_fuel_cooking],
      ];
      for (const [lbl, freq] of rows) {
        if (freq) {
          s += `<tr><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${lbl}</td>` +
            `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;">${freqLabel(freq)}</td></tr>`;
        }
      }
      s += '</table>';
    }
    p.push(s);
  }

  /* ── Your record readiness — worst first ───────────────────── */
  const scored = answers
    .filter(a => QUESTION_META[a.question_id] && ANSWER_RANK[a.value] !== undefined)
    .sort((a, b) => (ANSWER_RANK[a.value] ?? 99) - (ANSWER_RANK[b.value] ?? 99));

  if (scored.length > 0) {
    let s = h3('Your Record Readiness');
    s += '<p>Sorted by gap severity \u2014 largest gaps first.</p>';
    s += '<p style="font-size:13px;color:#64748b;margin-top:4px;">These are your own answers, not an assessment of your kitchen. EvidLY has not inspected your facility.</p>';
    s += '<table style="width:100%;border-collapse:collapse;font-size:14px;">';
    s += '<tr style="background:#f1f5f9;"><th style="padding:6px 8px;text-align:left;">Record</th>' +
      '<th style="padding:6px 8px;text-align:left;">What you told us</th>' +
      '<th style="padding:6px 8px;text-align:right;">Citation</th></tr>';
    for (const a of scored) {
      const q = QUESTION_META[a.question_id];
      s += `<tr style="background:${ANSWER_BG[a.value] || '#fff'};">` +
        `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${q.label}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${ANSWER_LABEL[a.value] || a.value}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:12px;color:#64748b;">${q.citation}</td></tr>`;
    }
    s += '</table>';
    p.push(s);
  }

  if (p.length === 1) {
    p.push('<p style="color:#64748b;">We could not locate jurisdiction configuration for this county. ' +
      'When data becomes available, an updated report may follow.</p>');
  }

  return p.join('');
}

async function logSend(
  sb: ReturnType<typeof createClient>,
  responseId: string,
  emailType: string,
  email: string,
  result: { id: string } | null,
  errMsg?: string,
) {
  try {
    await sb.from('study_email_log').insert({
      response_id: responseId, email_type: emailType,
      recipient_email: email, resend_id: result?.id ?? null,
      status: result ? 'sent' : 'failed',
      error_message: errMsg ?? null,
    });
  } catch (e) { console.error('[STUDY-EMAIL] log insert failed', e); }
}

async function alreadySent(
  sb: ReturnType<typeof createClient>,
  responseId: string,
  emailType: string,
): Promise<boolean> {
  try {
    const { data } = await sb.from('study_email_log')
      .select('id').eq('response_id', responseId)
      .eq('email_type', emailType).eq('status', 'sent').limit(1);
    return (data?.length ?? 0) > 0;
  } catch { return false; }
}

async function sendGapReport(
  sb: ReturnType<typeof createClient>,
  responseId: string,
  email: string,
) {
  if (await alreadySent(sb, responseId, 'county_gap_report')) return;

  const { data: resp } = await sb.from('market_research_responses')
    .select('county, scope, kitchen_type, status')
    .eq('id', responseId).single();
  if (!resp?.county) {
    await logSend(sb, responseId, 'county_gap_report', email, null, 'No county on response');
    return;
  }
  if (resp.status !== 'completed') return; // not time yet — fires on completion

  const { data: jurs } = await sb.from('jurisdictions')
    .select('agency_name, grading_type, grading_config, scoring_methodology, violation_weight_map, fire_ahj_name, fire_jurisdiction_config, hood_cleaning_default')
    .eq('state', 'CA').eq('county', resp.county).eq('is_active', true).limit(1);

  const { data: answers } = await sb.from('market_research_answers')
    .select('question_id, value').eq('response_id', responseId);

  const bodyHtml = buildGapReportBody(resp.county, jurs?.[0] ?? null, answers || []);
  const html = buildEmailHtml({
    recipientName: 'there',
    bodyHtml,
    footerNote: 'You received this because you opted into a county gap report in the California Commercial Kitchen Safety Study.',
  });

  const result = await sendEmail({
    to: email,
    subject: `Your ${resp.county} County Kitchen Safety Gap Report`,
    html,
  });
  await logSend(sb, responseId, 'county_gap_report', email, result,
    result ? undefined : 'Resend send failed');
}

async function sendReferralEmail(
  sb: ReturnType<typeof createClient>,
  responseId: string,
  email: string,
) {
  if (await alreadySent(sb, responseId, 'referral_link')) return;

  const url = 'https://getevidly.com/study?from=referral';
  const html = buildEmailHtml({
    recipientName: 'there',
    bodyHtml:
      `<p>Thanks for completing the California Commercial Kitchen Safety Study.</p>` +
      `<p>You asked for a link you can share with a colleague who manages ` +
      `kitchen compliance. Forward this email or copy the link below.</p>` +
      `<p style="margin:16px 0;padding:12px 16px;background:#f1f5f9;border-radius:6px;word-break:break-all;">` +
      `<a href="${url}" style="color:#1E2D4D;font-weight:600;">${url}</a></p>` +
      `<p style="font-size:13px;color:#64748b;">The study takes about two minutes. ` +
      `It asks what safety records they can produce on demand \u2014 no login, no account required.</p>`,
    ctaText: 'Take the Study',
    ctaUrl: url,
    footerNote: 'You received this because you requested a referral link in the California Commercial Kitchen Safety Study.',
  });

  const result = await sendEmail({ to: email, subject: 'Share the California Commercial Kitchen Safety Study', html });
  await logSend(sb, responseId, 'referral_link', email, result,
    result ? undefined : 'Resend send failed');
}

/** Fire pending study emails for a response. Safe to call multiple times (deduped via log). */
async function trySendStudyEmails(
  sb: ReturnType<typeof createClient>,
  responseId: string,
) {
  const { data: rows } = await sb.from('market_research_contacts')
    .select('email, wants_county_report, wants_referral_link')
    .eq('response_id', responseId).limit(1);
  const c = rows?.[0];
  if (!c?.email) return;

  const jobs: Promise<void>[] = [];
  if (c.wants_county_report) jobs.push(sendGapReport(sb, responseId, c.email));
  if (c.wants_referral_link) jobs.push(sendReferralEmail(sb, responseId, c.email));
  if (jobs.length) await Promise.allSettled(jobs);
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

      // Study emails — county gap report + referral link (best-effort, deduped)
      if (c.email) {
        try { await trySendStudyEmails(sb, response_id); } catch { /* best-effort */ }
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
        if (VALID_SOURCES.has(value as string)) {
          responsePatch.source = value;
        } else {
          console.warn(`[survey-respond] Unrecognised source tag: "${value}" — remapped to "other"`);
          responsePatch.source = 'other';
        }
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

      // Study emails — fire gap report if contact opted in
      try { await trySendStudyEmails(sb, response_id); } catch { /* best-effort */ }
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
