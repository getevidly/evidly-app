import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createOrgNotification } from "../_shared/notify.ts";
import { enqueueUploadNotification, triggerDelayedFlush } from "../_shared/uploadEmailQueue.ts";
import { requiredFields, validateTyped } from "../_shared/vendorDocumentRules.ts";
import {
  type IncomingFile,
  loadOpenCheck,
  markSent,
  publicCheckState,
  queueFixEmail,
  runCheck,
  sniffType,
  type Target,
  verifyForSend,
} from "../_shared/vendorDocumentCheckFlow.ts";

let corsHeaders = getCorsHeaders(null);

// Vendor secure upload — reads tokens from compliance_document_requests,
// writes back to compliance_documents on successful upload.
//
// GET  ?token=<uuid> → validate token, return upload form data
// POST ?token=<uuid> + FormData(file, notes) → upload file, update document

Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return jsonResponse({ error: "Token required" }, 400);
    }

    // ── Token lookup (compliance_document_requests) ───────────
    const { data: request, error: reqError } = await supabase
      .from("compliance_document_requests")
      .select(
        "id, organization_id, document_id, vendor_id, secure_token_expires_at, fulfilled_at, cancelled_at, recipient_email, recipient_name"
      )
      .eq("secure_token", token)
      .single();

    if (reqError || !request) {
      return jsonResponse({ error: "Invalid upload link" }, 404);
    }

    if (request.fulfilled_at) {
      return jsonResponse(
        { error: "This document has already been uploaded" },
        410
      );
    }

    if (request.cancelled_at) {
      return jsonResponse(
        { error: "This request has been cancelled" },
        410
      );
    }

    if (new Date(request.secure_token_expires_at) < new Date()) {
      return jsonResponse(
        {
          error:
            "This upload link has expired. Contact your client for a new link.",
        },
        410
      );
    }

    // Fetch linked compliance_document
    const { data: doc } = await supabase
      .from("compliance_documents")
      .select("id, type, name, category, vendor_id, service_type_code")
      .eq("id", request.document_id)
      .single();

    // Resolve vendor name (prefer vendors table, fall back to recipient_name)
    let vendorName = request.recipient_name || "Vendor";
    if (doc?.vendor_id) {
      const { data: vendor } = await supabase
        .from("vendors")
        .select("company_name")
        .eq("id", doc.vendor_id)
        .single();
      if (vendor?.company_name) vendorName = vendor.company_name;
    }

    // Resolve organization name
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", request.organization_id)
      .single();

    // ── Arthur's inbound-document rule applies to business documents ──
    // (certificates of insurance, licenses, certifications, W-9s,
    // agreements). Service reports keep their own path: AI extraction of
    // the service date and certificate number, then confirm-to-seal.
    const checked = doc?.category === "business";
    const required = checked
      ? requiredFields("kitchen", doc?.type || "")
      : { number: false, expiry: false, numberLabel: "Number" };
    const documentLabel = doc?.type || "Document";
    const checkTarget: Target = {
      flow: "kitchen",
      documentId: request.document_id,
      bucket: "documents",
      draftPath: (ext: string) =>
        `vendor-uploads/${request.organization_id}/${doc?.vendor_id || "unknown"}/draft-${request.document_id}-${Date.now()}.${ext}`,
      required,
      nameOnFile: vendorName === "Vendor" ? null : vendorName,
      documentLabel,
    };

    // ── GET → Return token info for the upload form ───────────
    if (req.method === "GET") {
      const openCheck = checked
        ? await loadOpenCheck(supabase, "kitchen", request.document_id)
        : null;
      return jsonResponse({
        valid: true,
        document_type: doc?.type || null,
        document_name: doc?.name || null,
        vendor_name: vendorName,
        organization_name: org?.name || null,
        expires_at: request.secure_token_expires_at,
        checked,
        needs_number: required.number,
        needs_expiry: required.expiry,
        number_label: required.numberLabel,
        check: publicCheckState(openCheck),
      });
    }

    // ── POST ──────────────────────────────────────────────────
    if (req.method === "POST") {
      const formData = await req.formData();
      const notes = (formData.get("notes") as string) || "";

      // Values that the shared steps below write, whichever path set them.
      let storagePath = "";
      let fileSize = 0;
      let mimeType = "";
      let originalFilename = "";
      let typedExpiration: string | null = null;
      let typedNumber: string | null = null;
      let sendingCheckId: string | null = null;

      if (checked) {
        const action = String(formData.get("action") ?? "");

        // Typed details: expiration date and policy or license number.
        const typed = validateTyped(
          required,
          String(formData.get("expiration_date") ?? ""),
          String(formData.get("doc_number") ?? ""),
        );

        // ── Check My Document: store the draft, read it, compare ──
        if (action === "check") {
          if (typed.error) return jsonResponse({ error: typed.error }, 400);

          let incoming: IncomingFile | null = null;
          const f = formData.get("file");
          if (f instanceof File && f.size > 0) {
            if (f.size > 25 * 1024 * 1024) {
              return jsonResponse({ error: "File too large. Maximum 25MB." }, 400);
            }
            const bytes = new Uint8Array(await f.arrayBuffer());
            const sniffed = sniffType(bytes.subarray(0, 8));
            if (!sniffed) {
              return jsonResponse({ error: "Upload a PDF, JPG or PNG so the document can be read." }, 400);
            }
            incoming = { bytes, mimeType: sniffed.mime, ext: sniffed.ext, name: f.name };
          }

          const result = await runCheck(
            supabase,
            checkTarget,
            { expiration: typed.expiration, number: typed.number },
            incoming,
          );
          if (!result.ok) return jsonResponse({ error: result.error }, result.status);
          return jsonResponse({ success: true, check: publicCheckState(result.check) });
        }

        // ── The sender left the page (sendBeacon on pagehide) ──────
        // Only a check that says needs_fix queues the fix email.
        if (action === "leave") {
          const open = await loadOpenCheck(supabase, "kitchen", request.document_id);
          const appUrl = (Deno.env.get("APP_URL") || "https://app.getevidly.com").replace(/\/+$/, "");
          const outcome = await queueFixEmail(supabase, open, {
            to: request.recipient_email,
            documentLabel,
            recipientName: org?.name || "your client",
            senderName: vendorName === "Vendor" ? null : vendorName,
            fixUrl: `${appUrl}/vendor/upload/${token}`,
          });
          return jsonResponse({ success: true, ...outcome });
        }

        // ── Send to {Recipient}: only a check that still matches ──
        if (action === "send") {
          const open = await loadOpenCheck(supabase, "kitchen", request.document_id);
          const refusal = verifyForSend(checkTarget, open);
          if (refusal || !open) return jsonResponse({ error: refusal }, 409);

          storagePath = open.file_path!;
          fileSize = Number(open.file_size_bytes ?? 0);
          mimeType = open.file_mime_type ?? "application/pdf";
          originalFilename = open.original_filename ?? "";
          typedExpiration = open.typed_expiration_date;
          typedNumber = open.typed_doc_number;
          sendingCheckId = open.id;
        } else {
          return jsonResponse({ error: "Check My Document first." }, 400);
        }
      } else {
      const file = formData.get("file") as File;

      if (!file) {
        return jsonResponse({ error: "No file provided" }, 400);
      }

      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/heic",
        "image/heif",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(file.type)) {
        return jsonResponse(
          {
            error:
              "File type not allowed. Please upload PDF, JPG, PNG, or Word document.",
          },
          400
        );
      }

      if (file.size > 25 * 1024 * 1024) {
        return jsonResponse({ error: "File too large. Maximum 25MB." }, 400);
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop() || "pdf";
      storagePath = `vendor-uploads/${request.organization_id}/${doc?.vendor_id || "unknown"}/${Date.now()}.${fileExt}`;
      fileSize = file.size;
      mimeType = file.type;
      originalFilename = file.name;

      const fileBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, fileBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("[UPLOAD] Storage error:", uploadError);
        return jsonResponse({ error: "Failed to upload file" }, 500);
      }
      }

      // ── 1. UPDATE compliance_documents ──────────────────────
      // For a checked document this is the first time the recipient's row
      // changes: the draft and its check never touched it.
      const { error: docUpdateError } = await supabase
        .from("compliance_documents")
        .update({
          status: "pending_review",
          storage_path: storagePath,
          file_size_bytes: fileSize,
          mime_type: mimeType,
          import_source: "vendor_secure_link",
          submitted_at: new Date().toISOString(),
          ...(checked
            ? {
              expiry_date: typedExpiration,
              doc_number: typedNumber,
              review_status: "waiting_for_acceptance",
            }
            : {}),
        })
        .eq("id", request.document_id);

      if (docUpdateError) {
        console.error(
          "[UPLOAD] compliance_documents update failed:",
          docUpdateError
        );
        // Cleanup: delete the uploaded file. A checked draft stays where it
        // is so the sender can press Send again.
        if (!checked) await supabase.storage.from("documents").remove([storagePath]);
        return jsonResponse(
          { error: "Failed to update document record" },
          500
        );
      }

      if (sendingCheckId) await markSent(supabase, sendingCheckId);

      // ── 2. UPDATE compliance_document_requests ──────────────
      const { error: reqUpdateError } = await supabase
        .from("compliance_document_requests")
        .update({ fulfilled_at: new Date().toISOString() })
        .eq("id", request.id);

      if (reqUpdateError) {
        console.error(
          "[UPLOAD] Request fulfillment update failed:",
          reqUpdateError
        );
        // Non-fatal: document already updated, operator can see it
      }

      // ── 3. INSERT compliance_document_activity_log ──────────
      try {
        await supabase.from("compliance_document_activity_log").insert({
          organization_id: request.organization_id,
          document_id: request.document_id,
          event_type: "uploaded",
          actor_user_id: null,
          actor_label: vendorName,
          metadata: {
            file_size_bytes: fileSize,
            mime_type: mimeType,
            notes: notes || null,
            upload_method: checked ? "vendor_secure_link_checked" : "vendor_secure_link",
            original_filename: originalFilename,
          },
        });
      } catch {
        console.error("[UPLOAD] Activity log insert failed — non-critical");
      }

      // ── 4. In-app notification ──────────────────────────────
      try {
        await createOrgNotification({
          supabase,
          organizationId: request.organization_id,
          roleFilter: ["compliance_manager", "owner_operator"],
          type: "vendor_document_uploaded",
          category: "documents",
          title: `${vendorName} uploaded ${doc?.type || "a document"}`,
          body: `${vendorName} uploaded ${doc?.type || "a document"} via secure link. Review the document.`,
          actionUrl: `/documents?doc=${request.document_id}`,
          actionLabel: "View Documents",
          priority: "medium",
          severity: "info",
          sourceType: "compliance_document",
          sourceId: request.document_id,
          deduplicate: true,
        });
      } catch {
        console.error("[UPLOAD] In-app notification failed — non-critical");
      }

      // ── 4b + 5. Enqueue email notification (batched) ───────
      try {
        await enqueueUploadNotification(supabase, [{
          organization_id: request.organization_id,
          document_id: request.document_id,
          uploaded_by_type: "vendor",
          uploaded_by_name: vendorName,
          uploaded_by_user_id: null,
        }]);
        triggerDelayedFlush(supabaseUrl, supabaseKey, request.organization_id);
      } catch {
        console.error("[UPLOAD] Email enqueue failed — non-critical");
      }

      // ── 6. Extract service fields (background, vendor_service only) ──
      // Advisory AI read of the fields a sealed service record needs.
      // Runs AFTER the response so the vendor is not blocked on a slow AI call.
      // Commits nothing: writes suggestions to compliance_documents.metadata.
      if (doc?.category === "vendor_service") {
        const extractUrl = `${supabaseUrl}/functions/v1/extract-service-fields`;
        const extractTask = fetch(extractUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            document_id: request.document_id,
            organization_id: request.organization_id,
          }),
        }).catch((e) =>
          console.error("[UPLOAD] extraction trigger failed — non-critical", e)
        );
        try {
          // @ts-ignore EdgeRuntime provided by Supabase edge runtime
          EdgeRuntime.waitUntil(extractTask);
        } catch {
          await extractTask;
        }
      }

      return jsonResponse({
        success: true,
        message:
          "Document uploaded successfully! Your client has been notified.",
        document_id: request.document_id,
      });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("Error in vendor-secure-upload:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
