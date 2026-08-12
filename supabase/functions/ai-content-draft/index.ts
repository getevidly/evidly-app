import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
let corsHeaders = getCorsHeaders(null);

/**
 * ai-content-draft — Generates a marketing post from a content_schedule brief.
 *
 * Request: { rowId: string }
 * Reads the row's `brief` column, calls Claude to draft title + body + cta,
 * writes the draft back to the row, and flips copy_state to Draft.
 */
Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get('origin'));
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

    const { rowId } = await req.json();

    if (!rowId) {
      return jsonResponse({ error: "rowId is required" }, 400);
    }

    // Read the content_schedule row
    const { data: row, error: readErr } = await supabase
      .from("content_schedule")
      .select("*")
      .eq("id", rowId)
      .single();

    if (readErr || !row) {
      return jsonResponse({ error: "Row not found" }, 404);
    }

    if (!row.brief || row.brief.trim() === "") {
      return jsonResponse(
        { error: "This row has no brief — nothing to draft from. Populate the brief first." },
        400,
      );
    }

    // Build user message
    const userMessage =
      `${row.brief}\n\nChannel: ${row.channel_label || "unknown"}. Brand: ${row.brand || "EvidLY"}. Post type: ${row.post_type || "unknown"}.`;

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
        max_tokens: 2000,
        system: `You draft one piece of marketing content for EvidLY from a brief. You will receive the post's brief (a THEME, a company ANGLE, a WHY NOW, a FORMAT spec, and LANGUAGE rules) plus its channel and brand. Draft the post to the brief exactly.

Rules that override everything:
1. Follow the brief's FORMAT precisely — the channel, the word count, the structure, and the number of CTAs it names.
2. Follow the brief's LANGUAGE rules precisely. On top of them, always: use "lapse", not "failure" (except an actual mechanical failure); never use the words prevent, monitor, track, surface, surfaces, jurisdiction, operators, or audit; never call EvidLY a platform or software.
3. NEVER fabricate a regulatory citation or a legal reference. Do not invent code-section numbers (CalCode §, NFPA, CFC), standard editions, statistics, or court-case names. Wherever the post makes a regulatory claim that needs a citation, write the claim in plain language and mark it inline with [verify] — e.g. "the daily temperature logs [verify: CalCode section]". For any legal reference write [verify: published case caption]. Flagging [verify] is always correct; guessing a citation is never correct.
4. Write in EvidLY's voice: plain and direct, addressed to the reader's situation rather than the company's features. Open on the reader; close on a why.

Output STRICT JSON and nothing else — no markdown, no preamble, no code fences:
{"title": "<the real post title or email subject derived from the brief, NOT the theme name>", "body": "<the drafted post>", "cta": "<the call to action, or an empty string if the brief names none>"}`,
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("[ai-content-draft] Claude error:", errText);
      return jsonResponse({ error: "AI service error" }, 500);
    }

    const anthropicData = await anthropicRes.json();
    const responseText =
      anthropicData.content
        ?.filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("") || "";

    // Parse JSON from model reply
    let draft: { title: string; body: string; cta: string };
    try {
      const cleaned = responseText.replace(/```json|```/g, "").trim();
      draft = JSON.parse(cleaned);
      if (typeof draft.title !== "string" || typeof draft.body !== "string" || typeof draft.cta !== "string") {
        throw new Error("Missing required keys");
      }
    } catch {
      console.error("[ai-content-draft] Failed to parse:", responseText);
      return jsonResponse(
        { error: "Model returned unparseable response", raw: responseText },
        502,
      );
    }

    // Update the row with the draft
    const updatedNotes = (row.notes || "")
      .replace("[copy_state: To write]", "[copy_state: Draft]");

    const { error: updateErr } = await supabase
      .from("content_schedule")
      .update({
        title: draft.title,
        body: draft.body,
        cta: draft.cta,
        status: "drafted",
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rowId);

    if (updateErr) {
      console.error("[ai-content-draft] Update error:", updateErr);
      return jsonResponse({ error: "Failed to save draft" }, 500);
    }

    return jsonResponse({ title: draft.title, body: draft.body, cta: draft.cta });
  } catch (error) {
    console.error("Error in ai-content-draft:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
