import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { logger } from "../_shared/logger.ts";

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

// ── Checklist email builder ─────────────────────────────────
function buildChecklistEmail(name: string, metadata: Record<string, unknown>): string {
  const kitchens = Number(metadata.kitchens) || 1;
  const svcCos = Number(metadata.service_companies) || 1;
  const recordCount = Number(metadata.record_count) || 0;

  const sections: { title: string; color: string; count: string; records: [string, string][] }[] = [
    {
      title: "FIRE SAFETY",
      color: "#B24A2E",
      count: `5 &times; ${kitchens} ${kitchens === 1 ? "kitchen" : "kitchens"} = ${5 * kitchens} records`,
      records: [
        ["Hood and exhaust cleaning", "NFPA 96 &middot; CFC 609"],
        ["Fire suppression system", "NFPA 17A &middot; CFC 904"],
        ["Sprinkler system", "NFPA 25 &middot; CFC 901"],
        ["Fire alarm system", "NFPA 72 &middot; CFC 907"],
        ["Fire extinguishers", "NFPA 10 &middot; CFC 906"],
      ],
    },
    {
      title: "FOOD SAFETY",
      color: "#3E6B8A",
      count: `13 &times; ${kitchens} ${kitchens === 1 ? "kitchen" : "kitchens"} = ${13 * kitchens} records`,
      records: [
        ["Pest control", "&sect;114259"],
        ["Receiving temperature log", "&sect;113996 &middot; one per day"],
        ["Cold holding log", "&sect;113996 &middot; one per day"],
        ["Hot holding log", "&sect;113996 &middot; one per day"],
        ["Cooling log", "&sect;114002 &middot; one per day"],
        ["Reheating log", "&sect;114014 &middot; one per day"],
        ["Warewash and sanitizer", "&sect;114099"],
        ["Health permit", "&sect;114381"],
        ["Food protection manager", "&sect;113947.1"],
        ["Food handler cards", "&sect;113948 &middot; one per person"],
        ["Allergen awareness and training", "&sect;113947(b)"],
        ["Person in charge", "&sect;113945"],
        ["Employee health policy", "&sect;113949"],
      ],
    },
    {
      title: "KITCHEN BUSINESS",
      color: "#B08611",
      count: "6 records &mdash; held once",
      records: [
        ["General liability insurance", ""],
        ["Food contamination and spoilage insurance", ""],
        ["Business license", ""],
        ["Seller's permit", ""],
        ["Form W-9", ""],
        ["Certificate of occupancy", ""],
      ],
    },
    {
      title: "SERVICE COMPANY",
      color: "#A79E8B",
      count: `5 &times; ${svcCos} ${svcCos === 1 ? "company" : "companies"} = ${5 * svcCos} records`,
      records: [
        ["General liability certificate of insurance", ""],
        ["Workers' compensation certificate of insurance", ""],
        ["Professional license", ""],
        ["Business license", ""],
        ["Form W-9", ""],
      ],
    },
  ];

  let html = `<p style="font-size: 20px; font-weight: 700; color: #1E2D4D; margin: 0 0 24px 0;"><strong>${recordCount}</strong> records to keep current, at least.</p>`;

  for (const section of sections) {
    html += `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">`;
    html += `<tr><td colspan="2" style="background: ${section.color}; color: #ffffff; padding: 10px 14px; font-weight: 700; font-size: 14px; letter-spacing: 0.05em;">${section.title}</td></tr>`;
    html += `<tr><td colspan="2" style="padding: 6px 14px; font-size: 12px; color: #7C8BA5; border-bottom: 1px solid #E7E3DA;">${section.count}</td></tr>`;
    for (const [recordName, cite] of section.records) {
      const citeCell = cite
        ? `<td style="padding: 8px 14px; font-size: 13px; color: #7C8BA5; text-align: right; border-bottom: 1px solid #f0ede6; white-space: nowrap;">${cite}</td>`
        : `<td style="padding: 8px 14px; font-size: 13px; color: #b8b0a0; text-align: right; border-bottom: 1px solid #f0ede6;">&mdash;</td>`;
      html += `<tr><td style="padding: 8px 14px; font-size: 14px; color: #1E2D4D; border-bottom: 1px solid #f0ede6;">${recordName}</td>${citeCell}</tr>`;
    }
    html += `</table>`;
  }

  html += `<p style="font-size: 13px; color: #4a5563; line-height: 1.5; margin: 24px 0 0 0;">Use the service company set for every vendor who works in your kitchen, not only the services listed above.</p>`;

  return html;
}

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
          bodyHtml: buildChecklistEmail(name || "", metadata || {}),
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

    const template = getReplyTemplate(form_type as FormType, seatsRemaining, source_page, name, metadata);

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
