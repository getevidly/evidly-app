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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { tenant_slug, provider, assertion_or_code } = await req.json();

    if (!tenant_slug || !provider || !assertion_or_code) {
      return jsonResponse({ error: "Missing required fields: tenant_slug, provider, assertion_or_code" }, 400);
    }

    // Look up tenant by slug
    const { data: tenant, error: tenantErr } = await supabase
      .from("enterprise_tenants")
      .select("*")
      .eq("slug", tenant_slug)
      .single();

    if (tenantErr || !tenant) {
      return jsonResponse({ error: "Tenant not found" }, 404);
    }

    // Look up SSO config for this tenant
    const { data: ssoConfig, error: ssoErr } = await supabase
      .from("enterprise_sso_configs")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("provider_type", provider)
      .single();

    if (ssoErr || !ssoConfig) {
      return jsonResponse({ error: "SSO config not found for provider: " + provider }, 404);
    }

    // Extract user attributes based on provider type
    let email: string;
    let name: string;
    const role = "member";

    if (provider === "saml") {
      // Stubbed SAML assertion processing - log the attribute mapping
      const attributeMapping = ssoConfig.attribute_mapping || {
        email: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
        name: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
        role: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role",
      };
      console.log("[SSO] SAML attribute mapping for tenant", tenant_slug, ":", JSON.stringify(attributeMapping));
      console.log("[SSO] SAML assertion received, length:", assertion_or_code.length);

      // In production, decode and validate the SAML assertion here
      email = "saml-user@" + tenant_slug + ".example.com";
      name = "SAML User";
    } else if (provider === "oidc") {
      // Stubbed OIDC authorization code exchange
      if (!assertion_or_code || assertion_or_code.length < 4) {
        return jsonResponse({ error: "Invalid authorization code" }, 400);
      }
      console.log("[SSO] OIDC code exchange for tenant", tenant_slug, ", code length:", assertion_or_code.length);

      // In production, exchange the code for tokens at the OIDC token endpoint
      email = "oidc-user@" + tenant_slug + ".example.com";
      name = "OIDC User";
    } else {
      return jsonResponse({ error: "Unsupported provider type: " + provider }, 400);
    }

    // JIT provision: upsert user into enterprise_user_mappings
    const { data: userMapping, error: upsertErr } = await supabase
      .from("enterprise_user_mappings")
      .upsert(
        {
          tenant_id: tenant.id,
          external_email: email,
          display_name: name,
          role: role,
          provider_type: provider,
          is_active: true,
          last_login_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,external_email" }
      )
      .select()
      .single();

    if (upsertErr) {
      console.error("[SSO] User upsert error:", upsertErr);
      return jsonResponse({ error: "Failed to provision user" }, 500);
    }

    // Audit log
    await supabase.from("enterprise_audit_log").insert({
      tenant_id: tenant.id,
      action: "sso_login",
      actor_email: email,
      details: { provider, user_mapping_id: userMapping.id },
    });

    return jsonResponse({
      success: true,
      user: { email, name, role },
      tenant: { slug: tenant.slug, display_name: tenant.display_name },
    });
  } catch (err) {
    console.error("[SSO] Unexpected error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});