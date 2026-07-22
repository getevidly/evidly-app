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
 * email matches the EvidLY design language: navy header, three pillars,
 * dashboard GIF, and a clear CTA.
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
  const firstName = recipientName.split(" ")[0];

  const subject = `Your EvidLY account is ready, ${firstName}`;

  // Note block: include only when personalMessage is non-null
  const noteBlock = params.personalMessage
    ? `<!-- NOTE_BLOCK_START --><tr><td class="p40" style="background:#FBF9F2;padding:18px 40px;border-bottom:1px solid #EEE7D9;border-left:3px solid #A08C5A;">
    <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#8A6412;margin-bottom:6px;">A note from Arthur</div>
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;font-style:italic;line-height:1.55;color:#3A4453;">${params.personalMessage}</div></td></tr><!-- NOTE_BLOCK_END -->`
    : "";

  // Unsubscribe — simple mailto fallback (no dedicated unsub endpoint yet)
  const unsubUrl = `mailto:founders@getevidly.com?subject=Unsubscribe&body=Please%20remove%20${encodeURIComponent(params.recipientName)}`;

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="x-apple-disable-message-reformatting">
<title>Your EvidLY account is ready, ${firstName}</title>
<style>body{margin:0;padding:0;background:#F7F1E6;} a{text-decoration:none;} img{-ms-interpolation-mode:bicubic;}
@media (max-width:620px){.card{width:100%!important;} .p40{padding-left:22px!important;padding-right:22px!important;}}</style>
</head><body style="margin:0;padding:0;background:#F7F1E6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your NFPA 96 cert is sealed in EvidLY. See the fire-side records a binder can't prove.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F1E6;">
<tr><td align="center" style="padding:28px 16px;">
<table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FFFFFF;border:1px solid #EEE7D9;">
  <!-- NAVY HEADER : wordmark + company as a LEFT LOCKUP -->
  <tr><td class="p40" style="background:#1C2A3A;padding:18px 40px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td valign="middle" style="padding-right:16px;"><img src="https://app.getevidly.com/wordmark.png" alt="EvidLY" width="152" style="display:block;border:0;height:auto;"/></td>
      <td valign="middle" style="padding-left:16px;border-left:1px solid rgba(255,255,255,0.20);font-family:'Courier New',monospace;font-size:10.5px;letter-spacing:0.12em;color:rgba(255,255,255,0.62);text-transform:uppercase;">A Cleaning Pros Plus Company</td>
    </tr></table></td></tr>
  ${noteBlock}
  <!-- NAVY : intro + three pillars -->
  <tr><td class="p40" style="background:#1C2A3A;padding:32px 40px 28px;">
    <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:bold;font-size:27px;line-height:1.15;color:#FFFFFF;">Your NFPA 96 cert is filed, ${businessName}.<br>Here&rsquo;s the part that isn&rsquo;t.</h1>
    <p style="margin:14px 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#A9B2BE;">You trust Cleaning Pros Plus with your hood cleaning &mdash; that NFPA 96 certificate is now sealed in EvidLY. I&rsquo;m also the expert witness in commercial-kitchen fire cases, and the kitchens that lose a claim usually weren&rsquo;t negligent &mdash; their paperwork just couldn&rsquo;t prove it. Binder or software, the fire side is the half that&rsquo;s hardest to prove when it counts.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="46" valign="top" style="padding-bottom:18px;"><div style="width:34px;height:34px;border-radius:8px;background:#2A3A4E;display:inline-flex;align-items:center;justify-content:center;font-size:17px;line-height:1;">&#x1F50D;</div></td>
      <td valign="top" style="padding-bottom:18px;padding-left:6px;">
        <div style="font-family:Georgia,serif;font-weight:bold;font-size:15px;color:#FFFFFF;">Intelligence</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.55;color:#A9B2BE;margin-top:2px;">Real-time alerts, predictive reminders, automated escalation, regulation cross-referencing, and sealed proof on demand</div>
      </td></tr>
    <tr>
      <td width="46" valign="top" style="padding-bottom:18px;"><div style="width:34px;height:34px;border-radius:8px;background:#7A3D1E;display:inline-flex;align-items:center;justify-content:center;font-size:17px;line-height:1;">&#x1F525;</div></td>
      <td valign="top" style="padding-bottom:18px;padding-left:6px;">
        <div style="font-family:Georgia,serif;font-weight:bold;font-size:15px;color:#FFFFFF;">Fire Safety</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.55;color:#A9B2BE;margin-top:2px;">Hood cleaning (NFPA 96), fire suppression (17A), sprinklers (25), alarms (72), extinguisher tags (10), and employee fire safety training</div>
      </td></tr>
    <tr>
      <td width="46" valign="top" style="padding-bottom:18px;"><div style="width:34px;height:34px;border-radius:8px;background:#1E3A5E;display:inline-flex;align-items:center;justify-content:center;font-size:17px;line-height:1;">&#x1F374;</div></td>
      <td valign="top" style="padding-bottom:18px;padding-left:6px;">
        <div style="font-family:Georgia,serif;font-weight:bold;font-size:15px;color:#FFFFFF;">Food Safety</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.55;color:#A9B2BE;margin-top:2px;">Employee Food Handler Cards, Certified Food Protection Manager certifications, daily temperature logs, HACCP, receiving inspections, pest control</div>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;border-top:1px solid rgba(255,255,255,0.12);"><tr>
      <td width="33%" valign="top" style="padding-top:18px;"><div style="font-family:Georgia,serif;font-weight:bold;font-size:13px;color:#CBB37D;">Predict</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#A9B2BE;margin-top:2px;">what's expiring</div></td>
      <td width="33%" valign="top" style="padding-top:18px;"><div style="font-family:Georgia,serif;font-weight:bold;font-size:13px;color:#CBB37D;">Reduce</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#A9B2BE;margin-top:2px;">the cost</div></td>
      <td width="33%" valign="top" style="padding-top:18px;"><div style="font-family:Georgia,serif;font-weight:bold;font-size:13px;color:#CBB37D;">Prove</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#A9B2BE;margin-top:2px;">on demand</div></td>
    </tr></table></td></tr>
  <!-- DASHBOARD SNIPPET -->
  <tr><td style="background:#F7F1E6;padding:20px 0 8px;">
    <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#8A6412;text-align:center;padding:0 40px 12px;">Your dashboard &middot; food &amp; fire, in one place</div>
    <a href="https://app.getevidly.com/demo" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
      <img src="https://app.getevidly.com/dashboard.gif" width="600" alt="Your EvidLY dashboard, cycling through all four locations" style="display:block;width:100%;max-width:600px;height:auto;border:0;"/>
    </a>
    <div style="text-align:center;padding:16px 40px 2px;">
      <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
        <td align="center" style="background:#FFFFFF;border:1.5px solid #1C2A3A;">
          <a href="https://app.getevidly.com/demo" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#1C2A3A;">Preview the full dashboard &#8599;</a>
        </td></tr></table>
    </div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8B94A0;text-align:center;padding:8px 40px 14px;line-height:1.5;">Opens in a new tab &mdash; your invite stays open here. When you're ready, use <span style="color:#1C2A3A;font-weight:bold;">See what's on file</span> below.</div></td></tr>
  <!-- CTA -->
  <tr><td class="p40" style="background:#FFFFFF;padding:26px 40px 34px;border-top:1px solid #EEE7D9;">
    <div style="font-family:Georgia,serif;font-weight:bold;font-size:18px;color:#1C2A3A;">${firstName}, a binder shows you tried. EvidLY is evidence.</div>
    <p style="margin:8px 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:13.5px;line-height:1.6;color:#5F6875;">Set a password to open your account &mdash; starting with the NFPA 96 cert Cleaning Pros Plus already sealed for you. From there, EvidLY identifies what your county and fire authority expect next, and flags what&rsquo;s missing.</p>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td align="center" style="background:#1C2A3A;"><a href="${inviteLink}" style="display:inline-block;padding:14px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#FFFFFF;">See what&rsquo;s on file &#8594;</a></td>
    </tr></table>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8B94A0;margin-top:12px;">Or paste this into your browser: ${inviteLink}</div></td></tr>
  <!-- FOOTER -->
  <tr><td class="p40" style="background:#FBF9F2;padding:22px 40px;border-top:1px solid #EEE7D9;">
    <div style="font-family:Georgia,serif;font-weight:bold;font-size:13px;color:#8A6412;">Predict the failure, reduce the cost.</div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5F6875;margin-top:8px;line-height:1.6;">founders@getevidly.com&nbsp;&middot;&nbsp;(855) 384-3591 ext. 1&nbsp;&middot;&nbsp;<a href="https://getevidly.com" style="color:#1C2A3A;">getevidly.com</a></div>
    <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#9A9384;margin-top:10px;">A Cleaning Pros Plus company</div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:10.5px;color:#9A9384;margin-top:10px;"><a href="${unsubUrl}" style="color:#9A9384;text-decoration:underline;">Unsubscribe</a></div></td></tr>
</table></td></tr></table></body></html>`;

  return { subject, html };
}
