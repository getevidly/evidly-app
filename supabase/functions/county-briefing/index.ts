import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
import { sendEmail, buildEmailHtml } from '../_shared/email.ts';
import { QUESTION_META } from '../_shared/study-questions.ts';
import { sortedJsonStringify, sha256 } from '../_shared/seal-canonicalization.ts';
import { buildClientInviteEmail } from '../_shared/invites.ts';

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
 *
 *   update-jurisdiction  { county, edits: { grading_type?, agency_name?,
 *                          jie_audit_status?, grading_config? },
 *                          source_confirmed?: boolean }
 *                        → { updated, batch_id, changes }
 *                        History row written BEFORE jurisdiction update.
 *                        If history insert fails, abort — no write.
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

/**
 * The name a jurisdiction is labelled by.
 *
 * A city jurisdiction is its own health authority (Long Beach is not Los
 * Angeles County), so it is labelled by city and takes no "County" suffix.
 * San Francisco carries a city and a county of the same name because it is a
 * consolidated city-county, so it keeps the county form.
 *
 * The word "County" lives inside the returned name rather than beside every
 * call site, which is what let a city inherit it in the first place.
 */
// deno-lint-ignore no-explicit-any
function jurisdictionDisplayName(county: string, jur: Record<string, any> | null | undefined): string {
  const city = typeof jur?.city === 'string' ? jur.city.trim() : '';
  if (city && city.toLowerCase() !== (county || '').trim().toLowerCase()) return city;
  return `${county} County`;
}

const DEFAULT_SUBJECT = (displayName: string) =>
  `${displayName} Briefing — How ${displayName} Evaluates Commercial Kitchens`;

function buildSubject(template: string | null | undefined, displayName: string, firstName: string): string {
  if (!template) return DEFAULT_SUBJECT(displayName);
  // Templates written before cities were labelled separately put the word
  // "County" straight after the token, so substituting a city name alone
  // would read "Long Beach County". Absorb the adjacent word: a county row
  // still resolves to "Merced County", a city row to "Long Beach".
  return template
    .replace(/\{\{COUNTY\}\}\s+County\b/g, displayName)
    .replace(/\{\{COUNTY\}\}/g, displayName)
    .replace(/\{\{FIRST_NAME\}\}/g, firstName);
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
  // Format 4: gc.placard_rules as { green: { label, score_range, color }, ... }
  // Only the nested-object form with a score_range is a tier set. The flat
  // colour-to-sentence form (Sacramento) is a violation-count rule, not a
  // score band, and is rendered as prose by buildPlacardProse instead.
  const pr = gc.placard_rules;
  if (pr && typeof pr === 'object' && !Array.isArray(pr)) {
    const placards: Array<{ name: string; range: string; color?: string; rank: number }> = [];
    for (const [key, val] of Object.entries(pr)) {
      if (key === 'imminent_health_hazard_override') continue;
      if (!val || typeof val !== 'object' || Array.isArray(val)) continue;
      // deno-lint-ignore no-explicit-any
      const v = val as Record<string, any>;
      if (typeof v.score_range !== 'string' || !v.score_range.trim()) continue;
      placards.push({
        name: String(v.label || v.color || key),
        range: v.score_range,
        ...(v.color ? { color: String(v.color) } : {}),
        rank: placardRank(String(v.color || key)),
      });
    }
    if (placards.length >= 2) {
      placards.sort((a, b) => a.rank - b.rank);
      return placards.map(({ rank: _rank, ...t }) => t);
    }
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


// ── Placard / no-grade helpers ───────────────────────────────────
// Several verified counties store a complete evaluation method in a shape
// extractTiers never read, so they fell through to the "once verified"
// placeholder despite being verified with full data. These read the shapes
// that actually exist rather than asking the data to change.

const PLACARD_ORDER = ['green', 'yellow', 'red'];

function placardRank(key: string): number {
  const i = PLACARD_ORDER.indexOf(key.toLowerCase());
  return i === -1 ? PLACARD_ORDER.length : i;
}

/**
 * True when the county issues no grade, placard or score at all — it keeps a
 * narrative inspection report and nothing else. Covers the modern schema
 * (three explicit produces_* flags, or evaluation_method calcode_narrative)
 * and the older flat shape (a violation report with an absent or empty
 * grades map). Deliberately strict: Alameda produces a score and Sacramento
 * produces a placard, so neither is caught here.
 */
// deno-lint-ignore no-explicit-any
function producesNoGrade(gc: Record<string, any> | null): boolean {
  if (!gc) return false;
  if (gc.produces_score === false && gc.produces_placard === false && gc.produces_letter_grade === false) {
    return true;
  }
  if (gc.evaluation_method === 'calcode_narrative') return true;
  const df = gc.display_format;
  if (df === 'violation_report' || df === 'violation_report_only') {
    const g = gc.grades;
    const empty = g === null || g === undefined
      || (typeof g === 'object' && !Array.isArray(g) && Object.keys(g).length === 0);
    if (empty) return true;
  }
  return false;
}

/**
 * Placard rules whose colour is set by a MAJOR-VIOLATION COUNT rather than a
 * score: placard_rules is a flat map of colour to a sentence. Rendered as the
 * stored prose, because forcing it into a name/range table would state a
 * numeric basis this county does not use.
 */
// deno-lint-ignore no-explicit-any
function buildPlacardProse(gc: Record<string, any>, fBody: string, fCode: string): string {
  const pr = gc.placard_rules;
  if (!pr || typeof pr !== 'object' || Array.isArray(pr)) return '';
  const rows = Object.entries(pr)
    .filter(([k, v]) => k !== 'imminent_health_hazard_override' && typeof v === 'string' && (v as string).trim())
    .sort((a, b) => placardRank(a[0]) - placardRank(b[0]));
  if (rows.length === 0) return '';

  const basis = gc.evaluation_method === 'major_violation_count_placard'
    ? 'Placard colour is set by the number of major violations observed, not by a numeric score.'
    : 'Placard colour is set by the rules below, not by a numeric score.';

  let html = `<p style="font-family:${fBody};font-size:14px;line-height:1.6;color:#4A5566;margin:0 0 10px;">${basis}</p>`;
  html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 12px;">`;
  for (const [name, text] of rows) {
    html += `<tr><td valign="top" style="padding:8px 10px;border-bottom:1px solid #EEE7D9;color:#1C2A3A;font-family:${fCode};font-size:11px;letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap;">${name}</td>` +
      `<td style="padding:8px 10px;border-bottom:1px solid #EEE7D9;color:#4A5566;font-family:${fBody};font-size:13px;line-height:1.5;">${text}</td></tr>`;
  }
  html += '</table>';
  return html;
}

/**
 * Qualitative deduction scales: deduction_tiers carries risk bands and a
 * relative magnitude, with no numeric ranges anywhere, so there is nothing to
 * put in a range column. Rendered as prose describing the method.
 */
// deno-lint-ignore no-explicit-any
function buildDeductionProse(gc: Record<string, any>, fBody: string, fCode: string): string {
  const dt = gc.deduction_tiers;
  if (!Array.isArray(dt) || dt.length === 0) return '';

  const lowerBetter = gc.lower_is_better === true || gc.scale_direction === 'negative';
  const perfect = typeof gc.perfect_score === 'number' ? gc.perfect_score : null;
  let lead = 'Inspections are scored by deduction: points are taken for each violation.';
  if (lowerBetter) {
    lead += perfect !== null
      ? ` A lower total is better — a clean inspection scores ${perfect}.`
      : ' A lower total is better.';
  }
  lead += ' Violations are weighted by risk:';

  let html = `<p style="font-family:${fBody};font-size:14px;line-height:1.6;color:#4A5566;margin:0 0 10px;">${lead}</p>`;
  html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 12px;">`;
  for (const t of dt) {
    if (!t || typeof t !== 'object') continue;
    // deno-lint-ignore no-explicit-any
    const row = t as Record<string, any>;
    const name = String(row.tier || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    if (!name) continue;
    const mag = row.deduction_magnitude ? `${row.deduction_magnitude} deduction` : '';
    const ex = Array.isArray(row.examples) && row.examples.length > 0
      ? `${mag ? ' \u00b7 ' : ''}${row.examples.join(', ')}`
      : '';
    html += `<tr><td valign="top" style="padding:8px 10px;border-bottom:1px solid #EEE7D9;color:#1C2A3A;font-family:${fCode};font-size:11px;letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap;">${name}</td>` +
      `<td style="padding:8px 10px;border-bottom:1px solid #EEE7D9;color:#4A5566;font-family:${fBody};font-size:13px;line-height:1.5;">${mag}${ex}</td></tr>`;
  }
  html += '</table>';
  return html;
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
    // deno-lint-ignore no-explicit-any
    const hcOverride = jur?.hood_cleaning_local_override as Record<string, any> | null;
    if (hcOverride && hcOverride.verification_status === 'verified' && hcOverride.minimum_frequency) {
      s += `<p style="font-family:${fInstrument};font-size:14px;line-height:1.6;color:#4A5566;margin:8px 0;">This county sets a local minimum of <strong>${freqLabel(hcOverride.minimum_frequency)}</strong> for hood cleaning.`;
      if (hcOverride.ordinance_citation) {
        s += ` Source: ${hcOverride.ordinance_citation}.`;
      }
      s += `</p>`;
    } else if (jur?.hood_cleaning_default) {
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
  accessVia?: string,
  unsubToken?: string,
): string {
  const unsubBase = `${Deno.env.get("SUPABASE_URL") || "https://irxgmhxhmxtzfwuieblc.supabase.co"}/functions/v1/email-unsubscribe`;
  const unsubUrl = unsubToken
    ? `${unsubBase}?token=${encodeURIComponent(unsubToken)}`
    : 'https://app.getevidly.com/settings/notifications';

  // Every label below uses this, so a city is never called by its county.
  const displayName = jurisdictionDisplayName(county, jur);

  // ── Card builders for fire / food grids ─────────────────────────
  // Standard card: white bg, solid border, coloured top accent
  const card = (title: string, cite: string, value: string, accent: string, cadence?: string) => {
    const citeLine = cadence
      ? `${cite} <span style="color:#B24A2E;">\u00b7 ${cadence}</span>`
      : cite;
    const valueLine = value
      ? `<div style="font-family:${fInstrument};font-size:11.5px;color:#4A5566;margin-top:5px;">${value}</div>`
      : '';
    return `<td width="33%" style="padding:0 4px 8px;" valign="top"><div style="border:1px solid #E7DFCE;border-top:3px solid ${accent};padding:11px;background:#FFFFFF;">` +
      `<div style="font-family:${fInstrument};font-size:12.5px;font-weight:bold;color:#1C2A3A;">${title}</div>` +
      `<div style="font-family:${fMono};font-size:9.5px;color:#8B95AA;margin-top:2px;">${citeLine}</div>` +
      `${valueLine}</div></td>`;
  };
  // Listed card: dashed border, tinted bg, no accent, uppercase label
  const listed = (label: string, title: string, cite: string) =>
    `<td width="33%" style="padding:0 4px 8px;" valign="top"><div style="border:1px dashed #C9C2B4;padding:11px;background:#FCFAF5;">` +
    `<div style="font-family:${fMono};font-size:8.5px;letter-spacing:0.08em;text-transform:uppercase;color:#A79E8D;margin-bottom:3px;">${label}</div>` +
    `<div style="font-family:${fInstrument};font-size:12.5px;font-weight:bold;color:#1C2A3A;">${title}</div>` +
    `<div style="font-family:${fMono};font-size:9.5px;color:#8B95AA;margin-top:2px;">${cite}</div>` +
    `</div></td>`;
  // Wrap cards into 3-per-row grid using nested tables (Outlook-safe)
  const gridOpen = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">`;
  const gridRow = (...cells: string[]) => `<tr>${cells.join('')}</tr>`;
  const emptyCell = `<td width="33%" style="padding:0 4px 8px;" valign="top"></td>`;

  const FA = '#B24A2E'; // fire accent
  const XA = '#3E6B8A'; // food accent

  const fireGrid = gridOpen +
    gridRow(
      card('Hood and exhaust cleaning', 'NFPA 96 \u00b7 CFC 609', 'By cooking volume and equipment type', FA),
      card('Fire suppression system', 'NFPA 17A \u00b7 CFC 904', 'Every 6 months', FA),
      card('Sprinkler system', 'NFPA 25 \u00b7 CFC 901', 'Annually', FA),
    ) +
    gridRow(
      card('Fire alarm system', 'NFPA 72 \u00b7 CFC 907', 'Annually', FA),
      card('Fire extinguishers', 'NFPA 10 \u00b7 CFC 906', 'Annually', FA),
      listed('Issued to you', 'Fire authority inspection report', 'Local fire authority'),
    ) +
    '</table>';

  const foodGrid = gridOpen +
    gridRow(
      card('Pest control', '\u00a7114259', 'Monthly service', XA),
      listed('If applicable', 'Grease trap service', 'Local fats, oils and grease ordinance'),
      listed('If applicable', 'Backflow testing', 'California Code of Regulations Title 17'),
    ) +
    gridRow(
      card('Receiving temperature log', '\u00a7114037', 'At delivery', XA, 'one per day'),
      card('Cold holding log', '\u00a7113996', '\u226441\u00b0F', XA, 'one per day'),
      card('Hot holding log', '\u00a7113996', '\u2265135\u00b0F', XA, 'one per day'),
    ) +
    gridRow(
      card('Cooling log', '\u00a7114002', '135\u219270\u00b0F in 2 hrs', XA, 'one per day'),
      card('Reheating log', '\u00a7114016', '\u2265165\u00b0F within 2 hrs', XA, 'one per day'),
      card('Warewash and sanitizer', '\u00a7114099', 'Test kit on hand', XA),
    ) +
    gridRow(
      card('Health permit', '\u00a7114381', 'Current', XA),
      card('Food protection manager', '\u00a7113947.1', 'One per facility', XA, 'one per certified person'),
      card('Food handler cards', '\u00a7113948', 'All food staff', XA, 'one per person'),
    ) +
    gridRow(
      card('Allergen awareness and training', '\u00a7113947(b)', '', XA, 'one per person'),
      card('Person in charge', '\u00a7113945', '', XA),
      card('Employee health policy', '\u00a7113949', '', XA),
    ) +
    gridRow(
      listed('If applicable', 'HACCP plan', '\u00a7114419'),
      listed('If applicable', 'Edible food recovery agreement and log', 'California Code of Regulations Title 14 \u00a718991.3'),
      listed('If applicable', 'Allergen labelling on menus', 'Senate Bill 68 \u00b7 effective 1 July 2026'),
    ) +
    gridRow(
      listed('If applicable', 'Prepackaged food labelling', '\u00a7114089'),
      listed('Issued to you', 'Health inspection report', 'County health department'),
      emptyCell,
    ) +
    '</table>';

  // ── Build evaluation block from jurisdiction data ─────────────────
  // Reads grading_config.tiers + grading_config.point_values — the same
  // fields ScoreTable renders per county.
  // deno-lint-ignore no-explicit-any
  const gc = jur?.grading_config as Record<string, any> | null;
  let evalBlock = '';

  if (jur?.grading_type === 'calcode_default' || producesNoGrade(gc)) {
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

  // Shapes a name/range table would misrepresent, so they render as prose.
  if (!evalBlock && gc) {
    evalBlock = buildPlacardProse(gc, fInstrument, fMono) || buildDeductionProse(gc, fInstrument, fMono);
  }

  if (!evalBlock) {
    // "once verified" is only honest for a row that is actually unverified.
    // A verified county with a shape nothing above caught still has its
    // method on file, and saying otherwise misreports our own data.
    evalBlock = jur?.jie_audit_status === 'verified'
      ? `<p style="font-family:${fInstrument};font-size:14px;line-height:1.6;color:#4A5566;margin:0;">This county’s evaluation method is on file — see how ${displayName} reports below.</p>`
      : `<p style="font-family:${fInstrument};font-size:14px;line-height:1.6;color:#8B95AA;margin:0;font-style:italic;">County-specific evaluation details will appear here once verified.</p>`;
  }

  if (jur?.agency_name) {
    evalBlock += `<p style="font-family:${fMono};font-size:10px;letter-spacing:0.08em;color:#9A9384;margin:10px 0 0;text-transform:uppercase;">Source: ${jur.agency_name}.</p>`;
  }

  const countyDisplay = displayName;
  const briefingSlug = ((jur?.slug) || '').replace(/-ca$/, '');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${displayName} Briefing</title>
<style>
:root { color-scheme: light only; supported-color-schemes: light only; }
body{margin:0;padding:0;background:#F7F1E6;} a{text-decoration:none;} img{-ms-interpolation-mode:bicubic;}
@media (max-width:620px){.card{width:100%!important;} .p40{padding-left:22px!important;padding-right:22px!important;}}
</style>
</head><body style="margin:0;padding:0;background:#F7F1E6;" bgcolor="#F7F1E6">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Hi ${firstName} \u2014 what ${displayName} can ask your kitchen to produce.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F1E6;" bgcolor="#F7F1E6">
<tr><td align="center" style="padding:28px 16px;">
<table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FFFFFF;border:1px solid #EEE7D9;" bgcolor="#FFFFFF">

  <!-- 1. HEADER -->
  <tr><td class="p40" style="background:#1C2A3A;padding:20px 40px;" bgcolor="#1C2A3A">
    <div style="font-family:${fMontserrat};font-weight:900;font-size:26px;letter-spacing:-0.5px;line-height:1;"><span style="color:#B24A2E;">E</span><span style="color:#F4EFE4;">vid</span><span style="color:#B24A2E;">LY</span></div>
    <div style="font-family:${fMono};font-size:10.5px;letter-spacing:0.12em;color:rgba(255,255,255,0.60);text-transform:uppercase;margin-top:7px;">Commercial Kitchen Risk Management</div>
  </td></tr>

  <!-- 2. COUNTY KICKER -->
  <tr><td class="p40" style="padding:28px 40px 0;" bgcolor="#FFFFFF">
    <div style="font-family:${fMono};font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#B24A2E;margin:0 0 12px;">${displayName} Briefing</div>
  </td></tr>

  <!-- 3. SALUTATION -->
  <tr><td class="p40" style="padding:0 40px 0;" bgcolor="#FFFFFF">
    <p style="font-family:${fInstrument};font-size:14px;line-height:1.6;color:#4A5566;margin:0 0 20px;">${
      firstName !== 'there' && orgName
        ? `Hi <strong style="color:#1C2A3A;">${firstName}</strong> \u2014 <strong style="color:#1C2A3A;">${orgName}</strong> runs a kitchen in ${displayName}. Here is what your property management, insurance company, compliance officer, the fire marshal and health department can ask you to produce anytime.`
        : firstName !== 'there'
        ? `Hi <strong style="color:#1C2A3A;">${firstName}</strong> \u2014 you manage a kitchen in ${displayName}. Here is what your property management, insurance company, compliance officer, the fire marshal and health department can ask you to produce anytime.`
        : `Hi there \u2014 you manage a kitchen in ${displayName}. Here is what your property management, insurance company, compliance officer, the fire marshal and health department can ask you to produce anytime.`
    }</p>
  </td></tr>

    <tr><td bgcolor="#FFFFFF" align="center" style="background:#FFFFFF;padding:26px 32px 6px;">
      <div style="font-family:'Instrument Sans',Arial,sans-serif;font-weight:700;font-size:25px;line-height:1.2;letter-spacing:-.01em;color:#1C2A3A;">
        What a commercial kitchen in ${countyDisplay} has to produce.
      </div>
    </td></tr>

    <tr><td bgcolor="#FFFFFF" align="center" style="background:#FFFFFF;padding:14px 40px 28px;">
      <div style="font-family:'Instrument Sans',Arial,sans-serif;font-size:15.5px;line-height:1.65;color:#5B6470;">
        Having them and having them available are not the same thing &mdash; and the difference only shows up on the day someone&rsquo;s standing there asking.
      </div>
    </td></tr>

    <tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;padding:0 32px 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#1C2A3A" style="background:#1C2A3A;border-top:3px solid #B24A2E;">
        <tr><td bgcolor="#1C2A3A" align="center" style="background:#1C2A3A;padding:26px 20px 6px;">
          <span style="font-family:'Montserrat',Arial,sans-serif;font-weight:800;font-size:62px;line-height:1;color:#CB5E38;">39</span>
        </td></tr>
        <tr><td bgcolor="#1C2A3A" align="center" style="background:#1C2A3A;padding:0 20px 6px;">
          <span style="font-family:'Instrument Sans',Arial,sans-serif;font-weight:600;font-size:15px;color:#F4EFE4;">Records to keep current, at all times</span>
        </td></tr>
        <tr><td bgcolor="#1C2A3A" align="center" style="background:#1C2A3A;padding:6px 20px 4px;">
          <span style="font-family:'IBM Plex Mono','Courier New',monospace;font-size:12px;letter-spacing:.08em;color:#C7D1DF;">Fire 5 &middot; Food 13 &middot; Business 6 &middot; Vendor 15</span>
        </td></tr>
        <tr><td bgcolor="#1C2A3A" align="center" style="background:#1C2A3A;padding:4px 26px 26px;">
          <span style="font-family:'Instrument Sans',Arial,sans-serif;font-size:12.5px;color:#C7D1DF;">That&rsquo;s one kitchen with three service companies. Nine more records apply only to some kitchens.</span>
        </td></tr>
      </table>
    </td></tr>

    <tr><td bgcolor="#FFFFFF" align="center" style="background:#FFFFFF;padding:0 40px 8px;">
      <div style="font-family:'Instrument Sans',Arial,sans-serif;font-size:15px;line-height:1.65;color:#1C2A3A;">
        The full set &mdash; every record with its citation, and how ${countyDisplay} evaluates &mdash; is one click below.
      </div>
    </td></tr>

    <tr><td bgcolor="#FFFFFF" align="center" style="background:#FFFFFF;padding:20px 32px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr><td bgcolor="#B24A2E" style="background:#B24A2E;border-radius:4px;">
          <a href="https://www.getevidly.com/briefing/california/${briefingSlug}?from=email&v=warm" style="display:inline-block;font-family:'Instrument Sans',Arial,sans-serif;font-weight:600;font-size:16px;color:#FFFFFF;padding:14px 30px;">See the ${countyDisplay} Briefing</a>
        </td></tr>
      </table>
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
      const reqJurId = body.jurisdiction_id as string | undefined;
      if (!county && !reqJurId) return jsonResponse({ error: "county or jurisdiction_id required" }, 400);

      // If step_number supplied, check email_kind — invite steps cannot be previewed
      const previewStepNumber = body.step_number as number | undefined;
      if (previewStepNumber !== undefined) {
        const { data: previewStep } = await supabase
          .from('outreach_steps')
          .select('email_kind')
          .eq('step_number', previewStepNumber)
          .eq('is_active', true)
          .maybeSingle();
        if (previewStep?.email_kind === 'invite') {
          return jsonResponse({
            error: "Preview is not available for invite steps. Invite emails are built per-recipient using their invite token.",
          }, 422);
        }
      }

      let jur: any;
      if (reqJurId) {
        const { data } = await supabase
          .from('jurisdictions').select('*')
          .eq('id', reqJurId).eq('is_active', true).single();
        jur = data;
      } else {
        const { data } = await supabase
          .from('jurisdictions').select('*')
          .eq('county', county).eq('state', 'CA')
          .eq('is_active', true).order('city', { ascending: true, nullsFirst: true })
          .limit(1).single();
        jur = data;
      }

      if (!jur) {
        return jsonResponse({ error: `No active jurisdiction found for ${county || reqJurId}` }, 404);
      }

      const gate = checkRequirements(jur);
      const hash = await computeJurisdictionHash(jur);
      const previewAccessVia = (body.access_via as string) || undefined;
      const previewHtml = buildBriefingEmail(county, 'there', null, jur, variant, previewAccessVia, 'preview');

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
      const reqJurId = body.jurisdiction_id as string | undefined;
      if (!county && !reqJurId) return jsonResponse({ error: "county or jurisdiction_id required" }, 400);

      let jur: any;
      if (reqJurId) {
        const { data } = await supabase
          .from('jurisdictions').select('*')
          .eq('id', reqJurId).eq('is_active', true).single();
        jur = data;
      } else {
        const { data } = await supabase
          .from('jurisdictions').select('*')
          .eq('county', county).eq('state', 'CA')
          .eq('is_active', true).order('city', { ascending: true, nullsFirst: true })
          .limit(1).single();
        jur = data;
      }

      if (!jur) {
        return jsonResponse({ error: `No active jurisdiction for ${county || reqJurId}` }, 404);
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

      const sendStepNumber = body.step_number as number | undefined;

      // If step_number supplied, fetch the step's subject_template + email_kind
      let stepSubjectTemplate: string | null = null;
      let stepEmailKind: string = 'briefing';
      if (sendStepNumber !== undefined) {
        const { data: stepRow } = await supabase
          .from('outreach_steps')
          .select('subject_template, email_kind')
          .eq('step_number', sendStepNumber)
          .eq('is_active', true)
          .maybeSingle();
        if (stepRow) {
          stepSubjectTemplate = stepRow.subject_template;
          stepEmailKind = stepRow.email_kind || 'briefing';
        }
      }

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
      const sendJurId = body.jurisdiction_id as string | undefined;
      let jur: any;
      if (sendJurId) {
        const { data } = await supabase
          .from('jurisdictions').select('*')
          .eq('id', sendJurId).eq('is_active', true).single();
        jur = data;
      } else {
        const { data } = await supabase
          .from('jurisdictions').select('*')
          .eq('county', county).eq('state', 'CA')
          .eq('is_active', true).order('city', { ascending: true, nullsFirst: true })
          .limit(1).single();
        jur = data;
      }

      if (!jur) {
        return jsonResponse({ error: `No active jurisdiction for ${county || sendJurId}` }, 404);
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

      // Fetch queued recipients.
      //
      // Cold is excluded here rather than skipped in the loop below, so a
      // cold row is never touched at all — not emailed, and not put on hold
      // by the dedupe check either. Cold never sends from EvidLY; those rows
      // stay queued and go out through the external tool, which is the same
      // rule cron-process enforces with its 'Cold variant' skip.
      let recipientQuery = supabase
        .from('county_briefing_recipients')
        .select('*')
        .eq('county', county)
        .eq('state_code', 'CA')
        .eq('status', 'queued')
        .neq('variant', 'cold');
      if (sendStepNumber !== undefined) {
        recipientQuery = recipientQuery.eq('step_number', sendStepNumber);
      }
      const { data: recipients } = await recipientQuery;

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

        let sendAccessVia: string | undefined;
        let sendInviteToken: string | undefined;

        if (r.variant === 'warm' || stepEmailKind === 'invite') {
          // Look up invite token + org for access_via / invite branching
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
          sendInviteToken = invite.token;
          const slug = county.toLowerCase().replace(/\s+/g, '-');

          if (invite.organization_id) {
            const { data: org } = await supabase
              .from('organizations')
              .select('access_via')
              .eq('id', invite.organization_id)
              .maybeSingle();
            sendAccessVia = org?.access_via || undefined;
          }
        } else {
          const slug = county.toLowerCase().replace(/\s+/g, '-');
        }

        const firstName = r.first_name || 'there';
        let html: string;
        let subject: string;
        if (stepEmailKind === 'invite') {
          const inviteResult = await buildClientInviteEmail({
            recipientName: firstName,
            businessName: r.org_name || 'your kitchen',
            inviteLink: `https://app.getevidly.com/join/${sendInviteToken}`,
            accessVia: sendAccessVia,
            supabase,
          });
          html = inviteResult.html;
          subject = inviteResult.subject;
        } else {
          html = buildBriefingEmail(county, firstName, r.org_name, jur, r.variant, sendAccessVia, r.unsub_token);
          subject = buildSubject(stepSubjectTemplate, jurisdictionDisplayName(county, jur), firstName);
        }

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
        county: string; variant?: string; jurisdiction_id?: string;
        sales_pipeline_id?: string;
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
        ...(r.jurisdiction_id ? { jurisdiction_id: r.jurisdiction_id } : {}),
        // Optional link back to the CRM prospect this recipient was added
        // alongside. Omitted entirely when absent, so existing callers that
        // never send it behave exactly as before.
        ...(r.sales_pipeline_id ? { sales_pipeline_id: r.sales_pipeline_id } : {}),
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
      // All active CA jurisdictions (county + city rows), left-joined to approvals + recipient counts
      const { data: jurisdictions } = await supabase
        .from('jurisdictions')
        .select('id, county, city, agency_name, fire_ahj_name, grading_type, grading_config, violation_weight_map, hood_cleaning_default, fire_jurisdiction_config, jie_audit_status, slug')
        .eq('state', 'CA')
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
          city: (j as any).city || null,
          jurisdiction_id: j.id,
          slug: (j as any).slug || null,
          sendable: gate.ok,
          block_reason: gate.block_reason,
          approved: appr?.approved_at ? true : false,
          lapsed: appr?.lapsed_at ? true : false,
          lapse_reason: appr?.lapse_reason || null,
          approved_at: appr?.approved_at || null,
          grading_type: j.grading_type || null,
          grading_config: j.grading_config || null,
          agency_name: j.agency_name || null,
          jie_audit_status: j.jie_audit_status || null,
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

    // ── LIST-RECIPIENTS ─────────────────────────────────────────
    // The tab used to read this table directly from the browser, but
    // county_briefing_recipients is gated by platform_admin_read and no
    // user holds that role, so the query silently returned zero rows.
    // Reading it here on the service role fixes the list without opening
    // the table — the RLS policy is deliberately left untouched.
    if (action === "list-recipients") {
      const { data: recipients, error } = await supabase
        .from('county_briefing_recipients')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ ok: true, recipients: recipients || [] });
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

          // Jurisdiction hash check — prefer jurisdiction_id when available
          let jur: any;
          if (r.jurisdiction_id) {
            const { data } = await supabase
              .from('jurisdictions').select('*')
              .eq('id', r.jurisdiction_id).eq('is_active', true).single();
            jur = data;
          } else {
            const { data } = await supabase
              .from('jurisdictions').select('*')
              .eq('county', r.county).eq('state', 'CA')
              .eq('is_active', true).order('city', { ascending: true, nullsFirst: true })
              .limit(1).single();
            jur = data;
          }

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

          const firstName = r.first_name || 'there';
          let html: string;
          let emailSubject: string;
          if ((step.email_kind || 'briefing') === 'invite') {
            const inviteResult = await buildClientInviteEmail({
              recipientName: firstName,
              businessName: r.org_name || 'your kitchen',
              inviteLink: `https://app.getevidly.com/join/${invite.token}`,
              accessVia: cronAccessVia,
              supabase,
            });
            html = inviteResult.html;
            emailSubject = inviteResult.subject;
          } else {
            const slug = r.county.toLowerCase().replace(/\s+/g, '-');
            html = buildBriefingEmail(r.county, firstName, r.org_name, jur, r.variant, cronAccessVia, r.unsub_token);
            emailSubject = buildSubject(step.subject_template, jurisdictionDisplayName(r.county, jur), firstName);
          }

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

    // ── UPDATE-JURISDICTION ─────────────────────────────────────
    // History-first write: snapshot → then update.  If the snapshot
    // insert fails the jurisdiction row is never touched.
    if (action === "update-jurisdiction") {
      const { county, edits, source_confirmed } = body;
      const reqJurId = body.jurisdiction_id as string | undefined;
      if (!county && !reqJurId) return jsonResponse({ error: "county or jurisdiction_id required" }, 400);
      if (!edits || typeof edits !== 'object') return jsonResponse({ error: "edits object required" }, 400);

      let jur: any;
      let jurError: any;
      if (reqJurId) {
        const res = await supabase
          .from('jurisdictions').select('*')
          .eq('id', reqJurId).eq('is_active', true).single();
        jur = res.data; jurError = res.error;
      } else {
        const res = await supabase
          .from('jurisdictions').select('*')
          .eq('county', county).eq('state', 'CA')
          .eq('is_active', true).order('city', { ascending: true, nullsFirst: true })
          .limit(1).single();
        jur = res.data; jurError = res.error;
      }

      if (jurError || !jur) {
        return jsonResponse({ error: `Jurisdiction not found for ${county || reqJurId}` }, 404);
      }

      // Build diff — only allowed fields
      const allowedFields = ['grading_type', 'agency_name', 'fire_ahj_name', 'jie_audit_status', 'grading_config'];
      const changes: { field_name: string; old_value: unknown; new_value: unknown }[] = [];
      const updatePayload: Record<string, unknown> = {};

      for (const field of allowedFields) {
        if (edits[field] !== undefined) {
          const oldVal = jur[field];
          const newVal = edits[field];
          if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;
          changes.push({ field_name: field, old_value: oldVal, new_value: newVal });
          updatePayload[field] = newVal;
        }
      }

      if (changes.length === 0) {
        return jsonResponse({ error: "No changes detected" }, 400);
      }

      // Verified-flag rule: if grading_type or grading_config changed and
      // source_confirmed is not true, force jie_audit_status to needs_review.
      const gradingFields = ['grading_type', 'grading_config'];
      const hasGradingChange = changes.some(c => gradingFields.includes(c.field_name));
      if (hasGradingChange && !source_confirmed) {
        const existing = changes.find(c => c.field_name === 'jie_audit_status');
        if (existing) {
          existing.new_value = 'needs_review';
        } else {
          changes.push({ field_name: 'jie_audit_status', old_value: jur.jie_audit_status, new_value: 'needs_review' });
        }
        updatePayload.jie_audit_status = 'needs_review';
      }

      // STEP 1: Snapshot current values into jurisdiction_edits FIRST.
      const batchId = crypto.randomUUID();
      const historyRows = changes.map(c => ({
        jurisdiction_id: jur.id,
        county: jur.county,
        batch_id: batchId,
        field_name: c.field_name,
        old_value: c.old_value ?? null,
        new_value: c.new_value ?? null,
        edited_by: user?.email || user?.id || 'platform_admin',
      }));

      const { error: historyError } = await supabase
        .from('jurisdiction_edits')
        .insert(historyRows);

      if (historyError) {
        // History failed — abort.  Jurisdiction row is UNTOUCHED.
        return jsonResponse({
          error: `History insert failed — jurisdiction NOT updated. ${historyError.message}`,
          abort: true,
        }, 500);
      }

      // STEP 2: Update the jurisdiction row.
      const { data: updated, error: updateError } = await supabase
        .from('jurisdictions')
        .update(updatePayload)
        .eq('id', jur.id)
        .select('id, county, grading_type, grading_config, agency_name, jie_audit_status')
        .single();

      if (updateError) {
        return jsonResponse({
          error: `Jurisdiction update failed after history was recorded. batch_id=${batchId}. ${updateError.message}`,
          batch_id: batchId,
        }, 500);
      }

      return jsonResponse({
        updated: true,
        batch_id: batchId,
        changes: changes.length,
        jurisdiction: updated,
      });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("[county-briefing] Error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
