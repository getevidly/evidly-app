import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * landing-chat — Lightweight AI compliance chat for landing page visitors
 *
 * No authentication required. Rate limited by IP (10 messages/hour).
 * Uses Claude Sonnet for cost-efficient, high-volume public endpoint.
 * Responses are 2-3 sentences max with soft CTAs to try demo or sign up.
 */

// In-memory rate limit store (resets when function cold-starts)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(ip);

  if (!limit || now > limit.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 3600000 }); // 1 hour window
    return true;
  }

  if (limit.count >= 10) return false;

  limit.count++;
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return jsonResponse(
        {
          reply:
            "I'm not available right now, but you can try the interactive demo to explore EvidLY's compliance tools!",
          cta: "try_demo",
        },
        503,
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return jsonResponse(
        {
          reply:
            "I've answered a lot of questions this session! Sign up for unlimited access to EvidLY's AI compliance assistant.",
          cta: "sign_up",
        },
        429,
      );
    }

    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return jsonResponse({ reply: "Please ask a question!", cta: "try_demo" }, 400);
    }

    const systemPrompt = `You are EvidLY's compliance assistant on the landing page.
You answer questions about commercial kitchen compliance: food safety (FDA Food Code, CalCode, state codes),
fire safety (NFPA 96, hood cleaning, fire suppression), health inspections, HACCP, and vendor management.

Rules:
- Keep responses to 2-3 sentences MAX. Be concise and helpful.
- After answering, naturally suggest trying the EvidLY demo or signing up.
- If the question isn't about kitchen compliance, redirect: "I specialize in commercial kitchen compliance. Want to ask about food safety, fire codes, or health inspections?"
- Never make up regulations. If unsure, say "I'd recommend checking with your local health department" and suggest EvidLY's AI Advisor for more detail.
- Be warm and professional. You're showing off EvidLY's AI capabilities.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!response.ok) {
      console.error("[landing-chat] Claude API error:", await response.text());
      return jsonResponse(
        {
          reply:
            "I'm having trouble connecting right now. Try the demo to explore EvidLY's full compliance tools!",
          cta: "try_demo",
        },
        500,
      );
    }

    const data = await response.json();
    const reply =
      data.content
        ?.filter((block: { type: string }) => block.type === "text")
        .map((block: { text: string }) => block.text)
        .join("") ||
      "I'd be happy to help with compliance questions. Try the demo for the full experience!";

    // Determine CTA based on content
    const lowerReply = reply.toLowerCase();
    const cta = lowerReply.includes("sign up") || lowerReply.includes("sign-up")
      ? "sign_up"
      : lowerReply.includes("book") || lowerReply.includes("walkthrough")
        ? "book_call"
        : "try_demo";

    return jsonResponse({ reply, cta });
  } catch (error) {
    console.error("[landing-chat] Error:", error);
    return jsonResponse(
      {
        reply:
          "I'm having trouble right now. Try the interactive demo to explore EvidLY's compliance tools!",
        cta: "try_demo",
      },
      500,
    );
  }
});

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
