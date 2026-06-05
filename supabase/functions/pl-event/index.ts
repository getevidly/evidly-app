import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { logEvent } from "../_shared/events.ts";

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { event_type, referral_code, intake_id, metadata } = body;

    if (!event_type) {
      return json({ error: "event_type required" }, 400, headers);
    }

    // Whitelist: only link_opened from this public endpoint
    if (event_type !== "link_opened") {
      return json(
        {
          error:
            "Only link_opened events can be submitted from this endpoint",
        },
        400,
        headers,
      );
    }

    // Rate limit
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateResult = await checkRateLimit({
      key: `pl_event:${clientIp}`,
      maxRequests: 60,
      windowSeconds: 3600,
      supabase,
    });
    if (!rateResult.allowed) {
      return json({ error: "Too many requests" }, 429, headers);
    }

    await logEvent(supabase, {
      event_type,
      intake_id: intake_id || undefined,
      referral_code: referral_code || undefined,
      metadata: metadata || undefined,
    });

    return json({ success: true }, 200, headers);
  } catch (err) {
    return json({ error: "Internal server error" }, 500, headers);
  }
});
