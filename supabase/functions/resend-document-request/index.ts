import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── Business-day calculator ─────────────────────────────────────────────────
function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start);
  let added = 0;
  while (added < days) {
    result.setUTCDate(result.getUTCDate() + 1);
    const dow = result.getUTCDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

// ── Edge function: resend-document-request ──────────────────────────────────
// Re-sends the secure upload link for a document in status='requested'.
//
// State A (token still valid, <30 days old):
//   Reuse existing token, increment resend_count, send email.
//
// State B (token expired, <30 days old):
//   Regenerate token with 5-business-day TTL, increment resend_count, send email.
//
// State C (>=30 days old):
//   Return 400 with code='request_stale'. Client shows "Issue Fresh Request".

let corsHeaders = getCorsHeaders(null);

Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Auth: extract user from JWT ──────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // ── Parse body ───────────────────────────────────────────────
    const { documentId }: { documentId: string } = await req.json();
    if (!documentId) {
      return jsonResponse({ error: "documentId is required" }, 400);
    }

    // ── Load document ────────────────────────────────────────────
    const { data: doc, error: docError } = await supabase
      .from("compliance_documents")
      .select("id, organization_id, status, vendor_id, type, name")
      .eq("id", documentId)
      .single();

    if (docError || !doc) {
      return jsonResponse({ error: "Document not found" }, 404);
    }

    if (doc.status !== "requested") {
      return jsonResponse(
        { error: "Document is not in requested status. Current: " + doc.status },
        400,
      );
    }

    // ── Verify operator's org matches doc's org ──────────────────
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id, full_name")
      .eq("id", user.id)
      .single();

    if (!profile || profile.organization_id !== doc.organization_id) {
      return jsonResponse(
        { error: "You do not have access to this document" },
        403,
      );
    }

    const actorLabel = profile.full_name || user.email || "Operator";

    // ── Load latest active request ───────────────────────────────
    const { data: request, error: reqError } = await supabase
      .from("compliance_document_requests")
      .select(
        "id, secure_token, secure_token_expires_at, recipient_email, recipient_name, requested_at, resend_count",
      )
      .eq("document_id", doc.id)
      .is("cancelled_at", null)
      .order("requested_at", { ascending: false })
      .limit(1)
      .single();

    if (reqError || !request) {
      return jsonResponse(
        { error: "No active request found for this document" },
        404,
      );
    }

    if (!request.recipient_email) {
      return jsonResponse(
        { error: "No recipient email on the request \u2014 cannot re-send" },
        400,
      );
    }

    // ── Compute state ────────────────────────────────────────────
    const now = new Date();
    const requestedAt = new Date(request.requested_at);
    const daysSince = Math.floor(
      (now.getTime() - requestedAt.getTime()) / 86400000,
    );

    // State C: >=30 days stale — reject
    if (daysSince >= 30) {
      return jsonResponse(
        {
          error:
            "Request is over 30 days old. Issue a fresh request instead.",
          code: "request_stale",
          days_since: daysSince,
        },
        400,
      );
    }

    const tokenExpiresAt = request.secure_token_expires_at
      ? new Date(request.secure_token_expires_at)
      : null;
    const tokenExpired = tokenExpiresAt ? tokenExpiresAt < now : true;

    let token = request.secure_token;
    let newExpiresAt: string | null = null;

    if (tokenExpired) {
      // ── State B: regenerate token with 5-business-day TTL ──────
      token = crypto.randomUUID();
      const expiresDate = addBusinessDays(now, 5);
      newExpiresAt = expiresDate.toISOString();

      const { error: updateError } = await supabase
        .from("compliance_document_requests")
        .update({
          secure_token: token,
          secure_token_expires_at: newExpiresAt,
          resend_count: (request.resend_count || 0) + 1,
          last_resent_at: now.toISOString(),
        })
        .eq("id", request.id);

      if (updateError) {
        console.error("[RESEND] Token regeneration failed:", updateError);
        return jsonResponse({ error: "Failed to regenerate token" }, 500);
      }
    } else {
      // ── State A: reuse token, increment resend_count ───────────
      newExpiresAt = request.secure_token_expires_at;

      const { error: updateError } = await supabase
        .from("compliance_document_requests")
        .update({
          resend_count: (request.resend_count || 0) + 1,
          last_resent_at: now.toISOString(),
        })
        .eq("id", request.id);

      if (updateError) {
        console.error("[RESEND] Counter increment failed:", updateError);
        return jsonResponse({ error: "Failed to update request" }, 500);
      }
    }

    // ── Resolve org name ─────────────────────────────────────────
    let orgName = "Your client";
    try {
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", doc.organization_id)
        .single();
      if (org?.name) orgName = org.name;
    } catch {
      // Fall back to generic name
    }

    // ── Compute expiry description for email template ────────────
    const expiryDescription = tokenExpired
      ? "in 5 business days"
      : (() => {
          const daysLeft = Math.ceil(
            (tokenExpiresAt!.getTime() - now.getTime()) / 86400000,
          );
          return daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;
        })();

    // ── Send email via send-document-request ─────────────────────
    const uploadUrl = `https://app.getevidly.com/vendor/upload/${token}`;
    const coverMessage = `This is a reminder to upload your ${doc.type || "document"}. Please use the secure link below.`;

    let emailed = false;
    try {
      const emailUrl = `${supabaseUrl}/functions/v1/send-document-request`;
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 8000);

      await fetch(emailUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          vendorEmail: request.recipient_email,
          vendorName: request.recipient_name || "Vendor",
          documentType: doc.type || "Document",
          uploadUrl,
          coverMessage,
          orgName,
          expiryDescription,
        }),
        signal: controller.signal,
      });
      emailed = true;
    } catch {
      console.error("[RESEND] Email send failed \u2014 non-critical");
    }

    // ── Activity log (non-critical) ──────────────────────────────
    try {
      await supabase.from("compliance_document_activity_log").insert({
        organization_id: doc.organization_id,
        document_id: doc.id,
        event_type: "resent",
        actor_user_id: user.id,
        actor_label: actorLabel,
        metadata: {
          request_id: request.id,
          resend_count: (request.resend_count || 0) + 1,
          token_regenerated: tokenExpired,
        },
      });
    } catch {
      console.error("[RESEND] Activity log insert failed \u2014 non-critical");
    }

    return jsonResponse({
      success: true,
      emailed,
      token_regenerated: tokenExpired,
      new_expires_at: newExpiresAt,
      resend_count: (request.resend_count || 0) + 1,
    });
  } catch (error) {
    console.error("Error in resend-document-request:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
