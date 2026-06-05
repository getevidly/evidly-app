import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

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

    const { intake_id } = await req.json();
    if (!intake_id) {
      return json({ error: "intake_id required" }, 400, headers);
    }

    const { data: auth, error: authErr } = await supabase
      .from("policy_lens_authorizations")
      .select("status")
      .eq("intake_id", intake_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (authErr || !auth) {
      return json({ error: "Authorization not found" }, 404, headers);
    }

    return json({ status: auth.status }, 200, headers);
  } catch (err) {
    return json({ error: "Internal server error" }, 500, headers);
  }
});
