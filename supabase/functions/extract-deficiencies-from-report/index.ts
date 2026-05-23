import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
let corsHeaders = getCorsHeaders(null);

/**
 * extract-deficiencies-from-report — AI Deficiency Extraction
 *
 * Accepts a deficiency_upload_id, fetches the uploaded file from storage,
 * extracts text content, calls Claude to identify deficiencies in the
 * inspection report, and updates the deficiency_uploads row with extracted items.
 *
 * Returns 501 if ANTHROPIC_API_KEY is not set.
 */

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return jsonResponse({ error: "AI service not configured. Add ANTHROPIC_API_KEY to environment." }, 501);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { upload_id } = await req.json();

    if (!upload_id) {
      return jsonResponse({ error: "upload_id is required" }, 400);
    }

    // Fetch the upload record
    const { data: upload, error: uploadErr } = await supabase
      .from("deficiency_uploads")
      .select("*")
      .eq("id", upload_id)
      .single();

    if (uploadErr || !upload) {
      return jsonResponse({ error: "Upload record not found" }, 404);
    }

    if (upload.status !== 'processing') {
      return jsonResponse({ error: "Upload is not in processing state" }, 400);
    }

    // Validate file size
    if (upload.file_size > MAX_FILE_SIZE) {
      await supabase
        .from("deficiency_uploads")
        .update({ status: 'failed', error_message: 'File exceeds 25MB limit' })
        .eq("id", upload_id);
      return jsonResponse({ error: "File exceeds 25MB limit" }, 400);
    }

    // Download the file from storage
    const { data: fileData, error: downloadErr } = await supabase
      .storage
      .from("reports")
      .download(upload.storage_path);

    if (downloadErr || !fileData) {
      console.error("[extract-deficiencies] Download error:", downloadErr);
      await supabase
        .from("deficiency_uploads")
        .update({ status: 'failed', error_message: 'Failed to download file from storage' })
        .eq("id", upload_id);
      return jsonResponse({ error: "Failed to download file" }, 500);
    }

    // Extract text from the file
    let reportText = '';
    try {
      if (upload.file_type === 'application/pdf') {
        // For PDFs, read as text (basic extraction)
        // In production, a PDF parsing library would be used
        const textContent = await fileData.text();
        reportText = textContent;
      } else if (upload.file_type.startsWith('image/')) {
        // For images, we'll send directly to Claude with vision
        reportText = '__IMAGE_FILE__';
      } else {
        // For doc/docx and other text formats
        reportText = await fileData.text();
      }
    } catch (textErr) {
      console.error("[extract-deficiencies] Text extraction error:", textErr);
      await supabase
        .from("deficiency_uploads")
        .update({ status: 'failed', error_message: 'Failed to extract text from file' })
        .eq("id", upload_id);
      return jsonResponse({ error: "Failed to extract text" }, 500);
    }

    if (!reportText || reportText.trim().length === 0) {
      // Empty extraction — set review with empty items
      await supabase
        .from("deficiency_uploads")
        .update({ status: 'review', extracted_items: [] })
        .eq("id", upload_id);
      return jsonResponse({ upload_id, status: 'review', extracted_items: [] });
    }

    // Build Claude messages
    const startTime = Date.now();
    let messages: any[];

    if (reportText === '__IMAGE_FILE__') {
      // Vision mode: send image directly
      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const mediaType = upload.file_type === 'image/png' ? 'image/png'
        : upload.file_type === 'image/heic' ? 'image/webp'
        : 'image/jpeg';

      messages = [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: "Extract deficiencies from this inspection report image.",
          },
        ],
      }];
    } else {
      // Text mode
      const truncatedText = reportText.slice(0, 30000); // Limit context window
      messages = [{
        role: "user",
        content: `Extract deficiencies from this inspection report:\n\n${truncatedText}`,
      }];
    }

    // Call Claude
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4000,
        system: `You are a food safety, fire safety, and facility compliance expert for commercial kitchens. You are analyzing an inspection report to extract individual deficiencies (code violations).

Return ONLY valid JSON with this structure:
{
  "items": [
    {
      "code": "Code citation (e.g. CalCode-114099, NFPA96-T12.4)",
      "title": "Short violation title",
      "description": "Full description of the violation as written in the report",
      "severity": "critical|major|minor|advisory",
      "category": "food_safety|fire_safety|facility_services",
      "timeline_requirement": "immediate|30_days|90_days|next_service",
      "required_action": "Required corrective action from the report",
      "location_description": "Where in the facility this was found",
      "equipment_name": "Equipment involved, if any",
      "confidence": 0.95,
      "confidence_reason": "Why this confidence level",
      "source_quote": "Exact quote from the report",
      "source_page": "Page number or section reference"
    }
  ]
}

Rules:
- Extract ONLY deficiencies that are explicitly stated in the report text. Do not infer or invent violations.
- Each item must have a direct source quote from the report. If you cannot quote the source, do not include the item.
- The code citation must come from the report. If the report does not cite a specific code, use the closest matching CalCode or NFPA section you are certain about, and set confidence below 0.7.
- Confidence scoring: 0.9+ for items with explicit code citations and clear descriptions; 0.7-0.89 for items where you had to infer the code or severity; below 0.7 for items where the violation is ambiguous.
- severity: Use the report's own severity classification if provided. Otherwise: "critical" for imminent health hazards, "major" for significant violations, "minor" for low-risk items, "advisory" for recommendations.
- category: "food_safety" for CalCode/FDA citations, "fire_safety" for NFPA citations, "facility_services" for general building/equipment items.
- timeline_requirement: "immediate" for critical items, "30_days" for major, "90_days" for minor, "next_service" for advisory. Override with the report's stated timeline if provided.
- Do not add items that are observations, recommendations, or notes — only actual cited violations.
- This is compliance guidance only — not legal advice.`,
        messages,
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("[extract-deficiencies] Claude error:", errText);
      await supabase
        .from("deficiency_uploads")
        .update({ status: 'failed', error_message: 'AI service error during extraction' })
        .eq("id", upload_id);
      return jsonResponse({ error: "AI service error" }, 500);
    }

    const anthropicData = await anthropicRes.json();
    const responseText =
      anthropicData.content
        ?.filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("") || "";

    // Parse the JSON response
    let extractedItems: any[] = [];
    try {
      const cleaned = responseText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      extractedItems = parsed.items || [];
    } catch {
      console.error("[extract-deficiencies] Failed to parse:", responseText);
      await supabase
        .from("deficiency_uploads")
        .update({ status: 'failed', error_message: 'Failed to parse AI response' })
        .eq("id", upload_id);
      return jsonResponse({ error: "Failed to parse AI response" }, 500);
    }

    // Validate and normalize extracted items
    const VALID_SEVERITIES = ['critical', 'major', 'minor', 'advisory'];
    const VALID_CATEGORIES = ['food_safety', 'fire_safety', 'facility_services'];
    const VALID_TIMELINES = ['immediate', '30_days', '90_days', 'next_service'];

    const normalizedItems = extractedItems.map((item: any, i: number) => {
      let severity = item.severity;
      if (!VALID_SEVERITIES.includes(severity)) {
        console.warn(`[extract-deficiencies] Invalid severity "${severity}" in item ${i + 1}. Defaulting to "minor".`);
        severity = 'minor';
      }

      let category = item.category;
      if (!VALID_CATEGORIES.includes(category)) {
        console.warn(`[extract-deficiencies] Invalid category "${category}" in item ${i + 1}. Defaulting to "food_safety".`);
        category = 'food_safety';
      }

      let timeline = item.timeline_requirement;
      if (!VALID_TIMELINES.includes(timeline)) {
        console.warn(`[extract-deficiencies] Invalid timeline "${timeline}" in item ${i + 1}. Defaulting to "30_days".`);
        timeline = '30_days';
      }

      const confidence = typeof item.confidence === 'number'
        ? Math.max(0, Math.min(1, item.confidence))
        : 0.5;

      return {
        id: `item-${i + 1}`,
        code: item.code || 'Unknown',
        title: item.title || 'Untitled violation',
        description: item.description || '',
        severity,
        category,
        timeline_requirement: timeline,
        required_action: item.required_action || '',
        location_description: item.location_description || '',
        equipment_name: item.equipment_name || '',
        confidence,
        confidence_reason: item.confidence_reason || '',
        source_quote: item.source_quote || '',
        source_page: item.source_page || '',
        accepted: true,
        edited_at: null,
      };
    });

    const tokensUsed = (anthropicData.usage?.input_tokens || 0) +
      (anthropicData.usage?.output_tokens || 0);

    // Update the upload record
    const { error: updateErr } = await supabase
      .from("deficiency_uploads")
      .update({
        status: 'review',
        extracted_items: normalizedItems,
        ai_model: "claude-sonnet-4-5-20250929",
        ai_prompt_version: "v1",
        tokens_used: tokensUsed,
        extraction_latency_ms: latencyMs,
      })
      .eq("id", upload_id);

    if (updateErr) {
      console.error("[extract-deficiencies] Update error:", updateErr);
      return jsonResponse({ error: "Failed to save extraction results" }, 500);
    }

    // Log the interaction
    await supabase.from("ai_interaction_logs").insert({
      user_id: upload.created_by || "00000000-0000-0000-0000-000000000000",
      location_id: upload.location_id,
      interaction_type: "deficiency_extraction",
      query: `Extract deficiencies from ${upload.file_name}`,
      response: JSON.stringify(normalizedItems).slice(0, 5000),
      tokens_used: tokensUsed,
      model_used: "claude-sonnet-4-5-20250929",
      latency_ms: latencyMs,
    }).then(() => {}).catch((e: any) => console.warn("[extract-deficiencies] Log insert failed:", e));

    return jsonResponse({
      upload_id,
      status: 'review',
      items_count: normalizedItems.length,
      latency_ms: latencyMs,
    });

  } catch (error) {
    console.error("Error in extract-deficiencies-from-report:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
