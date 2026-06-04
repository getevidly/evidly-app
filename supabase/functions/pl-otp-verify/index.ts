import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

async function hashCode(code: string): Promise<string> {
  const encoded = new TextEncoder().encode(code);
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

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

    const { intake_id, code } = await req.json();
    if (!intake_id || !code) {
      return json({ error: "intake_id and code required" }, 400, headers);
    }

    // Fetch newest unconsumed, unexpired OTP for this intake
    const now = new Date().toISOString();
    const { data: otpRow, error: otpErr } = await supabase
      .from("policy_lens_otp_codes")
      .select("*")
      .eq("intake_id", intake_id)
      .is("consumed_at", null)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (otpErr || !otpRow) {
      return json({ error: "Code expired or not found" }, 400, headers);
    }

    if (otpRow.attempts >= 5) {
      return json(
        { error: "Too many attempts — request a new code" },
        429,
        headers,
      );
    }

    // Hash-compare
    const submittedHash = await hashCode(String(code));
    if (submittedHash !== otpRow.code_hash) {
      await supabase
        .from("policy_lens_otp_codes")
        .update({ attempts: otpRow.attempts + 1 })
        .eq("id", otpRow.id);
      return json({ error: "Invalid code" }, 400, headers);
    }

    // ── Success — consume code ──────────────────────────────
    await supabase
      .from("policy_lens_otp_codes")
      .update({ consumed_at: now })
      .eq("id", otpRow.id);

    // Fetch intake to determine verification timestamp
    const { data: intake } = await supabase
      .from("policy_lens_intakes")
      .select("source")
      .eq("id", intake_id)
      .single();

    if (!intake) {
      return json({ error: "Intake not found" }, 400, headers);
    }

    // Set verification timestamp (re-stamps on resend recovery)
    const verifyUpdate =
      intake.source === "prospect"
        ? { phone_verified_at: now }
        : { agent_email_verified_at: now };

    await supabase
      .from("policy_lens_intakes")
      .update(verifyUpdate)
      .eq("id", intake_id);

    // Generate signed upload URL (15 min TTL)
    const { data: signedUrl, error: urlErr } = await supabase.storage
      .from("policy-lens-uploads")
      .createSignedUploadUrl(`${intake_id}/policy.pdf`);

    if (urlErr || !signedUrl) {
      logger.error("[pl-otp-verify] Signed URL error", urlErr);
      return json(
        { error: "Failed to generate upload URL" },
        500,
        headers,
      );
    }

    return json(
      {
        upload_url: signedUrl.signedUrl,
        upload_token: signedUrl.token,
      },
      200,
      headers,
    );
  } catch (err) {
    logger.error("[pl-otp-verify] Unhandled error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
