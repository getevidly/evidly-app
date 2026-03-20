import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createNotification } from "../_shared/notify.ts";
import { logger } from "../_shared/logger.ts";

/**
 * validate-vendor-document — VENDOR-COMPLIANCE-01
 *
 * Fire-and-forget AI validation of uploaded vendor documents.
 * Called by vendor-secure-upload after a vendor uploads a file.
 *
 * Flow:
 * 1. Fetch vendor_document record (file_url, document_type, vendor_id)
 * 2. Download file from Supabase Storage
 * 3. Call Claude API with base64-encoded document for analysis
 * 4. Insert vendor_document_submissions row with AI results
 * 5. Update vendor_documents AI columns
 * 6. Auto-approve if high confidence, else notify client to review
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const AUTO_APPROVE_THRESHOLD = 0.90;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { vendor_document_id, organization_id } = await req.json();

    if (!vendor_document_id || !organization_id) {
      return new Response(
        JSON.stringify({ error: "vendor_document_id and organization_id required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch vendor document record
    const { data: vendorDoc, error: docError } = await supabase
      .from("vendor_documents")
      .select("*, vendors(id, name, contact_name)")
      .eq("id", vendor_document_id)
      .single();

    if (docError || !vendorDoc) {
      logger.error("vendor_document not found", { vendor_document_id, docError });
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Create initial submission record
    const { data: submission, error: subError } = await supabase
      .from("vendor_document_submissions")
      .insert({
        organization_id,
        vendor_document_id,
        vendor_id: vendorDoc.vendor_id,
        ai_validated: false,
        ai_validation_status: "pending",
      })
      .select()
      .single();

    if (subError) {
      logger.error("Failed to create submission", { subError });
      return new Response(
        JSON.stringify({ error: "Failed to create submission" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. If no Anthropic key, skip AI validation — just leave as pending
    if (!anthropicKey) {
      logger.warn("ANTHROPIC_API_KEY not set — skipping AI validation");
      await notifyClientForReview(supabase, vendorDoc, submission, organization_id);
      return new Response(
        JSON.stringify({ success: true, submission_id: submission.id, ai_skipped: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Download file from storage
    let fileBase64 = "";
    let mediaType = "application/pdf";

    try {
      // Extract storage path from public URL
      const fileUrl = vendorDoc.file_url;
      const storagePrefix = "/storage/v1/object/public/documents/";
      const pathIdx = fileUrl.indexOf(storagePrefix);
      let storagePath = "";

      if (pathIdx !== -1) {
        storagePath = decodeURIComponent(fileUrl.substring(pathIdx + storagePrefix.length));
      } else {
        // Fallback: try to extract path after /documents/
        const match = fileUrl.match(/\/documents\/(.+)$/);
        storagePath = match ? decodeURIComponent(match[1]) : "";
      }

      if (!storagePath) {
        throw new Error("Could not extract storage path from file_url");
      }

      const { data: fileData, error: downloadError } = await supabase.storage
        .from("documents")
        .download(storagePath);

      if (downloadError || !fileData) {
        throw new Error(`Download failed: ${downloadError?.message}`);
      }

      const buffer = await fileData.arrayBuffer();
      fileBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      mediaType = vendorDoc.file_type || "application/pdf";
    } catch (dlErr) {
      logger.error("File download failed", { dlErr });
      // Mark validation as error
      await supabase
        .from("vendor_document_submissions")
        .update({
          ai_validated: true,
          ai_validation_status: "error",
          ai_validation_result: { error: "File download failed", details: String(dlErr) },
          ai_validated_at: new Date().toISOString(),
        })
        .eq("id", submission.id);

      await notifyClientForReview(supabase, vendorDoc, submission, organization_id);
      return new Response(
        JSON.stringify({ success: true, submission_id: submission.id, ai_error: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Call Claude API for document analysis
    const isImage = ["image/jpeg", "image/png", "image/heic", "image/heif"].includes(mediaType);
    const isPdf = mediaType === "application/pdf";

    const content: any[] = [];
    if (isImage) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: fileBase64 },
      });
    } else if (isPdf) {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: fileBase64 },
      });
    } else {
      // Word docs etc — can't be analyzed visually, skip AI
      await supabase
        .from("vendor_document_submissions")
        .update({
          ai_validated: true,
          ai_validation_status: "error",
          ai_validation_result: { error: "Unsupported file type for AI analysis", file_type: mediaType },
          ai_validated_at: new Date().toISOString(),
        })
        .eq("id", submission.id);

      await notifyClientForReview(supabase, vendorDoc, submission, organization_id);
      return new Response(
        JSON.stringify({ success: true, submission_id: submission.id, unsupported_type: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    content.push({
      type: "text",
      text: `Analyze this vendor document. The expected document type is: "${vendorDoc.document_type}".

Please determine:
1. Does the document match the expected type? (e.g., if we expected "Certificate of Insurance" does this actually appear to be a COI?)
2. Is there an expiration date visible? If so, what is it?
3. Is the document complete and legible?
4. Are there any red flags (expired, wrong entity, missing signatures, etc.)?

Respond in this exact JSON format:
{
  "document_type_match": true/false,
  "detected_type": "what the document actually appears to be",
  "expiry_detected": true/false,
  "expiry_date": "YYYY-MM-DD or null",
  "is_complete": true/false,
  "is_legible": true/false,
  "confidence": 0.0 to 1.0,
  "issues": ["list of any problems found"],
  "summary": "brief one-sentence summary"
}`,
    });

    let aiResult: any = null;
    try {
      const aiResponse = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 1024,
          messages: [{ role: "user", content }],
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        throw new Error(`Claude API error ${aiResponse.status}: ${errText}`);
      }

      const aiData = await aiResponse.json();
      const textBlock = aiData.content?.find((b: any) => b.type === "text");
      const rawText = textBlock?.text || "";

      // Extract JSON from response (may be wrapped in markdown code block)
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in AI response");
      }
    } catch (aiErr) {
      logger.error("Claude API call failed", { aiErr });
      await supabase
        .from("vendor_document_submissions")
        .update({
          ai_validated: true,
          ai_validation_status: "error",
          ai_validation_result: { error: "AI analysis failed", details: String(aiErr) },
          ai_validated_at: new Date().toISOString(),
        })
        .eq("id", submission.id);

      await notifyClientForReview(supabase, vendorDoc, submission, organization_id);
      return new Response(
        JSON.stringify({ success: true, submission_id: submission.id, ai_error: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Determine validation status
    const confidence = aiResult.confidence ?? 0;
    const hasIssues = (aiResult.issues?.length ?? 0) > 0;
    const typeMatch = aiResult.document_type_match ?? false;
    const passed = typeMatch && confidence >= AUTO_APPROVE_THRESHOLD && !hasIssues;
    const validationStatus = passed ? "passed" : "failed";

    // 7. Update submission with AI results
    await supabase
      .from("vendor_document_submissions")
      .update({
        ai_validated: true,
        ai_validation_status: validationStatus,
        ai_validation_result: aiResult,
        ai_validated_at: new Date().toISOString(),
        auto_approved: passed,
        review_status: passed ? "approved" : "pending",
        reviewed_at: passed ? new Date().toISOString() : null,
      })
      .eq("id", submission.id);

    // 8. Update vendor_documents AI columns
    await supabase
      .from("vendor_documents")
      .update({
        ai_classified: true,
        ai_confidence: confidence,
        ai_document_label: aiResult.detected_type || aiResult.summary || null,
        ...(passed
          ? { status: "accepted", reviewed_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", vendor_document_id);

    // 9. If auto-approved, update expiry date from AI if detected
    if (passed && aiResult.expiry_detected && aiResult.expiry_date) {
      await supabase
        .from("vendor_documents")
        .update({ expiration_date: aiResult.expiry_date })
        .eq("id", vendor_document_id);
    }

    // 10. If not auto-approved, notify client to review
    if (!passed) {
      await notifyClientForReview(supabase, vendorDoc, submission, organization_id);
    }

    logger.info("AI validation complete", {
      submission_id: submission.id,
      status: validationStatus,
      confidence,
      auto_approved: passed,
    });

    return new Response(
      JSON.stringify({
        success: true,
        submission_id: submission.id,
        validation_status: validationStatus,
        confidence,
        auto_approved: passed,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error("validate-vendor-document error", { error });
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ── Helper: notify client for manual review ─────────────────

async function notifyClientForReview(
  supabase: any,
  vendorDoc: any,
  submission: any,
  organizationId: string,
) {
  try {
    // Find compliance_manager + owner_operator users in org
    const { data: recipients } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("organization_id", organizationId)
      .in("role", ["compliance_manager", "owner_operator"]);

    const vendorName = vendorDoc.vendors?.name || "Vendor";
    const docType = vendorDoc.document_type || "Document";

    for (const recipient of (recipients || [])) {
      await createNotification({
        supabase,
        organizationId,
        userId: recipient.id,
        type: "vendor_document_review",
        category: "documents",
        title: `Review Required: ${docType} from ${vendorName}`,
        body: `A new ${docType} has been uploaded by ${vendorName} and requires your review.`,
        actionUrl: "/vendors/review",
        actionLabel: "Review Document",
        priority: "medium",
        severity: "advisory",
        sourceType: "vendor_document",
        sourceId: `${submission.id}_review`,
        deduplicate: true,
      });
    }

    // Update notification_sent_at on submission
    await supabase
      .from("vendor_document_submissions")
      .update({ notification_sent_at: new Date().toISOString() })
      .eq("id", submission.id);
  } catch {
    // Silent fail — notification is non-critical
  }
}
