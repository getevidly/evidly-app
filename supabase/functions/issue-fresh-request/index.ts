import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── Edge function: issue-fresh-request ──────────────────────────────────────
// Handles State C: the original request is >=30 days old (stale).
// Cancels the prior request, creates a brand-new compliance_document_requests
// row with a fresh 14-day token, sends the email, and logs activity.

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

    // ── Load prior request to inherit recipient info ─────────────
    const { data: priorRequest } = await supabase
      .from("compliance_document_requests")
      .select("id, recipient_email, recipient_name, vendor_id")
      .eq("document_id", doc.id)
      .is("cancelled_at", null)
      .order("requested_at", { ascending: false })
      .limit(1)
      .single();

    if (!priorRequest?.recipient_email) {
      return jsonResponse(
        {
          error:
            "No prior request with recipient email found \u2014 cannot issue fresh request",
        },
        400,
      );
    }

    // ── Cancel prior request ─────────────────────────────────────
    await supabase
      .from("compliance_document_requests")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("id", priorRequest.id);

    // ── Create new request with fresh 14-day token ───────────────
    const newToken = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: newRequest, error: insertError } = await supabase
      .from("compliance_document_requests")
      .insert({
        organization_id: doc.organization_id,
        document_id: doc.id,
        vendor_id: priorRequest.vendor_id || doc.vendor_id,
        requested_by: user.id,
        secure_token: newToken,
        secure_token_expires_at: expiresAt,
        recipient_email: priorRequest.recipient_email,
        recipient_name: priorRequest.recipient_name,
      })
      .select("id")
      .single();

    if (insertError || !newRequest) {
      console.error("[ISSUE-FRESH] Insert failed:", insertError);
      return jsonResponse({ error: "Failed to create new request" }, 500);
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

    // ── Send email via send-document-request ─────────────────────
    const uploadUrl = `https://app.getevidly.com/vendor/upload/${newToken}`;
    const coverMessage = `${orgName} is requesting your ${doc.type || "document"}. Please upload using the secure link below. The link expires in 14 days.`;

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
          vendorEmail: priorRequest.recipient_email,
          vendorName: priorRequest.recipient_name || "Vendor",
          documentType: doc.type || "Document",
          uploadUrl,
          coverMessage,
          orgName,
          expiryDescription: "in 14 days",
        }),
        signal: controller.signal,
      });
      emailed = true;
    } catch {
      console.error("[ISSUE-FRESH] Email send failed \u2014 non-critical");
    }

    // ── Activity log (non-critical) ──────────────────────────────
    try {
      await supabase.from("compliance_document_activity_log").insert({
        organization_id: doc.organization_id,
        document_id: doc.id,
        event_type: "requested",
        actor_user_id: user.id,
        actor_label: actorLabel,
        metadata: {
          fresh_request: true,
          prior_request_id: priorRequest.id,
          new_request_id: newRequest.id,
        },
      });
    } catch {
      console.error(
        "[ISSUE-FRESH] Activity log insert failed \u2014 non-critical",
      );
    }

    return jsonResponse({
      success: true,
      emailed,
      new_request_id: newRequest.id,
      new_expires_at: expiresAt,
    });
  } catch (error) {
    console.error("Error in issue-fresh-request:", error);
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
