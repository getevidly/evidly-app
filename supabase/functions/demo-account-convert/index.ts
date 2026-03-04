import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * demo-account-convert — Converts a demo account to a live paid account.
 *
 * Auth: Only EvidLY admin users (@getevidly.com).
 *
 * Actions:
 *   1. Sets organizations.is_demo = false, converted_at = now()
 *   2. Updates demo_sessions.status = 'converted'
 *   3. Cleans up demo_generated_data rows (any DB-stored mock data)
 *
 * Conversion = flip a flag, not a migration. Profile data was always in DB.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // ── Auth: admin only ──────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: caller },
  } = await userClient.auth.getUser();

  if (!caller?.email?.endsWith("@getevidly.com")) {
    return jsonResponse({ error: "Unauthorized — admin only" }, 403);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // ── Parse body ────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { organization_id, plan } = body as {
    organization_id?: string;
    plan?: string;
  };

  if (!organization_id) {
    return jsonResponse({ error: "organization_id is required" }, 400);
  }

  const selectedPlan = plan || "founder";

  try {
    // ── 1. Flip the org flag ────────────────────────────
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .update({
        is_demo: false,
        converted_at: new Date().toISOString(),
        demo_plan: selectedPlan,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organization_id)
      .eq("is_demo", true)
      .select("id, name")
      .single();

    if (orgError || !org) {
      return jsonResponse(
        {
          error: orgError?.message || "Organization not found or not a demo account",
        },
        404,
      );
    }

    // ── 2. Update linked demo session ───────────────────
    await supabase
      .from("demo_sessions")
      .update({
        status: "converted",
        converted_at: new Date().toISOString(),
        assigned_plan: selectedPlan,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organization_id)
      .in("status", ["ready", "active"]);

    // ── 3. Clean up any DB-stored demo generated data ───
    // Find demo_sessions linked to this org, then delete tracked rows
    const { data: sessions } = await supabase
      .from("demo_sessions")
      .select("id")
      .eq("organization_id", organization_id);

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map((s: { id: string }) => s.id);
      await supabase
        .from("demo_generated_data")
        .delete()
        .in("demo_session_id", sessionIds);
    }

    return jsonResponse({
      success: true,
      organization_id: org.id,
      organization_name: org.name,
      plan: selectedPlan,
      converted_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[demo-account-convert] Error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      500,
    );
  }
});
