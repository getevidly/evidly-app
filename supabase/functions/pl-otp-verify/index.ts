import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

const MAX_FILES = 5;
const POLICY_TYPES: readonly string[] = [
  "property",
  "general_liability",
  "umbrella_excess",
  "spoilage_contamination",
  "bop",
  "liquor_liability",
  "other",
];

/**
 * Validates the optional multi-file inputs.
 * file_count defaults to 1 and is capped at MAX_FILES; stated_policy_types,
 * when present, must be one known value per file.
 */
function planUploads(
  body: { file_count?: unknown; stated_policy_types?: unknown },
): { ok: true; fileCount: number; statedTypes: string[] | null } | { ok: false; error: string } {
  let fileCount = 1;
  const raw = body.file_count;
  if (raw !== undefined && raw !== null) {
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1 || raw > MAX_FILES) {
      return { ok: false, error: `file_count must be an integer between 1 and ${MAX_FILES}` };
    }
    fileCount = raw;
  }

  let statedTypes: string[] | null = null;
  const types = body.stated_policy_types;
  if (types !== undefined && types !== null) {
    if (!Array.isArray(types) || types.length !== fileCount) {
      return { ok: false, error: `stated_policy_types must be an array of ${fileCount} value(s)` };
    }
    for (const t of types) {
      if (typeof t !== "string" || !POLICY_TYPES.includes(t)) {
        return { ok: false, error: `unknown stated_policy_type: ${String(t)}` };
      }
    }
    statedTypes = types as string[];
  }

  return { ok: true, fileCount, statedTypes };
}

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

    const body = await req.json();
    const { intake_id, code } = body;
    if (!intake_id || !code) {
      return json({ error: "intake_id and code required" }, 400, headers);
    }

    // Validate the upload plan before the code is consumed
    const plan = planUploads(body);
    if (!plan.ok) {
      return json({ error: plan.error }, 400, headers);
    }
    const { fileCount, statedTypes } = plan;

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
      .select("source, extracted_fields")
      .eq("id", intake_id)
      .single();

    if (!intake) {
      return json({ error: "Intake not found" }, 400, headers);
    }

    // Set verification timestamp (re-stamps on resend recovery)
    const verifyUpdate: Record<string, unknown> =
      intake.source === "prospect"
        ? { phone_verified_at: now }
        : { agent_email_verified_at: now };

    // Stash the declared types for pl-intake-finalize to map onto pl_documents
    if (statedTypes) {
      verifyUpdate.extracted_fields = {
        ...((intake.extracted_fields as Record<string, unknown> | null) ?? {}),
        stated_policy_types: statedTypes,
      };
    }

    await supabase
      .from("policy_lens_intakes")
      .update(verifyUpdate)
      .eq("id", intake_id);

    // Generate signed upload URLs (15 min TTL) — one per declared file
    const uploads: Array<{ path: string; token: string; signed_url: string }> = [];
    for (let i = 1; i <= fileCount; i++) {
      const { data: signedUrl, error: urlErr } = await supabase.storage
        .from("policy-lens-uploads")
        .createSignedUploadUrl(`${intake_id}/policy-${i}.pdf`);

      if (urlErr || !signedUrl) {
        logger.error("[pl-otp-verify] Signed URL error", urlErr);
        return json(
          { error: "Failed to generate upload URL" },
          500,
          headers,
        );
      }
      uploads.push({ path: signedUrl.path, token: signedUrl.token, signed_url: signedUrl.signedUrl });
    }

    return json(
      {
        file_count: fileCount,
        uploads,
        // Legacy single-file fields — the first upload slot
        upload_url: uploads[0].signed_url,
        upload_token: uploads[0].token,
      },
      200,
      headers,
    );
  } catch (err) {
    logger.error("[pl-otp-verify] Unhandled error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
