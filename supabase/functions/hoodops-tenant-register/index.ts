// Identity bridge, Build 1 — tenant registration.
//
// HoodOps calls this once when a tenant enables the EvidLY integration,
// and again whenever that tenant's signing secret is rotated. It stores
// the per-tenant secret that a later build will use to verify cert seals
// per tenant instead of via one shared secret.
//
// Auth here is the PLATFORM registration secret, not a tenant secret: it
// authenticates HoodOps-the-platform opening the channel. The per-tenant
// secret is the payload, never the credential.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/** Constant-time string comparison to prevent timing side-channels. */
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.byteLength !== bufB.byteLength) return false;
  let result = 0;
  for (let i = 0; i < bufA.byteLength; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

/** Compute HMAC-SHA256 and return lowercase hex digest. */
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  const jsonResp = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResp({ error: "Method not allowed" }, 405);
  }

  // Fail CLOSED: an unset secret must never degrade to an open endpoint.
  const platformSecret = Deno.env.get("HOODOPS_PLATFORM_REGISTRATION_SECRET");
  if (!platformSecret) {
    console.error(
      "[hoodops-tenant-register] HOODOPS_PLATFORM_REGISTRATION_SECRET is not configured — rejecting request",
    );
    return jsonResp({ error: "Registration secret not configured" }, 500);
  }

  // Read raw body BEFORE parsing — the HMAC covers the exact bytes HoodOps signed.
  const rawBody = await req.text();

  const signatureHeader = req.headers.get("x-hoodops-signature");
  if (!signatureHeader) {
    return jsonResp({ error: "Unauthorized" }, 401);
  }

  const expectedSignature = await hmacSha256Hex(platformSecret, rawBody);
  if (!timingSafeEqual(expectedSignature, signatureHeader)) {
    return jsonResp({ error: "Unauthorized" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonResp({ error: "Invalid JSON body" }, 400);
  }

  const tenantSlug = typeof body.tenant_slug === "string" ? body.tenant_slug.trim() : "";
  const tenantName = typeof body.tenant_name === "string" ? body.tenant_name.trim() : "";
  const signingSecret = typeof body.signing_secret === "string" ? body.signing_secret : "";

  if (!tenantSlug || !tenantName || !signingSecret) {
    return jsonResp({
      error: "Missing required fields: tenant_slug, tenant_name, signing_secret",
    }, 400);
  }

  // service_role: hoodops_tenants is service-role-only by RLS, and the
  // anon client would read and write nothing.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Distinguish register from rotate BEFORE writing, so the response is
  // accurate. The upsert itself is what makes the call idempotent; this
  // lookup only labels the outcome.
  const { data: existing, error: lookupErr } = await supabase
    .from("hoodops_tenants")
    .select("id")
    .eq("tenant_slug", tenantSlug)
    .maybeSingle();

  if (lookupErr) {
    console.error("[hoodops-tenant-register] Lookup failed:", lookupErr.message);
    return jsonResp({ error: "Registration failed", detail: lookupErr.message }, 500);
  }

  const isRotation = Boolean(existing);

  // A repeat call for a known slug is a rotation, not an error: replace the
  // secret, refresh the name, stamp rotated_at, and re-activate.
  const { data: row, error: upsertErr } = await supabase
    .from("hoodops_tenants")
    .upsert({
      tenant_slug: tenantSlug,
      tenant_name: tenantName,
      signing_secret: signingSecret,
      active: true,
      ...(isRotation ? { rotated_at: new Date().toISOString() } : {}),
    }, { onConflict: "tenant_slug" })
    .select("id")
    .single();

  if (upsertErr || !row) {
    console.error("[hoodops-tenant-register] Upsert failed:", upsertErr?.message);
    return jsonResp({ error: "Registration failed", detail: upsertErr?.message }, 500);
  }

  console.log(
    `[hoodops-tenant-register] ${isRotation ? "Rotated" : "Registered"} tenant ${tenantSlug} (${row.id})`,
  );

  return jsonResp({
    tenant_id: row.id,
    status: isRotation ? "rotated" : "registered",
  }, isRotation ? 200 : 201);
});
