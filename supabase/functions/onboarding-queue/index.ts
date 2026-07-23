// Staff-gated data source for the onboarding queue UI.
// Returns all organizations that have a journey_stages row, joined with
// org name and invite contact info.
//
// POST {} (GET-style, no body required)
// Returns { accounts: [...] }

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401, headers);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify JWT + staff gate
    const token = authHeader.slice(7);
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Unauthorized" }, 401, headers);
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("evidly_staff_role")
      .eq("id", user.id)
      .single();
    if (!profile?.evidly_staff_role) {
      return json({ error: "Forbidden — staff only" }, 403, headers);
    }

    // Fetch all journey rows — service role bypasses RLS
    const { data: journeyRows, error: jErr } = await supabase
      .from("journey_stages")
      .select(
        "org_id, current_stage, " +
        "invited_at, record_viewed_at, demo_scheduled_at, demo_completed_at, " +
        "policies_uploaded_at, policies_read_at, cc_on_file_at, loa_signed_at, " +
        "account_configured_at, training_completed_at, " +
        "demo_completed_by, training_completed_by, " +
        "first_charge_at",
      )
      .order("invited_at", { ascending: false, nullsFirst: false });

    if (jErr) {
      console.error("[onboarding-queue] journey select failed", jErr.message);
      return json({ error: "Failed to load journey data" }, 500, headers);
    }

    if (!journeyRows || journeyRows.length === 0) {
      return json({ accounts: [] }, 200, headers);
    }

    // Collect org IDs for batch lookups
    const orgIds = journeyRows.map((r: any) => r.org_id).filter(Boolean);

    // Batch: org names
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", orgIds);
    const orgMap = new Map((orgs ?? []).map((o: any) => [o.id, o.name]));

    // Batch: latest invite per org (contact info)
    const { data: invites } = await supabase
      .from("evidly_client_invites")
      .select("organization_id, contact_name, email, status")
      .in("organization_id", orgIds)
      .order("created_at", { ascending: false });

    // Dedupe to latest invite per org
    const inviteMap = new Map<string, { contact_name: string; email: string; status: string }>();
    for (const inv of invites ?? []) {
      const oid = (inv as any).organization_id;
      if (!inviteMap.has(oid)) {
        inviteMap.set(oid, {
          contact_name: (inv as any).contact_name,
          email: (inv as any).email,
          status: (inv as any).status,
        });
      }
    }

    // Shape response
    const accounts = journeyRows.map((r: any) => ({
      org_id: r.org_id,
      org_name: orgMap.get(r.org_id) || "Unknown",
      current_stage: r.current_stage,
      invited_at: r.invited_at,
      record_viewed_at: r.record_viewed_at,
      demo_scheduled_at: r.demo_scheduled_at,
      demo_completed_at: r.demo_completed_at,
      policies_uploaded_at: r.policies_uploaded_at,
      policies_read_at: r.policies_read_at,
      cc_on_file_at: r.cc_on_file_at,
      loa_signed_at: r.loa_signed_at,
      account_configured_at: r.account_configured_at,
      training_completed_at: r.training_completed_at,
      demo_completed_by: r.demo_completed_by,
      training_completed_by: r.training_completed_by,
      first_charge_at: r.first_charge_at,
      contact_name: inviteMap.get(r.org_id)?.contact_name || null,
      contact_email: inviteMap.get(r.org_id)?.email || null,
      invite_status: inviteMap.get(r.org_id)?.status || null,
    }));

    return json({ accounts }, 200, headers);
  } catch (err) {
    console.error("[onboarding-queue] Unhandled error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
