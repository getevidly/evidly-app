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
