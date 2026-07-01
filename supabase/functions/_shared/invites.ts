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
  const { recipientName, senderName, businessName, inviteLink } = params;
  const senderOrg = params.senderOrg || "Cleaning Pros Plus";
  const opener = senderName
    ? `${senderName} from <strong>${senderOrg}</strong>`
    : `<strong>${senderOrg}</strong>`;
  const note = params.personalMessage
    ? `<p style="border-left: 3px solid #A08C5A; padding-left: 12px; color: #475569; font-style: italic;">${params.personalMessage}</p>`
    : "";

  const subject = `Your EvidLY account is ready, ${recipientName}`;

  const html = buildEmailHtml({
    recipientName,
    bodyHtml: `
      <p>${opener} set up an EvidLY account for <strong>${businessName}</strong>.</p>
      ${note}
      <p>EvidLY is a fire and food safety records service for commercial
      kitchens. In one place, it identifies what's on file, flags what's about
      to expire, and lets you prove any record on demand — for an inspector,
      your insurer, or anyone who asks.</p>
      <p>Your hood-cleaning records from ${senderOrg} flow in automatically.
      Add your other vendors — fire suppression, grease trap, pest control —
      and their service documents land in the same place, tied to your
      kitchen.</p>
      <p>It only takes a couple of minutes.</p>`,
    ctaText: "Set up your account",
    ctaUrl: inviteLink,
    footerNote: `When it comes to fire and food safety, the record is what protects you. EvidLY keeps yours current and in one place, so nothing slips before an inspection.`,
  });

  return { subject, html };
}
