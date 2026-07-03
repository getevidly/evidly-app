import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

let corsHeaders = getCorsHeaders(null);

interface ReviewActionPayload {
  documentId: string;
  action: "accept" | "reject";
  rejectionReason?: string;
}

Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Auth: extract user from JWT ──────────────────────────
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

    // ── Parse body ───────────────────────────────────────────
    const { documentId, action, rejectionReason }: ReviewActionPayload =
      await req.json();

    if (!documentId) {
      return jsonResponse({ error: "documentId is required" }, 400);
    }
    if (action !== "accept" && action !== "reject") {
      return jsonResponse(
        { error: 'action must be "accept" or "reject"' },
        400
      );
    }

    // ── Load compliance_documents row ────────────────────────
    const { data: doc, error: docError } = await supabase
      .from("compliance_documents")
      .select(
        "id, organization_id, status, storage_path, vendor_id, type, name, service_type_code, location_id, category, metadata"
      )
      .eq("id", documentId)
      .single();

    if (docError || !doc) {
      return jsonResponse({ error: "Document not found" }, 404);
    }

    if (doc.status !== "pending_review") {
      return jsonResponse(
        { error: "Document is not in review. Current status: " + doc.status },
        400
      );
    }

    // ── Verify operator's org matches doc's org ──────────────
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id, full_name")
      .eq("id", user.id)
      .single();

    if (!profile || profile.organization_id !== doc.organization_id) {
      return jsonResponse(
        { error: "You do not have access to this document" },
        403
      );
    }

    const actorLabel = profile.full_name || user.email || "Operator";

    // ══════════════════════════════════════════════════════════
    // ACCEPT BRANCH
    // ══════════════════════════════════════════════════════════
    if (action === "accept") {
      // 1. UPDATE compliance_documents → status='current'
      const { error: updateError } = await supabase
        .from("compliance_documents")
        .update({ status: "current" })
        .eq("id", doc.id);

      if (updateError) {
        console.error("[ACCEPT] UPDATE failed:", updateError);
        return jsonResponse({ error: "Failed to accept document" }, 500);
      }

      // 2. INSERT activity log — non-critical
      try {
        await supabase.from("compliance_document_activity_log").insert({
          organization_id: doc.organization_id,
          document_id: doc.id,
          event_type: "accepted",
          actor_user_id: user.id,
          actor_label: actorLabel,
          metadata: {},
        });
      } catch {
        console.error("[ACCEPT] Activity log insert failed — non-critical");
      }

      // 3. Service-record bridge — seal PSE, file the rest, advance the schedule if one exists.
      let bridge: Record<string, unknown> = { bridge: "skipped" };
      try {
        bridge = await runServiceBridge(supabase, supabaseUrl, supabaseKey, doc);
      } catch (e) {
        console.error("[ACCEPT] bridge threw — non-critical:", e);
      }

      return jsonResponse({ success: true, status: "current", ...bridge });
    }

    // ══════════════════════════════════════════════════════════
    // REJECT BRANCH
    // ══════════════════════════════════════════════════════════

    // 1. Load latest compliance_document_requests row
    const { data: priorRequest } = await supabase
      .from("compliance_document_requests")
      .select(
        "id, recipient_email, recipient_name, vendor_id, organization_id"
      )
      .eq("document_id", doc.id)
      .order("requested_at", { ascending: false })
      .limit(1)
      .single();

    const priorRequestId = priorRequest?.id || null;
    const recipientEmail = priorRequest?.recipient_email || null;
    const recipientName = priorRequest?.recipient_name || null;

    // Capture storage_path BEFORE nulling it (for file deletion later)
    const priorStoragePath = doc.storage_path;

    // 2. UPDATE compliance_documents → status='requested', null file metadata
    const { error: rejectUpdateError } = await supabase
      .from("compliance_documents")
      .update({
        status: "requested",
        storage_path: null,
        file_size_bytes: null,
        mime_type: null,
        import_source: null,
        submitted_at: null,
      })
      .eq("id", doc.id);

    if (rejectUpdateError) {
      console.error("[REJECT] UPDATE failed:", rejectUpdateError);
      return jsonResponse({ error: "Failed to reject document" }, 500);
    }

    // 3. INSERT activity log — non-critical
    try {
      await supabase.from("compliance_document_activity_log").insert({
        organization_id: doc.organization_id,
        document_id: doc.id,
        event_type: "rejected",
        actor_user_id: user.id,
        actor_label: actorLabel,
        metadata: {
          rejection_reason: rejectionReason || null,
          prior_request_id: priorRequestId,
        },
      });
    } catch {
      console.error("[REJECT] Activity log insert failed — non-critical");
    }

    let emailed = false;
    let newRequestId: string | null = null;
    let newExpiresAt: string | null = null;

    // 4. If recipient_email exists → create new request + send email
    if (recipientEmail) {
      const newToken = crypto.randomUUID();
      const expiresAt = new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000
      ).toISOString();

      // 4a. INSERT compliance_document_requests
      const { data: newRequest, error: insertError } = await supabase
        .from("compliance_document_requests")
        .insert({
          organization_id: doc.organization_id,
          document_id: doc.id,
          vendor_id: doc.vendor_id,
          requested_by: user.id,
          secure_token: newToken,
          secure_token_expires_at: expiresAt,
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          note_to_recipient: rejectionReason || null,
        })
        .select("id")
        .single();

      if (insertError || !newRequest) {
        console.error("[REJECT] New request INSERT failed:", insertError);
        // REVERT: set status back to pending_review
        await supabase
          .from("compliance_documents")
          .update({ status: "pending_review" })
          .eq("id", doc.id);
        return jsonResponse(
          { error: "Could not create new request. Please retry." },
          500
        );
      }

      newRequestId = newRequest.id;
      newExpiresAt = expiresAt;

      // 4b. Resolve org name
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

      // 4c. Compose cover message
      const coverMessage = rejectionReason
        ? `Your previous submission of ${doc.type || "the document"} was not accepted.\n\nReason: ${rejectionReason}\n\nPlease re-upload using the secure link below. The link expires in 14 days.`
        : `We need an updated version of your ${doc.type || "document"}. Please re-upload using the secure link below. The link expires in 14 days.`;

      // 4d. Send email via send-document-request — non-critical
      const uploadUrl = `https://app.getevidly.com/vendor/upload/${newToken}`;
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
            vendorEmail: recipientEmail,
            vendorName: recipientName || "Vendor",
            documentType: doc.type || "Document",
            uploadUrl,
            coverMessage,
            orgName,
          }),
          signal: controller.signal,
        });
        emailed = true;
      } catch {
        console.error("[REJECT] Email send failed — non-critical");
      }
    }

    // 5. Delete storage file — non-critical
    if (priorStoragePath) {
      try {
        await supabase.storage.from("documents").remove([priorStoragePath]);
      } catch {
        console.error("[REJECT] Storage delete failed — non-critical");
      }
    }

    return jsonResponse({
      success: true,
      status: "requested",
      emailed,
      new_request_id: newRequestId,
      new_expires_at: newExpiresAt,
    });
  } catch (error) {
    console.error("Error in document-review-action:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── SERVICE-RECORD BRIDGE (Unit 2b) ──────────────────────────
const PSE_SAFEGUARD: Record<string, string> = {
  KEC: "hood_cleaning",
  FS: "fire_suppression",
  FA: "fire_alarm",
  SP: "sprinklers",
};

async function advanceSchedule(
  supabase: any,
  doc: any,
  serviceDate: string,
): Promise<"advanced" | "no_schedule" | "error"> {
  if (!doc.service_type_code || !doc.location_id) return "no_schedule";
  const { data: sched } = await supabase
    .from("location_service_schedules")
    .select("id, frequency_interval_days")
    .eq("organization_id", doc.organization_id)
    .eq("location_id", doc.location_id)
    .eq("service_type_code", doc.service_type_code)
    .eq("is_active", true)
    .maybeSingle();
  if (!sched) return "no_schedule";
  const interval = sched.frequency_interval_days;
  let nextDue: string | null = null;
  if (interval && Number.isFinite(interval)) {
    const d = new Date(serviceDate + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + interval);
    nextDue = d.toISOString().slice(0, 10);
  }
  const { error: schedErr } = await supabase
    .from("location_service_schedules")
    .update({ last_service_date: serviceDate, next_due_date: nextDue })
    .eq("id", sched.id);
  return schedErr ? "error" : "advanced";
}

async function runServiceBridge(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  doc: any,
): Promise<Record<string, unknown>> {
  if (doc.category !== "vendor_service") return { bridge: "skipped_not_service" };

  const ext = (doc.metadata && doc.metadata.service_extraction) || null;
  const isPse = !!doc.service_type_code && doc.service_type_code in PSE_SAFEGUARD;

  if (isPse) {
    const sd = ext?.service_date;
    const sdConf = Number(ext?.service_date_confidence ?? 0);
    const certAbsent = ext?.cert_number_absent === true;
    const certVal = ext?.cert_number;
    const certConf = Number(ext?.cert_number_confidence ?? 0);
    const typeMatch = ext?.document_type_match === true;
    const legible = ext?.is_legible === true;
    const notFail = ext?.result !== "fail";
    const dateOk = !!sd && sdConf >= 0.95;
    const certOk = certAbsent || (!!certVal && certConf >= 0.95);
    const passed = !!ext && typeMatch && legible && notFail && dateOk && certOk;

    if (!passed) {
      const reason = !ext
        ? "no_extraction"
        : !dateOk
          ? "service_date_unconfirmed"
          : !certOk
            ? "cert_number_unconfirmed"
            : !typeMatch
              ? "type_mismatch"
              : !legible
                ? "illegible"
                : "result_fail";
      await supabase
        .from("compliance_documents")
        .update({ metadata: { ...(doc.metadata || {}), seal_pending: { reason, at: new Date().toISOString() } } })
        .eq("id", doc.id);
      const adv = await advanceSchedule(supabase, doc, sd || new Date().toISOString().slice(0, 10));
      return { bridge: "seal_deferred", reason, schedule: adv };
    }

    let vendorName = "Vendor";
    if (doc.vendor_id) {
      const { data: v } = await supabase.from("vendors").select("company_name").eq("id", doc.vendor_id).maybeSingle();
      if (v?.company_name) vendorName = v.company_name;
    }
    const certNumber = certAbsent ? "NONE" : certVal;

    let sealed = false;
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${supabaseUrl}/functions/v1/seal-service-record`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({
          organization_id: doc.organization_id,
          location_id: doc.location_id,
          safeguard_type: PSE_SAFEGUARD[doc.service_type_code],
          service_type_code: doc.service_type_code,
          vendor_name: vendorName,
          service_date: sd,
          cert_number: certNumber,
          source_file_bucket: "documents",
          source_file_path: doc.storage_path,
        }),
        signal: controller.signal,
      });
      sealed = res.ok;
      if (!res.ok) console.error("[BRIDGE] seal failed:", res.status, await res.text());
    } catch (e) {
      console.error("[BRIDGE] seal call threw:", e);
    }

    const adv = await advanceSchedule(supabase, doc, sd);
    return { bridge: sealed ? "sealed" : "seal_error", schedule: adv };
  }

  const svcDate = ext?.service_date || new Date().toISOString().slice(0, 10);
  const adv = await advanceSchedule(supabase, doc, svcDate);
  return { bridge: "filed_non_pse", schedule: adv };
}
