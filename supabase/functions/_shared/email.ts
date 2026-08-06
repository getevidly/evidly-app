// Shared Resend email utility for EvidLY edge functions
// Uses Resend API: https://resend.com/docs/api-reference/emails/send-email

import { createClient } from "npm:@supabase/supabase-js@2";
import { logger } from "./logger.ts";

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "EvidLY <noreply@getevidly.com>";

// ── Email suppression check ─────────────────────────────────────
// Lazy-init Supabase client for suppression lookups.
// deno-lint-ignore no-explicit-any
let _sb: any = null;
function getSb() {
  if (!_sb) {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (url && key) _sb = createClient(url, key);
  }
  return _sb;
}

async function checkSuppression(email: string): Promise<string | null> {
  const sb = getSb();
  if (!sb) return null;
  try {
    const { data } = await sb
      .from("email_suppressions")
      .select("reason")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    return data?.reason ?? null;
  } catch {
    // Suppression check must never block sends if the table is unreachable
    return null;
  }
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

/**
 * Send an email via Resend. Non-blocking: logs errors but does not throw.
 * Returns the Resend response data or null on failure.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ id: string } | null> {
  // ── Suppression check — runs before every send ──
  const suppressionReason = await checkSuppression(params.to);
  if (suppressionReason) {
    logger.warn(
      `[EMAIL] SUPPRESSED — ${params.to} (${suppressionReason}) — blocked: "${params.subject}"`,
    );
    return null;
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    logger.warn("[EMAIL] RESEND_API_KEY not set — skipping send to", params.to);
    return null;
  }

  const body: Record<string, unknown> = {
    from: params.from || FROM_ADDRESS,
    to: [params.to],
    subject: params.subject,
    html: params.html,
  };
  if (params.replyTo) body.reply_to = params.replyTo;

  const MAX_ATTEMPTS = 2;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        logger.info("[EMAIL] Sent", params.to, params.subject, data.id);
        return data;
      }

      // 4xx — non-retryable client error
      if (res.status < 500) {
        logger.error(`[EMAIL] Resend ${res.status} (non-retryable)`, params.to, data);
        return null;
      }

      // 5xx — retryable server error
      logger.warn(`[EMAIL] Resend ${res.status} — attempt ${attempt}/${MAX_ATTEMPTS}`, params.to);
    } catch (err) {
      logger.warn(`[EMAIL] Network error — attempt ${attempt}/${MAX_ATTEMPTS}`, params.to, err);
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  logger.error("[EMAIL] All retries exhausted", params.to, params.subject);
  return null;
}

// ── Branded HTML email builder ──────────────────────────────────

export interface EmailTemplateParams {
  recipientName: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  urgencyBanner?: { text: string; color: string };
  footerNote?: string;
  unsubscribeToken?: string;
  /** Campaign emails show an Unsubscribe link. Transactional (default) do not. */
  campaign?: boolean;
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
        <a href="${params.ctaUrl}" style="background: #1E2D4D; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
          ${params.ctaText}
        </a>
      </div>`
    : "";

  const unsubBase = `${Deno.env.get("SUPABASE_URL") || "https://irxgmhxhmxtzfwuieblc.supabase.co"}/functions/v1/email-unsubscribe`;
  const unsubUrl = params.unsubscribeToken
    ? `${unsubBase}?token=${params.unsubscribeToken}`
    : 'https://app.getevidly.com/settings/notifications';

  const reasonLine = params.footerNote
    ? `<p style="margin: 0 0 10px 0; font-size: 11px; color: #999;">${params.footerNote}</p>`
    : '';

  return `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: #1E2D4D; padding: 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
      <span style="color: #B24A2E;">E</span><span style="color: #ffffff;">vid</span><span style="color: #B24A2E;">LY</span>
    </h1>
  </div>
  ${urgencyBlock}
  <div style="padding: 32px;">
    <p>Hi ${params.recipientName},</p>
    ${params.bodyHtml}
    ${ctaBlock}
  </div>
  <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
    ${reasonLine}
    <p style="margin: 0 0 4px 0;">EvidLY &middot; Commercial Kitchen Risk Management</p>
    <p style="margin: 0 0 4px 0; font-size: 11px; color: #999;">Cleaning Pros Plus, LLC &middot; 2324 M Street #2711 &middot; Merced, CA 95344</p>
    <p style="margin: 0; font-size: 11px; color: #999;">&copy; 2026 EvidLY &middot; a Cleaning Pros Plus, LLC Company${params.campaign ? ` &nbsp;&middot;&nbsp; <a href="${unsubUrl}" style="color: #999; text-decoration: underline;">Unsubscribe</a>` : ''}</p>
  </div>
</div>`;
}
