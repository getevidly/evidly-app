// Shared invite email templates for Policy Lens referral flywheel.
// Locked vocab: Policy Lens reads/identifies/flags. Agent evaluates.
// No platform/tool-as-product/score. Kitchen leaders, not operators.

import { buildEmailHtml } from "./email.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { generateRingImages } from "./ring-renderer.ts";

interface InviteEmailParams {
  senderName: string;
  senderOrg: string;
  recipientName: string;
  referralLink: string;
}

/**
 * Company door invite — prospect (kitchen leader) inviting a peer.
 */
export function buildCompanyInviteEmail(
  params: InviteEmailParams,
): { subject: string; html: string } {
  const { senderName, senderOrg, recipientName, referralLink } = params;

  const subject = `${senderName} thought you should see this`;

  const html = buildEmailHtml({
    recipientName,
    bodyHtml: `
      <p>${senderName} from <strong>${senderOrg}</strong> wanted to share
      something with you.</p>
      <p>We recently submitted our commercial insurance policy to
      <strong>Policy Lens</strong> by EvidLY. It reads the policy document,
      identifies what's actually covered, and flags gaps that kitchen leaders
      often miss — things like hood and exhaust system exclusions,
      fire-suppression system warranties, and NFPA 96 cleaning-cadence
      conditions that can void a fire claim.</p>
      <p>It only takes a few minutes. Upload your policy and get a
      plain-language breakdown of where you stand.</p>`,
    ctaText: "Get Your Policy Review",
    ctaUrl: referralLink,
    footerNote: `EvidLY is in its Founder rollout — the first 250 restaurants to join lock in Founder pricing. ${senderName} thought you'd want to claim a spot before they're gone.`,
  });

  return { subject, html };
}

/**
 * Agent door invite — agent inviting a peer agent.
 */
export function buildAgentInviteEmail(
  params: InviteEmailParams,
): { subject: string; html: string } {
  const { senderName, senderOrg, recipientName, referralLink } = params;

  const subject = `${senderName} invited you to try Policy Lens`;

  const html = buildEmailHtml({
    recipientName,
    bodyHtml: `
      <p><strong>${senderName}</strong> from <strong>${senderOrg}</strong>
      wanted to share something with you.</p>
      <p><strong>Policy Lens</strong> by EvidLY reads commercial kitchen
      insurance policies, identifies coverage details, and flags potential
      gaps — giving you a head start before you evaluate the account.</p>
      <p>If you work with restaurant or food service clients, this is worth
      a look. Upload a client's policy and see what it finds.</p>`,
    ctaText: "Try Policy Lens",
    ctaUrl: referralLink,
    footerNote: `EvidLY is in its Founder rollout — the first 250 restaurants to join lock in Founder pricing. ${senderName} thought you'd want to claim a spot before they're gone.`,
  });

  return { subject, html };
}

/**
 * Client onboarding invite — a service provider (e.g. Cleaning Pros Plus)
 * bringing an existing client into EvidLY.
 *
 * Uses its OWN branded HTML template (not buildEmailHtml). Table-based,
 * inline styles, 600px fixed width. Fonts: Instrument Sans (body),
 * IBM Plex Mono (labels/data), Montserrat 800 (wordmark only).
 *
 * Ring images are rendered server-side as PNGs and hosted on Supabase
 * Storage (email-assets bucket). Content-addressed: same n/d values
 * reuse the same image.
 */
interface ClientInviteParams {
  recipientName: string;
  senderName?: string;
  senderOrg?: string;
  businessName: string;
  inviteLink: string;
  personalMessage?: string;
  supabase: SupabaseClient;
}

export async function buildClientInviteEmail(
  params: ClientInviteParams,
): Promise<{ subject: string; html: string }> {
  const { recipientName, businessName, inviteLink, supabase } = params;
  const firstName = recipientName.split(' ')[0];
  const orgName = params.senderOrg || 'Cleaning Pros Plus';

  // ── Day-one numerators: Fire 1 (hood-cleaning certificate), Food 0.
  //    These are day-one values and must be replaced with real proof
  //    counts if this email is ever re-sent to an established client. ──
  const fireNumerator = 1;
  const foodNumerator = 0;

  // Derive denominators from the pillar_requirements catalog so adding
  // a requirement to the catalog changes the email without a code edit.
  const { data: reqs } = await supabase
    .from('pillar_requirements')
    .select('pillar')
    .eq('state_code', 'CA')
    .eq('counts_toward_total', true);

  const fireDenom = reqs?.filter((r: { pillar: string }) => r.pillar === 'fire_safety').length || 5;
  const foodDenom = reqs?.filter((r: { pillar: string }) => r.pillar === 'food_safety').length || 13;
  const total = fireDenom + foodDenom;
  const firePct = Math.round((fireNumerator / fireDenom) * 100);
  const foodPct = Math.round((foodNumerator / foodDenom) * 100);

  // Generate ring PNGs (content-addressed — reuses existing images)
  const { fireRingUrl, foodRingUrl } = await generateRingImages(
    supabase, fireNumerator, fireDenom, foodNumerator, foodDenom,
  );

  const subject = "Your hood cleaning service certificate is on file.";

  // Preheader: note's first line so the personal sentence shows in inbox.
  const preheaderText = params.personalMessage
    ? params.personalMessage.split("\n")[0].substring(0, 150)
    : `${businessName}, your hood cleaning service certificate is on file.`;

  // Note block: renders only when personalMessage is non-empty.
  const noteBlock = params.personalMessage
    ? `<!-- NOTE --><tr><td class="p40" style="background:#F4EFE3;padding:20px 40px;border-left:3px solid #B24A2E;">
    <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:15px;line-height:1.55;color:#3A4453;">${params.personalMessage}</div>
    <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:#8a8270;margin-top:8px;">&mdash; Arthur</div></td></tr>`
    : "";

  // Unsubscribe — simple mailto fallback
  const unsubUrl = `mailto:founders@getevidly.com?subject=Unsubscribe&body=Please%20remove%20${encodeURIComponent(recipientName)}`;

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="x-apple-disable-message-reformatting">
<title>Your hood cleaning service certificate is on file</title>
<style>body{margin:0;padding:0;background:#F7F1E6;} a{text-decoration:none;} img{-ms-interpolation-mode:bicubic;}
@media (max-width:620px){.card{width:100%!important;} .p40{padding-left:22px!important;padding-right:22px!important;}}</style>
</head><body style="margin:0;padding:0;background:#F7F1E6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheaderText}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F1E6;">
<tr><td align="center" style="padding:28px 16px;">
<table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FFFFFF;border:1px solid #EEE7D9;">

  <!-- 1. HEADER — navy, Montserrat wordmark, 3px ember rule -->
  <tr><td class="p40" style="background:#1C2A3A;padding:28px 32px;">
    <span style="font-family:Montserrat,sans-serif;font-weight:800;font-size:27px;letter-spacing:-0.02em;line-height:1;"><span style="color:#B24A2E;">E</span><span style="color:#FFFFFF;">vid</span><span style="color:#B24A2E;">LY</span></span>
  </td></tr>
  <tr><td style="background:#B24A2E;height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- 2. NOTE FROM ARTHUR — collapses when personalMessage is empty -->
  ${noteBlock}

  <!-- 3. HEADLINE -->
  <tr><td class="p40" style="padding:36px 40px 0;">
    <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-weight:700;font-size:24px;line-height:1.25;color:#1C2A3A;">${businessName}, your hood cleaning service certificate is on file.</div>
  </td></tr>

  <!-- 4. GREETING -->
  <tr><td class="p40" style="padding:20px 40px 0;">
    <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:15px;line-height:1.65;color:#4A5566;">Hi ${firstName} &mdash; your kitchen exhaust and hood cleaning service certificate from Cleaning Pros Plus is already on file with EvidLY. That&rsquo;s the first record in your compliance account.</div>
  </td></tr>

  <!-- 5. INTRO -->
  <tr><td class="p40" style="padding:16px 40px 0;">
    <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:15px;line-height:1.65;color:#4A5566;">You trust Cleaning Pros Plus with your kitchen exhaust and hood cleaning. Every service, we leave a dated certificate &mdash; what we cleaned, what we found, what we couldn&rsquo;t reach. That certificate is now the first record in your account. But it&rsquo;s one of ${total} compliance records California requires across fire safety and food safety.</div>
  </td></tr>

  <!-- 6. PILLARS — Fire, Food, Intelligence -->
  <tr><td class="p40" style="padding:24px 40px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <!-- Fire Safety -->
      <tr>
        <td width="14" valign="top" style="padding-top:3px;"><div style="width:10px;height:10px;border-radius:50%;background:#B24A2E;"></div></td>
        <td style="padding-left:12px;padding-bottom:16px;">
          <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:15px;font-weight:700;color:#1C2A3A;">Fire Safety</div>
          <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:14px;line-height:1.55;color:#4A5566;padding-top:2px;">Hood and duct cleaning, suppression systems, extinguishers, alarms, and sprinklers.</div>
        </td>
      </tr>
      <!-- Food Safety -->
      <tr>
        <td width="14" valign="top" style="padding-top:3px;"><div style="width:10px;height:10px;border-radius:50%;background:#3E6B8A;"></div></td>
        <td style="padding-left:12px;padding-bottom:16px;">
          <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:15px;font-weight:700;color:#1C2A3A;">Food Safety</div>
          <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:14px;line-height:1.55;color:#4A5566;padding-top:2px;">Cooling records, holding temperatures, sanitization, food handler cards, and vendor insurance.</div>
        </td>
      </tr>
      <!-- Intelligence -->
      <tr>
        <td width="14" valign="top" style="padding-top:3px;"><div style="width:10px;height:10px;border-radius:50%;background:#3E5E4B;"></div></td>
        <td style="padding-left:12px;">
          <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:15px;font-weight:700;color:#1C2A3A;">Intelligence</div>
          <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:14px;line-height:1.55;color:#4A5566;padding-top:2px;">Predictive cadence management, lapse prevention, and audit-ready proof.</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- 7. TEASER BLOCK — cream card with rings -->
  <tr><td class="p40" style="padding:24px 40px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4EFE3;border:1px solid #EEE7D9;border-radius:8px;">
      <tr><td style="padding:24px;">
        <!-- Wordmark + org chip -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td><span style="font-family:Montserrat,sans-serif;font-weight:800;font-size:18px;letter-spacing:-0.02em;"><span style="color:#B24A2E;">E</span><span style="color:#1C2A3A;">vid</span><span style="color:#B24A2E;">LY</span></span></td>
          <td align="right"><span style="display:inline-block;background:#1C2A3A;color:#FFFFFF;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:4px 10px;border-radius:12px;">${orgName}</span></td>
        </tr></table>
        <div style="height:16px;font-size:0;line-height:0;">&nbsp;</div>
        <!-- ON FILE TODAY -->
        <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#8a8270;">ON FILE TODAY</div>
        <div style="height:8px;font-size:0;line-height:0;">&nbsp;</div>
        <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:17px;font-weight:700;line-height:1.3;color:#1C2A3A;">Your hood cleaning certificate is on file.</div>
        <div style="height:6px;font-size:0;line-height:0;">&nbsp;</div>
        <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:14px;line-height:1.55;color:#4A5566;">${total} compliance records are required across fire safety and food safety. Here&rsquo;s where you stand.</div>
        <div style="height:20px;font-size:0;line-height:0;">&nbsp;</div>
        <!-- TWO RINGS side by side -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <!-- Fire ring -->
          <td width="50%" align="center" valign="top" style="padding-right:8px;">
            <!--[if mso]>
            <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:120px;height:120px;">
            <v:fill type="frame" src="${fireRingUrl}" />
            <v:textbox inset="0,0,0,0" style="mso-fit-shape-to-text:true;">
            <![endif]-->
            <div style="width:120px;height:120px;background:url('${fireRingUrl}') center/120px 120px no-repeat;margin:0 auto;">
              <table role="presentation" width="120" cellpadding="0" cellspacing="0" style="width:120px;height:120px;"><tr>
                <td align="center" valign="middle" style="font-family:'IBM Plex Mono',monospace;font-size:28px;font-weight:700;color:#B24A2E;">${firePct}%</td>
              </tr></table>
            </div>
            <!--[if mso]></v:textbox></v:rect><![endif]-->
            <div style="height:8px;font-size:0;line-height:0;">&nbsp;</div>
            <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:#1C2A3A;"><b>${fireNumerator}</b> of <b>${fireDenom}</b> on file</div>
            <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:13px;color:#B24A2E;font-weight:700;padding-top:2px;">Fire Safety</div>
          </td>
          <!-- Food ring -->
          <td width="50%" align="center" valign="top" style="padding-left:8px;">
            <!--[if mso]>
            <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:120px;height:120px;">
            <v:fill type="frame" src="${foodRingUrl}" />
            <v:textbox inset="0,0,0,0" style="mso-fit-shape-to-text:true;">
            <![endif]-->
            <div style="width:120px;height:120px;background:url('${foodRingUrl}') center/120px 120px no-repeat;margin:0 auto;">
              <table role="presentation" width="120" cellpadding="0" cellspacing="0" style="width:120px;height:120px;"><tr>
                <td align="center" valign="middle" style="font-family:'IBM Plex Mono',monospace;font-size:28px;font-weight:700;color:#3E6B8A;">${foodPct}%</td>
              </tr></table>
            </div>
            <!--[if mso]></v:textbox></v:rect><![endif]-->
            <div style="height:8px;font-size:0;line-height:0;">&nbsp;</div>
            <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:#1C2A3A;"><b>${foodNumerator}</b> of <b>${foodDenom}</b> on file</div>
            <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:13px;color:#3E6B8A;font-weight:700;padding-top:2px;">Food Safety</div>
          </td>
        </tr></table>
        <div style="height:16px;font-size:0;line-height:0;">&nbsp;</div>
        <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:12px;line-height:1.5;color:#8a8270;">Counts reflect records currently on file. Requirements are based on California commercial kitchen regulations.</div>
      </td></tr>
    </table>
  </td></tr>

  <!-- 8. TRIPLET -->
  <tr><td class="p40" style="padding:0 40px;">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:#B24A2E;text-align:center;line-height:1.6;">Predict what&rsquo;s due &middot; Reduce the lapse &middot; Prove it&rsquo;s done</div>
  </td></tr>

  <!-- 9. CTA — ember button -->
  <tr><td class="p40" style="padding:24px 40px;">
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;"><tr>
      <td align="center" style="background:#B24A2E;border-radius:6px;">
        <a href="${inviteLink}" style="display:inline-block;padding:14px 30px;font-family:'Instrument Sans',system-ui,sans-serif;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;">See What&rsquo;s On File&nbsp;&#8594;</a>
      </td></tr></table>
    <div style="height:10px;font-size:0;line-height:0;">&nbsp;</div>
    <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:12px;color:#8B94A0;text-align:center;">No login needed.</div>
  </td></tr>

  <!-- 10. CLOSING -->
  <tr><td class="p40" style="padding:8px 40px 28px;">
    <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:15px;line-height:1.65;color:#4A5566;">${firstName}, when someone asks, a binder is a search.<br>EvidLY is an answer.</div>
  </td></tr>

  <!-- 11. FOOTER -->
  <tr><td class="p40" style="padding:22px 40px;border-top:1px solid #EEE7D9;">
    <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:13px;font-weight:700;color:#1C2A3A;">EvidLY &middot; Commercial Kitchen Risk Management</div>
    <div style="height:6px;font-size:0;line-height:0;">&nbsp;</div>
    <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:12px;color:#6E675A;line-height:1.8;">Cleaning Pros Plus, LLC</div>
    <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:12px;color:#6E675A;line-height:1.8;">{{BUSINESS_ADDRESS}}</div>
    <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:12px;color:#6E675A;line-height:1.8;">founders@getevidly.com &middot; (855) 384-3591</div>
    <div style="height:14px;border-bottom:1px solid #DDD6C8;font-size:0;line-height:0;">&nbsp;</div>
    <div style="height:12px;font-size:0;line-height:0;">&nbsp;</div>
    <div style="font-family:'Instrument Sans',system-ui,sans-serif;font-size:11px;color:#9a927f;">&copy; 2026 EvidLY &middot; a Cleaning Pros Plus, LLC Company &middot; <a href="${unsubUrl}" style="color:#9a927f;text-decoration:underline;">Unsubscribe</a></div>
  </td></tr>

</table></td></tr></table></body></html>`;

  return { subject, html };
}
