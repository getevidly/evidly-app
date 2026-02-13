import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Accepts an uploaded document (PDF or image) and uses Claude AI to extract:
// - Document type (hood cleaning cert, COI, health permit, etc.)
// - Vendor name
// - Issue date
// - Expiration date
// - License/cert numbers
// - Key compliance details

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return jsonResponse({ error: "AI service not configured" }, 503);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const documentId = formData.get("document_id") as string;

    if (!file) {
      return jsonResponse({ error: "No file provided" }, 400);
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    // Determine media type
    let mediaType = "application/pdf";
    if (file.type.startsWith("image/")) {
      mediaType = file.type;
    }

    // Call Claude API for document analysis
    const analysisPrompt = `You are a compliance document analyzer for commercial kitchens. Analyze this document and extract the following information in JSON format:

{
  "document_type": "The type of document (e.g., Hood Cleaning Certificate, Certificate of Insurance, Health Permit, Fire Suppression Report, Food Handler Certificate, Business License, Pest Control Report, IKECA Certification, etc.)",
  "vendor_name": "Company/vendor name on the document",
  "contact_name": "Individual contact name if visible",
  "issue_date": "Date issued (YYYY-MM-DD format or null)",
  "expiration_date": "Expiration date (YYYY-MM-DD format or null)",
  "license_number": "Any license, certificate, or policy number",
  "coverage_amount": "Insurance coverage amount if applicable",
  "location_address": "Service location address if visible",
  "service_date": "Date of most recent service if applicable",
  "next_service_date": "Next scheduled service date if applicable",
  "key_findings": ["Array of important compliance details or findings"],
  "compliance_status": "compliant, non_compliant, or needs_review",
  "confidence": 0.95
}

Return ONLY valid JSON, no markdown, no explanation. If a field is not found, use null. If you cannot confidently determine a value, use null rather than guessing. Set confidence to a lower value (0.5-0.7) when extraction is uncertain.`;

    const content: any[] = [
      {
        type: mediaType === "application/pdf" ? "document" : "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: base64,
        },
      },
      {
        type: "text",
        text: analysisPrompt,
      },
    ];

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content,
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("[AI] Claude API error:", errText);
      return jsonResponse({ error: "AI analysis failed" }, 500);
    }

    const anthropicData = await anthropicRes.json();
    const responseText = anthropicData.content
      ?.filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("") || "";

    // Parse the JSON response
    let extracted;
    try {
      const cleaned = responseText.replace(/```json|```/g, "").trim();
      extracted = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[AI] Failed to parse response:", responseText);
      return jsonResponse({
        error: "AI analysis returned unexpected format",
        raw_response: responseText,
      }, 422);
    }

    // If we have a document_id, update the document record with extracted data
    if (documentId) {
      const updateFields: Record<string, any> = {};

      if (extracted.document_type) updateFields.category = extracted.document_type;
      if (extracted.expiration_date) updateFields.expiration_date = extracted.expiration_date;
      if (extracted.key_findings) updateFields.tags = extracted.key_findings.slice(0, 5);

      if (Object.keys(updateFields).length > 0) {
        await supabase
          .from("documents")
          .update(updateFields)
          .eq("id", documentId);
      }
    }

    return jsonResponse({
      success: true,
      extracted,
      usage: {
        input_tokens: anthropicData.usage?.input_tokens,
        output_tokens: anthropicData.usage?.output_tokens,
      },
    });
  } catch (error) {
    console.error("Error in ai-document-analysis:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
