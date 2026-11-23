import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { partnerDocsState } from "../_shared/partnerDocState.ts";

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

    // Same builder partner-upload answers with, including each slot's open
    // check (the partner's own draft), so a "Fix My Document" link reopens
    // the screen with the mismatch highlighted.
    const state = await partnerDocsState(supabase, applicationId);
    if (!state.ok) return json({ ok: false, reason: "lookup_failed" }, 500);

    return json({
      ok: true,
      application_id: applicationId,
      business_name: app.business_name,
      email: app.email,
      docs: state.docs,
    });
  } catch (err) {
    console.error("[partner-token] unhandled:", err instanceof Error ? err.message : err);
    return json({ ok: false, reason: "lookup_failed" }, 500);
  }
});
