import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/email.ts";
import { buildEmailHtml } from "../_shared/email.ts";
import { logger } from "../_shared/logger.ts";

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

/**
 * share-join-preview — lets a prospect forward the /join sample-dashboard
 * link to a colleague. No auth required (the prospect isn't logged in).
 *
 * POST { token, email, note? }
 *
 * No auth required. Validates the token exists before sending.
 */
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
    const { token, email, note } = body;

    if (!token || !email) {
      return json({ error: "token and email are required" }, 400, headers);
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Invalid email address" }, 400, headers);
    }

    // Look up invite by token
    const { data: inv, error: invErr } = await supabase
      .from("evidly_client_invites")
      .select("id, organization_name, contact_name, token")
      .eq("token", token)
      .maybeSingle();

    if (invErr || !inv) {
      return json({ error: "Invalid invite link" }, 404, headers);
    }

    const appBase = Deno.env.get("APP_PUBLIC_BASE") || "https://app.getevidly.com";
    const joinLink = `${appBase}/join/${inv.token}`;

    const orgName = inv.organization_name || "a commercial kitchen";
    const senderLabel = inv.contact_name || "Someone";

    const noteBlock = note
      ? `<p style="color: #5F6875; font-style: italic; border-left: 3px solid #B26A43; padding-left: 12px; margin: 16px 0;">"${note}"</p>`
      : "";

    const subject = `${senderLabel} shared a sample dashboard with you`;

    const html = buildEmailHtml({
      recipientName: email.split("@")[0],
      bodyHtml: `
        <p><strong>${senderLabel}</strong> from <strong>${orgName}</strong> thought
        you'd want to see this.</p>
        ${noteBlock}
        <p>They're looking at <strong>Policy Lens</strong> by EvidLY — it reads
        commercial kitchen insurance policies, identifies what's covered, and
        flags gaps that kitchen leaders often miss.</p>
        <p>The link below opens a sample dashboard so you can see what a
        full year of records looks like.</p>`,
      ctaText: "View the Sample Dashboard",
      ctaUrl: joinLink,
    });

    const sent = await sendEmail({ to: email, subject, html });
    if (!sent) {
      return json({ error: "Could not send — check the email and try again." }, 502, headers);
    }

    logger.info("[share-join-preview] Shared", inv.id, "→", email);

    return json({ success: true }, 200, headers);
  } catch (err) {
    logger.error("[share-join-preview] Unhandled error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
