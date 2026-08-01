import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/email.ts';
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

// Named-requirement gate. Each required section is checked individually
// so the block reason names the specific gap, not a generic count.
// "What It Weights Heaviest" (violation_weight_map) is optional — only
// 9 of 58 CA counties have it today.
// deno-lint-ignore no-explicit-any
function checkRequirements(jur: Record<string, any>): { ok: boolean; block_reason: string | null } {
  // deno-lint-ignore no-explicit-any
  const fc = jur?.fire_jurisdiction_config as Record<string, any> | null;
  const fireAhj = fc?.fire_ahj_name || jur?.fire_ahj_name;

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
      letter_grade: 'letter grades', pass_fail: 'pass / fail scoring',
      color_placard: 'color-coded placards', numeric: 'numeric scoring',
    };
    let s = h3('How This County Evaluates');
    s += `<p style="font-family:${fInstrument};font-size:14px;line-height:1.6;color:#4A5566;margin:8px 0;">This county uses <strong>${labels[jur.grading_type] || 'standard inspection reports'}</strong> to evaluate food safety inspections.</p>`;
    if (jur.scoring_methodology) {
      s += `<p style="font-family:${fInstrument};font-size:13px;color:#5F6875;">${jur.scoring_methodology}</p>`;
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
): string {
  const body = buildBriefingBody(county, jur);

  const coldClose = `
    <p style="font-family:${fInstrument};font-size:14px;line-height:1.6;color:#4A5566;margin:24px 0 8px;">This is what the county expects. If you want to see how your kitchen lines up, submit the California Commercial Kitchen Safety Study. It takes three minutes, and the report is free.</p>
    <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:18px auto;"><tr>
      <td align="center" style="background:#1C2A3A;"><a href="${ctaUrl}" style="display:inline-block;padding:14px 30px;font-family:${fInstrument};font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;">Take the Study &#8594;</a></td>
    </tr></table>`;

  const warmClose = `
    <p style="font-family:${fInstrument};font-size:14px;line-height:1.6;color:#4A5566;margin:24px 0 8px;">Cleaning Pros Plus already services your kitchen. EvidLY keeps the hood cleaning certificate and every other compliance record where you can reach it the moment someone asks. Your account is ready.</p>
    <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:18px auto;"><tr>
      <td align="center" style="background:#1C2A3A;"><a href="${ctaUrl}" style="display:inline-block;padding:14px 30px;font-family:${fInstrument};font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;">See Your Dashboard &#8594;</a></td>
    </tr></table>`;

  const close = variant === 'warm' ? warmClose : coldClose;

  const unsubUrl = `mailto:founders@getevidly.com?subject=Unsubscribe&body=Please%20remove%20${encodeURIComponent(firstName)}`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="x-apple-disable-message-reformatting">
<title>${county} County Briefing</title>
<style>body{margin:0;padding:0;background:#F7F1E6;} a{text-decoration:none;} img{-ms-interpolation-mode:bicubic;}
@media (max-width:620px){.card{width:100%!important;} .p40{padding-left:22px!important;padding-right:22px!important;}}</style>
</head><body style="margin:0;padding:0;background:#F7F1E6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${firstName}, here is how ${county} County evaluates commercial kitchens.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F1E6;">
<tr><td align="center" style="padding:28px 16px;">
<table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FFFFFF;border:1px solid #EEE7D9;">

  <!-- 1. HEADER — navy, wordmark + County Briefing label -->
  <tr><td class="p40" style="background:#1C2A3A;padding:20px 40px;">
    <div style="font-family:${fMontserrat};font-weight:900;font-size:26px;letter-spacing:-0.5px;line-height:1;"><span style="color:#B24A2E;">E</span><span style="color:#F4EFE4;">vid</span><span style="color:#B24A2E;">LY</span></div>
    <div style="font-family:${fMono};font-size:10.5px;letter-spacing:0.12em;color:rgba(255,255,255,0.60);text-transform:uppercase;margin-top:7px;">County Briefing</div>
  </td></tr>

  <!-- 2. GREETING + INTRO -->
  <tr><td class="p40" style="padding:28px 40px 0;">
    <p style="font-family:${fInstrument};font-size:14px;line-height:1.6;color:#4A5566;margin:0 0 8px;">${firstName}, here is how <strong>${county} County</strong> evaluates commercial kitchens.</p>
  </td></tr>

  <!-- 3. BODY SECTIONS -->
  <tr><td class="p40" style="padding:0 40px 20px;">
    ${body}
  </td></tr>

  <!-- 4. CLOSE — variant-specific -->
  <tr><td class="p40" style="padding:0 40px 28px;border-top:1px solid #EEE7D9;">
    ${close}
  </td></tr>

  <!-- 5. FOOTER -->
  <tr><td class="p40" align="center" style="background:#FBF9F2;padding:24px 40px;border-top:1px solid #EEE7D9;text-align:center;">
    <div style="font-family:${fMono};font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#9A9384;">EvidLY &middot; Commercial Kitchen Risk Management</div>
    <div style="font-family:${fInstrument};font-size:11px;color:#9A9384;margin-top:10px;line-height:1.6;">Cleaning Pros Plus, LLC &middot; {{BUSINESS_ADDRESS}}</div>
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

    // ── Auth: verify user is EvidLY staff ──────────────────────
    const authHeader = req.headers.get("Authorization");
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    if (!user.email?.endsWith("@getevidly.com")) {
      return jsonResponse({ error: "Admin access required" }, 403);
    }

    const body = await req.json();
    const { action } = body;

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
      const previewHtml = buildBriefingEmail(county, 'there', null, jur, variant, '#');

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
          approved_by: user.id,
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

        if (r.variant === 'warm') {
          // Look up invite token
          const { data: invite } = await supabase
            .from('evidly_client_invites')
            .select('token')
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
        } else {
          ctaUrl = 'https://getevidly.com/study?from=email';
        }

        const firstName = r.first_name || 'there';
        const html = buildBriefingEmail(county, firstName, r.org_name, jur, r.variant, ctaUrl);
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
        .select('id, county, agency_name, fire_ahj_name, grading_type, grading_config, violation_weight_map, hood_cleaning_default, fire_jurisdiction_config')
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

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("[county-briefing] Error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
