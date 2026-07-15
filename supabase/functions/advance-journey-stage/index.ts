// Staff-gated edge function for stamping journey stages.
// POST { org_id, stage }
// The actor (staff user who clicked) is resolved server-side from the JWT —
// never sent from the client.  For manual stages (demo_completed,
// training_completed) the actor UUID is written to the _by column.
//
// Returns 200 { ok: true } on success (including idempotent no-op for
// auto stages).  Returns 409 if a manual stage was already stamped
// (append-only trigger).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { stampJourneyStage, isValidStage } from "../_shared/journeyStamp.ts";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401, headers);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify the caller's JWT and extract user.id
    const token = authHeader.slice(7);
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Unauthorized" }, 401, headers);
    }

    // Staff gate — same pattern as create-client-invite
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("evidly_staff_role")
      .eq("id", user.id)
      .single();
    if (!profile?.evidly_staff_role) {
      return json({ error: "Forbidden — staff only" }, 403, headers);
    }

    const body = await req.json();
    const { org_id, stage } = body as { org_id?: string; stage?: string };

    if (!org_id || !stage) {
      return json({ error: "org_id and stage required" }, 400, headers);
    }

    if (!isValidStage(stage)) {
      return json({ error: `Invalid stage: ${stage}` }, 400, headers);
    }

    // Pass the staff user's UUID as actorId — stampJourneyStage writes it
    // to the _by column for manual stages.
    await stampJourneyStage(supabase, org_id, stage, user.id);

    return json({ ok: true }, 200, headers);
  } catch (err) {
    // stampJourneyStage throws for manual-stage errors (already stamped,
    // missing actorId, DB constraint).  Surface clearly.
    const message =
      err instanceof Error ? err.message : "Internal server error";
    const status = message.includes("already stamped") ? 409 : 500;
    console.error("[advance-journey-stage]", message);
    return json({ error: message }, status, headers);
  }
});
