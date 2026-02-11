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

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Service role auth check
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";
  const providedKey = authHeader.replace("Bearer ", "");

  if (providedKey !== serviceRoleKey) {
    return jsonResponse({ error: "Unauthorized - service role key required" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceRoleKey
  );

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  try {
    // GET - Retrieve tenant configuration
    if (req.method === "GET") {
      if (!slug) return jsonResponse({ error: "Query param slug is required" }, 400);

      const { data: tenant, error } = await supabase
        .from("enterprise_tenants")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error || !tenant) return jsonResponse({ error: "Tenant not found" }, 404);
      return jsonResponse({ success: true, tenant });
    }

    // POST - Create new tenant
    if (req.method === "POST") {
      const body = await req.json();
      const { slug: newSlug, display_name, branding, features } = body;

      if (!newSlug || !display_name) {
        return jsonResponse({ error: "slug and display_name are required" }, 400);
      }

      // Insert tenant
      const { data: tenant, error: tenantErr } = await supabase
        .from("enterprise_tenants")
        .insert({
          slug: newSlug,
          display_name,
          branding: branding || {},
          features: features || {},
          is_active: true,
        })
        .select()
        .single();

      if (tenantErr) {
        console.error("[Provision] Tenant insert error:", tenantErr);
        return jsonResponse({ error: "Failed to create tenant - slug may already exist" }, 409);
      }
      // Create default SSO config entry
      await supabase.from("enterprise_sso_configs").insert({
        tenant_id: tenant.id, provider_type: "saml",
        is_enabled: false, config: {}, attribute_mapping: {},
      });
      // Generate a SCIM token for the tenant
      const rawToken = crypto.randomUUID() + "-" + crypto.randomUUID();
      const tokenHash = await hashToken(rawToken);
      await supabase.from("enterprise_scim_tokens").insert({
        tenant_id: tenant.id, token_hash: tokenHash,
        label: "Default provisioning token", is_active: true,
      });
      // Create root hierarchy node
      await supabase.from("enterprise_hierarchy_nodes").insert({
        tenant_id: tenant.id,
        name: display_name,
        node_type: "root",
        parent_id: null,
      });

      // Audit log
      await supabase.from("enterprise_audit_log").insert({
        tenant_id: tenant.id,
        action: "tenant_provisioned",
        actor_email: "system",
        details: { slug: newSlug, display_name },
      });

      return jsonResponse({
        success: true,
        tenant,
        scim_token: rawToken,
      }, 201);
    }
    // PATCH - Update tenant configuration
    if (req.method === "PATCH") {
      if (!slug) return jsonResponse({ error: "Query param slug is required for PATCH" }, 400);

      const body = await req.json();
      const updates: Record<string, unknown> = {};
      if (body.display_name) updates.display_name = body.display_name;
      if (body.branding) updates.branding = body.branding;
      if (body.features) updates.features = body.features;
      if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
      updates.updated_at = new Date().toISOString();

      const { data: updated, error } = await supabase
        .from("enterprise_tenants")
        .update(updates)
        .eq("slug", slug)
        .select()
        .single();

      if (error || !updated) return jsonResponse({ error: "Tenant not found or update failed" }, 404);

      await supabase.from("enterprise_audit_log").insert({
        tenant_id: updated.id,
        action: "tenant_updated",
        actor_email: "system",
        details: { slug, updates },
      });

      return jsonResponse({ success: true, tenant: updated });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("[Provision] Unexpected error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});