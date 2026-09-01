import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

/**
 * partner-apply — intake for the Trusted Partner Alliance application.
 *
 * Public: no JWT. The landing form at getevidly.com/partners/apply POSTs
 * here directly, so there is no session to verify. CORS is the only origin
 * gate and it is domain-restricted to getevidly.com.
 *
 * POST { first_name, last_name, business_name, service_type, email, phone,
 *        website, reviews_link, short_bio }
 *
 * The form sends short_bio; the column is bio. Mapped here, in one place.
 *
 * Writes one partner_applications row plus the six partner_documents rows
 * the partner has to fill. Those seven rows are one unit: if the six fail,
 * the application row is deleted, because a half-made application would
 * show the vendor an upload page with nothing to upload into.
 *
 * Email is not part of that unit. The row is the source of truth, so a
 * Resend failure is logged and reported in the response — never rolled back.
 */

const SERVICE_TYPES = [
  "Fire Suppression",
  "Fire Alarm",
  "Fire Sprinkler",
  "Hood Cleaning",
  "Pest Control",
  "Other",
] as const;

const DOC_TYPES = [
  "business_license",
  "professional_license",
  "w9",
  "liability_insurance",
  "workers_comp",
  "auto_insurance",
] as const;

/** All nine are required — the listing card cannot be published without them. */
const REQUIRED_FIELDS = [
  "first_name",
  "last_name",
  "business_name",
  "service_type",
  "email",
  "phone",
  "website",
  "reviews_link",
  "short_bio",
] as const;

const TOKEN_TTL_DAYS = 30;

/** Unauthenticated write: 7 rows and 2 emails per call. Held per IP. */
const APPLY_MAX = 5;
const APPLY_WINDOW = 3600; // 1 hour

const ADMIN_EMAIL = "arthur@getevidly.com";
const UPLOAD_BASE = "https://getevidly.com/partners/upload";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0].trim();
    if (first) return first;
  }
  return req.headers.get("cf-connecting-ip")?.trim() || "unknown";
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), {
      status: s,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed. POST an application." }, 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let applicationId: string | null = null;

  try {
    const limit = await checkRateLimit({
      key: `partner_apply:${clientIp(req)}`,
      maxRequests: APPLY_MAX,
      windowSeconds: APPLY_WINDOW,
      supabase,
    });
    if (!limit.allowed) {
      return json(
        { ok: false, error: "Too many applications from this connection — try again later." },
        429,
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Body must be JSON." }, 400);
    }

    const missing = REQUIRED_FIELDS.filter((f) => !str(body[f]));
    if (missing.length > 0) {
      return json({ ok: false, error: `Missing required field(s): ${missing.join(", ")}` }, 400);
    }

    const serviceType = str(body.service_type);
    if (!(SERVICE_TYPES as readonly string[]).includes(serviceType)) {
      // Caught before the insert so the caller gets this sentence rather than
      // a Postgres CHECK violation.
      return json({
        ok: false,
        error: `service_type must be one of: ${SERVICE_TYPES.join(", ")}. Received "${serviceType}".`,
      }, 400);
    }

    const uploadToken = crypto.randomUUID();
    const tokenExpiresAt = new Date(
      Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const firstName = str(body.first_name);
    const lastName = str(body.last_name);
    const businessName = str(body.business_name);
    const email = str(body.email);
    const phone = str(body.phone);

    const { data: app, error: appErr } = await supabase
      .from("partner_applications")
      .insert({
        first_name: firstName,
        last_name: lastName,
        business_name: businessName,
        service_type: serviceType,
        email,
        phone,
        website: str(body.website),
        reviews_link: str(body.reviews_link),
        bio: str(body.short_bio),
        upload_token: uploadToken,
        token_expires_at: tokenExpiresAt,
        status: "submitted",
      })
      .select("id")
      .single();

    if (appErr || !app) {
      console.error("[partner-apply] application insert failed:", appErr?.message);
      return json({ ok: false, error: "Could not save the application." }, 500);
    }

    applicationId = app.id as string;

    // ── The six document slots ──────────────────────────────────
    const { error: docsErr } = await supabase
      .from("partner_documents")
      .insert(DOC_TYPES.map((doc_type) => ({
        application_id: applicationId,
        doc_type,
        status: "pending",
      })));

    if (docsErr) {
      console.error("[partner-apply] document slots insert failed:", docsErr.message);

      // Undo the application so a half-made one cannot exist.
      const { error: cleanupErr } = await supabase
        .from("partner_applications")
        .delete()
        .eq("id", applicationId);

      if (cleanupErr) {
        // Worth shouting about: an orphan application row is now live with a
        // valid token and no document slots behind it.
        console.error(
          `[partner-apply] CLEANUP FAILED — orphan application ${applicationId} remains:`,
          cleanupErr.message,
        );
        return json({
          ok: false,
          error: "Could not save the document checklist, and could not undo the application.",
          orphan_application_id: applicationId,
          cleanup_failed: true,
        }, 500);
      }

      return json({
        ok: false,
        error: "Could not save the document checklist. The application was not kept — please try again.",
      }, 500);
    }

    // ── Email — never rolls the insert back ─────────────────────
    const uploadUrl = `${UPLOAD_BASE}?token=${uploadToken}`;
    const fullName = `${firstName} ${lastName}`.trim();
    const emailFailures: string[] = [];

    const adminHtml = buildEmailHtml({
      recipientName: "Arthur",
      bodyHtml: `
        <p>A new Trusted Partner Alliance application came in.</p>
        <table style="border-collapse: collapse; font-size: 14px; margin: 16px 0;">
          <tr><td style="padding: 4px 16px 4px 0; color: #64748b;">Name</td><td style="padding: 4px 0;"><strong>${esc(fullName)}</strong></td></tr>
          <tr><td style="padding: 4px 16px 4px 0; color: #64748b;">Business</td><td style="padding: 4px 0;"><strong>${esc(businessName)}</strong></td></tr>
          <tr><td style="padding: 4px 16px 4px 0; color: #64748b;">Service type</td><td style="padding: 4px 0;">${esc(serviceType)}</td></tr>
          <tr><td style="padding: 4px 16px 4px 0; color: #64748b;">Email</td><td style="padding: 4px 0;">${esc(email)}</td></tr>
          <tr><td style="padding: 4px 16px 4px 0; color: #64748b;">Phone</td><td style="padding: 4px 0;">${esc(phone)}</td></tr>
        </table>
        <p style="font-size: 13px; color: #64748b;">Their upload link has been sent. Six documents are pending.</p>`,
      skipGreeting: false,
    });

    const adminSend = await sendEmail({
      to: ADMIN_EMAIL,
      subject: `New partner application — ${businessName} (${serviceType})`,
      html: adminHtml,
      replyTo: email,
    });
    if (!adminSend) emailFailures.push("admin");

    const applicantHtml = buildEmailHtml({
      recipientName: firstName,
      bodyHtml: `
        <p>Thanks for applying to the EvidLY Trusted Partner Alliance.</p>
        <p>The next step is your paperwork. Use the private link below to upload
        six documents &mdash; business license, professional license, W-9,
        liability insurance, workers&rsquo; comp, and auto insurance.</p>
        <p>There is no login. The link is yours, and you can come back to it as
        many times as you need. It works for the next ${TOKEN_TTL_DAYS} days.</p>`,
      ctaText: "Upload your documents",
      ctaUrl: uploadUrl,
      footerNote: "You are receiving this because you applied to the EvidLY Trusted Partner Alliance.",
    });

    const applicantSend = await sendEmail({
      to: email,
      subject: "Your EvidLY partner upload link",
      html: applicantHtml,
    });
    if (!applicantSend) emailFailures.push("applicant");

    if (emailFailures.length > 0) {
      console.error(
        `[partner-apply] application ${applicationId} saved, email failed:`,
        emailFailures.join(", "),
      );
    }

    return json({
      ok: true,
      application_id: applicationId,
      email_failures: emailFailures,
    });
  } catch (err) {
    console.error("[partner-apply] unhandled:", err instanceof Error ? err.message : err);
    return json({ ok: false, error: "Something went wrong saving the application." }, 500);
  }
});
