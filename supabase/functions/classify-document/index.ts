import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClassificationResult {
  documentType: string;
  documentLabel: string;
  pillar: string;
  vendorName: string | null;
  serviceDate: string | null;
  expiryDate: string | null;
  confidence: number;
  summary: string;
  suggestedFields: Record<string, string>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { fileBase64, fileName, mimeType } = await req.json();
    
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: "API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";

    // Build the system prompt - comprehensive document type taxonomy
    const systemPrompt = `You are a commercial kitchen compliance document classifier for EvidLY.
Your job is to analyze uploaded documents and extract key metadata.

DOCUMENT TYPES YOU KNOW:

Facility Safety (pillar: facility_safety):
- hood_cleaning_cert: Hood/exhaust cleaning certificate
- fire_suppression_report: Fire suppression system inspection (Ansul, Amerex, etc.)
- fire_extinguisher_tag: Fire extinguisher inspection tag or certificate
- ansul_cert: Ansul system certification
- exhaust_fan_service: Exhaust fan service/cleaning record
- building_fire_inspection: Building fire inspection report from fire department

Food Safety (pillar: food_safety):
- health_permit: Health department permit/license
- food_handler_cert: Individual food handler certification card
- food_manager_cert: Food manager certification (ServSafe, etc.)
- haccp_plan: HACCP plan document
- allergen_training: Allergen awareness training record
- pest_control_report: Pest control service report

Vendor (pillar: vendor):
- vendor_coi: Vendor certificate of insurance (COI)
- vendor_licenses: Vendor business license
- service_agreements: Service agreement or contract

Facility (pillar: facility):
- business_license: Business license from city/county
- certificate_occupancy: Certificate of occupancy
- grease_trap_records: Grease trap pumping/service record
- backflow_test: Backflow preventer test report

RESPOND ONLY WITH VALID JSON matching this exact schema:
{
  "documentType": "string (from the list above, or 'unknown')",
  "documentLabel": "string (human-readable name)",
  "pillar": "facility_safety | food_safety | vendor | facility | unknown",
  "vendorName": "string or null",
  "serviceDate": "YYYY-MM-DD or null",
  "expiryDate": "YYYY-MM-DD or null",
  "confidence": 0.0-1.0,
  "summary": "One-line description of the document",
  "suggestedFields": {}
}

Rules:
- If you cannot determine the document type with reasonable confidence (>0.5), set documentType to "unknown".
- Extract dates in YYYY-MM-DD format. If only a month/year is visible, use the 1st of the month.
- For vendor names, use the full business name as printed on the document.
- Do NOT include any text outside the JSON object.`;

    // Build content array for the message
    const content: any[] = [];

    if (isImage) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: mimeType, data: fileBase64 },
      });
      content.push({
        type: "text",
        text: `Analyze this image of a commercial kitchen compliance document. Classify it and extract all metadata. File name: ${fileName}`,
      });
    } else if (isPdf) {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: fileBase64 },
      });
      content.push({
        type: "text",
        text: `Analyze this PDF compliance document. Classify it and extract all metadata. File name: ${fileName}`,
      });
    } else {
      // Filename-only classification
      content.push({
        type: "text",
        text: `Classify this commercial kitchen compliance document based on its filename: "${fileName}". Do your best to determine the type, but set confidence low if uncertain.`,
      });
    }

    // Call Claude API directly (same pattern as ai-document-analysis)
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Claude API error:", errText);
      throw new Error(`Claude API returned ${response.status}`);
    }

    const result = await response.json();
    const text = result.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");

    // Clean and parse JSON response
    const cleaned = text.replace(/```json\s*|```\s*/g, "").trim();
    const classification: ClassificationResult = JSON.parse(cleaned);

    // Clamp confidence to 0-1 range
    classification.confidence = Math.max(0, Math.min(1, classification.confidence));

    return new Response(
      JSON.stringify({ success: true, classification }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Classification error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
        classification: {
          documentType: "unknown",
          documentLabel: "Unknown Document",
          pillar: "unknown",
          vendorName: null,
          serviceDate: null,
          expiryDate: null,
          confidence: 0,
          summary: "Unable to classify automatically",
          suggestedFields: {},
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
