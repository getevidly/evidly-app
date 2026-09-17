import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PUBLIC_CORS_HEADERS } from "../_shared/cors.ts";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { logger } from "../_shared/logger.ts";
// Cold path: no certInfo, so every item renders as an unchecked requirement.
import { buildChecklistEmail } from "../_shared/checklist-email.ts";

const VALID_FORM_TYPES = [
  "founding_member",
  "alerts",
  "feedback",
  "partner",
  "cta",
  "resource",
] as const;
type FormType = (typeof VALID_FORM_TYPES)[number];

// ── Known top-level fields (everything else → metadata) ─────
const KNOWN_FIELDS = new Set([
  "form_type",
  "name",
  "business_name",
  "email",
  "phone",
  "state",
  "jurisdiction",
  "message",
  "consent",
  "source_page",
]);

// ── Auto-reply copy per form_type ───────────────────────────
interface ReplyTemplate {
  subject: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  skipGreeting?: boolean;
}

// ── Checklist email builder  v23 ────────────────────────────────────────

function getReplyTemplate(
  formType: FormType,
  seatsRemaining?: number,
  sourcePage?: string,
  name?: string,
  metadata?: Record<string, unknown>,
): ReplyTemplate {
  switch (formType) {
    case "founding_member": {
      const seatsCopy = seatsRemaining != null
        ? `<strong>${seatsRemaining} seats</strong> left`
        : `<strong>limited seats</strong> available`;
      return {
        subject: "You\u2019re on the list \u2014 EvidLY Founder seats",
        bodyHtml:
          `<p>Thanks for putting your name in for an EvidLY Founder seat \u2014 we\u2019ve got your details.</p><p>The Founder Window is open now, with ${seatsCopy} for California kitchen leaders. Claim yours and your rate locks for 36 months. Seats close when they\u2019re gone \u2014 not on a date \u2014 so being early matters.</p><p>Questions? Just reply; it comes straight to us.</p><p>\u2014 Arthur Haggerty, Founder &amp; CEO<br>EvidLY</p>`,
      };
    }
    case "alerts":
      return {
        subject: "You\u2019re on the list \u2014 EvidLY alerts",
        bodyHtml:
          "<p>Thanks \u2014 you\u2019re on the list. County and state alerts aren\u2019t open yet; we\u2019ll email you once they are, and you can leave the list at any time by replying to this message.</p>",
      };
    case "feedback":
      return {
        subject: "Thanks for the feedback",
        bodyHtml:
          "<p>Thank you for taking the time \u2014 we read every response, and yours is in front of us. This is how EvidLY gets built around what kitchens actually need.</p><p>If you raised something that needs a reply, we\u2019ll follow up. Either way, we appreciate it.</p>",
      };
    case "partner":
      return {
        subject: "We received your EvidLY partner application",
        bodyHtml:
          "<p>Thanks for applying to partner with EvidLY \u2014 we\u2019ve got your application and we\u2019ll review it.</p><p>We\u2019re building a network of quality service companies: the kind that do the work right and stand behind it. We review each application personally, and if it\u2019s a fit, we\u2019ll reach out to talk next steps \u2014 usually within a few business days.</p><p>Questions in the meantime? Reply here.</p><p>\u2014 The EvidLY team</p>",
      };
    case "cta": {
      const ctaSeatsCopy = seatsRemaining != null
        ? `${seatsRemaining} seats left`
        : `limited seats available`;
      return {
        subject: "Thanks \u2014 here\u2019s what\u2019s next with EvidLY",
        bodyHtml:
          `<p>Thanks for reaching out about EvidLY \u2014 we\u2019ve got your details and someone will follow up shortly.</p><p>In short: EvidLY keeps your kitchen\u2019s record aligned to what both your county and your insurance carrier require \u2014 documenting the work and identifying what\u2019s missing before it costs you. The Founder Window is open now with ${ctaSeatsCopy} for California kitchen leaders.</p><p>Reply with anything specific you want to cover.</p>`,
      };
    }
    case "resource": {
      if (sourcePage === "count" || sourcePage === "count-booth") {
        return {
          subject: "Your compliance record checklist",
          bodyHtml: buildChecklistEmail(name || "", metadata || {}, sourcePage),
          skipGreeting: true,
        };
      }
      return {
        subject: "You\u2019re on the list \u2014 EvidLY resource",
        bodyHtml:
          "<p>Thanks \u2014 you\u2019re on the list. We\u2019ll email this address when the resource is ready.</p>",
      };
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────
function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Handler ─────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: PUBLIC_CORS_HEADERS });
  }

  const headers = { ...PUBLIC_CORS_HEADERS, "Content-Type": "application/json" };

  try {
    // ── Parse body ────────────────────────────────────────
    const body = await req.json();
    const {
      form_type,
      name,
      business_name,
      email,
      phone,
      state,
      jurisdiction,
      message,
      consent,
      source_page,
      ...rest
    } = body;

    // ── Validate ──────────────────────────────────────────
    if (!form_type || !VALID_FORM_TYPES.includes(form_type)) {
      return json(
        { error: `form_type must be one of: ${VALID_FORM_TYPES.join(", ")}` },
        400,
        headers,
      );
    }
    if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return json({ error: "A valid email is required" }, 400, headers);
    }
    if (!phone || typeof phone !== "string" || phone.trim().length < 7) {
      return json({ error: "A valid phone number is required" }, 400, headers);
    }

    // ── Build metadata from unknown extra fields ─────────
    const metadata: Record<string, unknown> = { ...rest };

    // ── Insert ────────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: insertError } = await supabase
      .from("form_submissions")
      .insert({
        form_type,
        name: name?.trim() || null,
        business_name: business_name?.trim() || null,
        email: email.trim(),
        phone: phone.trim(),
        state: state?.trim() || null,
        jurisdiction: jurisdiction?.trim() || null,
        message: message?.trim() || null,
        metadata,
        consent: consent === true,
        source_page: source_page?.trim() || null,
      });

    if (insertError) {
      logger.error("[FORM-SUBMIT] Insert failed", insertError);
      return json({ error: "Failed to save submission" }, 500, headers);
    }

    // ── Auto-reply email (non-blocking) ──────────────────
    const recipientName = (metadata?.first_name ? String(metadata.first_name).trim() : "") || name?.trim() || "there";

    // Fetch live founder seat count for founding_member / cta templates
    let seatsRemaining: number | undefined;
    if (form_type === "founding_member" || form_type === "cta") {
      const { data, error: rpcError } = await supabase.rpc("get_founder_count");
      if (rpcError) {
        logger.error("[FORM-SUBMIT] get_founder_count RPC failed", rpcError);
      } else {
        seatsRemaining = 250 - (data as number);
      }
    }

    let template: ReturnType<typeof getReplyTemplate>;
    try {
      template = getReplyTemplate(form_type as FormType, seatsRemaining, source_page, name, metadata);
    } catch (templateErr) {
      console.error("[FORM-SUBMIT] buildChecklistEmail threw:", templateErr, (templateErr as Error)?.message);
      // Fall back to generic resource reply so the send still happens
      template = {
        subject: "You\u2019re on the list \u2014 EvidLY resource",
        bodyHtml:
          "<p>Thanks \u2014 you\u2019re on the list. We\u2019ll email this address when the resource is ready.</p>",
      };
    }

    const emailHtml = buildEmailHtml({
      recipientName,
      bodyHtml: template.bodyHtml,
      ctaText: template.ctaText,
      ctaUrl: template.ctaUrl,
      skipGreeting: template.skipGreeting,
    });

    // Fire-and-forget style: await but don't fail on error
    try {
      const emailResult = await sendEmail({
        to: email.trim(),
        subject: template.subject,
        html: emailHtml,
      });

      if (!emailResult) {
        console.error("[FORM-SUBMIT] Auto-reply email failed for", email);
      }
    } catch (sendErr) {
      console.error("[FORM-SUBMIT] sendEmail threw for", email, ":", sendErr, (sendErr as Error)?.message);
    }

    return json({ ok: true }, 200, headers);
  } catch (err) {
    logger.error("[FORM-SUBMIT] Unexpected error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
