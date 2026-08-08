import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
import { sendEmail, buildEmailHtml } from '../_shared/email.ts';
import { QUESTION_META } from '../_shared/study-questions.ts';
import { sortedJsonStringify, sha256 } from '../_shared/seal-canonicalization.ts';

const corsHeaders = getCorsHeaders(null);

/**
 * county-briefing — County briefing email sender with approval gate.
 *
 * Auth: Bearer token → verify user → check @getevidly.com email domain.
 *
 * Actions (via POST body { action, ... }):
 *
 *   preview         { county, variant? }
 *                   → { preview_html, sendable, block_reason, jurisdiction_hash }
 *
 *   approve         { county }
 *                   → { approval_id, jurisdiction_hash }
 *
 *   send            { county }
 *                   → { sent, failed, held }
 *
 *   add-recipients  { recipients: [{ email, first_name?, org_name?, county, variant? }] }
 *                   → { inserted }
 *
 *   list            {}
 *                   → { counties: [...] }
 *
 *   list-steps      {}
 *                   → { steps: [...] }
 *
 *   upsert-step     { step_number, label, delay_days?, trigger_type?, variant_scope?,
 *                     subject_template?, body_template? }
 *                   → { step }
 *
 *   sign-off-step   { step_number }
 *                   → { step }
 *
 *   cron-process    {} (called by pg_cron, no user auth)
 *                   → { processed, sent, held, skipped_reasons }
 */

// ── Helpers ─────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function freqLabel(f: string): string {
  const m: Record<string, string> = {
    monthly: 'Monthly', quarterly: 'Quarterly',
    semi_annual: 'Every 6 months', annual: 'Annually',
  };
  return m[f] || f;
}

// 8-field jurisdiction hash — deterministic SHA-256.
const HASH_FIELDS = [
  'agency_name', 'fire_ahj_name', 'grading_type',
  'scoring_methodology', 'violation_weight_map', 'hood_cleaning_default',
  'fire_jurisdiction_config',
] as const;

// deno-lint-ignore no-explicit-any
async function computeJurisdictionHash(jur: Record<string, any>): Promise<string> {
  const parts = HASH_FIELDS.map(f => {
    const v = jur[f];
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'object') return sortedJsonStringify(v);
    return JSON.stringify(v);
  });
  const canonical = parts.join('|');
  const buf = new TextEncoder().encode(canonical);
  return sha256(buf.buffer);
}

// Step content hash — covers every field that reaches the recipient.
// Hashed fields: subject_template, body_template, variant_scope.
const STEP_HASH_FIELDS = ['subject_template', 'body_template', 'variant_scope', 'delay_days', 'trigger_type'] as const;

// deno-lint-ignore no-explicit-any
async function computeStepContentHash(step: Record<string, any>): Promise<string> {
  const parts = STEP_HASH_FIELDS.map(f => JSON.stringify(step[f] ?? ''));
  const canonical = parts.join('|');
  const buf = new TextEncoder().encode(canonical);
  return sha256(buf.buffer);
}

// Named-requirement gate. Each required section is checked individually
// so the block reason names the specific gap, not a generic count.
// "What It Weights Heaviest" (violation_weight_map) is optional — only
// 9 of 58 CA counties have it today.
// deno-lint-ignore no-explicit-any
function checkRequirements(jur: Record<string, any>): { ok: boolean; block_reason: string | null } {
  // deno-lint-ignore no-explicit-any
  const fc = jur?.fire_jurisdiction_config as Record<string, any> | null;
  const fireAhj = fc?.fire_ahj_name || jur?.fire_ahj_name;
  // deno-lint-ignore no-explicit-any
  const gc = jur?.grading_config as Record<string, any> | null;

  if (gc?.verification_blocked)
    return { ok: false, block_reason: gc.verification_blocked_reason || 'Jurisdiction config unverified — source unreliable' };
  if (jur?.jie_audit_status === 'needs_review')
    return { ok: false, block_reason: 'Jurisdiction audit status is needs_review — verify against source documents before approval' };
  if (!jur?.agency_name)
    return { ok: false, block_reason: 'No food-safety agency on file' };
  if (!fireAhj)
    return { ok: false, block_reason: 'No fire AHJ on file' };
  if (!jur?.grading_type)
    return { ok: false, block_reason: 'No grading type on file' };
  if (!jur?.hood_cleaning_default && !fc?.nfpa_96_table_12_4)
    return { ok: false, block_reason: 'No hood cleaning frequency on file' };

  return { ok: true, block_reason: null };
}

// ── Structured evaluation builder ────────────────────────────────
// Renders tiers, direction, and point values from grading_config.
// Point values that exist only in scoring_methodology prose are not rendered.

// deno-lint-ignore no-explicit-any
function shouldRenderPointValuesEmail(gc: Record<string, any>, prose: string | null): boolean {
  const pv = gc.point_values || gc.violation_points;
  if (!pv || typeof pv !== 'object' || !prose) return false;
  const values = Object.values(pv) as number[];
  if (!values.every(pts => new RegExp(`=\\s*${pts}\\s*(?:pts?|points?|\\b)`, 'i').test(prose))) {
    return false;
  }
  const evidence = gc.violation_weight_evidence;
  if (evidence?.evidence_samples && Array.isArray(evidence.evidence_samples)) {
    const configSet = new Set(values);
    // deno-lint-ignore no-explicit-any
    const hasConflict = evidence.evidence_samples.some(
      (s: any) => typeof s.point_value === 'number' && !configSet.has(s.point_value)
    );
    if (hasConflict) return false;
  }
  return true;
}

// deno-lint-ignore no-explicit-any
function extractTiers(gc: Record<string, any>): Array<{ name: string; range: string; color?: string }> | null {
  // Format 1: gc.tiers as { name: [min, max] } (e.g. Merced)
  if (gc.tiers && typeof gc.tiers === 'object' && !Array.isArray(gc.tiers)) {
    const result: Array<{ name: string; range: string; color?: string }> = [];
    for (const [name, range] of Object.entries(gc.tiers)) {
      const r = range as number[] | null;
      const rangeStr = Array.isArray(r)
        ? r[1] != null ? `${r[0]} \u2013 ${r[1]}` : `${r[0]}+`
        : String(range);
      result.push({ name, range: rangeStr });
    }
    if (result.length === 0) return null;
    // Colors from grading_thresholds.color_note (e.g. "Green/Yellow/Red ...")
    const colorNote = gc.grading_thresholds?.color_note;
    if (typeof colorNote === 'string') {
      const cm = colorNote.match(/^([A-Za-z]+(?:\/[A-Za-z]+)+)/);
      if (cm) {
        const colors = cm[1].split('/');
        if (colors.length === result.length) {
          result.forEach((r, i) => { r.color = colors[i]; });
        }
      }
    }
    return result;
  }
  // Format 2: gc.grading_thresholds.tiers as array of { label, score_min, score_max, color? }
  const gt = gc.grading_thresholds;
  if (gt?.tiers && Array.isArray(gt.tiers)) {
    // deno-lint-ignore no-explicit-any
    return gt.tiers.map((t: any) => ({
      name: t.label || t.name,
      range: t.score_max != null ? `${t.score_min} \u2013 ${t.score_max}` : `${t.score_min}+`,
      ...(t.color ? { color: t.color as string } : {}),
    }));
  }
  // Format 3: top-level letter keys A, B, C with [min, max] arrays (e.g. LA, Riverside)
  const letterKeys = ['A', 'B', 'C', 'D', 'F'];
  const found: Array<{ name: string; range: string; color?: string }> = [];
  let lowestStart = Infinity;
  for (const key of letterKeys) {
    if (Array.isArray(gc[key]) && gc[key].length === 2 && typeof gc[key][0] === 'number') {
      const [low, high] = gc[key];
      const entry: { name: string; range: string; color?: string } = {
        name: `Grade ${key}`, range: `${low} \u2013 ${high}`,
      };
      const display = gc[`grade_${key.toLowerCase()}_display`];
      if (typeof display === 'string' && display.endsWith('_card')) {
        entry.color = display.replace('_card', '').replace(/^\w/, (c: string) => c.toUpperCase());
      }
      found.push(entry);
      if (low < lowestStart) lowestStart = low;
    }
  }
  // If lowest letter grade doesn't reach 0, add below-fail tier
  if (found.length >= 2 && lowestStart > 0 && typeof gc.fail_below === 'number') {
    const belowLabel = gc.below_70_display === 'numerical_score_card' ? 'Score Card'
      : `Below ${gc.fail_below}`;
    found.push({ name: belowLabel, range: `0 \u2013 ${gc.fail_below - 1}` });
  }
  return found.length >= 2 ? found : null;
}

// deno-lint-ignore no-explicit-any
function buildStructuredEvaluation(gc: Record<string, any>, font: string, prose: string | null): string {
  let html = '';

  const direction = gc.direction || gc.score_direction
      || (gc.evaluation_method && /deduction/i.test(gc.evaluation_method) ? 'downward_deduction' : null);
  if (direction) {
    const dirLabel = direction === 'accumulate_up' ? 'Points accumulate upward (lower is better)'
      : direction === 'downward_deduction' ? 'Points deducted from base (higher is better)'
      : direction.replace(/_/g, ' ');
    html += `<p style="font-family:${font};font-size:13px;color:#5F6875;margin:6px 0;"><strong>Scoring direction:</strong> ${dirLabel}</p>`;
  }

  const tierRows = extractTiers(gc);
  if (tierRows && tierRows.length > 0) {
    const hasColors = tierRows.some(t => t.color);
    html += `<table style="width:100%;border-collapse:collapse;font-family:${font};font-size:13px;margin:8px 0;">`;
    html += `<tr style="background:#F7F1E6;"><th style="padding:6px 8px;text-align:left;">Rating</th>`;
    if (hasColors) html += `<th style="padding:6px 8px;text-align:left;">Card</th>`;
    html += `<th style="padding:6px 8px;text-align:right;">Point Range</th></tr>`;
    for (const t of tierRows) {
      html += `<tr><td style="padding:6px 8px;border-bottom:1px solid #EEE7D9;">${t.name}</td>`;
      if (hasColors) html += `<td style="padding:6px 8px;border-bottom:1px solid #EEE7D9;">${t.color || '\u2014'}</td>`;
      html += `<td style="padding:6px 8px;border-bottom:1px solid #EEE7D9;text-align:right;">${t.range}</td></tr>`;
    }
    html += '</table>';
  }

  if (shouldRenderPointValuesEmail(gc, prose)) {
    const pv = gc.point_values || gc.violation_points;
    html += `<table style="width:100%;border-collapse:collapse;font-family:${font};font-size:13px;margin:8px 0;">`;
    html += `<tr style="background:#F7F1E6;"><th style="padding:6px 8px;text-align:left;">Violation Category</th><th style="padding:6px 8px;text-align:right;">Points</th></tr>`;
    for (const [cat, pts] of Object.entries(pv)) {
      const label = cat.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      html += `<tr><td style="padding:6px 8px;border-bottom:1px solid #EEE7D9;">${label}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #EEE7D9;text-align:right;font-weight:600;">${pts}</td></tr>`;
    }
    html += '</table>';
  }

  return html;
}

function isPointValueSentenceEmail(sent: string): boolean {
  if (/\bpoint\s+weights?\s*:/i.test(sent)) return true;
  if (/\d+[-\s]point\s*(?:penalty|surcharge|deduction)/i.test(sent)) return true;
  // Multiple "= N pts/points" (require unit word to avoid "= 3/year" false positives)
  const eqWithUnit = sent.match(/=\s*-?\d+\s*(?:pts?|points?|point)\b/gi);
  if (eqWithUnit && eqWithUnit.length >= 2) return true;
  // Multiple violation-category = bare-number assignments (repeat Major = 14, Minor = 6)
  const catAssign = sent.match(/\b(?:major|minor|critical|grp|non-?critical|repeat|imminent|hazard)\s*[=:]\s*-?\d+/gi);
  if (catAssign && catAssign.length >= 2) return true;
  // Multiple parenthetical point values (handles negative) with violation keywords
  const parenPts = sent.match(/\(\s*-?\d+(?:\s*[-\u2013]\s*\d+)?\+?\s*(?:pts?|points?|point)\b/gi);
  if (parenPts && parenPts.length >= 2 &&
      /\b(?:major|minor|critical|hazard|violation|deduct)/i.test(sent)) return true;
  // Violation categories with parenthetical point values: "Major (5 points, ...)"
  const catParenPts = sent.match(/\b(?:major|minor|critical|imminent|non-?critical|grp|crf)\b[^)]*?\(\s*-?\d+[^)]*?(?:pts?|points?|point)\b/gi);
  if (catParenPts && catParenPts.length >= 2) return true;
  // "violations are -N pt(s)"
  if (/\b(?:violations?|infractions?)\s+(?:are|is)\s+-?\d+\s*(?:pts?|points?|point)\b/i.test(sent)) return true;
  // "additional -N pts"
  if (/\badditional\s+-?\d+\s*(?:pts?|points?|point)\b/i.test(sent)) return true;
  return false;
}

function isTierRangeSentenceEmail(sent: string): boolean {
  // 3+ tier labels each paired with a numeric range = tier enumeration sentence
  const tierLabels = sent.match(/\b(?:Grade\s+[A-F]|[A-C](?=\s*[\(=:])|Good|Satisfactory|Unsatisfactory|Score\s*Card|Notice\s+of\s+Closure)\b/gi);
  const numericRanges = sent.match(/\d+\s*[-\u2013<>=]+\s*\d+/g);
  return !!(tierLabels && tierLabels.length >= 3 && numericRanges && numericRanges.length >= 2);
}

function scrubPointValuesEmail(text: string): string | null {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const clean = sentences.filter((sent: string) => {
    const letters = sent.replace(/[^a-zA-Z]/g, '');
    return letters.length > 2 && !isPointValueSentenceEmail(sent) && !isTierRangeSentenceEmail(sent);
  });
  const result = clean.join(' ').trim();
  return result || null;
}

// ── Study five-day follow-up ─────────────────────────────────────
const STUDY_FOLLOWUP_STEP = 50;
const CALENDLY_URL = 'https://calendly.com/founders-getevidly/california-commercial-kitchen-study';
const GAP_RANK: Record<string, number> = { no: 0, gap: 1, untracked: 2 };
const GAP_LABEL: Record<string, string> = {
  no: 'Not on file', gap: 'Not in my hands', untracked: 'Have to find it',
};

function buildFollowUpEmail(
  gaps: Array<{ label: string; status: string }>,
  totalGaps: number,
  unsubToken?: string,
): string {
  const shown = gaps.slice(0, 3);
  const remaining = totalGaps - shown.length;
  const plural = shown.length !== 1;

  let listHtml = '';
  for (const g of shown) {
    listHtml += `<li style="margin-bottom:6px;"><strong>${g.label}</strong> \u2014 ${g.status}</li>`;
  }
  if (remaining > 0) {
    listHtml += `<li style="margin-bottom:6px;color:#64748b;">\u2026and ${remaining} more</li>`;
  }

  const bodyHtml =
    `<p>You finished the California Commercial Kitchen Safety Study five days ago. ` +
    `You told us you couldn\u2019t put your hands on ${plural ? 'these records' : 'this record'} right now:</p>` +
    `<ul style="margin:16px 0;padding-left:20px;font-size:14px;line-height:1.7;">${listHtml}</ul>` +
    `<p>If an inspector or a broker asked for ${plural ? 'those' : 'that'} tomorrow, ` +
    `you\u2019d have to go looking.</p>` +
    `<p>That is the conversation worth having. Thirty minutes with the ` +
    `Founder, Arthur \u2014 nothing to prepare. We work out how those get on ` +
    `file and stay there.</p>`;

  return buildEmailHtml({
    recipientName: 'there',
    bodyHtml,
    ctaText: 'Pick a time',
    ctaUrl: CALENDLY_URL,
    footerNote: 'You received this because you completed the California Commercial Kitchen Safety Study and have not yet scheduled a meeting.',
    campaign: true,
    unsubscribeToken: unsubToken,
  });
}

// ── Email template ──────────────────────────────────────────────

const fInstrument = "'Instrument Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const fMono = "'IBM Plex Mono','Courier New',monospace";
const fMontserrat = "'Montserrat','Arial Black','Helvetica Neue',Arial,sans-serif";

function h3(text: string): string {
  return `<h3 style="color:#1C2A3A;border-bottom:2px solid #B24A2E;padding-bottom:4px;margin-top:28px;font-family:${fInstrument};font-size:17px;font-weight:700;">${text}</h3>`;
}

// deno-lint-ignore no-explicit-any
function buildBriefingBody(county: string, jur: Record<string, any>): string {
  const p: string[] = [];
  // deno-lint-ignore no-explicit-any
  const fc = jur?.fire_jurisdiction_config as Record<string, any> | null;

  /* ── Who inspects you ──────────────────────────────────────── */
  const fireAhj = fc?.fire_ahj_name || jur?.fire_ahj_name;
  if (jur?.agency_name || fireAhj) {
    let s = h3('Who Inspects You');
    if (jur.agency_name) s += `<p style="font-family:${fInstrument};font-size:14px;line-height:1.6;color:#4A5566;margin:8px 0;"><strong>Food safety:</strong> ${jur.agency_name}</p>`;
    if (fireAhj) {
      s += `<p style="font-family:${fInstrument};font-size:14px;line-height:1.6;color:#4A5566;margin:8px 0;"><strong>Fire safety:</strong> ${fireAhj}</p>`;
      if (fc?.ahj_split_notes) {
        s += `<p style="font-family:${fInstrument};font-size:13px;color:#5F6875;margin-top:2px;">${fc.ahj_split_notes}</p>`;
      }
    }
    p.push(s);
  }

  /* ── How this county evaluates ──────────────────────────────── */
  if (jur?.grading_type || jur?.grading_config) {
    const labels: Record<string, string> = {
      letter_grade: 'letter grades', letter_grade_abc: 'letter grades (A / B / C)',
      letter_grade_strict: 'letter grades with strict thresholds',
      pass_fail: 'pass / fail scoring', pass_fail_placard: 'pass / fail placards',
      pass_reinspect: 'pass / re-inspect scoring',
      pass_conditional_closed: 'pass / conditional pass / closed scoring',
      color_placard: 'color-coded placards',
      green_yellow_red: 'green / yellow / red placards',
      green_yellow_red_numeric: 'green / yellow / red placards with numeric scores',
      numeric: 'numeric scoring', numeric_score: 'numeric scoring',
      numeric_score_no_letter: 'numeric scoring (no letter grade)',
      point_accumulation_tiered: 'a point-accumulation system with tiered ratings',
      inspection_report: 'inspection reports (no letter grade or numeric score)',
      violation_report_only: 'violation reports (no letter grade or numeric score)',
    };
    let s = h3('How This County Evaluates');
    s += `<p style="font-family:${fInstrument};font-size:14px;line-height:1.6;color:#4A5566;margin:8px 0;">This county uses <strong>${labels[jur.grading_type] || 'standard inspection reports'}</strong> to evaluate food safety inspections.</p>`;
    if (jur?.grading_config) {
      s += buildStructuredEvaluation(jur.grading_config as Record<string, any>, fInstrument, jur.scoring_methodology || null);
    }
    if (jur.scoring_methodology) {
      const prose = scrubPointValuesEmail(jur.scoring_methodology);
      if (prose) {
        s += `<p style="font-family:${fInstrument};font-size:13px;color:#5F6875;">${prose}</p>`;
      }
    }
    p.push(s);
  }

  /* ── What it weights heaviest ───────────────────────────────── */
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
        s += `<p style="font-family:${fInstrument};font-size:13px;color:#5F6875;">${desc}</p>`;
      }
      if (rows.length > 0) {
        s += `<table style="width:100%;border-collapse:collapse;font-family:${fInstrument};font-size:14px;">`;
        for (const r of rows) {
          s += `<tr><td style="padding:6px 8px;border-bottom:1px solid #EEE7D9;">${r.label}</td>` +
            `<td style="padding:6px 8px;border-bottom:1px solid #EEE7D9;text-align:right;font-weight:600;">${r.pts} pts</td></tr>`;
        }
        s += '</table>';
      }
      p.push(s);
    }
  }

  /* ── Hood cleaning frequency ────────────────────────────────── */
  if (jur?.hood_cleaning_default || fc?.nfpa_96_table_12_4) {
    let s = h3('Hood Cleaning Frequency');
    if (jur?.hood_cleaning_default) {
      s += `<p style="font-family:${fInstrument};font-size:14px;line-height:1.6;color:#4A5566;margin:8px 0;">This county enforces <strong>${freqLabel(jur.hood_cleaning_default)}</strong> hood cleaning as the default schedule.</p>`;
    }
    // deno-lint-ignore no-explicit-any
    const t124 = fc?.nfpa_96_table_12_4 as Record<string, any> | undefined;
    if (t124) {
      s += `<p style="font-family:${fInstrument};font-size:13px;color:#5F6875;margin-top:8px;">Your specific frequency depends on cooking volume (NFPA 96 Table 12.4):</p>`;
      s += `<table style="width:100%;border-collapse:collapse;font-family:${fInstrument};font-size:13px;margin-top:4px;">`;
      s += `<tr style="background:#F7F1E6;"><th style="padding:6px 8px;text-align:left;">Hood / Cooking Type</th>` +
        `<th style="padding:6px 8px;text-align:right;">Frequency</th></tr>`;
      const freqRows: [string, string][] = [
        ['Type I \u2014 Heavy volume', t124.type_i_heavy_volume],
        ['Type I \u2014 Moderate volume', t124.type_i_moderate_volume],
        ['Type I \u2014 Low volume', t124.type_i_low_volume],
        ['Type II hood', t124.type_ii],
        ['Solid fuel cooking', t124.solid_fuel_cooking],
      ];
      for (const [lbl, freq] of freqRows) {
        if (freq) {
          s += `<tr><td style="padding:6px 8px;border-bottom:1px solid #EEE7D9;">${lbl}</td>` +
            `<td style="padding:6px 8px;border-bottom:1px solid #EEE7D9;text-align:right;">${freqLabel(freq)}</td></tr>`;
        }
      }
      s += '</table>';
    }
    p.push(s);
  }

  if (p.length === 0) {
    p.push(`<p style="font-family:${fInstrument};font-size:14px;color:#5F6875;">We could not locate jurisdiction configuration for this county. When data becomes available, a briefing may follow.</p>`);
  }

  return p.join('');
}

function buildBriefingEmail(
  county: string,
  firstName: string,
  orgName: string | null,
  // deno-lint-ignore no-explicit-any
  jur: Record<string, any>,
  variant: string,
  ctaUrl: string,
  accessVia?: string,
  unsubToken?: string,
): string {
  const unsubBase = `${Deno.env.get("SUPABASE_URL") || "https://irxgmhxhmxtzfwuieblc.supabase.co"}/functions/v1/email-unsubscribe`;
  const unsubUrl = unsubToken
    ? `${unsubBase}?token=${encodeURIComponent(unsubToken)}`
    : 'https://app.getevidly.com/settings/notifications';

  // ── Row builder for fire / food tables ──────────────────────────
  const row = (name: string, cite: string, value: string) =>
    `<tr><td style="padding:8px 10px;border-bottom:1px solid #EEE7D9;color:#1C2A3A;font-family:${fInstrument};font-size:14px;">${name}</td>` +
    `<td style="padding:8px 10px;border-bottom:1px solid #EEE7D9;color:#8B95AA;font-family:${fMono};font-size:11px;white-space:nowrap;">${cite}</td>` +
    `<td style="padding:8px 10px;border-bottom:1px solid #EEE7D9;color:#4A5566;font-family:${fInstrument};font-size:13px;text-align:right;">${value}</td></tr>`;

  const tblOpen = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">`;

  const fireTable = tblOpen +
    row('Exhaust &amp; hood cleaning', 'NFPA 96', 'By cooking volume and equipment type') +
    row('Fire suppression', 'NFPA 17A', 'Every 6 months') +
    row('Fire sprinklers', 'NFPA 25', 'Annually') +
    row('Fire alarm', 'NFPA 72', 'Annually') +
    row('Fire extinguishers', 'NFPA 10', 'Annually') +
    '</table>';

  const foodTable = tblOpen +
    row('Pest control', 'CalCode \u00a7114259', 'Monthly service') +
    row('Receiving temperatures', 'CalCode \u00a7113996', 'At delivery') +
    row('Hot holding', 'CalCode \u00a7113996', '\u2265135\u00b0F') +
    row('Cold holding', 'CalCode \u00a7113996', '\u226441\u00b0F') +
    row('Cooling', 'CalCode \u00a7114002', '135\u219270\u00b0F in 2 hrs') +
    row('Reheating', 'CalCode \u00a7114014', '\u2265165\u00b0F within 2 hrs') +
    row('Warewash &amp; sanitizer', 'CalCode \u00a7114099, \u00a7114125', 'Test kit on hand') +
    row('Health permit', 'CalCode \u00a7114381', 'Current') +
    row('Manager certification', 'CalCode \u00a7113947', 'One per facility') +
    row('Food handler cards', 'CalCode \u00a7113948', 'All food staff') +
    '</table>';

  // ── Build evaluation block from jurisdiction data ─────────────────
  // Reads grading_config.tiers + grading_config.point_values — the same
  // fields ScoreTable renders per county.
  // deno-lint-ignore no-explicit-any
  const gc = jur?.grading_config as Record<string, any> | null;
  let evalBlock = '';

  if (jur?.grading_type === 'calcode_default') {
    evalBlock = `<p style="font-family:${fInstrument};font-size:14px;line-height:1.6;color:#4A5566;margin:0;">This county posts no grade or placard. Inspection reports are kept on file and produced on request.</p>`;
  } else if (gc) {
    const tiers = extractTiers(gc);
    if (tiers && tiers.length > 0) {
      evalBlock += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 12px;">`;
      for (const t of tiers) {
        evalBlock += `<tr><td style="padding:8px 10px;border-bottom:1px solid #EEE7D9;color:#1C2A3A;font-family:${fInstrument};font-size:14px;">${t.name}</td>` +
          `<td style="padding:8px 10px;border-bottom:1px solid #EEE7D9;color:#4A5566;font-family:${fInstrument};font-size:13px;text-align:right;">${t.range}</td></tr>`;
      }
      evalBlock += '</table>';
    }

    // deno-lint-ignore no-explicit-any
    const pv = gc.point_values as Record<string, any> | undefined;
    if (pv && typeof pv === 'object' && Object.keys(pv).length > 0) {
      const order = ['critical', 'major', 'minor', 'grp', 'repeat', 'repeat_multiplier'];
      const labels: Record<string, string> = {
        critical: 'Critical', major: 'Major', minor: 'Minor',
        grp: 'GRP', repeat: 'Repeat', repeat_multiplier: 'Repeat multiplier',
      };
      const rendered = new Set<string>();
      let weightHtml = '';
      for (const key of order) {
        if (pv[key] !== undefined && pv[key] !== null) {
          const label = labels[key] || key;
          weightHtml += `<tr><td style="padding:8px 10px;border-bottom:1px solid #EEE7D9;color:#1C2A3A;font-family:${fInstrument};font-size:14px;">${label}</td>` +
            `<td style="padding:8px 10px;border-bottom:1px solid #EEE7D9;color:#4A5566;font-family:${fMono};font-size:13px;text-align:right;font-weight:600;">${pv[key]} pts</td></tr>`;
          rendered.add(key);
        }
      }
      for (const [key, val] of Object.entries(pv)) {
        if (!rendered.has(key) && val !== undefined && val !== null) {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          weightHtml += `<tr><td style="padding:8px 10px;border-bottom:1px solid #EEE7D9;color:#1C2A3A;font-family:${fInstrument};font-size:14px;">${label}</td>` +
            `<td style="padding:8px 10px;border-bottom:1px solid #EEE7D9;color:#4A5566;font-family:${fMono};font-size:13px;text-align:right;font-weight:600;">${val} pts</td></tr>`;
        }
      }
      if (weightHtml) {
        evalBlock += `<p style="font-family:${fInstrument};font-size:13px;color:#5F6875;margin:12px 0 6px;font-weight:600;">Violation point weights</p>`;
        evalBlock += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${weightHtml}</table>`;
      }
    }
  }

  if (!evalBlock) {
    evalBlock = `<p style="font-family:${fInstrument};font-size:14px;line-height:1.6;color:#8B95AA;margin:0;font-style:italic;">County-specific evaluation details will appear here once verified.</p>`;
  }

  if (jur?.agency_name) {
    evalBlock += `<p style="font-family:${fMono};font-size:10px;letter-spacing:0.08em;color:#9A9384;margin:10px 0 0;text-transform:uppercase;">Source: ${jur.agency_name}.</p>`;
  }

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${county} County Briefing</title>
<style>
:root { color-scheme: light only; supported-color-schemes: light only; }
body{margin:0;padding:0;background:#F7F1E6;} a{text-decoration:none;} img{-ms-interpolation-mode:bicubic;}
@media (max-width:620px){.card{width:100%!important;} .p40{padding-left:22px!important;padding-right:22px!important;}}
</style>
</head><body style="margin:0;padding:0;background:#F7F1E6;" bgcolor="#F7F1E6">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Hi ${firstName} \u2014 what ${county} County can ask your kitchen to produce.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F1E6;" bgcolor="#F7F1E6">
<tr><td align="center" style="padding:28px 16px;">
<table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FFFFFF;border:1px solid #EEE7D9;" bgcolor="#FFFFFF">

  <!-- 1. HEADER -->
  <tr><td class="p40" style="background:#1C2A3A;padding:20px 40px;" bgcolor="#1C2A3A">
    <div style="font-family:${fMontserrat};font-weight:900;font-size:26px;letter-spacing:-0.5px;line-height:1;"><span style="color:#B24A2E;">E</span><span style="color:#F4EFE4;">vid</span><span style="color:#B24A2E;">LY</span></div>
    <div style="font-family:${fMono};font-size:10.5px;letter-spacing:0.12em;color:rgba(255,255,255,0.60);text-transform:uppercase;margin-top:7px;">County Briefing</div>
  </td></tr>

  <!-- 2. COUNTY KICKER -->
  <tr><td class="p40" style="padding:28px 40px 0;" bgcolor="#FFFFFF">
    <div style="font-family:${fMono};font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#B24A2E;margin:0 0 12px;">${county} County</div>
  </td></tr>

  <!-- 3. SALUTATION -->
  <tr><td class="p40" style="padding:0 40px 0;" bgcolor="#FFFFFF">
    <p style="font-family:${fInstrument};font-size:14px;line-height:1.6;color:#4A5566;margin:0 0 20px;">Hi ${firstName} \u2014 you manage a kitchen in ${county} County; here is what your property management, insurance company, the fire marshal and health department can ask you to produce anytime.</p>
  </td></tr>

  <!-- 4. HEADLINE -->
  <tr><td class="p40" style="padding:0 40px 20px;" bgcolor="#FFFFFF">
    <h2 style="font-family:${fInstrument};font-size:20px;font-weight:700;color:#1C2A3A;margin:0;">What a kitchen here has to produce.</h2>
  </td></tr>

  <!-- 5. FIRE SAFETY -->
  <tr><td class="p40" style="padding:0 40px 6px;" bgcolor="#FFFFFF">
    <h3 style="color:#1C2A3A;border-bottom:2px solid #B24A2E;padding-bottom:4px;margin:24px 0 12px 0;font-family:${fInstrument};font-size:17px;font-weight:700;">Fire Safety</h3>
    ${fireTable}
    <p style="font-family:${fInstrument};font-size:13px;line-height:1.5;color:#5F6875;margin:12px 0 0;">Five systems, five separate service records \u2014 whether one company services them or five.</p>
  </td></tr>

  <!-- 6. FOOD SAFETY -->
  <tr><td class="p40" style="padding:0 40px 6px;" bgcolor="#FFFFFF">
    <h3 style="color:#1C2A3A;border-bottom:2px solid #B24A2E;padding-bottom:4px;margin:24px 0 12px 0;font-family:${fInstrument};font-size:17px;font-weight:700;">Food Safety</h3>
    ${foodTable}
    <p style="font-family:${fMono};font-size:10px;letter-spacing:0.08em;color:#9A9384;margin:10px 0 0;text-transform:uppercase;">Source: California Retail Food Code.</p>
  </td></tr>

  <!-- 7. HOW THIS COUNTY EVALUATES -->
  <tr><td class="p40" style="padding:0 40px 20px;border-top:1px solid #EEE7D9;" bgcolor="#FFFFFF">
    <h3 style="color:#1C2A3A;border-bottom:2px solid #B24A2E;padding-bottom:4px;margin:24px 0 12px 0;font-family:${fInstrument};font-size:17px;font-weight:700;">How This County Evaluates</h3>
    ${evalBlock}
  </td></tr>

  <!-- 8. CTA -->
  <tr><td class="p40" style="padding:0 40px 28px;" bgcolor="#FFFFFF">
    <p style="font-family:${fInstrument};font-size:14px;line-height:1.6;color:#4A5566;margin:0 0 6px;">CalCode is the same in every county.</p>
    <p style="font-family:${fInstrument};font-size:14px;line-height:1.6;color:#4A5566;margin:0 0 18px;">How your inspection gets reported is not. Tiers, placards and point weights are set locally. All 58 counties are published, free to read.</p>
    <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
      <td align="center" style="background:#1C2A3A;" bgcolor="#1C2A3A"><a href="${ctaUrl}" style="display:inline-block;padding:14px 30px;font-family:${fInstrument};font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;">See how each county reports &#8594;</a></td>
    </tr></table>
  </td></tr>

  <!-- 9. FOOTER -->
  <tr><td class="p40" align="center" style="background:#FBF9F2;padding:24px 40px;border-top:1px solid #EEE7D9;text-align:center;" bgcolor="#FBF9F2">
    <div style="font-family:${fMono};font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#9A9384;">EvidLY &middot; Cleaning Pros Plus, LLC &middot; (855) 384-3591</div>
    <div style="font-family:${fInstrument};font-size:11px;color:#9A9384;margin-top:10px;line-height:1.6;">2324 M Street #2711 &middot; Merced, CA 95344</div>
    <div style="font-family:${fInstrument};font-size:10.5px;color:#9A9384;margin-top:8px;">&copy; 2026 EvidLY &middot; a Cleaning Pros Plus, LLC Company &nbsp;&middot;&nbsp; <a href="${unsubUrl}" style="color:#9A9384;text-decoration:underline;">Unsubscribe</a></div>
  </td></tr>

</table></td></tr></table></body></html>`;
}

// ── Main handler ────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action } = body;

    // cron-process is called by pg_cron with service_role JWT — no user auth.
    // All other actions require a verified @getevidly.com user.
    let user: { id: string; email?: string } | null = null;
    if (action !== "cron-process") {
      const authHeader = req.headers.get("Authorization");
      const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader || "" } },
      });
      const { data: { user: authUser } } = await supabaseAuth.auth.getUser();

      if (!authUser) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      if (!authUser.email?.endsWith("@getevidly.com")) {
        return jsonResponse({ error: "Admin access required" }, 403);
      }
      user = authUser;
    }

    // ── PREVIEW ─────────────────────────────────────────────────
    if (action === "preview") {
      const county = body.county as string;
      const variant = body.variant || 'cold';
      if (!county) return jsonResponse({ error: "county required" }, 400);

      const { data: jur } = await supabase
        .from('jurisdictions')
        .select('*')
        .eq('county', county)
        .eq('state_code', 'CA')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!jur) {
        return jsonResponse({ error: `No active jurisdiction found for ${county} County, CA` }, 404);
      }

      const gate = checkRequirements(jur);
      const hash = await computeJurisdictionHash(jur);
      const previewAccessVia = (body.access_via as string) || undefined;
      const previewHtml = buildBriefingEmail(county, 'there', null, jur, variant, '#', previewAccessVia, 'preview');

      return jsonResponse({
        preview_html: previewHtml,
        sendable: gate.ok,
        block_reason: gate.block_reason,
        jurisdiction_hash: hash,
        jurisdiction_id: jur.id,
      });
    }

    // ── APPROVE ─────────────────────────────────────────────────
    if (action === "approve") {
      const county = body.county as string;
      if (!county) return jsonResponse({ error: "county required" }, 400);

      const { data: jur } = await supabase
        .from('jurisdictions')
        .select('*')
        .eq('county', county)
        .eq('state_code', 'CA')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!jur) {
        return jsonResponse({ error: `No active jurisdiction for ${county} County, CA` }, 404);
      }

      const gate = checkRequirements(jur);
      if (!gate.ok) {
        return jsonResponse({ error: gate.block_reason }, 422);
      }

      const hash = await computeJurisdictionHash(jur);

      const { data: approval, error } = await supabase
        .from('county_briefing_approvals')
        .upsert({
          county,
          state_code: 'CA',
          jurisdiction_id: jur.id,
          approved_by: user!.id,
          approved_at: new Date().toISOString(),
          jurisdiction_hash: hash,
          lapsed_at: null,
          lapse_reason: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'county,state_code' })
        .select('id')
        .single();

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ approval_id: approval?.id, jurisdiction_hash: hash });
    }

    // ── SEND ────────────────────────────────────────────────────
    if (action === "send") {
      const county = body.county as string;
      if (!county) return jsonResponse({ error: "county required" }, 400);

      // Fetch approval
      const { data: approval } = await supabase
        .from('county_briefing_approvals')
        .select('*')
        .eq('county', county)
        .eq('state_code', 'CA')
        .single();

      if (!approval || !approval.approved_at) {
        return jsonResponse({ error: "No approval on file for this county" }, 422);
      }
      if (approval.lapsed_at) {
        return jsonResponse({ error: `Approval lapsed: ${approval.lapse_reason || 'jurisdiction data changed'}` }, 422);
      }

      // Fetch jurisdiction + recompute hash
      const { data: jur } = await supabase
        .from('jurisdictions')
        .select('*')
        .eq('county', county)
        .eq('state_code', 'CA')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!jur) {
        return jsonResponse({ error: `No active jurisdiction for ${county} County, CA` }, 404);
      }

      const currentHash = await computeJurisdictionHash(jur);
      if (currentHash !== approval.jurisdiction_hash) {
        // Auto-lapse
        await supabase
          .from('county_briefing_approvals')
          .update({
            lapsed_at: new Date().toISOString(),
            lapse_reason: 'Jurisdiction data changed since approval',
            updated_at: new Date().toISOString(),
          })
          .eq('id', approval.id);

        return jsonResponse({
          error: "Approval lapsed: jurisdiction data changed since approval. Re-preview and re-approve.",
        }, 422);
      }

      // Fetch queued recipients
      const { data: recipients } = await supabase
        .from('county_briefing_recipients')
        .select('*')
        .eq('county', county)
        .eq('state_code', 'CA')
        .eq('status', 'queued');

      if (!recipients || recipients.length === 0) {
        return jsonResponse({ sent: 0, failed: 0, held: 0, detail: "No queued recipients" });
      }

      let sent = 0, failed = 0, held = 0;

      for (const r of recipients) {
        // Dedup: check if already sent to this email for this county
        const { data: existing } = await supabase
          .from('county_briefing_recipients')
          .select('id')
          .eq('email', r.email)
          .eq('county', county)
          .eq('status', 'sent')
          .limit(1);

        if (existing && existing.length > 0) {
          await supabase
            .from('county_briefing_recipients')
            .update({ status: 'held', hold_reason: 'Already sent to this email for this county' })
            .eq('id', r.id);
          held++;
          continue;
        }

        let ctaUrl: string;
        let sendAccessVia: string | undefined;

        if (r.variant === 'warm') {
          // Look up invite token + org for access_via branching
          const { data: invite } = await supabase
            .from('evidly_client_invites')
            .select('token, organization_id')
            .eq('email', r.email)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (!invite?.token) {
            await supabase
              .from('county_briefing_recipients')
              .update({ status: 'held', hold_reason: 'No invite on file for this email' })
              .eq('id', r.id);
            held++;
            continue;
          }
          ctaUrl = `https://app.getevidly.com/join/${invite.token}`;

          if (invite.organization_id) {
            const { data: org } = await supabase
              .from('organizations')
              .select('access_via')
              .eq('id', invite.organization_id)
              .maybeSingle();
            sendAccessVia = org?.access_via || undefined;
          }
        } else {
          ctaUrl = 'https://getstovio.com/study/?from=email';
        }

        const firstName = r.first_name || 'there';
        const html = buildBriefingEmail(county, firstName, r.org_name, jur, r.variant, ctaUrl, sendAccessVia, r.unsub_token);
        const subject = `${county} County Briefing — How This County Evaluates Commercial Kitchens`;

        const result = await sendEmail({ to: r.email, subject, html });

        if (result) {
          await supabase
            .from('county_briefing_recipients')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              resend_id: result.id,
              approval_id: approval.id,
            })
            .eq('id', r.id);
          sent++;
        } else {
          await supabase
            .from('county_briefing_recipients')
            .update({ status: 'failed' })
            .eq('id', r.id);
          failed++;
        }
      }

      return jsonResponse({ sent, failed, held });
    }

    // ── ADD-RECIPIENTS ──────────────────────────────────────────
    if (action === "add-recipients") {
      const list = body.recipients as Array<{
        email: string; first_name?: string; org_name?: string;
        county: string; variant?: string;
      }>;

      if (!list || !Array.isArray(list) || list.length === 0) {
        return jsonResponse({ error: "recipients array required" }, 400);
      }

      const rows = list.map(r => ({
        email: r.email.trim().toLowerCase(),
        first_name: r.first_name || null,
        org_name: r.org_name || null,
        county: r.county,
        state_code: 'CA',
        variant: r.variant || 'cold',
        status: 'queued',
        unsub_token: crypto.randomUUID(),
      }));

      const { error } = await supabase
        .from('county_briefing_recipients')
        .insert(rows);

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ inserted: rows.length });
    }

    // ── LIST ────────────────────────────────────────────────────
    if (action === "list") {
      // All active CA jurisdictions, left-joined to approvals + recipient counts
      const { data: jurisdictions } = await supabase
        .from('jurisdictions')
        .select('id, county, agency_name, fire_ahj_name, grading_type, grading_config, violation_weight_map, hood_cleaning_default, fire_jurisdiction_config, jie_audit_status')
        .eq('state_code', 'CA')
        .eq('is_active', true)
        .order('county');

      if (!jurisdictions) {
        return jsonResponse({ counties: [] });
      }

      const { data: approvals } = await supabase
        .from('county_briefing_approvals')
        .select('*')
        .eq('state_code', 'CA');

      const approvalMap = new Map<string, typeof approvals extends Array<infer T> ? T : never>();
      for (const a of (approvals || [])) {
        approvalMap.set(a.county, a);
      }

      // Aggregate recipient counts per county
      const { data: recipientRows } = await supabase
        .from('county_briefing_recipients')
        .select('county, status')
        .eq('state_code', 'CA');

      const recipientCounts = new Map<string, { queued: number; sent: number; held: number; failed: number }>();
      for (const r of (recipientRows || [])) {
        if (!recipientCounts.has(r.county)) {
          recipientCounts.set(r.county, { queued: 0, sent: 0, held: 0, failed: 0 });
        }
        const c = recipientCounts.get(r.county)!;
        if (r.status === 'queued') c.queued++;
        else if (r.status === 'sent') c.sent++;
        else if (r.status === 'held') c.held++;
        else if (r.status === 'failed') c.failed++;
      }

      const counties = jurisdictions.map(j => {
        const gate = checkRequirements(j);
        const appr = approvalMap.get(j.county);
        const rc = recipientCounts.get(j.county) || { queued: 0, sent: 0, held: 0, failed: 0 };

        return {
          county: j.county,
          jurisdiction_id: j.id,
          sendable: gate.ok,
          block_reason: gate.block_reason,
          approved: appr?.approved_at ? true : false,
          lapsed: appr?.lapsed_at ? true : false,
          lapse_reason: appr?.lapse_reason || null,
          approved_at: appr?.approved_at || null,
          ...rc,
        };
      });

      return jsonResponse({ counties });
    }

    // ── LIST-STEPS ───────────────────────────────────────────────
    if (action === "list-steps") {
      const { data: steps } = await supabase
        .from('outreach_steps')
        .select('*')
        .order('step_number');

      return jsonResponse({ steps: steps || [] });
    }

    // ── UPSERT-STEP ─────────────────────────────────────────────
    if (action === "upsert-step") {
      const { step_number, label, delay_days, trigger_type, variant_scope,
              subject_template, body_template, is_active } = body;

      if (step_number === undefined || step_number === null || !label) {
        return jsonResponse({ error: "step_number and label required" }, 400);
      }

      // Compute content hash over every rendered field
      const hashInput = {
        subject_template: subject_template || '',
        body_template: body_template || '',
        variant_scope: variant_scope || 'both',
      };
      const contentHash = await computeStepContentHash(hashInput);

      // Check if step exists
      const { data: existing } = await supabase
        .from('outreach_steps')
        .select('id, content_hash')
        .eq('step_number', step_number)
        .single();

      const row: Record<string, any> = {
        step_number,
        label,
        delay_days: delay_days ?? 0,
        trigger_type: trigger_type || 'manual',
        variant_scope: variant_scope || 'both',
        subject_template: subject_template || '',
        body_template: body_template || '',
        content_hash: contentHash,
        updated_at: new Date().toISOString(),
        // If content changed, clear sign-off
        ...(existing && existing.content_hash !== contentHash
          ? { signed_off_by: null, signed_off_at: null }
          : {}),
      };
      if (is_active !== undefined) row.is_active = is_active;

      const { data: step, error } = existing
        ? await supabase.from('outreach_steps').update(row).eq('id', existing.id).select().single()
        : await supabase.from('outreach_steps').insert({ ...row, content_hash: contentHash }).select().single();

      if (error) return jsonResponse({ error: error.message }, 500);

      return jsonResponse({ step });
    }

    // ── SIGN-OFF-STEP ───────────────────────────────────────────
    if (action === "sign-off-step") {
      const { step_number } = body;
      if (!step_number) return jsonResponse({ error: "step_number required" }, 400);

      const { data: step } = await supabase
        .from('outreach_steps')
        .select('*')
        .eq('step_number', step_number)
        .single();

      if (!step) return jsonResponse({ error: `Step ${step_number} not found` }, 404);

      // Recompute hash and verify content hasn't drifted
      const currentHash = await computeStepContentHash(step);
      if (currentHash !== step.content_hash) {
        // Content was modified outside upsert — update hash, clear any stale sign-off
        await supabase.from('outreach_steps').update({
          content_hash: currentHash,
          signed_off_by: null,
          signed_off_at: null,
          updated_at: new Date().toISOString(),
        }).eq('id', step.id);
        return jsonResponse({ error: "Content hash mismatch — step content changed. Re-review before signing off." }, 422);
      }

      const { data: updated, error } = await supabase
        .from('outreach_steps')
        .update({
          signed_off_by: user!.id,
          signed_off_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', step.id)
        .select()
        .single();

      if (error) return jsonResponse({ error: error.message }, 500);

      return jsonResponse({ step: updated });
    }

    // ── CRON-PROCESS ────────────────────────────────────────────
    // Called daily by pg_cron. Processes auto-trigger steps for warm
    // recipients. Cold never sends from EvidLY — export to HubSpot.
    // Every skip writes its reason to the recipient row.
    if (action === "cron-process") {
      // Master pause check — step_number 0 with is_active=false halts all sending
      const { data: masterRow } = await supabase
        .from('outreach_steps')
        .select('is_active')
        .eq('step_number', 0)
        .maybeSingle();

      if (masterRow && !masterRow.is_active) {
        console.log("[county-briefing] cron-process: sending paused");
        return jsonResponse({ processed: 0, sent: 0, held: 0, skipped_reasons: { 'Sending paused': 1 } });
      }

      const now = new Date();
      let sent = 0, held = 0;
      const skippedReasons: Record<string, number> = {};

      function trackSkip(reason: string) {
        skippedReasons[reason] = (skippedReasons[reason] || 0) + 1;
      }

      // Fetch all auto-trigger steps that are active
      const { data: steps } = await supabase
        .from('outreach_steps')
        .select('*')
        .eq('trigger_type', 'auto')
        .eq('is_active', true)
        .order('step_number');

      if (!steps || steps.length === 0) {
        return jsonResponse({ processed: 0, sent: 0, held: 0, skipped_reasons: { 'No auto-trigger steps defined': 1 } });
      }

      for (const step of steps) {
        // Gate: step must be signed off
        if (!step.signed_off_at) {
          // Hold all queued recipients for this step
          const { data: unsignedRecipients } = await supabase
            .from('county_briefing_recipients')
            .select('id')
            .eq('step_number', step.step_number)
            .eq('status', 'queued');

          if (unsignedRecipients && unsignedRecipients.length > 0) {
            for (const r of unsignedRecipients) {
              await supabase.from('county_briefing_recipients')
                .update({ status: 'held', hold_reason: `Step ${step.step_number} not signed off` })
                .eq('id', r.id);
              held++;
            }
            trackSkip(`Step ${step.step_number} not signed off`);
          }
          continue;
        }

        // Verify step content hash hasn't drifted
        const currentStepHash = await computeStepContentHash(step);
        if (currentStepHash !== step.content_hash) {
          const { data: driftRecipients } = await supabase
            .from('county_briefing_recipients')
            .select('id')
            .eq('step_number', step.step_number)
            .eq('status', 'queued');

          if (driftRecipients && driftRecipients.length > 0) {
            for (const r of driftRecipients) {
              await supabase.from('county_briefing_recipients')
                .update({ status: 'held', hold_reason: `Step ${step.step_number} content changed since sign-off` })
                .eq('id', r.id);
              held++;
            }
            trackSkip(`Step ${step.step_number} content drifted`);
          }
          // Lapse the sign-off
          await supabase.from('outreach_steps').update({
            signed_off_by: null, signed_off_at: null,
            content_hash: currentStepHash,
            updated_at: now.toISOString(),
          }).eq('id', step.id);
          continue;
        }

        // Fetch queued recipients for this step
        const { data: recipients } = await supabase
          .from('county_briefing_recipients')
          .select('*')
          .eq('step_number', step.step_number)
          .eq('status', 'queued');

        if (!recipients || recipients.length === 0) continue;

        // Check delay eligibility
        const delayMs = step.delay_days * 24 * 60 * 60 * 1000;

        for (const r of recipients) {
          // Delay gate: recipient must have been created delay_days ago
          const createdAt = new Date(r.created_at);
          if (now.getTime() - createdAt.getTime() < delayMs) {
            trackSkip(`Step ${step.step_number} delay not elapsed`);
            continue; // Don't hold — just not ready yet
          }

          // Cold recipients never send from EvidLY
          if (r.variant === 'cold') {
            trackSkip('Cold variant — export to HubSpot');
            continue; // Leave as queued — cold exported manually
          }

          // County approval gate
          const { data: approval } = await supabase
            .from('county_briefing_approvals')
            .select('*')
            .eq('county', r.county)
            .eq('state_code', 'CA')
            .single();

          if (!approval || !approval.approved_at) {
            await supabase.from('county_briefing_recipients')
              .update({ status: 'held', hold_reason: 'County not approved' })
              .eq('id', r.id);
            held++;
            trackSkip('County not approved');
            continue;
          }

          if (approval.lapsed_at) {
            await supabase.from('county_briefing_recipients')
              .update({ status: 'held', hold_reason: `County approval lapsed: ${approval.lapse_reason || 'data changed'}` })
              .eq('id', r.id);
            held++;
            trackSkip('County approval lapsed');
            continue;
          }

          // Jurisdiction hash check
          const { data: jur } = await supabase
            .from('jurisdictions')
            .select('*')
            .eq('county', r.county)
            .eq('state_code', 'CA')
            .eq('is_active', true)
            .limit(1)
            .single();

          if (!jur) {
            await supabase.from('county_briefing_recipients')
              .update({ status: 'held', hold_reason: 'No active jurisdiction' })
              .eq('id', r.id);
            held++;
            trackSkip('No active jurisdiction');
            continue;
          }

          const currentJurHash = await computeJurisdictionHash(jur);
          if (currentJurHash !== approval.jurisdiction_hash) {
            await supabase.from('county_briefing_approvals').update({
              lapsed_at: now.toISOString(),
              lapse_reason: 'Jurisdiction data changed since approval',
              updated_at: now.toISOString(),
            }).eq('id', approval.id);
            await supabase.from('county_briefing_recipients')
              .update({ status: 'held', hold_reason: 'County approval lapsed: jurisdiction data changed' })
              .eq('id', r.id);
            held++;
            trackSkip('Jurisdiction data changed');
            continue;
          }

          // Dedup check
          const { data: existing } = await supabase
            .from('county_briefing_recipients')
            .select('id')
            .eq('email', r.email)
            .eq('county', r.county)
            .eq('step_number', r.step_number)
            .eq('status', 'sent')
            .limit(1);

          if (existing && existing.length > 0) {
            await supabase.from('county_briefing_recipients')
              .update({ status: 'held', hold_reason: 'Already sent this step to this email' })
              .eq('id', r.id);
            held++;
            trackSkip('Dedup');
            continue;
          }

          // Warm invite lookup + org access_via for close branching
          const { data: invite } = await supabase
            .from('evidly_client_invites')
            .select('token, organization_id')
            .eq('email', r.email)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (!invite?.token) {
            await supabase.from('county_briefing_recipients')
              .update({ status: 'held', hold_reason: 'No invite on file for this email' })
              .eq('id', r.id);
            held++;
            trackSkip('No invite on file');
            continue;
          }

          let cronAccessVia: string | undefined;
          if (invite.organization_id) {
            const { data: org } = await supabase
              .from('organizations')
              .select('access_via')
              .eq('id', invite.organization_id)
              .maybeSingle();
            cronAccessVia = org?.access_via || undefined;
          }

          const ctaUrl = `https://app.getevidly.com/join/${invite.token}`;
          const firstName = r.first_name || 'there';
          const html = buildBriefingEmail(r.county, firstName, r.org_name, jur, r.variant, ctaUrl, cronAccessVia, r.unsub_token);
          const emailSubject = step.subject_template
            ? step.subject_template.replace(/\{\{COUNTY\}\}/g, r.county).replace(/\{\{FIRST_NAME\}\}/g, firstName)
            : `${r.county} County Briefing — How This County Evaluates Commercial Kitchens`;

          const result = await sendEmail({ to: r.email, subject: emailSubject, html });

          if (result) {
            await supabase.from('county_briefing_recipients').update({
              status: 'sent',
              sent_at: now.toISOString(),
              resend_id: result.id,
              approval_id: approval.id,
            }).eq('id', r.id);
            sent++;
          } else {
            await supabase.from('county_briefing_recipients')
              .update({ status: 'failed' })
              .eq('id', r.id);
            trackSkip('Send failed');
          }
        }
      }

      // ── Study five-day follow-up ─────────────────────────────────
      let followupSent = 0, followupSkipped = 0;

      const { data: followUpStep } = await supabase
        .from('outreach_steps')
        .select('*')
        .eq('step_number', STUDY_FOLLOWUP_STEP)
        .eq('is_active', true)
        .maybeSingle();

      if (!followUpStep) {
        trackSkip('Study follow-up step not defined (step 50)');
      } else if (!followUpStep.signed_off_at) {
        trackSkip('Study follow-up step not signed off');
      } else {
        const fHash = await computeStepContentHash(followUpStep);
        if (fHash !== followUpStep.content_hash) {
          trackSkip('Study follow-up content drifted');
          await supabase.from('outreach_steps').update({
            signed_off_by: null, signed_off_at: null,
            content_hash: fHash, updated_at: now.toISOString(),
          }).eq('id', followUpStep.id);
        } else {
          const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

          // Bulk-fetch already-processed response IDs to avoid N+1 queries
          const { data: alreadyProcessed } = await supabase
            .from('study_email_log')
            .select('response_id')
            .eq('email_type', 'five_day_followup');
          const processedIds = new Set(
            (alreadyProcessed || []).map((r: { response_id: string }) => r.response_id),
          );

          const { data: responses } = await supabase
            .from('market_research_responses')
            .select('id')
            .eq('status', 'completed')
            .lte('completed_at', fiveDaysAgo)
            .gte('completed_at', thirtyDaysAgo);

          for (const resp of (responses || [])) {
            if (processedIds.has(resp.id)) continue;

            const { data: contact } = await supabase
              .from('market_research_contacts')
              .select('email, wants_meeting')
              .eq('response_id', resp.id)
              .maybeSingle();

            if (!contact?.email) continue;
            if (contact.wants_meeting === true) continue;

            // Pipeline check — someone who booked through any channel
            const { data: pipeline } = await supabase
              .from('sales_pipeline')
              .select('id')
              .ilike('contact_email', contact.email)
              .limit(1);

            if (pipeline && pipeline.length > 0) continue;

            // Gap records — same logic as KitchenSafetyStudy.jsx
            const { data: answers } = await supabase
              .from('market_research_answers')
              .select('question_id, value')
              .eq('response_id', resp.id);

            const gaps = (answers || [])
              .filter((a: { question_id: string; value: string }) =>
                QUESTION_META[a.question_id] && GAP_RANK[a.value] !== undefined)
              .sort((a: { value: string }, b: { value: string }) =>
                GAP_RANK[a.value] - GAP_RANK[b.value])
              .map((a: { question_id: string; value: string }) => ({
                label: QUESTION_META[a.question_id].label,
                status: GAP_LABEL[a.value],
              }));

            if (gaps.length === 0) {
              // No gaps → no send, log the skip with reason
              try {
                await supabase.from('study_email_log').insert({
                  response_id: resp.id, email_type: 'five_day_followup',
                  recipient_email: contact.email, resend_id: null,
                  status: 'skipped',
                  error_message: 'No gap records — nothing to meet about',
                });
              } catch { /* best-effort */ }
              followupSkipped++;
              continue;
            }

            const followUpUnsubToken = crypto.randomUUID();
            const subject = 'The records you\u2019d have to go looking for';
            const html = buildFollowUpEmail(gaps, gaps.length, followUpUnsubToken);

            const result = await sendEmail({ to: contact.email, subject, html });
            try {
              await supabase.from('study_email_log').insert({
                response_id: resp.id, email_type: 'five_day_followup',
                recipient_email: contact.email, resend_id: result?.id ?? null,
                status: result ? 'sent' : 'failed',
                error_message: result ? null : 'Resend send failed',
                unsub_token: followUpUnsubToken,
              });
            } catch { /* best-effort */ }

            if (result) followupSent++;
            else followupSkipped++;
          }
        }
      }

      console.log("[county-briefing] cron-process:", JSON.stringify({
        sent, held, skipped_reasons: skippedReasons,
        followup_sent: followupSent, followup_skipped: followupSkipped,
      }));
      return jsonResponse({
        processed: sent + held, sent, held, skipped_reasons: skippedReasons,
        followup_sent: followupSent, followup_skipped: followupSkipped,
      });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("[county-briefing] Error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
