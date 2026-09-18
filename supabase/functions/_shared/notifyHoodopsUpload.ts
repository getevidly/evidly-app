// ═══════════════════════════════════════════════════════════
// notifyHoodopsUpload — tell HoodOps that one of its tenants just filed a
// business document.
//
// This is the first outbound call EvidLY makes to HoodOps. Everything until
// now has been inbound: hoodops-webhook verifies x-hoodops-signature on
// requests HoodOps sends us. This signs the mirror image — the same
// HMAC-SHA256-over-raw-bytes scheme, the same per-tenant signing_secret,
// carried in x-evidly-signature so the two directions cannot be confused.
//
// It is best effort by design. A partner filing their insurance certificate
// must not see an error because HoodOps was down, so every failure here is
// logged and swallowed and the caller never learns of it.
// ═══════════════════════════════════════════════════════════

/** Minimal structural shape of the service-role client this module needs. */
// deno-lint-ignore no-explicit-any
type DbClient = { from: (table: string) => any };

/** The fields of the application row this needs. Anything else is ignored. */
export interface PartnerApplicationRef {
  id: string;
  hoodops_tenant_id?: string | null;
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

/**
 * Notify HoodOps that `docTypes` were just uploaded for `app`.
 *
 * Returns nothing and never throws. Silent when the application belongs to a
 * public applicant, when the tenant is inactive, or when HOODOPS_CALLBACK_URL
 * is unset — which is the state this ships in.
 */
export async function notifyHoodopsUpload(
  supabase: DbClient,
  app: PartnerApplicationRef,
  docTypes: string[],
): Promise<void> {
  try {
    /* A public applicant came in through getevidly.com/partners/apply and has
     * no tenant behind them. There is nobody to tell. */
    if (!app?.hoodops_tenant_id) return;

    const callbackUrl = Deno.env.get("HOODOPS_CALLBACK_URL");
    if (!callbackUrl) {
      console.log(
        `[notifyHoodopsUpload] HOODOPS_CALLBACK_URL unset — skipping notice for application ${app.id}`,
      );
      return;
    }

    const { data: tenant, error: tenantErr } = await supabase
      .from("hoodops_tenants")
      .select("tenant_slug, signing_secret, active")
      .eq("id", app.hoodops_tenant_id)
      .maybeSingle() as {
        data: {
          tenant_slug: string;
          signing_secret: string;
          active: boolean;
        } | null;
        error: { message?: string } | null;
      };

    if (tenantErr) {
      console.error(
        `[notifyHoodopsUpload] Tenant lookup failed for application ${app.id}: ${tenantErr.message}`,
      );
      return;
    }
    if (!tenant) {
      console.error(
        `[notifyHoodopsUpload] No hoodops_tenants row for ${app.hoodops_tenant_id} (application ${app.id})`,
      );
      return;
    }
    /* A deactivated tenant is one we have been told to stop talking to. Its
     * secret may well still verify, which is exactly why the check is here
     * and not left to the far end. */
    if (!tenant.active) {
      console.log(
        `[notifyHoodopsUpload] Tenant ${tenant.tenant_slug} is inactive — no notice sent`,
      );
      return;
    }
    if (!tenant.signing_secret) {
      console.error(
        `[notifyHoodopsUpload] Tenant ${tenant.tenant_slug} has no signing secret — no notice sent`,
      );
      return;
    }

    /* Serialize once. The signature covers these exact bytes, so the same
     * string must be both hashed and sent — re-stringifying could reorder
     * keys and produce a digest for something other than what was posted. */
    const bodyStr = JSON.stringify({
      event: "partner_documents_uploaded",
      hoodops_tenant_slug: tenant.tenant_slug,
      doc_types: docTypes,
      uploaded_at: new Date().toISOString(),
    });

    const signature = await hmacSha256Hex(tenant.signing_secret, bodyStr);

    const res = await fetch(callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-evidly-signature": signature,
      },
      body: bodyStr,
      /* Bounded, because this runs after the upload is already decided and
       * must not hold the function open on an unresponsive endpoint. */
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(
        `[notifyHoodopsUpload] ${tenant.tenant_slug} returned HTTP ${res.status} for application ${app.id}`,
      );
      return;
    }

    console.log(
      `[notifyHoodopsUpload] Told ${tenant.tenant_slug} about ${docTypes.join(", ")} on application ${app.id}`,
    );
  } catch (err) {
    // An upload must never fail because HoodOps was unreachable.
    console.error(
      `[notifyHoodopsUpload] Notice skipped for application ${app?.id}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}
