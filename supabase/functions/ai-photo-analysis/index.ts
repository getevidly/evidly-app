// ═══════════════════════════════════════════════════════════
// ai-photo-analysis — HOODOPS AI Photo Analysis
//
// Receives a kitchen exhaust photo (base64 or URL) and uses
// Claude Vision to analyze grease levels, equipment condition,
// detected issues, and NFPA compliance references.
//
// Optionally compares against a before_photo_id for
// improvement tracking (pre/post service comparison).
// ═══════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert kitchen exhaust system inspector with deep knowledge of NFPA 96, UL 300, and commercial kitchen fire safety standards. You are analyzing a photo of a kitchen exhaust system component (hood, duct, fan, filter, or related equipment).

Analyze the photo and return a JSON object with the following structure. Return ONLY valid JSON, no markdown fences, no explanation.

{
  "grease_level": "light" | "moderate" | "heavy" | "excessive",
  "grease_percentage": <number 0-100, estimated percentage of visible surface with grease buildup>,
  "cleanliness_score": <number 1-10, where 10 is perfectly clean>,
  "condition_rating": "good" | "fair" | "poor" | "critical",
  "detected_issues": [
    {
      "type": "<issue type, e.g. grease_buildup, corrosion, damage, missing_component, improper_installation, fire_hazard, blockage>",
      "location": "<where in the image, e.g. upper_left, center, along_seams, filter_bank>",
      "severity": "low" | "medium" | "high" | "critical",
      "confidence": <number 0-1>
    }
  ],
  "recommended_actions": [
    "<specific action recommended, e.g. 'Deep clean horizontal duct section to remove heavy grease accumulation'>"
  ],
  "nfpa_references": [
    "<relevant NFPA 96 section references, e.g. 'NFPA 96 11.4 - Cleaning of exhaust system required when grease deposits are apparent'>"
  ],
  "confidence": <number 0-1, overall confidence in the analysis>,
  "summary": "<1-2 sentence summary of findings>"
}

Guidelines:
- grease_level: light (<15% coverage), moderate (15-40%), heavy (40-70%), excessive (>70%)
- cleanliness_score: 10=spotless, 8-9=minor residue, 6-7=visible buildup, 4-5=significant buildup, 1-3=severely contaminated
- condition_rating: good=well maintained, fair=minor issues, poor=multiple issues needing attention, critical=immediate action required
- Always include at least one NFPA reference
- Be specific about locations of detected issues
- If the image is not a kitchen exhaust component, set confidence to 0.1 and note it in summary`;

const COMPARISON_PROMPT = `You are comparing two photos of the same kitchen exhaust system component — a BEFORE photo (first image) and an AFTER photo (second image). Evaluate the improvement from cleaning or service work.

Return ONLY valid JSON with this structure:

{
  "improvement_percent": <number 0-100, overall improvement percentage>,
  "areas_improved": [
    "<description of specific areas that show improvement>"
  ],
  "areas_remaining": [
    "<description of areas that still need attention>"
  ],
  "before_grease_level": "light" | "moderate" | "heavy" | "excessive",
  "after_grease_level": "light" | "moderate" | "heavy" | "excessive",
  "service_quality_rating": "excellent" | "good" | "acceptable" | "poor",
  "summary": "<1-2 sentence comparison summary>"
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return jsonResponse({ error: "AI service not configured" }, 503);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { photo_base64, photo_url, job_id, phase, category, before_photo_id } = body;

    if (!photo_base64 && !photo_url) {
      return jsonResponse({ error: "photo_base64 or photo_url is required" }, 400);
    }
    if (!job_id) {
      return jsonResponse({ error: "job_id is required" }, 400);
    }

    // ── Resolve the main photo to base64 ──────────────────────
    let imageBase64 = photo_base64;
    let mediaType = "image/jpeg";

    if (!imageBase64 && photo_url) {
      const photoRes = await fetch(photo_url);
      if (!photoRes.ok) {
        return jsonResponse({ error: "Failed to fetch photo from URL" }, 400);
      }
      const contentType = photoRes.headers.get("content-type") || "image/jpeg";
      mediaType = contentType.split(";")[0].trim();
      const buffer = await photoRes.arrayBuffer();
      imageBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    }

    // ── If before_photo_id provided, fetch before photo for comparison ──
    let beforeBase64: string | null = null;
    let beforeMediaType = "image/jpeg";

    if (before_photo_id) {
      const { data: beforePhoto, error: bpError } = await supabase
        .from("job_photos")
        .select("photo_url, storage_path")
        .eq("id", before_photo_id)
        .single();

      if (bpError || !beforePhoto) {
        console.warn("Before photo not found:", before_photo_id, bpError?.message);
      } else {
        // Try storage path first, then photo_url
        const beforeUrl = beforePhoto.storage_path
          ? `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/${beforePhoto.storage_path}`
          : beforePhoto.photo_url;

        if (beforeUrl) {
          try {
            const bRes = await fetch(beforeUrl);
            if (bRes.ok) {
              const bCt = bRes.headers.get("content-type") || "image/jpeg";
              beforeMediaType = bCt.split(";")[0].trim();
              const bBuf = await bRes.arrayBuffer();
              beforeBase64 = btoa(String.fromCharCode(...new Uint8Array(bBuf)));
            }
          } catch (fetchErr) {
            console.warn("Failed to fetch before photo:", fetchErr);
          }
        }
      }
    }

    // ── Build Claude API request ──────────────────────────────
    const isComparison = beforeBase64 !== null;
    const messages: any[] = [];

    if (isComparison) {
      // Comparison mode: before + after images
      messages.push({
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: beforeMediaType, data: beforeBase64 },
          },
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: `Phase: ${phase || "unknown"}, Category: ${category || "general"}. Compare these before (first) and after (second) photos.`,
          },
        ],
      });
    } else {
      // Single photo analysis
      messages.push({
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: `Phase: ${phase || "unknown"}, Category: ${category || "general"}. Analyze this kitchen exhaust system photo.`,
          },
        ],
      });
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2000,
        system: isComparison ? COMPARISON_PROMPT : SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("[AI] Claude API error:", errText);
      return jsonResponse({ error: "AI photo analysis failed" }, 500);
    }

    const anthropicData = await anthropicRes.json();
    const responseText = anthropicData.content
      ?.filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("") || "";

    // ── Parse the Claude response ─────────────────────────────
    let analysis: any;
    try {
      const cleaned = responseText.replace(/```json|```/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[AI] Failed to parse response:", responseText);
      return jsonResponse({
        error: "AI analysis returned unexpected format",
        raw_response: responseText,
      }, 422);
    }

    // ── If comparison mode, run single-photo analysis too ─────
    let singleAnalysis = analysis;
    let comparison = null;

    if (isComparison) {
      comparison = analysis;

      // Run a second call for the standalone after-photo analysis
      const singleRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: mediaType, data: imageBase64 },
                },
                {
                  type: "text",
                  text: `Phase: ${phase || "unknown"}, Category: ${category || "general"}. Analyze this kitchen exhaust system photo (this is the after-service photo).`,
                },
              ],
            },
          ],
        }),
      });

      if (singleRes.ok) {
        const singleData = await singleRes.json();
        const singleText = singleData.content
          ?.filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("") || "";
        try {
          singleAnalysis = JSON.parse(singleText.replace(/```json|```/g, "").trim());
        } catch {
          console.warn("[AI] Could not parse single analysis, using comparison data");
          singleAnalysis = {
            grease_level: comparison.after_grease_level || "unknown",
            cleanliness_score: null,
            condition_rating: null,
            confidence: comparison.confidence || 0.5,
          };
        }
      }
    }

    // ── Build the final result ────────────────────────────────
    const result: any = {
      grease_level: singleAnalysis.grease_level,
      grease_percentage: singleAnalysis.grease_percentage,
      cleanliness_score: singleAnalysis.cleanliness_score,
      condition_rating: singleAnalysis.condition_rating,
      detected_issues: singleAnalysis.detected_issues || [],
      recommended_actions: singleAnalysis.recommended_actions || [],
      nfpa_references: singleAnalysis.nfpa_references || [],
      confidence: singleAnalysis.confidence,
      summary: singleAnalysis.summary,
    };

    if (comparison) {
      result.comparison = {
        improvement_percent: comparison.improvement_percent,
        areas_improved: comparison.areas_improved || [],
        areas_remaining: comparison.areas_remaining || [],
        before_grease_level: comparison.before_grease_level,
        after_grease_level: comparison.after_grease_level,
        service_quality_rating: comparison.service_quality_rating,
        summary: comparison.summary,
      };
    }

    // ── Store analysis in job_photos table ─────────────────────
    // Find the most recent photo for this job/phase/category, or create one
    const photoFilter: any = { job_id };
    if (phase) photoFilter.phase = phase;
    if (category) photoFilter.category = category;

    const { data: existingPhotos } = await supabase
      .from("job_photos")
      .select("id")
      .match(photoFilter)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingPhotos && existingPhotos.length > 0) {
      const { error: updateError } = await supabase
        .from("job_photos")
        .update({
          ai_analysis: result,
          ai_analyzed: true,
          ai_analyzed_at: new Date().toISOString(),
        })
        .eq("id", existingPhotos[0].id);

      if (updateError) {
        console.error("Failed to update job_photos:", updateError.message);
      }
    } else {
      // Insert a new photo record with the analysis
      const { error: insertError } = await supabase
        .from("job_photos")
        .insert({
          job_id,
          phase: phase || "inspection",
          category: category || "general",
          photo_url: photo_url || null,
          ai_analysis: result,
          ai_analyzed: true,
          ai_analyzed_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Failed to insert job_photos:", insertError.message);
      }
    }

    return jsonResponse({
      success: true,
      analysis: result,
      usage: {
        input_tokens: anthropicData.usage?.input_tokens,
        output_tokens: anthropicData.usage?.output_tokens,
      },
    });
  } catch (error) {
    console.error("Error in ai-photo-analysis:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
