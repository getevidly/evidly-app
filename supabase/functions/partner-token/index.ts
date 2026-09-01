import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * partner-token — validates a partner's upload link.
 *
 * Public: no JWT. The token in the link is the credential, same posture as
 * sealed-evidence-share. getevidly.com/partners/upload calls this on load to
 * decide whether to render the upload form or a kind "this link is no longer
 * usable" message.
 *
 * GET ?token=<token>   or   POST { token }
 *
 * NOT single-use. The partner comes back to the same link as they gather
 * paperwork; expiry is the only gate. A used token is still a good token.
 *
 * Unknown token and expired token return the SAME shape at HTTP 200, so a
 * caller walking the token space learns nothing from the difference — it
 * cannot tell "never existed" from "ran out of time".
 */

const DOC_TYPES = [
  "business_license",
  "professional_license",
  "w9",
  "liability_insurance",
  "workers_comp",
  "auto_insurance",
] as const;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), {
      status: s,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  /** One shape for every unusable token. */
  const unusable = () => json({ ok: false, reason: "invalid_or_expired" });

  if (req.method !== "GET" && req.method !== "POST") {
    return json({ ok: false, reason: "method_not_allowed" }, 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    let token = new URL(req.url).searchParams.get("token") || "";
    if (!token && req.method === "POST") {
      try {
        const body = await req.json();
        if (typeof body?.token === "string") token = body.token;
      } catch {
        // Unparseable body is just a missing token.
      }
    }
    token = token.trim();
    if (!token) return unusable();

    const { data: app, error: appErr } = await supabase
      .from("partner_applications")
      .select("id, business_name, email, token_expires_at")
      .eq("upload_token", token)
      .maybeSingle();

    if (appErr) {
      console.error("[partner-token] lookup failed:", appErr.message);
      return json({ ok: false, reason: "lookup_failed" }, 500);
    }
    if (!app) return unusable();

    const expiresAt = app.token_expires_at as string | null;
    if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) return unusable();

    const applicationId = app.id as string;

    const { data: docs, error: docsErr } = await supabase
      .from("partner_documents")
      .select("doc_type, file_path, expiration_date")
      .eq("application_id", applicationId);

    if (docsErr) {
      console.error("[partner-token] document lookup failed:", docsErr.message);
      return json({ ok: false, reason: "lookup_failed" }, 500);
    }

    // Built from DOC_TYPES, not from the rows, so the page always renders the
    // same six slots in the same order even if a row is somehow missing.
    type DocRow = { doc_type: string; file_path: string | null; expiration_date: string | null };
    const byType = new Map<string, DocRow>(
      ((docs ?? []) as DocRow[]).map((d) => [d.doc_type, d]),
    );

    return json({
      ok: true,
      application_id: applicationId,
      business_name: app.business_name,
      email: app.email,
      docs: DOC_TYPES.map((doc_type) => {
        const row = byType.get(doc_type);
        return {
          doc_type,
          uploaded: Boolean(row?.file_path),
          expiration_date: row?.expiration_date ?? null,
        };
      }),
    });
  } catch (err) {
    console.error("[partner-token] unhandled:", err instanceof Error ? err.message : err);
    return json({ ok: false, reason: "lookup_failed" }, 500);
  }
});
