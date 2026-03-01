// Shared Resend email utility for EvidLY edge functions
// Uses Resend API: https://resend.com/docs/api-reference/emails/send-email

import { logger } from "./logger.ts";

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "EvidLY <noreply@getevidly.com>";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Send an email via Resend. Non-blocking: logs errors but does not throw.
 * Returns the Resend response data or null on failure.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ id: string } | null> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    logger.warn("[EMAIL] RESEND_API_KEY not set — skipping send to", params.to);
    return null;
  }

  try {
    const body: Record<string, unknown> = {
      from: FROM_ADDRESS,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    };
    if (params.replyTo) body.reply_to = params.replyTo;

    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      logger.error(`[EMAIL] Resend error ${res.status}`, params.to, data);
      return null;
    }
    logger.info("[EMAIL] Sent", params.to, params.subject, data.id);
    return data;
  } catch (err) {
    logger.error("[EMAIL] Failed to send", params.to, err);
    return null;
  }
}

// ── Branded HTML email builder ──────────────────────────────────

export interface EmailTemplateParams {
  recipientName: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  urgencyBanner?: { text: string; color: string };
  footerNote?: string;
}

/**
 * Build a branded EvidLY email with header, body, optional CTA button,
 * optional urgency banner, and footer.
 */
export function buildEmailHtml(params: EmailTemplateParams): string {
  const urgencyBlock = params.urgencyBanner
    ? `<div style="background: ${params.urgencyBanner.color}; color: #ffffff; padding: 12px 24px; text-align: center; font-weight: 600; font-size: 14px;">${params.urgencyBanner.text}</div>`
    : "";

  const ctaBlock = params.ctaText && params.ctaUrl
    ? `<div style="text-align: center; margin: 24px 0;">
        <a href="${params.ctaUrl}" style="background: #1e4d6b; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
          ${params.ctaText}
        </a>
      </div>`
    : "";

  const footerNote = params.footerNote
    ? `<p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">${params.footerNote}</p>`
    : "";

  return `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: #1e4d6b; padding: 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
      <span style="color: #ffffff;">Evid</span><span style="color: #d4af37;">LY</span>
    </h1>
  </div>
  ${urgencyBlock}
  <div style="padding: 32px;">
    <p>Hi ${params.recipientName},</p>
    ${params.bodyHtml}
    ${ctaBlock}
    ${footerNote}
  </div>
  <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
    &copy; 2026 EvidLY &mdash; Lead with Confidence &mdash; Know Where You Stand
  </div>
</div>`;
}
