// ═══════════════════════════════════════════════════════════
// verifyHoodopsRequest — per-tenant HMAC verification for inbound
// HoodOps calls.
//
// This is hoodops-webhook's verification block (index.ts:93-177) lifted
// into one place, with ONE deliberate difference: there is no global
// HOODOPS_WEBHOOK_SECRET fallback. hoodops-webhook keeps that fallback
// because it predates the identity bridge and still carries legacy
// traffic. Anything new authenticates as a named tenant or not at all,
// so a missing, unknown or inactive slug is 401 — never a downgrade to
// the shared key.
//
// hoodops-webhook is NOT modified by this file and does not import it.
// ═══════════════════════════════════════════════════════════

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

/** Minimal structural shape of the service-role client this module needs. */
// deno-lint-ignore no-explicit-any
type DbClient = { from: (table: string) => any };

export interface HoodopsTenant {
  id: string;
  tenant_slug: string;
  tenant_name: string;
}

export interface VerifyResult {
  ok: boolean;
  status: number;
  /** Set only when ok. */
  tenant: HoodopsTenant | null;
  /** The exact bytes the signature covers. Always set. */
  rawBody: string;
  /** Parsed body, set only when ok. */
  // deno-lint-ignore no-explicit-any
  body: any;
  /** Short reason for the caller's { error } payload. */
  error?: string;
}

/**
 * Verify an inbound HoodOps request and resolve the calling tenant.
 *
 * The request body is consumed here — the caller must use `rawBody` / `body`
 * from the result rather than reading the Request again.
 */
export async function verifyHoodopsRequest(
  req: Request,
  supabase: DbClient,
): Promise<VerifyResult> {
  // Read raw body BEFORE parsing — HMAC must match the exact bytes HoodOps signed.
  const rawBody = await req.text();

  const fail = (status: number, error: string): VerifyResult => ({
    ok: false,
    status,
    tenant: null,
    rawBody,
    body: null,
    error,
  });

  const signatureHeader = req.headers.get("x-hoodops-signature");
  if (!signatureHeader) return fail(401, "Unauthorized");

  /* Tenant identity. Parsed leniently and ONLY to pick a verification secret —
   * malformed JSON falls through to the 401 below, so an unauthenticated caller
   * still cannot tell valid JSON from invalid.
   * Body wins over header: the body is inside the HMAC-covered bytes, the
   * header is not. */
  let tenantSlug: string | null = null;
  try {
    const peek = JSON.parse(rawBody);
    const raw = peek?.data?.hoodops_tenant_slug ?? peek?.hoodops_tenant_slug;
    if (typeof raw === "string" && raw.trim()) tenantSlug = raw.trim();
  } catch {
    // Not JSON — no slug, and the next check refuses.
  }
  if (!tenantSlug) {
    const hdr = req.headers.get("x-hoodops-tenant");
    if (hdr && hdr.trim()) tenantSlug = hdr.trim();
  }

  // No global fallback. No slug means no secret to verify against.
  if (!tenantSlug) {
    console.error("[verifyHoodopsRequest] No tenant slug on the request");
    return fail(401, "Unauthorized");
  }

  const { data: tenant, error: tenantErr } = await supabase
    .from("hoodops_tenants")
    .select("id, tenant_slug, tenant_name, signing_secret")
    .eq("tenant_slug", tenantSlug)
    .eq("active", true)
    .maybeSingle() as {
      data: {
        id: string;
        tenant_slug: string;
        tenant_name: string;
        signing_secret: string;
      } | null;
      error: { message?: string } | null;
    };

  if (tenantErr) {
    console.error(
      `[verifyHoodopsRequest] Tenant lookup failed for ${tenantSlug}: ${tenantErr.message}`,
    );
    return fail(401, "Unauthorized");
  }
  if (!tenant?.signing_secret) {
    console.error(`[verifyHoodopsRequest] Unknown or inactive tenant: ${tenantSlug}`);
    return fail(401, "Unauthorized");
  }

  const expectedSignature = await hmacSha256Hex(tenant.signing_secret, rawBody);
  if (!timingSafeEqual(expectedSignature, signatureHeader)) {
    return fail(401, "Unauthorized");
  }

  // Verified. Only now is a parse failure worth reporting honestly.
  // deno-lint-ignore no-explicit-any
  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return fail(400, "Invalid JSON");
  }

  return {
    ok: true,
    status: 200,
    tenant: {
      id: tenant.id,
      tenant_slug: tenant.tenant_slug,
      tenant_name: tenant.tenant_name,
    },
    rawBody,
    body,
  };
}
