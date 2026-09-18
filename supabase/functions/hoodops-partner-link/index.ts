// ═══════════════════════════════════════════════════════════
// hoodops-partner-link — returns a HoodOps tenant's private upload link
// for its OWN business records (COIs, licences, W-9).
//
// This is the service company's paperwork, not a kitchen's copy of it.
// It lives in partner_applications / partner_documents, the same rows the
// Trusted Partner Alliance flow uses, tied to the tenant by
// partner_applications.hoodops_tenant_id (migration 20261231000000).
//
// Auth: per-tenant HMAC over the exact request bytes, via
// _shared/verifyHoodopsRequest.ts. No global-secret fallback. There is
// deliberately NO [functions.hoodops-partner-link] block in config.toml,
// so gateway JWT verification stays on — the same posture hoodops-webhook
// has.
//
// Sends no email. Returns a link and an expiry, never a bare token and
// never a file path.
// ═══════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyHoodopsRequest } from "../_shared/verifyHoodopsRequest.ts";

/* Both copied from partner-apply/index.ts:37-44 and :59,66 — the slots a
 * records set is made of, and the link the partner opens. partner-expiry-scan
 * mints replacement tokens on the same TTL (index.ts:27,29,174-182). */
const DOC_TYPES = [
  "business_license",
  "professional_license",
  "w9",
  "liability_insurance",
  "workers_comp",
  "auto_insurance",
] as const;

const TOKEN_TTL_DAYS = 30;
const UPLOAD_BASE = "https://getevidly.com/partners/upload";

/* A HoodOps tenant is a kitchen exhaust cleaner. The column is CHECK
 * constrained (migration 20261218000000:41-49) and this is the member that
 * fits. */
const SERVICE_TYPE = "Hood Cleaning";

function jsonResp(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResp({ error: "Method not allowed" }, 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const verified = await verifyHoodopsRequest(req, supabase);
  if (!verified.ok || !verified.tenant) {
    return jsonResp({ error: verified.error || "Unauthorized" }, verified.status);
  }

  const tenant = verified.tenant;
  const body = verified.body ?? {};

  const businessName = str(body.business_name);
  const email = str(body.email);
  if (!businessName || !email) {
    return jsonResp({ error: "business_name and email are required" }, 400);
  }

  const firstName = str(body.first_name);
  const lastName = str(body.last_name);
  const phone = str(body.phone);
  const website = str(body.website);

  // One token per call, minted exactly as partner-expiry-scan does.
  const uploadToken = crypto.randomUUID();
  const tokenExpiresAt = new Date(
    Date.now() + TOKEN_TTL_DAYS * 86400000,
  ).toISOString();

  try {
    let applicationId: string | null = null;
    let created = false;

    // ── (i) Already linked to this tenant ────────────────────────
    const { data: linked, error: linkedErr } = await supabase
      .from("partner_applications")
      .select("id")
      .eq("hoodops_tenant_id", tenant.id)
      .maybeSingle() as {
        data: { id: string } | null;
        error: { message?: string } | null;
      };

    if (linkedErr) {
      console.error(
        `[hoodops-partner-link] Linked lookup failed for tenant ${tenant.tenant_slug}: ${linkedErr.message}`,
      );
      return jsonResp({ error: "Could not resolve the records set" }, 500);
    }
    if (linked) applicationId = linked.id;

    /* ── (ii) Adopt an unclaimed row with the same email ──────────
     * The company may already have applied through the public form. Claim
     * that row rather than making a second one. Only a row with no tenant
     * is eligible — a row belonging to another tenant is never touched. */
    if (!applicationId) {
      const { data: unclaimed, error: unclaimedErr } = await supabase
        .from("partner_applications")
        .select("id")
        .ilike("email", email)
        .is("hoodops_tenant_id", null)
        .limit(1)
        .maybeSingle() as {
          data: { id: string } | null;
          error: { message?: string } | null;
        };

      if (unclaimedErr) {
        console.error(
          `[hoodops-partner-link] Unclaimed lookup failed for tenant ${tenant.tenant_slug}: ${unclaimedErr.message}`,
        );
        return jsonResp({ error: "Could not resolve the records set" }, 500);
      }

      if (unclaimed) {
        /* Re-assert the null guard in the WHERE clause, not just the read:
         * between the select and the update another caller could have
         * claimed it. The unique partial index on hoodops_tenant_id is the
         * backstop. */
        const { data: stamped, error: stampErr } = await supabase
          .from("partner_applications")
          .update({ hoodops_tenant_id: tenant.id } as never)
          .eq("id", unclaimed.id)
          .is("hoodops_tenant_id", null)
          .select("id")
          .maybeSingle() as {
            data: { id: string } | null;
            error: { message?: string } | null;
          };

        if (stampErr) {
          console.error(
            `[hoodops-partner-link] Could not claim application ${unclaimed.id} for tenant ${tenant.tenant_slug}: ${stampErr.message}`,
          );
          return jsonResp({ error: "Could not resolve the records set" }, 500);
        }
        if (stamped) applicationId = stamped.id;
      }
    }

    /* ── (iii) Create a new records set ───────────────────────────
     * The application row and its six slots are ONE unit, exactly as
     * partner-apply treats them (index.ts:151-214): if the slots fail, the
     * application is deleted, because a half-made one would hand the
     * company an upload page with nothing to upload into. */
    if (!applicationId) {
      const { data: app, error: appErr } = await supabase
        .from("partner_applications")
        .insert({
          first_name: firstName,
          last_name: lastName,
          business_name: businessName,
          service_type: SERVICE_TYPE,
          email,
          phone,
          website,
          upload_token: uploadToken,
          token_expires_at: tokenExpiresAt,
          status: "submitted",
          hoodops_tenant_id: tenant.id,
        } as never)
        .select("id")
        .single() as {
          data: { id: string } | null;
          error: { message?: string } | null;
        };

      if (appErr || !app) {
        console.error(
          `[hoodops-partner-link] Application insert failed for tenant ${tenant.tenant_slug}: ${appErr?.message}`,
        );
        return jsonResp({ error: "Could not create the records set" }, 500);
      }

      const newId = app.id;

      const { error: docsErr } = await supabase
        .from("partner_documents")
        .insert(DOC_TYPES.map((doc_type) => ({
          application_id: newId,
          doc_type,
          status: "pending",
        })) as never) as { error: { message?: string } | null };

      if (docsErr) {
        console.error(
          `[hoodops-partner-link] Document slots insert failed for ${newId}: ${docsErr.message}`,
        );

        const { error: cleanupErr } = await supabase
          .from("partner_applications")
          .delete()
          .eq("id", newId) as { error: { message?: string } | null };

        if (cleanupErr) {
          // An orphan row is now live with a valid token and no slots behind it.
          console.error(
            `[hoodops-partner-link] CLEANUP FAILED — orphan application ${newId} remains: ${cleanupErr.message}`,
          );
          return jsonResp({
            error: "Could not create the document checklist, and could not undo the records set",
          }, 500);
        }

        return jsonResp({
          error: "Could not create the document checklist. Nothing was kept — please try again.",
        }, 500);
      }

      applicationId = newId;
      created = true;
    }

    /* ── Fresh token on every call ────────────────────────────────
     * The create path above already wrote this token; writing it again is
     * the same value. For (i) and (ii) it replaces whatever was there, so
     * the link handed back is always live for the full TTL. */
    const { error: tokErr } = await supabase
      .from("partner_applications")
      .update({
        upload_token: uploadToken,
        token_expires_at: tokenExpiresAt,
      } as never)
      .eq("id", applicationId) as { error: { message?: string } | null };

    if (tokErr) {
      // Returning a link that cannot be opened is worse than returning none.
      console.error(
        `[hoodops-partner-link] Token refresh failed for ${applicationId}: ${tokErr.message}`,
      );
      return jsonResp({ error: "Could not issue an upload link" }, 500);
    }

    return jsonResp({
      upload_url: `${UPLOAD_BASE}?token=${uploadToken}`,
      expires_at: tokenExpiresAt,
      created,
    }, 200);
  } catch (err) {
    console.error(
      `[hoodops-partner-link] Unexpected failure for tenant ${tenant.tenant_slug}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return jsonResp({ error: "Internal error" }, 500);
  }
});
