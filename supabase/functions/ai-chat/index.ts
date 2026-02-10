import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * ai-chat — Real-time AI compliance advisor
 *
 * Receives user message + location context, queries relevant tables
 * for real-time data, calls Claude API with context + user question,
 * and returns a structured response with optional action buttons.
 *
 * Rate limit: 50 messages/user/day (standard), unlimited (premium)
 */
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

    // Auth
    const authHeader = req.headers.get("Authorization");
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { messages, system, location_id, stream } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return jsonResponse({ error: "messages array required" }, 400);
    }

    // Rate limiting — check daily usage (standard: 50/day)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: todayCount } = await supabase
      .from("ai_interaction_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("interaction_type", "chat")
      .gte("created_at", todayStart.toISOString());

    // TODO: Check user's tier from subscription table
    const dailyLimit = 50;
    if ((todayCount || 0) >= dailyLimit) {
      return jsonResponse(
        {
          error: "Daily AI chat limit reached",
          limit: dailyLimit,
          used: todayCount,
          upgrade_url: "/settings?tab=billing",
        },
        429,
      );
    }

    // Gather real-time compliance context if location_id provided
    let contextData = "";
    if (location_id) {
      const [tempLogs, checklists, documents, vendors] = await Promise.all([
        supabase
          .from("temperature_logs")
          .select("unit_name, temperature, recorded_at, status")
          .eq("location_id", location_id)
          .order("recorded_at", { ascending: false })
          .limit(20),
        supabase
          .from("checklists")
          .select("name, status, completed_at")
          .eq("location_id", location_id)
          .order("completed_at", { ascending: false })
          .limit(10),
        supabase
          .from("documents")
          .select("name, category, expiration_date, status")
          .eq("location_id", location_id)
          .limit(20),
        supabase
          .from("vendor_services")
          .select("company_name, service_type, next_due, status")
          .eq("location_id", location_id)
          .limit(15),
      ]);

      contextData = `\n\nREAL-TIME DATA (last fetched ${new Date().toISOString()}):\n`;
      if (tempLogs.data?.length) {
        contextData += `\nRecent Temp Logs:\n${tempLogs.data.map((t: any) => `  - ${t.unit_name}: ${t.temperature}°F (${t.status}) at ${t.recorded_at}`).join("\n")}`;
      }
      if (checklists.data?.length) {
        contextData += `\nRecent Checklists:\n${checklists.data.map((c: any) => `  - ${c.name}: ${c.status}`).join("\n")}`;
      }
      if (documents.data?.length) {
        contextData += `\nDocuments:\n${documents.data.map((d: any) => `  - ${d.name} (${d.category}): expires ${d.expiration_date || "N/A"} — ${d.status}`).join("\n")}`;
      }
      if (vendors.data?.length) {
        contextData += `\nVendor Services:\n${vendors.data.map((v: any) => `  - ${v.company_name} (${v.service_type}): next due ${v.next_due} — ${v.status}`).join("\n")}`;
      }
    }

    const systemPrompt = (system || "") + contextData;

    const startTime = Date.now();

    // Call Claude API
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
        system: systemPrompt,
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
        stream: !!stream,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("[ai-chat] Claude API error:", errText);
      return jsonResponse({ error: "AI service error" }, 500);
    }

    const latencyMs = Date.now() - startTime;

    // If streaming, pipe through SSE
    if (stream) {
      // Log the interaction (approximate — we don't have full response yet)
      await supabase.from("ai_interaction_logs").insert({
        user_id: user.id,
        location_id: location_id || null,
        interaction_type: "chat",
        query: messages[messages.length - 1]?.content || "",
        response: "[streaming]",
        model_used: "claude-sonnet-4-5-20250929",
        latency_ms: latencyMs,
      });

      return new Response(anthropicRes.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming response
    const data = await anthropicRes.json();
    const responseText =
      data.content
        ?.filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("") || "";

    // Log the interaction
    await supabase.from("ai_interaction_logs").insert({
      user_id: user.id,
      location_id: location_id || null,
      interaction_type: "chat",
      query: messages[messages.length - 1]?.content || "",
      response: responseText.slice(0, 5000),
      tokens_used: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      model_used: "claude-sonnet-4-5-20250929",
      latency_ms: latencyMs,
    });

    return jsonResponse({
      text: responseText,
      usage: data.usage,
      latency_ms: latencyMs,
    });
  } catch (error) {
    console.error("Error in ai-chat:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
