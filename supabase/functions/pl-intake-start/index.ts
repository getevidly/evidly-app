import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendSms } from "../_shared/sms.ts";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { logger } from "../_shared/logger.ts";
import { DISCLOSURE_VERSION, generateSignToken } from "../_shared/disclosure.ts";
import { logEvent } from "../_shared/events.ts";

// ── Free-email domain blocklist (agent door) ────────────────
const FREE_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "aol.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "mail.com",
  "yandex.com",
  "live.com",
  "msn.com",
];

// ── Helpers ─────────────────────────────────────────────────

async function hashCode(code: string): Promise<string> {
  const encoded = new TextEncoder().encode(code);
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateOtp(): string {
  const raw = crypto.getRandomValues(new Uint32Array(1))[0];
  return String((raw % 900000) + 100000);
}

function generateReferralCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

/** Normalize a US phone number to E.164 (+1XXXXXXXXXX). Returns null if unparseable. */
function toE164US(raw: string): string | null {
  const d = (raw || "").replace(/\D/g, "");
  if (d.length === 10) return "+1" + d;
  if (d.length === 11 && d[0] === "1") return "+" + d;
  return null;
}

async function decrementRateLimit(
  supabase: ReturnType<typeof createClient>,
  key: string,
): Promise<void> {
  try {
    const { data: bucket } = await supabase
      .from("rate_limit_buckets")
      .select("count")
      .eq("key", key)
      .single();
    if (bucket && bucket.count > 0) {
      await supabase
        .from("rate_limit_buckets")
        .update({ count: bucket.count - 1 })
        .eq("key", key);
    }
  } catch {
    // Best-effort — don't fail the request
  }
}

async function sendOtp(
  channel: "sms" | "email",
  contact: string,
  code: string,
  recipientName: string,
): Promise<unknown> {
  if (channel === "sms") {
    return await sendSms({
      to: contact,
      body: `Your EvidLY verification code is: ${code}`,
    });
  }
  return await sendEmail({
    to: contact,
    subject: "Your EvidLY verification code",
    html: buildEmailHtml({
      recipientName,
      bodyHtml: `
        <p>Your verification code is:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:4px;text-align:center;">${code}</p>
        <p>This code expires in 10 minutes.</p>`,
    }),
  });
}

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

// ── Handler ─────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // ────────────────────────────────────────────────────────
    // RESEND MODE — intake_id present, no new row
    // ────────────────────────────────────────────────────────
    if (body.intake_id) {
      const { data: intake, error: fetchErr } = await supabase
        .from("policy_lens_intakes")
        .select("*")
        .eq("id", body.intake_id)
        .single();

      if (fetchErr || !intake) {
        return json({ error: "Intake not found" }, 400, headers);
      }
      if (intake.policy_pdf_path) {
        return json({ error: "Intake already finalized" }, 400, headers);
      }

      const channel: "sms" | "email" =
        intake.source === "prospect" ? "sms" : "email";
      const contact =
        intake.source === "prospect"
          ? intake.contact_phone
          : intake.agent_email;
      const recipientName =
        intake.source === "prospect"
          ? intake.contact_name || "there"
          : intake.agent_name || "Agent";

      // Rate limit: pl_otp:{contact} 3/hr
      const otpLimit = await checkRateLimit({
        key: `pl_otp:${contact}`,
        maxRequests: 3,
        windowSeconds: 3600,
        supabase,
      });
      if (!otpLimit.allowed) {
        return json(
          { error: "Too many code requests — try again later" },
          429,
          headers,
        );
      }

      // Invalidate prior unconsumed codes for this intake
      await supabase
        .from("policy_lens_otp_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("intake_id", body.intake_id)
        .is("consumed_at", null);

      // Generate + store OTP
      const code = generateOtp();
      const codeHash = await hashCode(code);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await supabase.from("policy_lens_otp_codes").insert({
        intake_id: body.intake_id,
        channel,
        code_hash: codeHash,
        expires_at: expiresAt,
      });

      // BLOCKING SEND — 502 on failure, decrement rate bucket
      const sendResult = await sendOtp(channel, contact, code, recipientName);
      if (!sendResult) {
        await decrementRateLimit(supabase, `pl_otp:${contact}`);
        return json(
          {
            error:
              "We couldn't send your code — check the number/email and try again.",
          },
          502,
          headers,
        );
      }

      return json({ intake_id: body.intake_id }, 200, headers);
    }

    // ────────────────────────────────────────────────────────
    // NEW INTAKE MODE
    // ────────────────────────────────────────────────────────
    const { source } = body;
    if (!source || !["prospect", "agent"].includes(source)) {
      return json(
        { error: 'source must be "prospect" or "agent"' },
        400,
        headers,
      );
    }

    // ── Door validation ─────────────────────────────────────
    if (source === "prospect") {
      const required = [
        "business_name",
        "contact_name",
        "contact_email",
        "contact_phone",
        "zip",
      ];
      const missing = required.filter(
        (f) => !body[f] || !String(body[f]).trim(),
      );
      if (missing.length) {
        return json(
          { error: `Missing required fields: ${missing.join(", ")}` },
          400,
          headers,
        );
      }
      // ── Normalize prospect phone to E.164 ──────────────────
      const e164Phone = toE164US(body.contact_phone);
      if (!e164Phone) {
        return json(
          { error: "Enter a valid US mobile number" },
          400,
          headers,
        );
      }
      body.contact_phone = e164Phone;

      if (body.agent_email && !body.agent_report_consent) {
        return json(
          { error: "agent_report_consent required when agent_email provided" },
          400,
          headers,
        );
      }
    } else {
      // ── Agent door: validate lane + lane-specific fields ────
      const lane = body.lane || "esign";
      if (!["esign", "attest"].includes(lane)) {
        return json(
          { error: 'lane must be "esign" or "attest"' },
          400,
          headers,
        );
      }

      const required = [
        "agent_name",
        "agency_name",
        "agent_license_number",
        "agent_email",
        "business_name",
      ];
      if (lane === "esign") {
        required.push("client_name", "client_email");
      } else {
        required.push("attestation_date");
      }

      const missing = required.filter(
        (f) => !body[f] || !String(body[f]).trim(),
      );
      if (missing.length) {
        return json(
          { error: `Missing required fields: ${missing.join(", ")}` },
          400,
          headers,
        );
      }
      const domain = body.agent_email.split("@")[1]?.toLowerCase();
      if (FREE_EMAIL_DOMAINS.includes(domain)) {
        return json(
          {
            error:
              "Please use your agency business email, not a personal address",
          },
          400,
          headers,
        );
      }
    }

    // ── Rate limits (check BEFORE creating rows) ────────────
    const ipLimit = await checkRateLimit({
      key: `pl_intake:${clientIp}`,
      maxRequests: 10,
      windowSeconds: 86400,
      supabase,
    });
    if (!ipLimit.allowed) {
      return json(
        { error: "Too many requests — try again later" },
        429,
        headers,
      );
    }

    const contact =
      source === "prospect" ? body.contact_phone : body.agent_email;
    const otpLimit = await checkRateLimit({
      key: `pl_otp:${contact}`,
      maxRequests: 3,
      windowSeconds: 3600,
      supabase,
    });
    if (!otpLimit.allowed) {
      return json(
        { error: "Too many code requests — try again later" },
        429,
        headers,
      );
    }

    // ── Insert intake row ───────────────────────────────────
    const intakeRow: Record<string, unknown> = {
      source,
      status: "received",
      business_name: body.business_name,
      contact_name: body.contact_name || null,
      contact_email: body.contact_email || null,
      contact_phone: body.contact_phone || null,
      zip: body.zip || null,
      county: body.county || null,
      agent_name: body.agent_name || null,
      agent_email: body.agent_email || null,
      agency_name: body.agency_name || null,
      agent_license_number: body.agent_license_number || null,
      attribution_source: body.attribution_source || null,
      referred_by: body.referred_by || null,
      agent_report_consent: false,
    };

    if (source === "prospect" && body.agent_email) {
      intakeRow.agent_report_consent = true;
      intakeRow.agent_consent_at = new Date().toISOString();
    }

    // ── Insert with referral_code collision retry (×5) ──────
    let intake: { id: string } | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      intakeRow.referral_code = generateReferralCode();
      const { data, error: insertErr } = await supabase
        .from("policy_lens_intakes")
        .insert(intakeRow)
        .select("id")
        .single();

      if (!insertErr && data) {
        intake = data;
        break;
      }
      // 23505 = unique_violation — retry with new code
      if (insertErr?.code === "23505") continue;
      logger.error("[pl-intake-start] Insert failed", insertErr);
      return json({ error: "Failed to create intake" }, 500, headers);
    }
    if (!intake) {
      return json({ error: "Failed to generate referral code" }, 500, headers);
    }

    // ── Log intake_started event ──────────────────────────────
    await logEvent(supabase, {
      event_type: "intake_started",
      intake_id: intake.id,
      referral_code: intakeRow.referral_code as string,
    });

    // ── Authorization row (agent esign/attest) ────────────────
    if (source === "agent") {
      const lane = body.lane || "esign";
      const now = new Date().toISOString();

      if (lane === "esign") {
        const { data: auth, error: authErr } = await supabase
          .from("policy_lens_authorizations")
          .insert({
            intake_id: intake.id,
            client_name: body.client_name,
            client_email: body.client_email,
            method: "esign",
            status: "requested",
            disclosure_version: DISCLOSURE_VERSION,
          })
          .select("id")
          .single();

        if (authErr || !auth) {
          logger.error(
            "[pl-intake-start] Authorization insert failed",
            authErr,
          );
          return json(
            { error: "Failed to create authorization" },
            500,
            headers,
          );
        }

        // Generate sign token + email client
        const token = await generateSignToken(auth.id);
        const publicBase = Deno.env.get("PL_PUBLIC_BASE");
        if (!publicBase) {
          logger.error("[pl-intake-start] PL_PUBLIC_BASE env var is not set");
          return json({ error: "Server configuration error" }, 500, headers);
        }
        const signLink = `${publicBase}/policy-lens/authorize?token=${token}`;

        const clientEmailResult = await sendEmail({
          to: body.client_email,
          subject: "Authorization required — EvidLY Policy Review",
          html: buildEmailHtml({
            recipientName: body.client_name,
            bodyHtml: `
              <p>Your insurance agent <strong>${body.agent_name}</strong> from
              <strong>${body.agency_name}</strong> has requested authorization
              to review your commercial property insurance policy through EvidLY.</p>
              <p>Please review the authorization details and sign electronically
              by clicking the button below.</p>`,
            ctaText: "Review & Sign Authorization",
            ctaUrl: signLink,
            footerNote:
              "This link expires in 72 hours. If you did not expect this request, you can safely ignore this email.",
          }),
        });

        if (!clientEmailResult) {
          return json(
            {
              error:
                "We couldn't send the authorization email — please verify the client's email address and try again.",
            },
            502,
            headers,
          );
        }
      } else {
        // attest lane
        const { error: authErr } = await supabase
          .from("policy_lens_authorizations")
          .insert({
            intake_id: intake.id,
            method: "attest",
            status: "attested",
            attested_at: now,
            attestation_date: body.attestation_date,
          });

        if (authErr) {
          logger.error(
            "[pl-intake-start] Authorization insert failed",
            authErr,
          );
          return json(
            { error: "Failed to create authorization" },
            500,
            headers,
          );
        }
      }
    }

    // ── Generate + store OTP ────────────────────────────────
    const channel: "sms" | "email" =
      source === "prospect" ? "sms" : "email";
    const code = generateOtp();
    const codeHash = await hashCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const recipientName =
      source === "prospect"
        ? body.contact_name || "there"
        : body.agent_name || "Agent";

    await supabase.from("policy_lens_otp_codes").insert({
      intake_id: intake.id,
      channel,
      code_hash: codeHash,
      expires_at: expiresAt,
    });

    // ── BLOCKING SEND — 502 on failure, decrement rate bucket
    const sendResult = await sendOtp(channel, contact, code, recipientName);
    if (!sendResult) {
      await decrementRateLimit(supabase, `pl_otp:${contact}`);
      return json(
        {
          error:
            "We couldn't send your code — check the number/email and try again.",
        },
        502,
        headers,
      );
    }

    // ── After-intake confirmation email (non-blocking) ──────
    const submitterEmail = source === "prospect" ? body.contact_email : body.agent_email;
    if (submitterEmail) {
      try {
        await sendEmail({
          to: submitterEmail,
          subject: "We've received your Policy Lens request",
          html: buildEmailHtml({
            recipientName,
            bodyHtml: `
              <p>We've received your Policy Lens request for ${body.business_name || "your kitchen"} — thank you.</p>
              <p>Here's what happens next: once your policy is in, Policy Lens reads it and identifies the provisions that govern your kitchen — what's required, and what's missing or overdue. A person on our team reviews every submission before anything goes out. We'll be in touch with your results.</p>
              <p>Policy Lens reads the policy. Your agent evaluates the coverage.</p>
              <p>Questions in the meantime? Just reply.</p>
              <p>— Arthur Haggerty, Founder &amp; CEO<br>EvidLY</p>`,
          }),
        });
      } catch (confirmErr) {
        logger.error("[pl-intake-start] Confirmation email failed", confirmErr);
      }
    }

    return json({ intake_id: intake.id, referral_code: intakeRow.referral_code }, 200, headers);
  } catch (err) {
    logger.error("[pl-intake-start] Unhandled error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
