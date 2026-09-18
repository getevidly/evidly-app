// ═══════════════════════════════════════════════════════════
// hoodops-partner-documents — returns a HoodOps tenant's CURRENT business
// documents as short-lived signed URLs.
//
// The counterpart to hoodops-partner-link: that one hands the tenant a
// place to put its paperwork, this one hands back what is on file. Same
// rows (partner_applications / partner_documents), same tenant link
// (partner_applications.hoodops_tenant_id, migration 20261231000000).
//
// Auth: per-tenant HMAC over the exact request bytes, via
// _shared/verifyHoodopsRequest.ts. No global-secret fallback. There is
// deliberately NO [functions.hoodops-partner-documents] block in
// config.toml, so gateway JWT verification stays on — the same posture
// hoodops-partner-link and hoodops-webhook have.
//
// Read-only. It writes nothing and sends nothing.
//
// What crosses this boundary is what a counterparty needs to see: the
// document's kind, whether it is good, when it runs out, and a link that
// dies in five minutes. Never file_path, never upload_token, never any
// other column of partner_applications beyond business_name.
// ═══════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyHoodopsRequest } from "../_shared/verifyHoodopsRequest.ts";

/** Private bucket, created public=false at migration 20261218000000:244-246. */
const BUCKET = "partner-documents";

/** Five minutes, matching portal-access/index.ts:364. */
const SIGNED_URL_TTL_SECONDS = 300;

/** A document inside this many days is "expiring". Same window the daily
 *  partner-expiry-scan uses (index.ts:25, WINDOW_DAYS = 30). */
const EXPIRING_WINDOW_DAYS = 30;

/** Stable presentation order, copied from partner-admin/index.ts:30-37. */
const DOC_TYPE_ORDER = [
  "business_license",
  "professional_license",
  "w9",
  "liability_insurance",
  "workers_comp",
  "auto_insurance",
] as const;

/** Verbatim from partner-expiry-scan/index.ts:31-38, so the same document
 *  is named identically wherever a person reads about it. */
const DOC_LABELS: Record<string, string> = {
  business_license: "Business License",
  professional_license: "Professional License",
  w9: "W-9",
  liability_insurance: "Liability Insurance",
  workers_comp: "Workers' Comp",
  auto_insurance: "Auto Insurance",
};

const label = (t: string) => DOC_LABELS[t] ?? t.replace(/_/g, " ");

/** partner-expiry-scan/index.ts:47-50. expiration_date is a DATE column
 *  arriving as "YYYY-MM-DD"; reading it as UTC midnight keeps the stored
 *  calendar day from shifting wherever this runs. */
function daysUntil(dateOnly: string, todayMs: number): number {
  const then = new Date(`${dateOnly}T00:00:00Z`).getTime();
  return Math.round((then - todayMs) / 86400000);
}

type DocStatus = "current" | "expiring" | "expired";

function statusFor(expirationDate: string | null, todayMs: number): DocStatus {
  // No expiration date is not a problem — a W-9 does not expire.
  if (!expirationDate) return "current";
  const days = daysUntil(expirationDate, todayMs);
  if (days < 0) return "expired";
  if (days <= EXPIRING_WINDOW_DAYS) return "expiring";
  return "current";
}

function jsonResp(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface DocRow {
  doc_type: string;
  file_path: string | null;
  expiration_date: string | null;
  uploaded_at: string | null;
}

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

  try {
    // ── The records set for this tenant ──────────────────────────
    const { data: app, error: appErr } = await supabase
      .from("partner_applications")
      .select("id, business_name")
      .eq("hoodops_tenant_id", tenant.id)
      .maybeSingle() as {
        data: { id: string; business_name: string | null } | null;
        error: { message?: string } | null;
      };

    if (appErr) {
      console.error(
        `[hoodops-partner-documents] Application lookup failed for tenant ${tenant.tenant_slug}: ${appErr.message}`,
      );
      return jsonResp({ error: "Could not read the records set" }, 500);
    }

    /* Not connected yet is a real answer, not a failure — the tenant has
     * simply never been through hoodops-partner-link. */
    if (!app) {
      return jsonResp({ connected: false, documents: [] }, 200);
    }

    // ── Its documents ────────────────────────────────────────────
    const { data: docs, error: docsErr } = await supabase
      .from("partner_documents")
      .select("doc_type, file_path, expiration_date, uploaded_at")
      .eq("application_id", app.id) as {
        data: DocRow[] | null;
        error: { message?: string } | null;
      };

    if (docsErr) {
      console.error(
        `[hoodops-partner-documents] Document read failed for application ${app.id}: ${docsErr.message}`,
      );
      return jsonResp({ error: "Could not read the documents" }, 500);
    }

    const rows = docs ?? [];
    const todayMs = Date.now();

    const ordered = [...rows].sort((a, b) => {
      const ia = DOC_TYPE_ORDER.indexOf(a.doc_type as typeof DOC_TYPE_ORDER[number]);
      const ib = DOC_TYPE_ORDER.indexOf(b.doc_type as typeof DOC_TYPE_ORDER[number]);
      return (ia < 0 ? DOC_TYPE_ORDER.length : ia) - (ib < 0 ? DOC_TYPE_ORDER.length : ib);
    });

    const documents = [];
    for (const d of ordered) {
      const status = statusFor(d.expiration_date, todayMs);
      const hasFile = !!d.file_path;

      const entry: Record<string, unknown> = {
        doc_type: d.doc_type,
        label: label(d.doc_type),
        expiration_date: d.expiration_date,
        uploaded_at: d.uploaded_at,
        status,
        has_file: hasFile,
      };

      /* A link only for a document that both exists and is still good.
       * Handing out an expired certificate under a live link is how a
       * counterparty ends up relying on it. The null-path guard is
       * portal-access/index.ts:357-359; the call is its :362-364. */
      if (hasFile && status !== "expired") {
        const { data: signed, error: signErr } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(d.file_path as string, SIGNED_URL_TTL_SECONDS) as {
            data: { signedUrl: string } | null;
            error: { message?: string } | null;
          };

        if (signErr || !signed) {
          /* One unsignable document must not blank the whole set. The row
           * still reports its kind, status and expiry — only the link is
           * missing, and has_file already says a file is there. */
          console.error(
            `[hoodops-partner-documents] Signed URL failed for ${d.doc_type} on application ${app.id}: ${signErr?.message}`,
          );
        } else {
          entry.url = signed.signedUrl;
          entry.url_expires_in_seconds = SIGNED_URL_TTL_SECONDS;
        }
      }

      documents.push(entry);
    }

    return jsonResp({
      connected: true,
      business_name: app.business_name,
      documents,
    }, 200);
  } catch (err) {
    console.error(
      `[hoodops-partner-documents] Unexpected failure for tenant ${tenant.tenant_slug}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return jsonResp({ error: "Internal error" }, 500);
  }
});
