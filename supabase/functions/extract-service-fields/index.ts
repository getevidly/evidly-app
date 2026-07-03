import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";

/**
 * extract-service-fields — VENDOR-SERVICE-SEAL-01 (Unit 1)
 *
 * Fire-and-forget AI extraction of the fields a SEALED service record needs,
 * read off a vendor-uploaded service document. Called by vendor-secure-upload
 * right after it sets a vendor_service document to pending_review.
 *
 * ADVISORY ONLY. Commits nothing authoritative: no status change, no
 * vendor_service_records row, no seal. It records SUGGESTED values + per-field
 * confidences into compliance_documents.metadata.service_extraction. The gate to
 * auto-seal (>= 0.95 on both dates + cert_number, passed, line-match, non-dupe)
 * or route to a human lives downstream in the accept handler (Unit 2), never here.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { document_id, organization_id } = await req.json();

    if (!document_id || !organization_id) {
      return new Response(
        JSON.stringify({ error: "document_id and organization_id required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // ── 1. Load the compliance_documents row ──────────────────────────────────
    const { data: doc, error: docError } = await supabase
      .from("compliance_documents")
      .select("id, type, category, storage_path, mime_type, metadata")
      .eq("id", document_id)
      .single();

    if (docError || !doc) {
      logger.error("extract-service-fields: doc load failed", { docError });
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // ── 2. Guard: service documents only (defensive; caller already filters) ───
    if (doc.category !== "vendor_service") {
      return new Response(
        JSON.stringify({ skipped: true, reason: "not a vendor_service document" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Merge a service_extraction payload into metadata without clobbering.
    const writeExtraction = async (payload: Record<string, unknown>) => {
      const mergedMeta = {
        ...(doc.metadata ?? {}),
        service_extraction: {
          ...payload,
          schema_version: 1,
          extracted_at: new Date().toISOString(),
        },
      };
      const { error: metaErr } = await supabase
        .from("compliance_documents")
        .update({ metadata: mergedMeta })
        .eq("id", document_id);
      if (metaErr) {
        logger.error("extract-service-fields: metadata write failed", { metaErr });
      }
    };

    if (!anthropicKey) {
      await writeExtraction({ status: "error", error: "ANTHROPIC_API_KEY not set" });
      return new Response(
        JSON.stringify({ success: true, ai_error: true }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // ── 3. Download + media-type guard ────────────────────────────────────────
    let fileBase64 = "";
    const mediaType = doc.mime_type || "application/pdf";

    try {
      if (!doc.storage_path) throw new Error("Document has no storage_path");

      const { data: fileData, error: downloadError } = await supabase.storage
        .from("documents")
        .download(doc.storage_path);

      if (downloadError || !fileData) {
        throw new Error(`Download failed: ${downloadError?.message}`);
      }

      const buffer = await fileData.arrayBuffer();
      fileBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    } catch (dlErr) {
      logger.error("extract-service-fields: file download failed", { dlErr });
      await writeExtraction({ status: "error", error: "File download failed", details: String(dlErr) });
      return new Response(
        JSON.stringify({ success: true, ai_error: true }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

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
      await writeExtraction({ status: "unsupported_type", file_type: mediaType });
      return new Response(
        JSON.stringify({ success: true, unsupported_type: true }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // ── 4. Claude call — SERVICE-oriented schema ──────────────────────────────
    content.push({
      type: "text",
      text: `You are reading a completed vendor SERVICE record for a commercial kitchen fire-safety service. The expected document type is: "${doc.type}". This is proof that a service (e.g., kitchen exhaust hood cleaning, fire suppression inspection) was performed — NOT an insurance certificate.

Read ONLY what is printed on the document. Do not infer, estimate, or fill in a date or number that is not visibly stated. If a value is not clearly legible on the page, return null and a low confidence for it. Never guess a date or certificate number.

Determine each of the following, with a separate confidence (0.0-1.0) for each:
1. service_date — the date the service work was actually PERFORMED (when the technician did the cleaning/inspection). Distinct from any invoice or issue date. YYYY-MM-DD.
2. cert_number — the certificate, invoice, or service-report reference number printed on the document, if any. Many hood-cleaning invoices have NO formal certificate number. If the document genuinely shows no such number, set cert_number to null and cert_number_absent to true. If a number exists but you cannot read it confidently, set cert_number to null, cert_number_absent to false, and a low confidence.
3. cert_date — the date printed ON the certificate/invoice (issue date of the paper), if different from the service date. YYYY-MM-DD.
4. technician_name — the name of the technician who performed the service, if printed.
5. result — the stated outcome if present: "pass", "fail", or "n/a". Only "fail" if the document explicitly indicates the system failed or a deficiency requiring correction.

Also assess:
- document_type_match: does this appear to be the expected service document type?
- detected_type: what the document actually appears to be.
- is_legible: is the document clear enough to read the key fields?
- issues: any problems (illegible, wrong entity, incomplete, expired-looking, mismatched service).

Respond in this EXACT JSON format and nothing else:
{
  "service_date": "YYYY-MM-DD or null",
  "service_date_confidence": 0.0,
  "cert_number": "string or null",
  "cert_number_absent": true,
  "cert_number_confidence": 0.0,
  "cert_date": "YYYY-MM-DD or null",
  "cert_date_confidence": 0.0,
  "technician_name": "string or null",
  "result": "pass | fail | n/a | null",
  "result_confidence": 0.0,
  "document_type_match": true,
  "detected_type": "what the document actually appears to be",
  "is_legible": true,
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

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in AI response");
      }
    } catch (aiErr) {
      logger.error("extract-service-fields: Claude call failed", { aiErr });
      await writeExtraction({ status: "error", error: "AI extraction failed", details: String(aiErr) });
      return new Response(
        JSON.stringify({ success: true, ai_error: true }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // ── 5. Record the extraction (advisory) ───────────────────────────────────
    await writeExtraction({ status: "extracted", ...aiResult });

    return new Response(
      JSON.stringify({ success: true, document_id }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    logger.error("extract-service-fields: unhandled error", { err });
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
