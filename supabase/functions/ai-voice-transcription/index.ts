// ═══════════════════════════════════════════════════════════
// ai-voice-transcription — HOODOPS AI Voice Transcription
//
// Receives an audio file URL, transcribes it with OpenAI
// Whisper, then uses Claude to extract structured inspection
// data (deficiencies, measurements, equipment references,
// customer notes) from the transcription.
//
// Stores the result in the voice_notes table.
// ═══════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
let corsHeaders = getCorsHeaders(null);

const EXTRACTION_PROMPT = `You are an expert kitchen exhaust inspection technician assistant. A field technician has recorded a voice note during a kitchen exhaust inspection or service job. Extract structured data from their transcription.

Return ONLY valid JSON with this structure:

{
  "deficiencies": [
    {
      "description": "<clear description of the deficiency>",
      "location": "<where the deficiency was found, e.g. 'main hood plenum', 'vertical duct run', 'rooftop fan'>",
      "severity": "low" | "medium" | "high" | "critical",
      "category": "grease_buildup" | "structural_damage" | "missing_component" | "code_violation" | "access_issue" | "equipment_malfunction" | "fire_hazard" | "other",
      "nfpa_reference": "<relevant NFPA 96 section if applicable, or null>"
    }
  ],
  "measurements": [
    {
      "type": "<what was measured, e.g. 'grease_depth', 'duct_dimension', 'fan_speed', 'temperature', 'access_panel_size'>",
      "value": "<the measurement value>",
      "unit": "<unit of measurement>",
      "location": "<where the measurement was taken>"
    }
  ],
  "equipment_mentioned": [
    {
      "name": "<equipment name or type>",
      "condition": "good" | "fair" | "poor" | "critical" | "unknown",
      "notes": "<any details mentioned about this equipment>"
    }
  ],
  "customer_notes": [
    "<any notes, requests, or observations the technician mentioned about the customer or site>"
  ],
  "action_items": [
    "<any follow-up actions the technician mentioned>"
  ],
  "summary": "<1-2 sentence summary of the voice note content>"
}

Guidelines:
- Be thorough in extracting all deficiencies, even minor ones
- Convert informal language into professional terminology
- If the technician mentions grease levels, classify as: light, moderate, heavy, excessive
- Map equipment references to standard terminology (e.g., "the big fan" = rooftop exhaust fan)
- Include NFPA 96 references for any code-relevant observations
- If something is unclear, include it with a note rather than omitting it
- Return empty arrays if no items found for a category`;

Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return jsonResponse({ error: "Transcription service not configured (OPENAI_API_KEY)" }, 503);
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return jsonResponse({ error: "AI extraction service not configured (ANTHROPIC_API_KEY)" }, 503);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { audio_url, job_id, context_type, context_id } = body;

    if (!audio_url) {
      return jsonResponse({ error: "audio_url is required" }, 400);
    }
    if (!job_id) {
      return jsonResponse({ error: "job_id is required" }, 400);
    }

    // ── Step 1: Download the audio file ───────────────────────
    let audioBuffer: ArrayBuffer;
    let audioContentType: string;
    let audioFilename: string;

    try {
      const audioRes = await fetch(audio_url);
      if (!audioRes.ok) {
        return jsonResponse({
          error: `Failed to download audio file: ${audioRes.status} ${audioRes.statusText}`,
        }, 400);
      }
      audioContentType = audioRes.headers.get("content-type") || "audio/webm";
      audioBuffer = await audioRes.arrayBuffer();

      // Derive filename extension from content type
      const extMap: Record<string, string> = {
        "audio/webm": "webm",
        "audio/mp4": "m4a",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/ogg": "ogg",
        "audio/flac": "flac",
        "audio/x-m4a": "m4a",
      };
      const ext = extMap[audioContentType.split(";")[0].trim()] || "webm";
      audioFilename = `voice_note.${ext}`;
    } catch (fetchErr) {
      return jsonResponse({
        error: `Failed to fetch audio: ${(fetchErr as Error).message}`,
      }, 400);
    }

    // ── Step 2: Transcribe with OpenAI Whisper ────────────────
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: audioContentType });
    formData.append("file", audioBlob, audioFilename);
    formData.append("model", "whisper-1");
    formData.append("language", "en");
    formData.append("response_format", "verbose_json");
    formData.append(
      "prompt",
      "Kitchen exhaust hood cleaning inspection. NFPA 96 compliance. " +
        "Grease buildup, ductwork, rooftop fan, access panels, fire suppression system, " +
        "baffle filters, plenum, horizontal duct, vertical riser.",
    );

    const whisperRes = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
        },
        body: formData,
      },
    );

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      console.error("[Whisper] API error:", errText);
      return jsonResponse({ error: "Transcription failed" }, 500);
    }

    const whisperData = await whisperRes.json();
    const transcription = whisperData.text || "";
    const whisperConfidence =
      whisperData.segments && whisperData.segments.length > 0
        ? whisperData.segments.reduce(
            (sum: number, seg: any) => sum + (seg.avg_logprob || 0),
            0,
          ) / whisperData.segments.length
        : null;

    // Normalize confidence: avg_logprob is negative, closer to 0 is better
    // Convert to 0-1 scale: e^(avg_logprob) gives a rough probability
    const transcriptionConfidence = whisperConfidence !== null
      ? Math.min(1, Math.max(0, Math.exp(whisperConfidence)))
      : 0.8;

    if (!transcription || transcription.trim().length === 0) {
      // Store empty transcription record
      await supabase.from("voice_notes").insert({
        job_id,
        context_type: context_type || "general",
        context_id: context_id || null,
        audio_url,
        transcription: "",
        confidence: 0,
        extracted_data: null,
        status: "empty",
      });

      return jsonResponse({
        success: true,
        transcription: "",
        confidence: 0,
        extracted_data: null,
        warning: "No speech detected in audio",
      });
    }

    // ── Step 3: Extract structured data with Claude ───────────
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2000,
        system: EXTRACTION_PROMPT,
        messages: [
          {
            role: "user",
            content: `Here is the technician's voice note transcription from a kitchen exhaust inspection job:\n\n"${transcription}"\n\nContext type: ${context_type || "general"}\n\nExtract all structured data from this transcription.`,
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error("[AI] Claude API error:", errText);

      // Still store the transcription even if extraction fails
      await supabase.from("voice_notes").insert({
        job_id,
        context_type: context_type || "general",
        context_id: context_id || null,
        audio_url,
        transcription,
        confidence: transcriptionConfidence,
        extracted_data: null,
        status: "transcribed",
      });

      return jsonResponse({
        success: true,
        transcription,
        confidence: transcriptionConfidence,
        extracted_data: null,
        warning: "Transcription succeeded but data extraction failed",
      });
    }

    const claudeData = await claudeRes.json();
    const responseText = claudeData.content
      ?.filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("") || "";

    let extractedData: any;
    try {
      const cleaned = responseText.replace(/```json|```/g, "").trim();
      extractedData = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[AI] Failed to parse extraction:", responseText);
      extractedData = null;
    }

    // ── Step 4: Store in voice_notes table ────────────────────
    const { data: voiceNote, error: insertError } = await supabase
      .from("voice_notes")
      .insert({
        job_id,
        context_type: context_type || "general",
        context_id: context_id || null,
        audio_url,
        transcription,
        confidence: transcriptionConfidence,
        extracted_data: extractedData,
        duration_seconds: whisperData.duration || null,
        language: whisperData.language || "en",
        status: extractedData ? "processed" : "transcribed",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to insert voice_note:", insertError.message);
    }

    return jsonResponse({
      success: true,
      voice_note_id: voiceNote?.id || null,
      transcription,
      confidence: transcriptionConfidence,
      extracted_data: extractedData
        ? {
            deficiencies: extractedData.deficiencies || [],
            measurements: extractedData.measurements || [],
            equipment_mentioned: extractedData.equipment_mentioned || [],
            customer_notes: extractedData.customer_notes || [],
            action_items: extractedData.action_items || [],
            summary: extractedData.summary || null,
          }
        : null,
      duration_seconds: whisperData.duration || null,
      usage: {
        whisper_duration: whisperData.duration,
        claude_input_tokens: claudeData.usage?.input_tokens,
        claude_output_tokens: claudeData.usage?.output_tokens,
      },
    });
  } catch (error) {
    console.error("Error in ai-voice-transcription:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
