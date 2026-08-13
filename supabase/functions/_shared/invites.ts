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
    campaign: true,
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
    campaign: true,
  });

  return { subject, html };
}

/**
 * Client onboarding invite — a service provider (e.g. Cleaning Pros Plus)
 * bringing an existing client into EvidLY.
 *
 * Uses its OWN branded HTML template (not buildEmailHtml). Table-based,
 * inline styles, 600px fixed width. Fonts: Instrument Sans (body),
 * IBM Plex Mono (labels/data), Montserrat 900 (wordmark only).
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
  accessVia?: string;  // 'cpp_client' | 'signed_on_directly'
  supabase: SupabaseClient;
}

export async function buildClientInviteEmail(
  params: ClientInviteParams,
): Promise<{ subject: string; html: string }> {
  const { recipientName, businessName, inviteLink, supabase, accessVia } = params;
  const firstName = recipientName.split(' ')[0];
  const isCpp = accessVia === 'cpp_client';

  // ── Day-one numerators: CPP clients start with 1 fire (hood cert on file).
  //    Non-CPP clients start at 0/0 — no certificate is claimed. ──
  const fireNumerator = isCpp ? 1 : 0;
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

  const subject = isCpp
    ? "Your hood cleaning service certificate is on file."
    : "Your EvidLY account is ready.";

  // Preheader: personal note's first line when present, else subject.
  const preheaderText = params.personalMessage
    ? params.personalMessage.split("\n")[0].substring(0, 150)
    : subject;

  // Note block: renders only when personalMessage is non-empty.
  const noteBlock = params.personalMessage
    ? `<tr><td class="p40" style="background:#FBF9F2;padding:18px 40px;border-bottom:1px solid #EEE7D9;border-left:3px solid #B24A2E;" bgcolor="#FBF9F2">
    <div style="font-family:'IBM Plex Mono','Courier New',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#B24A2E;margin-bottom:6px;">A note from Arthur</div>
    <div style="font-family:'Instrument Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-style:italic;line-height:1.55;color:#3A4453;">${params.personalMessage}</div></td></tr>`
    : "";

  // Unsubscribe — simple mailto fallback
  const unsubUrl = `mailto:founders@getevidly.com?subject=Unsubscribe&body=Please%20remove%20${encodeURIComponent(recipientName)}`;

  // Font stacks
  const fInstrument = "'Instrument Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const fMono = "'IBM Plex Mono','Courier New',monospace";
  const fMontserrat = "'Montserrat','Arial Black','Helvetica Neue',Arial,sans-serif";

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Your EvidLY account is ready, ${firstName}</title>
<style>
:root { color-scheme: light only; supported-color-schemes: light only; }
body{margin:0;padding:0;background:#F7F1E6;} a{text-decoration:none;} img{-ms-interpolation-mode:bicubic;}
@media (max-width:620px){.card{width:100%!important;} .p40{padding-left:22px!important;padding-right:22px!important;}}
</style>
</head><body style="margin:0;padding:0;background:#F7F1E6;" bgcolor="#F7F1E6">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheaderText}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F1E6;" bgcolor="#F7F1E6">
<tr><td align="center" style="padding:28px 16px;">
<table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FFFFFF;border:1px solid #EEE7D9;" bgcolor="#FFFFFF">

  <!-- 1. HEADER — navy, wordmark + company lockup -->
  <tr><td class="p40" style="background:#1C2A3A;padding:20px 40px;" bgcolor="#1C2A3A">
    <div style="font-family:${fMontserrat};font-weight:900;font-size:26px;letter-spacing:-0.5px;line-height:1;"><span style="color:#B24A2E;">E</span><span style="color:#FFFFFF;">vid</span><span style="color:#B24A2E;">LY</span></div>
    <div style="font-family:${fMono};font-size:10.5px;letter-spacing:0.12em;color:rgba(255,255,255,0.60);text-transform:uppercase;margin-top:7px;">${isCpp ? 'A Cleaning Pros Plus Company' : 'Commercial Kitchen Risk Management'}</div>
  </td></tr>

  <!-- 2. NOTE FROM ARTHUR — collapses when personalMessage is empty -->
  ${noteBlock}

  <!-- 3. NAVY BLOCK — headline, intro, pillars, triplet -->
  <tr><td class="p40" style="background:#1C2A3A;padding:32px 40px 28px;" bgcolor="#1C2A3A">
    <h1 style="margin:0;font-family:${fInstrument};font-weight:bold;font-size:27px;line-height:1.22;color:#FFFFFF;">${isCpp ? `${businessName}, your hood cleaning service certificate is on file.` : `${businessName}, your account is ready.`}</h1>
    <p style="margin:14px 0 24px;font-family:${fInstrument};font-size:14px;line-height:1.6;color:#A9B2BE;">${isCpp
      ? `You trust Cleaning Pros Plus with your kitchen exhaust and hood cleaning &mdash; the service certificate required by NFPA 96 is on file. Your insurance company, your property manager, the fire marshal and the health inspector each ask for records, on their own schedules. Binder or application, fire and food records both have to be to hand when they ask.`
      : `Your insurance company, your property manager, the fire marshal and the health inspector each ask for records, on their own schedules. Binder or application, fire and food records both have to be to hand when they ask. EvidLY keeps every record in one place so the answer is ready the moment someone asks.`}</p>

    <!-- Pillars -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="46" valign="top" style="padding-bottom:18px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="34" height="34" align="center" valign="middle" style="width:34px;height:34px;background:#EAE0C6;border-radius:8px;font-size:18px;line-height:34px;font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif;" bgcolor="#EAE0C6">&#128293;</td></tr></table></td>
      <td valign="top" style="padding-bottom:18px;padding-left:6px;">
        <div style="font-family:${fInstrument};font-weight:bold;font-size:15px;color:#FFFFFF;">Fire Safety</div>
        <div style="font-family:${fInstrument};font-size:12.5px;line-height:1.55;color:#A9B2BE;margin-top:2px;">Exhaust and hood cleaning (NFPA 96), fire suppression (NFPA 17A), fire extinguishers (NFPA 10), fire alarm (NFPA 72), sprinklers (NFPA 25)</div>
      </td></tr>
    <tr>
      <td width="46" valign="top" style="padding-bottom:18px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="34" height="34" align="center" valign="middle" style="width:34px;height:34px;background:#EAE0C6;border-radius:8px;font-size:18px;line-height:34px;font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif;" bgcolor="#EAE0C6">&#127860;</td></tr></table></td>
      <td valign="top" style="padding-bottom:18px;padding-left:6px;">
        <div style="font-family:${fInstrument};font-weight:bold;font-size:15px;color:#FFFFFF;">Food Safety</div>
        <div style="font-family:${fInstrument};font-size:12.5px;line-height:1.55;color:#A9B2BE;margin-top:2px;">Daily temperature logs &mdash; receiving, cooling, hot holding, cold holding, reheating &mdash; sanitization records, pest control, grease trap (if applicable), backflow prevention (if applicable), health permit, food handler cards, food protection manager certification</div>
      </td></tr>
    <tr>
      <td width="46" valign="top" style="padding-bottom:18px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="34" height="34" align="center" valign="middle" style="width:34px;height:34px;background:#EAE0C6;border-radius:8px;font-size:18px;line-height:34px;font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif;" bgcolor="#EAE0C6">&#9889;</td></tr></table></td>
      <td valign="top" style="padding-bottom:18px;padding-left:6px;">
        <div style="font-family:${fInstrument};font-weight:bold;font-size:15px;color:#FFFFFF;">Intelligence</div>
        <div style="font-family:${fInstrument};font-size:12.5px;line-height:1.55;color:#A9B2BE;margin-top:2px;">Real-time alerts, predictive reminders, automated escalation, and regulation cross-referencing</div>
      </td></tr>
    </table>

    <!-- Triplet -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;border-top:1px solid rgba(255,255,255,0.12);"><tr>
      <td width="33%" valign="top" align="center" style="padding-top:18px;text-align:center;">
        <div style="font-family:${fInstrument};font-weight:bold;font-size:13px;color:#CBB37D;">Predict</div>
        <div style="font-family:${fInstrument};font-size:11px;color:#A9B2BE;margin-top:2px;">what&rsquo;s due</div></td>
      <td width="33%" valign="top" align="center" style="padding-top:18px;text-align:center;">
        <div style="font-family:${fInstrument};font-weight:bold;font-size:13px;color:#CBB37D;">Reduce</div>
        <div style="font-family:${fInstrument};font-size:11px;color:#A9B2BE;margin-top:2px;">the lapse</div></td>
      <td width="33%" valign="top" align="center" style="padding-top:18px;text-align:center;">
        <div style="font-family:${fInstrument};font-weight:bold;font-size:13px;color:#CBB37D;">Prove</div>
        <div style="font-family:${fInstrument};font-size:11px;color:#A9B2BE;margin-top:2px;">it&rsquo;s done</div></td>
    </tr></table>
  </td></tr>

  <!-- 4. TEASER BLOCK — clickable dashboard snippet -->
  <tr><td style="background:#F7F1E6;padding:22px 0 4px;" bgcolor="#F7F1E6">
    <div style="font-family:${fMono};font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#B24A2E;text-align:center;padding:0 40px 12px;">Here&rsquo;s where your kitchen stands</div>
    <a href="${inviteLink}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:block;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAF7F0;border-top:1px solid #EEE7D9;border-bottom:1px solid #EEE7D9;" bgcolor="#FAF7F0">
        <tr><td style="padding:24px 32px 26px;">

          <!-- Wordmark + org chip -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-family:${fMontserrat};font-weight:800;font-size:16px;letter-spacing:-0.01em;color:#1C2A3A;"><span style="color:#B24A2E;">E</span>vid<span style="color:#B24A2E;">LY</span></td>
            <td align="right"><span style="font-family:${fMono};font-size:9.5px;letter-spacing:0.12em;text-transform:uppercase;color:#5F6875;background:#EFE8DA;padding:5px 10px;border-radius:5px;">${businessName}</span></td>
          </tr></table>

          <!-- On file today -->
          <div style="font-family:${fMono};font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:#A79E8B;padding:20px 0 0;">On file today</div>
          <div style="font-family:${fInstrument};font-size:27px;line-height:1.22;font-weight:700;letter-spacing:-0.02em;color:#1C2A3A;padding:8px 0 0;">${isCpp ? 'Your hood cleaning<br />certificate is on file.' : 'Your account is ready.<br />Records start here.'}</div>
          <div style="font-family:${fInstrument};font-size:14.5px;line-height:1.6;color:#5F6875;padding:12px 0 22px;"><span style="color:#1C2A3A;font-weight:600;">${total} compliance records are required</span> for this kitchen &mdash; ${fireDenom} fire safety, ${foodDenom} food safety. On top of that: your company&rsquo;s own business records, and one set for every vendor who provides services.</div>

          <!-- TWO RINGS -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 0;"><tr>
            <!-- Fire ring (text baked into 2x PNG — scales as one unit on mobile) -->
            <td width="50%" align="center" valign="top" style="padding:0 6px;">
              <img src="${fireRingUrl}" alt="${firePct}% fire safety" width="104" height="104" style="display:block;margin:0 auto;max-width:100%;height:auto;" />
              <div style="font-family:${fMono};font-size:9px;letter-spacing:0.13em;text-transform:uppercase;color:#8b95a3;padding:9px 0 0;">Fire safety</div>
              <div style="font-family:${fInstrument};font-size:13px;color:#5F6875;padding:4px 0 0;">${fireNumerator} of ${fireDenom} on file</div>
            </td>
            <!-- Food ring (text baked into 2x PNG — scales as one unit on mobile) -->
            <td width="50%" align="center" valign="top" style="padding:0 6px;">
              <img src="${foodRingUrl}" alt="${foodPct}% food safety" width="104" height="104" style="display:block;margin:0 auto;max-width:100%;height:auto;" />
              <div style="font-family:${fMono};font-size:9px;letter-spacing:0.13em;text-transform:uppercase;color:#8b95a3;padding:9px 0 0;">Food safety</div>
              <div style="font-family:${fInstrument};font-size:13px;color:#5F6875;padding:4px 0 0;">${foodNumerator} of ${foodDenom} on file</div>
            </td>
          </tr></table>

          <!-- Disclaimer -->
          <div style="font-family:${fInstrument};font-size:13px;line-height:1.55;color:#8b95a3;padding:18px 0 0;">This is what EvidLY holds today, out of the ${total} records a California kitchen has to produce on demand. <span style="color:#5F6875;">It is not a compliance score</span> &mdash; the rest may well exist, in a binder, a vendor&rsquo;s inbox, a folder on a phone. Having them and having them the moment someone asks are not the same thing.</div>

        </td></tr>
      </table>
    </a>
  </td></tr>

  <!-- 5. CTA — closing line + navy button -->
  <tr><td class="p40" align="center" style="background:#FFFFFF;padding:26px 40px 34px;border-top:1px solid #EEE7D9;text-align:center;" bgcolor="#FFFFFF">
    <div style="font-family:${fInstrument};font-weight:bold;font-size:18px;line-height:1.3;color:#1C2A3A;margin-bottom:18px;">${firstName}, the first step is telling us who services your kitchen.</div>
    <table role="presentation" align="center" cellpadding="0" cellspacing="0"><tr>
      <td align="center" style="background:#1C2A3A;" bgcolor="#1C2A3A"><a href="${inviteLink}" style="display:inline-block;padding:14px 30px;font-family:${fInstrument};font-size:15px;font-weight:bold;color:#FFFFFF;">See the dashboard &#8594;</a></td>
    </tr></table>
    <div style="font-family:${fInstrument};font-size:11.5px;color:#8B94A0;margin-top:11px;">No login, no password needed.</div>
  </td></tr>

  <!-- 6. FOOTER -->
  <tr><td class="p40" align="center" style="background:#FBF9F2;padding:24px 40px;border-top:1px solid #EEE7D9;text-align:center;" bgcolor="#FBF9F2">
    <div style="font-family:${fInstrument};font-size:12px;color:#5F6875;margin-top:8px;line-height:1.6;"><span style="white-space:nowrap;">founders@getevidly.com</span> &middot; <span style="white-space:nowrap;">(855) 384-3591</span> &middot; <span style="white-space:nowrap;"><a href="https://getevidly.com" style="color:#1C2A3A;">getevidly.com</a></span></div>
    <div style="font-family:${fMono};font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#9A9384;margin-top:10px;">EvidLY &middot; Commercial Kitchen Risk Management</div>
    <div style="font-family:${fInstrument};font-size:11px;color:#9A9384;margin-top:10px;line-height:1.6;">${isCpp ? 'Cleaning Pros Plus, LLC' : 'EvidLY'} &middot; 2324 M Street #2711 &middot; Merced, CA 95344</div>
    <div style="font-family:${fInstrument};font-size:10.5px;color:#9A9384;margin-top:8px;">&copy; 2026 EvidLY${isCpp ? ' &middot; a Cleaning Pros Plus, LLC Company' : ''} &nbsp;&middot;&nbsp; <a href="${unsubUrl}" style="color:#9A9384;text-decoration:underline;">Unsubscribe</a></div>
  </td></tr>

</table></td></tr></table></body></html>`;

  return { subject, html };
}
