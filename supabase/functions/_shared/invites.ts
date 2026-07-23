// Shared invite email templates for Policy Lens referral flywheel.
// Locked vocab: Policy Lens reads/identifies/flags. Agent evaluates.
// No platform/tool-as-product/score. Kitchen leaders, not operators.

import { buildEmailHtml } from "./email.ts";

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
 * bringing an existing client into EvidLY. Distinct from the Policy Lens
 * referral builders above. personalMessage is optional admin-entered copy.
 *
 * Uses its OWN branded HTML template (not buildEmailHtml) so the invite
 * email matches the EvidLY design language: navy header with wordmark,
 * personal note, hero copy, state-block progress bars, and a single CTA.
 */
interface ClientInviteParams {
  recipientName: string;
  senderName?: string;
  senderOrg?: string;
  businessName: string;
  inviteLink: string;
  personalMessage?: string;
}

export function buildClientInviteEmail(
  params: ClientInviteParams,
): { subject: string; html: string } {
  const { recipientName, businessName, inviteLink } = params;

  const subject = "Your hood cleaning is documented \u2014 could you prove the rest?";

  // Preheader: note's first line so the personal sentence shows in inbox.
  // Fallback: hero line 1.
  const preheaderText = params.personalMessage
    ? params.personalMessage.split("\n")[0].substring(0, 150)
    : `${businessName}, your hood cleaning is documented.`;

  // Note block: renders only when personalMessage is non-empty.
  // When empty the entire cream band collapses — nothing renders.
  const noteBlock = params.personalMessage
    ? `<!-- NOTE --><tr><td class="p40" style="background:#F4EFE3;padding:20px 40px;border-left:3px solid #B24A2E;">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:15.5px;font-style:italic;line-height:1.55;color:#3A4453;">${params.personalMessage}</div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8a8270;margin-top:8px;">&mdash; Arthur</div></td></tr>`
    : "";

  // Unsubscribe — simple mailto fallback (no dedicated unsub endpoint yet)
  const unsubUrl = `mailto:founders@getevidly.com?subject=Unsubscribe&body=Please%20remove%20${encodeURIComponent(recipientName)}`;

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="x-apple-disable-message-reformatting">
<title>Your hood cleaning is documented</title>
<style>body{margin:0;padding:0;background:#F7F1E6;} a{text-decoration:none;} img{-ms-interpolation-mode:bicubic;}
@media (max-width:620px){.card{width:100%!important;} .p40{padding-left:22px!important;padding-right:22px!important;}}</style>
</head><body style="margin:0;padding:0;background:#F7F1E6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheaderText}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F1E6;">
<tr><td align="center" style="padding:28px 16px;">
<table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FFFFFF;border:1px solid #EEE7D9;">

  <!-- 1. HEADER — navy, wordmark only, 3 px ember rule beneath -->
  <tr><td class="p40" style="background:#1E2D4D;padding:28px 32px;">
    <span style="font-family:Arial,Helvetica,sans-serif;font-weight:900;font-size:27px;letter-spacing:-0.02em;line-height:1;"><span style="color:#CB5E38;">E</span><span style="color:#FFFFFF;">vid</span><span style="color:#CB5E38;">LY</span></span>
  </td></tr>
  <tr><td style="background:#B24A2E;height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- 2. NOTE FROM ARTHUR — collapses when personalMessage is empty -->
  ${noteBlock}

  <!-- 3. HERO — navy -->
  <tr><td class="p40" style="background:#1E2D4D;padding:36px 40px 32px;">
    <!-- Hero headlines — spacer row between lines, not a br -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="font-family:Georgia,'Times New Roman',serif;font-weight:bold;font-size:27px;line-height:1.15;color:#FFFFFF;">${businessName}, your hood cleaning is documented.</td></tr>
      <tr><td style="height:14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="font-family:Georgia,'Times New Roman',serif;font-weight:bold;font-size:27px;line-height:1.15;color:#E6B9A4;">Could you prove the rest today?</td></tr>
    </table>
    <!-- Spacer before body copy -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:22px;font-size:0;line-height:0;">&nbsp;</td></tr></table>
    <!-- Paragraph 1 -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14.5px;line-height:1.72;color:#BCC7D6;">You already trust Cleaning Pros Plus with your hood cleaning. Every visit, we leave a dated certificate&nbsp;&mdash; what we cleaned, what we found, what we couldn&rsquo;t reach. That&rsquo;s now the first record in your account.</td></tr>
      <tr><td style="height:16px;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>
    <!-- Paragraph 2 — middle sentence highlighted -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14.5px;line-height:1.72;color:#BCC7D6;">That certificate is what an inspector or an insurance adjuster asks for. <span style="color:#E6B9A4;">Not the invoice, and not your word that someone came.</span> Suppression, alarms, sprinklers, extinguishers, food handler cards, temperature logs&nbsp;&mdash; each one has a document like it.</td></tr>
      <tr><td style="height:16px;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>
    <!-- Paragraph 3 — "NFPA 96 expert witness" bolded white -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14.5px;line-height:1.72;color:#BCC7D6;">I&rsquo;ve served as an <strong style="color:#FFFFFF;">NFPA 96 expert witness</strong> in commercial-kitchen fire litigation&nbsp;&mdash; reviewing what those documents could and couldn&rsquo;t prove.</td></tr>
    </table>
  </td></tr>

  <!-- 4. STATE BLOCK — cream -->
  <tr><td class="p40" style="background:#F4EFE3;padding:28px 40px;">
    <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#8a8270;">WHAT&rsquo;S IN YOUR ACCOUNT SO FAR</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:10px;font-size:0;line-height:0;">&nbsp;</td></tr></table>
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.3;color:#1E2D4D;">One record is on file. Here&rsquo;s what it sits alongside.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:18px;font-size:0;line-height:0;">&nbsp;</td></tr></table>
    <!-- Day-one hardcoded counts: Fire 1/5, Food 0/11.
         This email is sent at org creation when only the hood-cleaning
         certificate exists. These values must be replaced with real
         data if this template is ever re-used for established clients. -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #EEE7D9;">
      <tr><td style="padding:14px 18px;border-bottom:1px solid #EEE7D9;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="14" valign="middle"><div style="width:10px;height:10px;border-radius:50%;background:#B24A2E;"></div></td>
          <td style="padding-left:10px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#1E2D4D;">Fire Safety</td>
          <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5F6875;"><b style="color:#1E2D4D;">1</b> of <b style="color:#1E2D4D;">5</b> on file</td>
        </tr></table>
        <div style="margin-top:8px;height:8px;border-radius:99px;background:#EEE7D9;">
          <div style="width:20%;height:8px;border-radius:99px;background:#B24A2E;"></div>
        </div>
      </td></tr>
      <tr><td style="padding:14px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="14" valign="middle"><div style="width:10px;height:10px;border-radius:50%;background:#3E6B8A;"></div></td>
          <td style="padding-left:10px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#1E2D4D;">Food Safety</td>
          <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5F6875;"><b style="color:#1E2D4D;">0</b> of <b style="color:#1E2D4D;">11</b> on file</td>
        </tr></table>
        <div style="margin-top:8px;height:8px;border-radius:99px;background:#EEE7D9;">
          <div style="width:2%;height:8px;border-radius:99px;background:#3E6B8A;"></div>
        </div>
      </td></tr>
    </table>
  </td></tr>

  <!-- 5. CTA — ember button -->
  <tr><td class="p40" style="background:#F4EFE3;padding:0 40px 28px;">
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;"><tr>
      <td align="center" style="background:#B24A2E;border-radius:6px;">
        <a href="${inviteLink}" style="display:inline-block;padding:14px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;">Preview the Dashboard &middot; See What&rsquo;s On File&nbsp;&#8594;</a>
      </td></tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:10px;font-size:0;line-height:0;">&nbsp;</td></tr></table>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11.5px;color:#8B94A0;text-align:center;">View-only. No account, no password.</div>
  </td></tr>

  <!-- 6. FOOTER — cream -->
  <tr><td class="p40" style="background:#F4EFE3;padding:22px 40px;border-top:1px solid #DDD6C8;">
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6E675A;line-height:1.8;">founders@getevidly.com</div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6E675A;line-height:1.8;">(855) 384-3591</div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6E675A;line-height:1.8;"><a href="https://getevidly.com" style="color:#6E675A;text-decoration:none;">getevidly.com</a></div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6E675A;line-height:1.8;">{{BUSINESS_ADDRESS}}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:14px;border-bottom:1px solid #DDD6C8;font-size:0;line-height:0;">&nbsp;</td></tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:12px;font-size:0;line-height:0;">&nbsp;</td></tr></table>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9a927f;">&copy; 2026 EvidLY &middot; a Cleaning Pros Plus, LLC company</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:10px;font-size:0;line-height:0;">&nbsp;</td></tr></table>
    <div><a href="${unsubUrl}" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9a927f;text-decoration:underline;">Unsubscribe</a></div>
  </td></tr>

</table></td></tr></table></body></html>`;

  return { subject, html };
}
