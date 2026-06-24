import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { logger } from "../_shared/logger.ts";

// TODO: replace with the real URL once the resource PDF/page is live
const RESOURCE_URL = "";

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
}

function getReplyTemplate(formType: FormType): ReplyTemplate {
  switch (formType) {
    case "founding_member":
      return {
        subject: "You\u2019re on the list \u2014 EvidLY Founder seats",
        bodyHtml:
          "<p>Thanks for putting your name in for an EvidLY Founder seat \u2014 we\u2019ve got your details.</p><p>Here\u2019s what\u2019s next: the Founder Window opens <strong>July 4</strong>, with 250 seats for California kitchen leaders. Claim one and your rate locks for 36 months. We\u2019ll reach out before the window opens with your invitation to lock your seat. Seats close when the 250th is taken \u2014 not on a date \u2014 so being early matters.</p><p>Questions in the meantime? Just reply; it comes straight to us.</p><p>\u2014 Arthur Haggerty, Founder &amp; CEO<br>EvidLY</p>",
      };
    case "alerts":
      return {
        subject: "You\u2019re subscribed \u2014 EvidLY compliance alerts",
        bodyHtml:
          "<p>You\u2019re on the list. We\u2019ll send you what your county and state authorities change \u2014 new requirements, code updates, the things that catch kitchens off guard \u2014 so nothing lands on you by surprise.</p><p>No noise, only what matters. An unsubscribe link sits at the bottom of every alert. Reply anytime to tell us what you\u2019d find most useful.</p>",
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
    case "cta":
      return {
        subject: "Thanks \u2014 here\u2019s what\u2019s next with EvidLY",
        bodyHtml:
          "<p>Thanks for reaching out about EvidLY \u2014 we\u2019ve got your details and someone will follow up shortly.</p><p>In short: EvidLY keeps your kitchen\u2019s record aligned to what both your county and your insurance carrier require \u2014 documenting the work and identifying what\u2019s missing before it costs you. The Founder Window opens July 4 with 250 seats for California kitchen leaders.</p><p>Reply with anything specific you want to cover.</p>",
      };
    case "resource":
      if (RESOURCE_URL) {
        return {
          subject: "Here\u2019s your EvidLY resource",
          bodyHtml: "<p>Thanks \u2014 here\u2019s the resource you requested:</p>",
          ctaText: "Download Resource",
          ctaUrl: RESOURCE_URL,
        };
      }
      return {
        subject: "Here\u2019s your EvidLY resource",
        bodyHtml:
          "<p>Thanks \u2014 we\u2019ve saved your email. The resource you requested is on its way; we\u2019ll send it to this address shortly.</p>",
      };
  }
}

// ── Helpers ──────────────────────────────────────────────────
function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Handler ─────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

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
    const recipientName = name?.trim() || "there";
    const template = getReplyTemplate(form_type as FormType);

    const emailHtml = buildEmailHtml({
      recipientName,
      bodyHtml: template.bodyHtml,
      ctaText: template.ctaText,
      ctaUrl: template.ctaUrl,
    });

    // Fire-and-forget style: await but don't fail on error
    const emailResult = await sendEmail({
      to: email.trim(),
      subject: template.subject,
      html: emailHtml,
    });

    if (!emailResult) {
      logger.error("[FORM-SUBMIT] Auto-reply email failed for", email);
    }

    return json({ ok: true }, 200, headers);
  } catch (err) {
    logger.error("[FORM-SUBMIT] Unexpected error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
