/**
 * survey-respond — public edge function for the Kitchen Safety Study.
 *
 * POST { response_id, patch }                → upsert response + answers
 * POST { response_id, delete_answers: [...] } → remove stale answer rows
 * POST { response_id, contact }               → write contact row (opt-in only)
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

// Placeholder — replace with per-touch-type ladders when follow-up cadence rules are defined
const DEFAULT_FOLLOW_UP_DAYS = 3;

const VALID_SOURCES = new Set(['call', 'show', 'email', 'social', 'page', 'cra', 'referral', 'client', 'other', 'research', 'stovio-home', 'stovio-food', 'stovio-fire', 'stovio-article', 'assessment']);

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
    const followUpDate = new Date(Date.now() + DEFAULT_FOLLOW_UP_DAYS * 86400000).toISOString().split('T')[0];
    await sb.from('sales_pipeline').insert({
      org_name: orgName,
      contact_email: email,
      segment: pipelineSegment,
      location_count: locationCount,
      county: resp.county || null,
      stage: 'prospect',
      source: 'study',
      notes: `Study completed ${today}`,
      next_action_at: followUpDate,
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

  /* ── Hood cleaning frequency ───────────────────────────────────
   * The county does not set this interval, so neither hood_cleaning_default
   * nor the Table 12.4 rows are stated as county enforcement. NFPA 96 sets
   * it, by what the kitchen cooks. Removed, not reworded. */
  if (fc) {
    let s = h3('Fire Safety Standards');
    s += '<p>NFPA 96 Table 12.4 sets the interval by what the kitchen '
      + 'cooks: monthly for solid fuel, quarterly for high-volume cooking, '
      + 'semiannually for moderate volume, annually for low-volume or '
      + 'seasonal cooking.</p>';
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
    .select('agency_name, grading_type, grading_config, scoring_methodology, violation_weight_map, fire_ahj_name, fire_jurisdiction_config')
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

  const url = 'https://getstovio.com/study/?from=referral';
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

/* ── Risk Assessment findings email ───────────────────────────────
 * Only for responses whose source is 'assessment'. The study senders
 * above are untouched — this is an additional branch, not a variant. */

const RA_RATING_RANK: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3, onfile: 4, unrated: 5,
};
const RA_RATING_LABEL: Record<string, string> = {
  critical: 'Critical', high: 'High', medium: 'Medium',
  low: 'Low', onfile: 'On file', unrated: 'Not rated',
};
/* rating → days from completion until the record is due. 'onfile' has no
 * offset — it keeps whatever date the operator already has scheduled.
 * 'unrated' is the policy question when the answer was not "yes": it is
 * never given a band, but it still earns a week. */
const RA_DUE_DAYS: Record<string, number> = {
  critical: 1, high: 3, medium: 7, low: 14, unrated: 7,
};
/* Plan ordering — bands in severity order, then the policy question,
 * then everything already on file, last. */
const RA_PLAN_RANK: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3, unrated: 4, onfile: 9,
};

interface RaRecordDef { label: string; pillar: 'fire' | 'food'; }

/* The fourteen records the assessment rates, in page order — fire first,
 * then food. Labels match what the respondent saw on screen (the RECORDS
 * table in evidly-landing src/lib/riskAssessmentRating.ts) so the email
 * and the page name the same record the same way.
 *
 * The page's third pillar, 'policy' — the protective safeguards
 * endorsement — reads under Fire Safety here: it is the insurance
 * condition on the fire safeguards listed above it, and the document
 * has only the two tables.
 *
 * QUESTION_META is NOT the source for this list. It knows only ten of
 * the fourteen, which is why permit, cfpm, pest and pse were missing
 * from the register. */
const RA_RECORDS: Record<string, RaRecordDef> = {
  hood:    { label: 'Hood and duct cleaning',            pillar: 'fire' },
  supp:    { label: 'Hood suppression service',          pillar: 'fire' },
  sprink:  { label: 'Fire sprinkler inspection',         pillar: 'fire' },
  alarm:   { label: 'Fire alarm service',                pillar: 'fire' },
  ext:     { label: 'Extinguisher service',              pillar: 'fire' },
  vins:    { label: 'Vendor insurance certificates',     pillar: 'fire' },
  pse:     { label: 'Protective safeguards endorsement', pillar: 'fire' },
  permit:  { label: 'Health permit',                     pillar: 'food' },
  cfpm:    { label: 'Food safety manager certificate',   pillar: 'food' },
  handler: { label: 'Food handler cards',                pillar: 'food' },
  cool:    { label: 'Cooling records',                   pillar: 'food' },
  hold:    { label: 'Hot and cold holding logs',         pillar: 'food' },
  sanit:   { label: 'Sanitizer concentration records',   pillar: 'food' },
  pest:    { label: 'Pest control service',              pillar: 'food' },
};
const RA_RECORD_ORDER: string[] = Object.keys(RA_RECORDS);

/* Pill colours — foreground on its own pale ground. */
const RA_PILL: Record<string, { fg: string; bg: string }> = {
  critical: { fg: '#A8352A', bg: '#F7E9E7' },
  high:     { fg: '#B24A2E', bg: '#F8EBE5' },
  medium:   { fg: '#7A5B14', bg: '#F6F0DF' },
  low:      { fg: '#33556E', bg: '#E8EEF4' },
  onfile:   { fg: '#33613F', bg: '#E6F0E9' },
  unrated:  { fg: '#5A5A5A', bg: '#EFEFEF' },
};

const RA_DAY_MS = 86_400_000;
const RA_REASSESS_DAYS = 90;
const RA_PREFIX = 'ra_rating_';

/* The wrapper (buildEmailHtml) carries no heading or table styles — it is
 * a 600px Inter column with a padded body slot. These are the only styles
 * the document adds, and they are inline so every client honours them. */
const RA_H2 = "margin:28px 0 8px 0;font-family:'Inter',Arial,sans-serif;"
  + 'font-size:16px;line-height:22px;font-weight:700;color:#1E2D4D;';
const RA_TABLE = 'width:100%;max-width:600px;border-collapse:collapse;'
  + 'margin:0 0 4px 0;';
const RA_TH = 'padding:0 8px 6px 0;text-align:left;font-size:10px;'
  + 'letter-spacing:.06em;text-transform:uppercase;color:#94a3b8;'
  + "font-weight:600;border-bottom:1px solid #E6E8EC;font-family:'Inter',Arial,sans-serif;";
const RA_TD = 'padding:9px 8px 9px 0;border-bottom:1px solid #E6E8EC;'
  + 'vertical-align:top;';
const RA_NAME = "font-family:'Inter',Arial,sans-serif;font-size:14px;"
  + 'line-height:20px;color:#1E2D4D;';
const RA_WHY = "font-family:'Inter',Arial,sans-serif;font-size:12px;"
  + 'line-height:18px;color:#6B7280;';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function raDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

/** County arrives as a slug ('merced'); the document shows it as written. */
function raCounty(county: string | null): string {
  if (!county) return '';
  return county.split(/[\s_-]+/).filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

interface RaRow {
  id: string;
  idx: number;
  label: string;
  pillar: 'fire' | 'food';
  rating: string;
  reason: string;
  action: string;
  owner: string;
}

/**
 * Every record the respondent was rated on — driven by the ra_rating_<id>
 * answers themselves, not by a fixed list, so a record the page adds
 * later appears here without a change to this function.
 */
function raRows(byId: Map<string, string>): RaRow[] {
  const ids: string[] = [];
  for (const key of byId.keys()) {
    if (key.startsWith(RA_PREFIX)) ids.push(key.slice(RA_PREFIX.length));
  }

  return ids
    .map((id): RaRow => {
      const def = RA_RECORDS[id];
      const known = RA_RECORD_ORDER.indexOf(id);
      return {
        id,
        /* Unknown ids sort after the fourteen rather than ahead of them. */
        idx: known === -1 ? RA_RECORD_ORDER.length : known,
        label: def?.label ?? QUESTION_META[id]?.label ?? id,
        pillar: def?.pillar ?? 'food',
        rating: byId.get(RA_PREFIX + id) ?? '',
        reason: byId.get(`ra_reason_${id}`) ?? '',
        action: byId.get(`ra_action_${id}`) ?? '',
        owner: byId.get(`ra_owner_${id}`) ?? '',
      };
    })
    .filter(r => RA_RATING_RANK[r.rating] !== undefined)
    .sort((a, b) =>
      (RA_RATING_RANK[a.rating] - RA_RATING_RANK[b.rating]) || (a.idx - b.idx));
}

/** "7 Critical, 4 Medium, and 2 of 14 records you could send today." */
function raSummary(rows: RaRow[]): string {
  const parts: string[] = [];
  for (const band of ['critical', 'high', 'medium', 'low']) {
    const n = rows.filter(r => r.rating === band).length;
    if (n > 0) parts.push(`${n} ${RA_RATING_LABEL[band]}`);
  }
  const ready = rows.filter(r => r.rating === 'onfile').length;
  const tail = `${ready} of ${rows.length} records you could send today.`;
  return parts.length ? `${parts.join(', ')}, and ${tail}` : tail;
}

function raPill(rating: string): string {
  const c = RA_PILL[rating] ?? RA_PILL.unrated;
  return '<span style="display:inline-block;padding:2px 8px;border-radius:10px;'
    + `background:${c.bg};color:${c.fg};font-size:11px;line-height:16px;`
    + `font-weight:600;white-space:nowrap;font-family:'Inter',Arial,sans-serif;">`
    + `${RA_RATING_LABEL[rating] ?? 'Not rated'}</span>`;
}

/** Due date for a row — on-file records keep the date already scheduled. */
function raDue(rating: string, completedAt: Date): string {
  const days = RA_DUE_DAYS[rating];
  return days === undefined
    ? 'Next date on your calendar'
    : raDate(new Date(completedAt.getTime() + days * RA_DAY_MS));
}

/** Record | Rating | Why, for one pillar. */
function raPillarTable(rows: RaRow[]): string {
  const body = rows.map(r =>
    `<tr><td style="${RA_TD}${RA_NAME}width:44%;">${esc(r.label)}</td>`
    + `<td style="${RA_TD}width:20%;">${raPill(r.rating)}</td>`
    + `<td style="${RA_TD}${RA_WHY}width:36%;">${esc(r.reason)}</td></tr>`,
  ).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="${RA_TABLE}">`
    + `<tr><th style="${RA_TH}">Record</th><th style="${RA_TH}">Rating</th>`
    + `<th style="${RA_TH}">Why</th></tr>${body}</table>`;
}

/**
 * The plan. Action and Owner are shown only when the page actually sent
 * ra_action_<id> / ra_owner_<id>; today it sends neither, so the table
 * renders Record | Rating | Due.
 */
function raPlanTable(rows: RaRow[], completedAt: Date): string {
  const withText = rows.some(r => r.action || r.owner);
  const ordered = [...rows].sort((a, b) =>
    (RA_PLAN_RANK[a.rating] - RA_PLAN_RANK[b.rating]) || (a.idx - b.idx));

  const head = withText
    ? ['Record', 'Action', 'Owner', 'Due']
    : ['Record', 'Rating', 'Due'];
  const ths = head.map(h => `<th style="${RA_TH}">${h}</th>`).join('');

  const body = ordered.map(r => {
    const due = raDue(r.rating, completedAt);
    const cells = withText
      ? `<td style="${RA_TD}${RA_NAME}width:28%;">${esc(r.label)}</td>`
        + `<td style="${RA_TD}${RA_WHY}width:34%;">${esc(r.action)}</td>`
        + `<td style="${RA_TD}${RA_WHY}width:18%;">${esc(r.owner)}</td>`
        + `<td style="${RA_TD}${RA_WHY}width:20%;">${esc(due)}</td>`
      : `<td style="${RA_TD}${RA_NAME}width:44%;">${esc(r.label)}</td>`
        + `<td style="${RA_TD}width:20%;">${raPill(r.rating)}</td>`
        + `<td style="${RA_TD}${RA_WHY}width:36%;">${esc(due)}</td>`;
    return `<tr>${cells}</tr>`;
  }).join('');

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="${RA_TABLE}">`
    + `<tr>${ths}</tr>${body}</table>`;
}

const RA_TITLE = 'Your Commercial Kitchen Risk Assessment';

const RA_INTRO = 'Here is the Risk Assessment you took on getevidly.com. It '
  + 'rates each of the fourteen records a commercial kitchen can be asked to '
  + 'produce — by what kind of record it is and how far past its interval '
  + 'it is — and gives you a plan with a date for each one. Keep the '
  + 'reference number; it identifies this assessment if you send it to your '
  + 'carrier or your property manager.';

/* True when the write failed only because market_research_contacts.name is
 * absent — migration 20261228000000 not yet applied to this database.
 * PostgREST answers PGRST204 from its schema cache; Postgres itself answers
 * 42703 when the cache is stale rather than empty. Both mean the same thing. */
// deno-lint-ignore no-explicit-any
function raMissingNameColumn(err: any): boolean {
  if (!err) return false;
  return err.code === 'PGRST204' || err.code === '42703'
    || /'?name'? column/i.test(err.message ?? '');
}

/** "Hi Arthur," when the contact row carries a name, otherwise "Hi,". */
function raGreeting(contactName: string | null): string {
  const first = (contactName ?? '').trim().split(/\s+/)[0] ?? '';
  return first ? `Hi ${first},` : 'Hi,';
}

const RA_DISCLAIMER = 'This assessment was produced by EvidLY from your '
  + 'answers on getevidly.com/risk-assessment. It is not an inspection '
  + 'and not a coverage determination.';

/** The findings document, HTML, for the standard wrapper's body slot. */
function buildAssessmentFindingsBody(
  county: string | null,
  assessmentId: string,
  completedAt: Date,
  answers: Array<{ question_id: string; value: string }>,
  contactName: string | null,
): string {
  const byId = new Map<string, string>();
  for (const a of answers) byId.set(a.question_id, a.value);

  const rows = raRows(byId);
  const reassess = new Date(completedAt.getTime() + RA_REASSESS_DAYS * RA_DAY_MS);
  const countyName = raCounty(county);

  const p: string[] = [];

  p.push(
    `<h2 style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:20px;`
    + `line-height:26px;font-weight:700;color:#1E2D4D;">${RA_TITLE}</h2>`,
  );
  p.push(
    `<p style="margin:6px 0 0 0;font-family:'SFMono-Regular',Consolas,`
    + `'Liberation Mono',Menlo,monospace;font-size:12px;line-height:18px;`
    + `color:#6B7280;">`
    + `${countyName ? `${esc(countyName)} County &middot; ` : ''}`
    + `Taken ${raDate(completedAt)} &middot; Re-assess by ${raDate(reassess)}`
    + ` &middot; ${rows.length} record${rows.length === 1 ? '' : 's'}`
    + ` &middot; Reference ${esc(assessmentId)}</p>`,
  );
  p.push(`<p style="${RA_NAME}margin:24px 0 0 0;">`
    + `${esc(raGreeting(contactName))}</p>`);
  p.push(`<p style="${RA_NAME}margin:12px 0 0 0;">${RA_INTRO}</p>`);

  if (rows.length === 0) {
    p.push(`<p style="${RA_NAME}margin:24px 0 0 0;">No rated records were `
      + 'recorded on this assessment.</p>');
  } else {
    p.push(`<h2 style="${RA_H2}">What this says</h2>`);
    p.push(`<p style="${RA_NAME}margin:0;">${esc(raSummary(rows))}</p>`);

    /* Fire is always first. */
    const fire = rows.filter(r => r.pillar === 'fire');
    const food = rows.filter(r => r.pillar === 'food');
    if (fire.length) {
      p.push(`<h2 style="${RA_H2}">Fire Safety</h2>`);
      p.push(raPillarTable(fire));
    }
    if (food.length) {
      p.push(`<h2 style="${RA_H2}">Food Safety</h2>`);
      p.push(raPillarTable(food));
    }

    p.push(`<h2 style="${RA_H2}">Your plan</h2>`);
    p.push(raPlanTable(rows, completedAt));
  }

  p.push(`<p style="${RA_NAME}margin:28px 0 0 0;">Re-assess by `
    + `${raDate(reassess)}.</p>`);
  p.push(`<p style="${RA_WHY}margin:16px 0 0 0;">${RA_DISCLAIMER}</p>`);

  return p.join('');
}

/** The same document, same order, no markup — the text/plain alternative. */
function buildAssessmentFindingsText(
  county: string | null,
  assessmentId: string,
  completedAt: Date,
  answers: Array<{ question_id: string; value: string }>,
  contactName: string | null,
): string {
  const byId = new Map<string, string>();
  for (const a of answers) byId.set(a.question_id, a.value);

  const rows = raRows(byId);
  const reassess = new Date(completedAt.getTime() + RA_REASSESS_DAYS * RA_DAY_MS);
  const countyName = raCounty(county);

  const out: string[] = [];
  out.push(RA_TITLE);
  out.push(
    `${countyName ? `${countyName} County · ` : ''}`
    + `Taken ${raDate(completedAt)} · Re-assess by ${raDate(reassess)}`
    + ` · ${rows.length} record${rows.length === 1 ? '' : 's'}`
    + ` · Reference ${assessmentId}`,
  );
  out.push('', raGreeting(contactName), '', RA_INTRO);

  if (rows.length === 0) {
    out.push('', 'No rated records were recorded on this assessment.');
  } else {
    out.push('', 'WHAT THIS SAYS', raSummary(rows));

    const section = (title: string, list: RaRow[]) => {
      if (!list.length) return;
      out.push('', title.toUpperCase());
      for (const r of list) {
        out.push(`  ${r.label} — ${RA_RATING_LABEL[r.rating]}`
          + `${r.reason ? ` — ${r.reason}` : ''}`);
      }
    };
    section('Fire Safety', rows.filter(r => r.pillar === 'fire'));
    section('Food Safety', rows.filter(r => r.pillar === 'food'));

    out.push('', 'YOUR PLAN');
    const withText = rows.some(r => r.action || r.owner);
    const ordered = [...rows].sort((a, b) =>
      (RA_PLAN_RANK[a.rating] - RA_PLAN_RANK[b.rating]) || (a.idx - b.idx));
    for (const r of ordered) {
      const due = raDue(r.rating, completedAt);
      out.push(withText
        ? `  ${r.label} — ${r.action} — ${r.owner} — ${due}`
        : `  ${r.label} — ${RA_RATING_LABEL[r.rating]} — ${due}`);
    }
  }

  out.push('', `Re-assess by ${raDate(reassess)}.`);
  out.push('', RA_DISCLAIMER);

  return out.join('\n');
}

async function sendAssessmentFindings(
  sb: ReturnType<typeof createClient>,
  responseId: string,
  email: string,
  county: string | null,
  completedAt: string | null,
) {
  if (await alreadySent(sb, responseId, 'assessment_findings')) return;

  const { data: answers } = await sb.from('market_research_answers')
    .select('question_id, value').eq('response_id', responseId);

  const rows = (answers || []) as Array<{ question_id: string; value: string }>;
  const assessmentId =
    rows.find(a => a.question_id === 'ra_assessment_id')?.value ?? '';
  if (!assessmentId) {
    await logSend(sb, responseId, 'assessment_findings', email, null,
      'No ra_assessment_id on response');
    return;
  }

  /* The greeting's name. Its own query rather than a column on the shared
   * contact select in trySendStudyEmails, so the study senders are untouched
   * and a missing column (migration 20260914120000 not yet applied) costs
   * this email a first name instead of failing every study email. */
  let contactName: string | null = null;
  try {
    const { data: contact } = await sb.from('market_research_contacts')
      .select('name').eq('response_id', responseId).limit(1);
    contactName = (contact?.[0] as { name?: string } | undefined)?.name ?? null;
  } catch { /* column absent — fall back to "Hi," */ }

  const completed = completedAt ? new Date(completedAt) : new Date();
  const bodyHtml = buildAssessmentFindingsBody(
    county, assessmentId, completed, rows, contactName);
  const html = buildEmailHtml({
    recipientName: 'there',
    bodyHtml,
    /* The body opens with its own heading and greeting — the wrapper's
     * "Hi there," would sit above a document that is not a letter. */
    skipGreeting: true,
    category: RA_CATEGORY,
    footerNote: 'You received this because you asked for your findings when you completed the EvidLY Risk Assessment.',
  });
  const text = buildAssessmentFindingsText(
    county, assessmentId, completed, rows, contactName);

  const result = await sendEmail({
    to: email,
    subject: `${RA_TITLE}${county ? ` — ${raCounty(county)}` : ''}`,
    html,
    text,
  });
  await logSend(sb, responseId, 'assessment_findings', email, result,
    result ? undefined : 'Resend send failed');
}

/* ── Risk Assessment: the county-requirements and referral emails ──
 * The assessment path's counterparts to sendGapReport and
 * sendReferralEmail. Separate builders and senders on purpose: the two
 * Study functions above are left byte-identical, and neither of these
 * may name the Study or link getstovio.com. */

const RA_URL = 'https://www.getevidly.com/risk-assessment';
const RA_CATEGORY = 'Commercial Kitchen Risk Management';

/** The wrapper's CTA button, rendered inside the body so the disclaimer
 *  stays the last line of every assessment email. */
function raButton(text: string, url: string): string {
  return '<div style="text-align:center;margin:24px 0 0 0;">'
    + `<a href="${url}" style="background:#1E2D4D;color:#ffffff;`
    + 'padding:14px 32px;border-radius:8px;text-decoration:none;'
    + `font-weight:600;display:inline-block;">${text}</a></div>`;
}

/** First name for the greeting. Tolerates the `name` column being absent
 *  (migration 20260914120000) the same way sendAssessmentFindings does —
 *  a missing column costs a first name, never the email. */
async function raContactName(
  sb: ReturnType<typeof createClient>,
  responseId: string,
): Promise<string | null> {
  try {
    const { data } = await sb.from('market_research_contacts')
      .select('name').eq('response_id', responseId).limit(1);
    return (data?.[0] as { name?: string } | undefined)?.name ?? null;
  } catch { return null; }
}

/* The jurisdiction requirement sections, fire first then food — the order
 * the assessment's own opening line promises, and the order the findings
 * email uses. Section content is the gap report's, unchanged. The record
 * readiness table is deliberately absent: the rated register lives in the
 * findings email, which this email's closing line points at. */
function buildAssessmentCountySections(
  // deno-lint-ignore no-explicit-any
  jur: Record<string, any> | null,
): string[] {
  const p: string[] = [];
  // deno-lint-ignore no-explicit-any
  const fc = jur?.fire_jurisdiction_config as Record<string, any> | null;
  const fireAhj = fc?.fire_ahj_name || jur?.fire_ahj_name;

  /* ── Who inspects you — fire first ─────────────────────────── */
  if (jur?.agency_name || fireAhj) {
    let s = h3('Who Inspects You');
    if (fireAhj) {
      s += `<p><strong>Fire safety:</strong> ${fireAhj}</p>`;
      if (fc?.ahj_split_notes) {
        s += `<p style="font-size:13px;color:#64748b;margin-top:2px;">${fc.ahj_split_notes}</p>`;
      }
    }
    if (jur?.agency_name) s += `<p><strong>Food safety:</strong> ${jur.agency_name}</p>`;
    p.push(s);
  }

  /* ── Fire: the authority and the standards, no interval ──────
   * A county does not set the hood-cleaning interval — NFPA 96 does, and
   * what the kitchen cooks decides which interval applies. Stating
   * hood_cleaning_default or the Table 12.4 rows here read as county
   * requirements, which they are not. Both are gone, not reworded. */
  {
    let s = h3('Fire Safety Standards');
    s += '<p>Hood and duct cleaning follows NFPA 96, on the interval set by '
      + 'what the kitchen cooks: monthly for solid fuel, quarterly for '
      + 'high-volume, semiannually for moderate volume, annually for low '
      + 'volume. Suppression, sprinkler, alarm and extinguisher service '
      + 'follow NFPA 17A, 25, 72 and 10 on their own schedules.';
    if (fireAhj) s += ` Your fire authority is ${fireAhj}.`;
    s += '</p>';
    p.push(s);
  }

  /* ── Food: how this county grades ──────────────────────────── */
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

  /* ── Food: what it weights heaviest ────────────────────────── */
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

  return p;
}

/** EDIT B — what the county requires, on the assessment path. */
function buildAssessmentCountyBody(
  county: string,
  // deno-lint-ignore no-explicit-any
  jur: Record<string, any> | null,
  contactName: string | null,
): string {
  const countyName = raCounty(county);
  const p: string[] = [];

  p.push(`<p style="${RA_NAME}margin:0;">${esc(raGreeting(contactName))}</p>`);
  p.push(`<p style="${RA_NAME}margin:12px 0 0 0;">Here is what `
    + `${esc(countyName)} County asks a commercial kitchen to produce, `
    + 'fire first, then food — the requirements behind the Risk '
    + 'Assessment you took on getevidly.com.</p>');

  const sections = buildAssessmentCountySections(jur);
  if (sections.length > 0) {
    p.push(...sections);
  } else {
    p.push('<p style="color:#64748b;">We could not locate jurisdiction '
      + 'configuration for this county. When data becomes available, an '
      + 'updated summary may follow.</p>');
  }

  p.push(`<p style="${RA_NAME}margin:28px 0 0 0;">Your rated register and `
    + 'plan are in the assessment email that came with this.</p>');
  p.push(raButton('Take It Again in 90 Days', RA_URL));
  p.push(`<p style="${RA_WHY}margin:16px 0 0 0;">${RA_DISCLAIMER}</p>`);

  return p.join('');
}

async function sendAssessmentCountyReport(
  sb: ReturnType<typeof createClient>,
  responseId: string,
  email: string,
) {
  if (await alreadySent(sb, responseId, 'assessment_county_report')) return;

  const { data: respRow } = await sb.from('market_research_responses')
    .select('county, status').eq('id', responseId).single();
  const resp = respRow as { county: string | null; status: string | null } | null;
  if (!resp?.county) {
    await logSend(sb, responseId, 'assessment_county_report', email, null,
      'No county on response');
    return;
  }
  if (resp.status !== 'completed') return; // not time yet — fires on completion

  /* ilike, not eq: the assessment page submits a slug ('merced') while
   * jurisdictions stores the county title-cased ('Merced'). An eq match
   * would return nothing and this email would carry no requirements at
   * all. The Study's sendGapReport keeps its eq — untouched on purpose. */
  const { data: jurs } = await sb.from('jurisdictions')
    /* hood_cleaning_default is deliberately not selected: this email states
     * no interval as a county requirement, so the column cannot reach it. */
    .select('agency_name, grading_type, grading_config, scoring_methodology, violation_weight_map, fire_ahj_name, fire_jurisdiction_config')
    .eq('state', 'CA').ilike('county', resp.county).eq('is_active', true).limit(1);

  const contactName = await raContactName(sb, responseId);
  const html = buildEmailHtml({
    recipientName: 'there',
    bodyHtml: buildAssessmentCountyBody(resp.county, jurs?.[0] ?? null, contactName),
    skipGreeting: true,
    category: RA_CATEGORY,
    footerNote: 'You received this because you asked what your county requires when you completed the EvidLY Risk Assessment.',
  });

  const result = await sendEmail({
    to: email,
    subject: `What ${raCounty(resp.county)} County requires — fire and food records`,
    html,
  });
  await logSend(sb, responseId, 'assessment_county_report', email, result,
    result ? undefined : 'Resend send failed');
}

/** EDIT A — the forwardable link, on the assessment path. */
function buildAssessmentReferralBody(contactName: string | null): string {
  const url = `${RA_URL}?from=referral`;
  const p: string[] = [];

  p.push(`<p style="${RA_NAME}margin:0;">${esc(raGreeting(contactName))}</p>`);
  p.push(`<p style="${RA_NAME}margin:12px 0 0 0;">You asked for a link to `
    + "forward. Send this to whoever answers for the kitchen's records:</p>");
  p.push('<p style="margin:16px 0 0 0;padding:12px 16px;background:#f1f5f9;'
    + 'border-radius:6px;word-break:break-all;">'
    + `<a href="${url}" style="color:#1E2D4D;font-weight:600;">${url}</a></p>`);
  p.push(`<p style="${RA_NAME}margin:16px 0 0 0;">It takes three minutes and `
    + 'asks which fire and food safety records they could produce today. No '
    + 'account, no login. They get their own rated register and a plan with '
    + 'a date on every record.</p>');
  p.push(raButton('Take the Risk Assessment', url));
  p.push(`<p style="${RA_WHY}margin:16px 0 0 0;">${RA_DISCLAIMER}</p>`);

  return p.join('');
}

async function sendAssessmentReferral(
  sb: ReturnType<typeof createClient>,
  responseId: string,
  email: string,
) {
  if (await alreadySent(sb, responseId, 'assessment_referral')) return;

  const contactName = await raContactName(sb, responseId);
  const html = buildEmailHtml({
    recipientName: 'there',
    bodyHtml: buildAssessmentReferralBody(contactName),
    skipGreeting: true,
    category: RA_CATEGORY,
    footerNote: 'You received this because you asked for a link to forward when you completed the EvidLY Risk Assessment.',
  });

  const result = await sendEmail({
    to: email,
    subject: 'The Risk Assessment — a link to forward',
    html,
  });
  await logSend(sb, responseId, 'assessment_referral', email, result,
    result ? undefined : 'Resend send failed');
}

/** Fire pending study emails for a response. Safe to call multiple times (deduped via log). */
async function trySendStudyEmails(
  sb: ReturnType<typeof createClient>,
  responseId: string,
) {
  const { data: rows } = await sb.from('market_research_contacts')
    .select('email, wants_findings, wants_county_report, wants_referral_link')
    .eq('response_id', responseId).limit(1);
  const c = rows?.[0] as {
    email: string | null; wants_findings: boolean | null;
    wants_county_report: boolean | null; wants_referral_link: boolean | null;
  } | undefined;
  if (!c?.email) return;
  const to = c.email;

  /* Source decides which document each opt-in produces. One fetch, shared by
   * all three senders — every email on the assessment path is the Risk
   * Assessment's, and a study response reaches only the study senders. */
  const { data } = await sb.from('market_research_responses')
    .select('source, county, completed_at')
    .eq('id', responseId).single();
  const resp = data as { source: string | null; county: string | null; completed_at: string | null } | null;
  const isAssessment = resp?.source === 'assessment';

  const jobs: Promise<void>[] = [];
  if (c.wants_county_report) {
    jobs.push(isAssessment
      ? sendAssessmentCountyReport(sb, responseId, c.email)
      : sendGapReport(sb, responseId, c.email));
  }
  if (c.wants_referral_link) {
    jobs.push(isAssessment
      ? sendAssessmentReferral(sb, responseId, c.email)
      : sendReferralEmail(sb, responseId, c.email));
  }
  if (c.wants_findings && isAssessment) {
    jobs.push(sendAssessmentFindings(
      sb, responseId, c.email, resp?.county ?? null, resp?.completed_at ?? null));
  }

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

    // ── Delete answers action ───────────────────────────────────
    if (body.delete_answers !== undefined) {
      const ids = body.delete_answers;
      if (!Array.isArray(ids) || ids.length === 0 || !ids.every((v: unknown) => typeof v === 'string' && v.length > 0)) {
        return json({ error: 'delete_answers must be a non-empty array of question_id strings' }, 400);
      }

      const { error: delErr, count } = await sb
        .from('market_research_answers')
        .delete({ count: 'exact' })
        .eq('response_id', response_id)
        .in('question_id', ids);

      if (delErr) {
        console.error('[survey-respond] delete_answers error:', delErr.message);
        return json({ error: delErr.message }, 500);
      }

      console.log(`[survey-respond] delete_answers: response_id=${response_id} ids=${JSON.stringify(ids)} removed=${count}`);
      return json({ ok: true, response_id, deleted: count });
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

      const consent = {
        wants_findings: !!c.wants_findings,
        wants_county_report: !!c.wants_county_report,
        wants_referral_link: !!c.wants_referral_link,
        wants_meeting: !!c.wants_meeting,
      };
      /* `name` is stored when the contact action sends one. The column
       * arrives with migration 20261228000000; until that migration is
       * applied to PROD, Postgres answers 42703 and the write is retried
       * without the field, so an unapplied migration costs the findings
       * greeting a first name rather than breaking every contact write. */
      const withName = { response_id, email: c.email || null, name: c.name || null, ...consent };
      const withoutName = { response_id, email: c.email || null, ...consent };

      let { error } = await sb
        .from('market_research_contacts')
        .upsert(withName, { onConflict: 'response_id' });
      if (raMissingNameColumn(error)) {
        console.warn('[survey-respond] market_research_contacts.name missing — migration 20261228000000 not applied');
        ({ error } = await sb
          .from('market_research_contacts')
          .upsert(withoutName, { onConflict: 'response_id' }));
      }
      // Note: onConflict on response_id needs a unique index; for now we just insert
      // since each response should only have one contact row.
      if (error) {
        // If duplicate, try update instead
        if (error.code === '23505') {
          const { email: _e, response_id: _r, ...rest } = withName;
          const { error: updErr } = await sb
            .from('market_research_contacts')
            .update({ email: c.email || null, ...rest })
            .eq('response_id', response_id);
          if (raMissingNameColumn(updErr)) {
            await sb
              .from('market_research_contacts')
              .update({ email: c.email || null, ...consent })
              .eq('response_id', response_id);
          }
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
