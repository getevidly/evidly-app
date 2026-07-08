import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";

/**
 * extract-lease-responsibility — Lease Intake Phase A
 *
 * Reads a lease document (compliance_documents row with type containing
 * 'lease') and extracts per-safeguard responsibility determinations:
 *   - WHO maintains each protective safeguard system
 *   - WHO carries impairment-notification duty
 *
 * ADVISORY ONLY — NO AUTO-CONFIRM.
 * Every row is staged with confirmed_by = NULL. A human MUST confirm
 * each finding in Phase B. There is NO confidence threshold that
 * bypasses human review. This is a legal-liability determination.
 *
 * Silence/ambiguity IS a finding — if the lease doesn't mention a
 * safeguard, a row is still created with finding_type = 'silent'.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

// Top-level safeguards only. Sub-services (GFX/FPM/RGC) inherit from KEC.
const SAFEGUARD_CODES = ["KEC", "FS", "FA", "SP", "FE"] as const;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { lease_document_id, organization_id, location_id } = await req.json();

    if (!lease_document_id || !organization_id || !location_id) {
      return new Response(
        JSON.stringify({ error: "lease_document_id, organization_id, and location_id required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // ── 1. Load the compliance_documents row ────────────────────────────────
    const { data: doc, error: docError } = await supabase
      .from("compliance_documents")
      .select("id, type, category, storage_path, mime_type, metadata")
      .eq("id", lease_document_id)
      .single();

    if (docError || !doc) {
      logger.error("extract-lease-responsibility: doc load failed", { docError });
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // ── 2. Guard: lease/business documents only ─────────────────────────────
    if (doc.category !== "business") {
      return new Response(
        JSON.stringify({ skipped: true, reason: "not a business-category document" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!anthropicKey) {
      logger.error("extract-lease-responsibility: ANTHROPIC_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    // ── 3. Download lease file ──────────────────────────────────────────────
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
      logger.error("extract-lease-responsibility: file download failed", { dlErr });
      return new Response(
        JSON.stringify({ error: "File download failed", details: String(dlErr) }),
        { status: 500, headers: { "Content-Type": "application/json" } },
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
      return new Response(
        JSON.stringify({ error: "Unsupported file type", file_type: mediaType }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // ── 4. Claude call — LEASE RESPONSIBILITY extraction ────────────────────
    content.push({
      type: "text",
      text: `You are reading a COMMERCIAL LEASE AGREEMENT for a restaurant or commercial kitchen tenant. Your job is to determine, for each of the following protective safeguard systems, WHO is responsible for MAINTAINING the system and WHO carries the IMPAIRMENT-NOTIFICATION duty (i.e., who must notify relevant parties if the system is impaired or out of service).

The safeguard systems to evaluate:
1. KEC — Kitchen Exhaust Cleaning (hood/duct cleaning, grease removal)
2. FS — Fire Suppression System (wet chemical suppression, Ansul, etc.)
3. FA — Fire Alarm (detection and alarm systems)
4. SP — Fire Sprinkler (sprinkler system)
5. FE �� Fire Extinguisher (portable fire extinguishers, NFPA 10)

For EACH safeguard, determine:
- maintenance_party: who is responsible for maintaining/servicing this system ("tenant", "landlord", "shared", or "unspecified")
- notification_party: who must notify if the system is impaired ("tenant", "landlord", "shared", or "unspecified")
- source_reference: the specific lease clause (e.g., "§3.2(b)", "Article 7, Section 3", "Exhibit B, paragraph 4")
- finding_type: categorize the lease language:
  - "allocated" = the lease clearly assigns responsibility to a specific party
  - "silent" = the lease does NOT mention this safeguard system at all
  - "ambiguous" = the lease mentions it but the language is unclear or could be read multiple ways
  - "conflicting" = the lease has contradictory clauses about this system
- confidence: your confidence in this determination (0.0-1.0)
- reasoning: brief explanation of why you made this determination (1-2 sentences)

CRITICAL RULES:
- If the lease is SILENT about a safeguard (doesn't mention it at all), still report it with finding_type "silent" and parties as "unspecified". Silence IS a finding.
- If language is ambiguous, report finding_type "ambiguous" with your best interpretation in the parties but a lower confidence.
- Do NOT guess or infer beyond what the lease text states. If it says "Tenant shall maintain all fire safety equipment" that covers KEC/FS/FA/SP/FE. If it only says "Tenant maintains the hood system" that's only KEC.
- Look for: maintenance/repair clauses, insurance requirement clauses, indemnification clauses, exhibit/addendum schedules, and any fire/safety-specific provisions.
- "Shared" means BOTH parties have explicit responsibilities for that system.

Respond in this EXACT JSON format and nothing else:
{
  "safeguards": {
    "KEC": {
      "maintenance_party": "tenant|landlord|shared|unspecified",
      "notification_party": "tenant|landlord|shared|unspecified",
      "source_reference": "clause reference or null",
      "finding_type": "allocated|silent|ambiguous|conflicting",
      "confidence": 0.0,
      "reasoning": "brief explanation"
    },
    "FS": { ... same shape ... },
    "FA": { ... same shape ... },
    "SP": { ... same shape ... },
    "FE": { ... same shape ... }
  },
  "lease_summary": "One sentence describing the overall responsibility allocation pattern in this lease",
  "extraction_notes": ["any caveats or issues encountered reading the document"]
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
          max_tokens: 2048,
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
      logger.error("extract-lease-responsibility: Claude call failed", { aiErr });
      return new Response(
        JSON.stringify({ error: "AI extraction failed", details: String(aiErr) }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // ── 5. Stage rows — ADVISORY ONLY, NO AUTO-CONFIRM ──────────────────────
    // Each safeguard gets one row via UPSERT. confirmed_by stays NULL.
    // Downstream code MUST NOT treat confirmed_by IS NULL as authoritative.

    const results: Array<{ code: string; status: string; finding_type: string }> = [];

    for (const code of SAFEGUARD_CODES) {
      const finding = aiResult?.safeguards?.[code];

      // Default to 'silent' if AI didn't return data for this code
      const maintenanceParty = finding?.maintenance_party || "unspecified";
      const notificationParty = finding?.notification_party || "unspecified";
      const findingType = finding?.finding_type || "silent";
      const sourceReference = finding?.source_reference || null;
      const confidence = finding?.confidence ?? 0;
      const reasoning = finding?.reasoning || null;

      const aiSuggested = {
        maintenance_party: maintenanceParty,
        notification_party: notificationParty,
        source_reference: sourceReference,
        finding_type: findingType,
        confidence,
        reasoning,
        lease_summary: aiResult?.lease_summary || null,
        extraction_notes: aiResult?.extraction_notes || [],
        extracted_at: new Date().toISOString(),
        schema_version: 1,
      };

      // UPSERT: re-extraction overwrites previous staged row for same safeguard+source
      const { error: upsertErr } = await supabase
        .from("location_safeguard_responsibility")
        .upsert(
          {
            organization_id,
            location_id,
            service_type_code: code,
            source: "lease",
            maintenance_party: maintenanceParty,
            notification_party: notificationParty,
            finding_type: findingType,
            source_reference: sourceReference,
            lease_document_id,
            ai_suggested: aiSuggested,
            // CRITICAL: confirmed_by and confirmed_at are NOT set.
            // These rows are STAGED / ADVISORY ONLY.
            confirmed_by: null,
            confirmed_at: null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "location_id,service_type_code,source",
          },
        );

      if (upsertErr) {
        logger.error("extract-lease-responsibility: upsert failed", { code, upsertErr });
        results.push({ code, status: "error", finding_type: findingType });
      } else {
        results.push({ code, status: "staged", finding_type: findingType });
      }
    }

    // ── 6. Write extraction metadata back to the lease document ──────────────
    const mergedMeta = {
      ...(doc.metadata ?? {}),
      lease_extraction: {
        schema_version: 1,
        extracted_at: new Date().toISOString(),
        safeguard_codes: [...SAFEGUARD_CODES],
        results,
        lease_summary: aiResult?.lease_summary || null,
        extraction_notes: aiResult?.extraction_notes || [],
      },
    };

    await supabase
      .from("compliance_documents")
      .update({ metadata: mergedMeta })
      .eq("id", lease_document_id);

    return new Response(
      JSON.stringify({
        success: true,
        lease_document_id,
        location_id,
        staged_count: results.filter((r) => r.status === "staged").length,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    logger.error("extract-lease-responsibility: unhandled error", { err });
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
