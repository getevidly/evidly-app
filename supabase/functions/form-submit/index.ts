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
  const businessName = metadata.business_name ? String(metadata.business_name) : "";
  const CAL = "https://calendly.com/founders-getevidly/discovery-call";

  const sections: { title: string; color: string; text: string; total: number; records: [string, string][] }[] = [
    {
      title: "Fire safety", color: "#CB5C39", text: "#CB5C39",
      total: 5 * kitchens,
      records: [
        ["Hood and exhaust cleaning", "NFPA 96 &middot; CFC 609"],
        ["Fire suppression system", "NFPA 17A &middot; CFC 904"],
        ["Sprinkler system", "NFPA 25 &middot; CFC 901"],
        ["Fire alarm system", "NFPA 72 &middot; CFC 907"],
        ["Fire extinguishers", "NFPA 10 &middot; CFC 906"],
      ],
    },
    {
      title: "Food safety", color: "#3E6B8A", text: "#3E6B8A",
      total: 13 * kitchens,
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
      title: "Kitchen business", color: "#D8A93A", text: "#B08611",
      total: 6,
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
      title: "Service company", color: "#A79E8B", text: "#5A5346",
      total: 5 * svcCos,
      records: [
        ["General liability certificate of insurance", ""],
        ["Workers' compensation certificate of insurance", ""],
        ["Professional license", ""],
        ["Business license", ""],
        ["Form W-9", ""],
      ],
    },
  ];

  // ── build section tables ──
  let sectionHtml = "";
  for (const s of sections) {
    let rows = "";
    for (const [rName, cite] of s.records) {
      const citeLine = cite
        ? `<div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:7pt;color:#9A9484;margin-top:1px">${cite}</div>`
        : "";
      rows += `<tr><td bgcolor="#FFFFFF" style="padding:5px 8px 5px 0;vertical-align:top;width:19px"><div style="width:11px;height:11px;border:1.5px solid #C4CBD4;border-radius:3px;background:#FFFFFF;margin-top:2px"></div></td><td bgcolor="#FFFFFF" style="padding:5px 0"><div style="font-family:'Inter',Arial,sans-serif;font-size:9pt;color:#1E2D4D">${rName}</div>${citeLine}</td></tr>`;
    }
    sectionHtml +=
      `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px">` +
      `<tr>` +
      `<td bgcolor="#FFFFFF" style="vertical-align:middle"><table cellpadding="0" cellspacing="0" border="0"><tr>` +
      `<td width="11" height="11" bgcolor="${s.color}" style="width:11px;height:11px;font-size:0;line-height:0">&nbsp;</td>` +
      `<td bgcolor="#FFFFFF" style="padding-left:8px;font-family:'Montserrat',Arial,sans-serif;font-size:12.5pt;font-weight:700;color:${s.text}">${s.title}</td>` +
      `</tr></table></td>` +
      `<td bgcolor="#FFFFFF" style="text-align:right;vertical-align:middle">` +
      `<span style="font-family:'Montserrat',Arial,sans-serif;font-weight:700;font-size:12.5pt;color:#1E2D4D">${s.total}</span>` +
      `</td></tr>` +
      `<tr><td colspan="2" height="2" bgcolor="${s.color}" style="height:2px;font-size:0;line-height:0">&nbsp;</td></tr>` +
      rows +
      `</table>`;
  }

  // ── vendor note ──
  sectionHtml +=
    `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px"><tr>` +
    `<td width="2" bgcolor="#CB5C39" style="width:2px;font-size:0">&nbsp;</td>` +
    `<td bgcolor="#FFFFFF" style="padding:8px 12px;font-family:'Inter',Arial,sans-serif;font-size:7.8pt;color:#4A5464;line-height:1.5">Use this set for every vendor who works in your kitchen &mdash; refrigeration, plumbing, grease hauling, equipment repair, linen &mdash; not only the services listed above.</td>` +
    `</tr></table>`;

  // ── assemble full email ──
  return `<div style="color-scheme:light only;font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto">` +

    // ── context ──
    `<p style="font-family:'Inter',Arial,sans-serif;font-size:10pt;color:#243044;margin:0 0 12px 0">You counted ${recordCount} records. Here is the itemized list &mdash; every one, with the code behind it.</p>` +
    `<p style="font-family:'Inter',Arial,sans-serif;font-size:10pt;color:#243044;margin:0 0 20px 0">Check each record you can produce today. What you cannot is where to start.</p>` +

    // ── HEADER ──
    `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#1E2D4D" style="padding:28px">` +
    `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
    `<td bgcolor="#1E2D4D" style="vertical-align:top">` +
    `<div style="font-family:'Montserrat',Arial,sans-serif;font-weight:700;font-size:20pt;color:#FFFFFF;line-height:1.15">Your compliance record checklist</div>` +
    `<div style="font-family:'Inter',Arial,sans-serif;font-size:9.5pt;color:#AEBACD;margin-top:8px">${businessName ? `Prepared for ${businessName} &middot; ` : ""}${kitchens} kitchen${kitchens === 1 ? "" : "s"} &middot; ${svcCos} service ${svcCos === 1 ? "company" : "companies"}</div>` +
    `</td>` +
    `<td bgcolor="#1E2D4D" style="text-align:right;vertical-align:top;padding-left:20px">` +
    `<div style="font-family:'Montserrat',Arial,sans-serif;font-weight:700;font-size:40pt;color:#FFFFFF;line-height:1">${recordCount}</div>` +
    `<div style="font-family:'Inter',Arial,sans-serif;font-size:7.5pt;color:#AEBACD;letter-spacing:0.1em;text-transform:uppercase;margin-top:4px">Records to keep current, at least</div>` +
    `</td></tr></table>` +
    `</td></tr>` +

    // ── color bar ──
    `<tr><td style="font-size:0;line-height:0"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
    `<td width="25%" height="4" bgcolor="#CB5C39" style="font-size:0;line-height:0">&nbsp;</td>` +
    `<td width="33%" height="4" bgcolor="#3E6B8A" style="font-size:0;line-height:0">&nbsp;</td>` +
    `<td width="14%" height="4" bgcolor="#D8A93A" style="font-size:0;line-height:0">&nbsp;</td>` +
    `<td width="28%" height="4" bgcolor="#A79E8B" style="font-size:0;line-height:0">&nbsp;</td>` +
    `</tr></table></td></tr></table>` +

    // ── BODY ──
    `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#FFFFFF" style="padding:24px">` +
    sectionHtml +

    // ── CTA ──
    `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px"><tr>` +
    `<td bgcolor="#1E2D4D" style="border-radius:8px;padding:18px">` +
    `<a href="${CAL}" style="font-family:'Montserrat',Arial,sans-serif;font-weight:700;font-size:14pt;color:#FFFFFF;text-decoration:none;display:block">Schedule a meeting &rarr;</a>` +
    `<div style="font-family:'Inter',Arial,sans-serif;font-size:9pt;color:#AEBACD;margin-top:6px">Bring this checklist to the call.</div>` +
    `<div style="margin-top:12px"><a href="${CAL}" style="font-family:'Montserrat',Arial,sans-serif;font-weight:700;font-size:11.5pt;color:#CB5C39;text-decoration:none">Book a discovery call</a></div>` +
    `<div style="margin-top:4px"><a href="tel:+18553843591" style="font-family:'Inter',Arial,sans-serif;font-size:9pt;color:#FFFFFF;text-decoration:none">(855) 384-3591</a></div>` +
    `</td></tr></table>` +
    `</td></tr></table>` +

    // ── FOOTER ──
    `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
    `<td bgcolor="#FFFFFF" style="border-top:1px solid #ECE8DE;padding:16px 24px">` +
    `<div style="font-family:'Inter',Arial,sans-serif;font-size:7.6pt;color:#8A8578;line-height:1.5">How to read this: Check each record you can produce today. EvidLY reads and identifies; it does not decide your coverage.</div>` +
    `<div style="font-family:'Inter',Arial,sans-serif;font-size:7.6pt;color:#8A8578;line-height:1.5;margin-top:10px">` +
    `<span style="font-weight:700;color:#1E2D4D">getevidly.com</span><br>(855) 384-3591<br>a Cleaning Pros Plus, LLC company` +
    `</div>` +
    `</td></tr></table>` +
    `</div>`;
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
