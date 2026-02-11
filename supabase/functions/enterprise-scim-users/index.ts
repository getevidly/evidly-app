import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-API-Key",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const SCIM_USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";
const SCIM_LIST_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:ListResponse";

function toScimUser(user: Record<string, unknown>) {
  return {
    schemas: [SCIM_USER_SCHEMA],
    id: user.id,
    userName: user.external_email,
    name: { formatted: user.display_name },
    displayName: user.display_name,
    emails: [{ value: user.external_email, primary: true }],
    active: user.is_active ?? true,
    role: user.role,
    meta: {
      resourceType: "User",
      created: user.created_at,
      lastModified: user.updated_at || user.created_at,
    },
  };
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Bearer token authentication
    const authHeader = req.headers.get("Authorization") || "";
    const bearerToken = authHeader.replace("Bearer ", "");
    if (!bearerToken) {
      return jsonResponse({ error: "Missing SCIM bearer token" }, 401);
    }

    const tokenHash = await hashToken(bearerToken);

    const { data: scimToken, error: tokenErr } = await supabase
      .from("enterprise_scim_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .eq("is_active", true)
      .single();

    if (tokenErr || !scimToken) {
      return jsonResponse({ error: "Invalid or inactive SCIM token" }, 401);
    }

    const tenantId = scimToken.tenant_id;
    const url = new URL(req.url);
    const userId = url.searchParams.get("id");

    // GET - List users or get single user
    if (req.method === "GET") {
      const query = supabase
        .from("enterprise_user_mappings")
        .select("*")
        .eq("tenant_id", tenantId);

      if (userId) {
        const { data: user, error } = await query.eq("id", userId).single();
        if (error || !user) return jsonResponse({ error: "User not found" }, 404);
        return jsonResponse(toScimUser(user));
      }

      const { data: users, error } = await query.order("created_at", { ascending: true });
      if (error) return jsonResponse({ error: "Failed to list users" }, 500);

      return jsonResponse({
        schemas: [SCIM_LIST_SCHEMA],
        totalResults: users?.length || 0,
        startIndex: 1,
        itemsPerPage: users?.length || 0,
        Resources: (users || []).map(toScimUser),
      });
    }
    // POST - Create user
    if (req.method === "POST") {
      const body = await req.json();
      const email = body.userName || body.emails?.[0]?.value;
      const displayName = body.displayName || body.name?.formatted || email;
      const role = body.role || "member";

      if (!email) return jsonResponse({ error: "userName or emails[0].value is required" }, 400);

      const { data: newUser, error } = await supabase
        .from("enterprise_user_mappings")
        .insert({
          tenant_id: tenantId,
          external_email: email,
          display_name: displayName,
          role,
          provider_type: "scim",
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error("[SCIM] Create user error:", error);
        return jsonResponse({ error: "Failed to create user" }, 500);
      }

      await supabase.from("enterprise_audit_log").insert({
        tenant_id: tenantId,
        action: "scim_user_created",
        actor_email: "scim-integration",
        details: { user_id: newUser.id, email },
      });

      return jsonResponse(toScimUser(newUser), 201);
    }
    // PATCH - Update user
    if (req.method === "PATCH") {
      if (!userId) return jsonResponse({ error: "Query param id is required for PATCH" }, 400);

      const body = await req.json();
      const updates: Record<string, unknown> = {};
      if (body.displayName || body.name?.formatted) updates.display_name = body.displayName || body.name.formatted;
      if (body.userName) updates.external_email = body.userName;
      if (body.role) updates.role = body.role;
      if (typeof body.active === "boolean") updates.is_active = body.active;
      updates.updated_at = new Date().toISOString();

      const { data: updated, error } = await supabase
        .from("enterprise_user_mappings")
        .update(updates)
        .eq("id", userId)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error || !updated) return jsonResponse({ error: "User not found or update failed" }, 404);

      await supabase.from("enterprise_audit_log").insert({
        tenant_id: tenantId,
        action: "scim_user_updated",
        actor_email: "scim-integration",
        details: { user_id: userId, updates },
      });

      return jsonResponse(toScimUser(updated));
    }
    // DELETE - Soft delete (deactivate)
    if (req.method === "DELETE") {
      if (!userId) return jsonResponse({ error: "Query param id is required for DELETE" }, 400);

      const { data: deactivated, error } = await supabase
        .from("enterprise_user_mappings")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error || !deactivated) return jsonResponse({ error: "User not found" }, 404);

      await supabase.from("enterprise_audit_log").insert({
        tenant_id: tenantId,
        action: "scim_user_deactivated",
        actor_email: "scim-integration",
        details: { user_id: userId },
      });

      return new Response(null, { status: 204, headers: corsHeaders });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("[SCIM] Unexpected error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});