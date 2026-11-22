import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { notifyHoodopsUpload } from "../_shared/notifyHoodopsUpload.ts";
import { requiredFields, validateTyped } from "../_shared/vendorDocumentRules.ts";
import {
  type IncomingFile,
  loadOpenCheck,
  markSent,
  queueFixEmail,
  runCheck,
  sniffType,
  type Target,
  verifyForSend,
} from "../_shared/vendorDocumentCheckFlow.ts";
import { PARTNER_DOC_LABELS, PARTNER_DOC_TYPES, partnerDocsState } from "../_shared/partnerDocState.ts";

/**
 * partner-upload — one document for one slot of a partner application,
 * checked on the partner's screen before it is sent.
 *
 * Public: no JWT. The token in the multipart body is the credential, same
 * posture as partner-token and sealed-evidence-share. getevidly.com/partners/upload
 * POSTs here.
 *
 * POST multipart/form-data: token, doc_type, action, plus
 *   action=check  expiration_date, doc_number (not for W-9), file (optional
 *                 once a draft file is stored). Stores the draft privately,
 *                 reads the document, compares, returns the rows.
 *   action=leave  sent by the page on pagehide. If this slot's check says
 *                 needs_fix, queues the "Fix One Detail" email (Part 3).
 *   action=send   nothing else. Files the checked draft on the partner's
 *                 record as Waiting for Acceptance, only if every detail
 *                 still matches.
 *
 * Arthur's rule: nothing is saved as sent, and nothing reaches the
 * recipient, until every detail matches. A request with no action (the
 * old one-step upload) is refused for that reason.
 *
 * Returns the same docs[] shape partner-token returns (partnerDocState), so
 * the page renders every slot from this response alone.
 */

const BUCKET = "partner-documents";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ADMIN_EMAIL = "arthur@getevidly.com";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), {
      status: s,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  /** Same shape partner-token uses, so the page has one unusable-link state. */
  const unusable = () => json({ ok: false, reason: "invalid_or_expired" });

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed. POST a document." }, 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return json({ ok: false, error: "Body must be multipart/form-data." }, 400);
    }

    const token = String(form.get("token") ?? "").trim();
    const docType = String(form.get("doc_type") ?? "").trim();
    const action = String(form.get("action") ?? "").trim();

    // ── 1. Token ────────────────────────────────────────────────
    if (!token) return unusable();

    const { data: app, error: appErr } = await supabase
      .from("partner_applications")
      .select("id, business_name, email, token_expires_at, hoodops_tenant_id")
      .eq("upload_token", token)
      .maybeSingle();

    if (appErr) {
      console.error("[partner-upload] token lookup failed:", appErr.message);
      return json({ ok: false, reason: "lookup_failed" }, 500);
    }
    if (!app) return unusable();

    const expiresAt = app.token_expires_at as string | null;
    if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) return unusable();

    const applicationId = app.id as string;

    // ── 2. doc_type ─────────────────────────────────────────────
    if (!(PARTNER_DOC_TYPES as readonly string[]).includes(docType)) {
      return json({
        ok: false,
        error: `doc_type must be one of: ${PARTNER_DOC_TYPES.join(", ")}. Received "${docType}".`,
      }, 400);
    }

    const { data: slotRow, error: slotErr } = await supabase
      .from("partner_documents")
      .select("id, file_path, status")
      .eq("application_id", applicationId)
      .eq("doc_type", docType)
      .maybeSingle();
    if (slotErr || !slotRow) {
      console.error("[partner-upload] slot lookup failed:", slotErr?.message ?? "no row");
      return json({ ok: false, error: "Could not find that document slot." }, 500);
    }

    const required = requiredFields("partner", docType);
    const target: Target = {
      flow: "partner",
      documentId: slotRow.id as string,
      bucket: BUCKET,
      draftPath: (ext: string) => `${applicationId}/drafts/${docType}-${Date.now()}.${ext}`,
      required,
      nameOnFile: (app.business_name as string | null) ?? null,
      documentLabel: PARTNER_DOC_LABELS[docType] ?? docType,
    };

    const respondWithState = async () => {
      const state = await partnerDocsState(supabase, applicationId);
      if (!state.ok) return json({ ok: false, error: "Saved, but could not read the checklist back." }, 500);
      return json({ ok: true, docs: state.docs });
    };

    // ── 3a. Check My Document ───────────────────────────────────
    if (action === "check") {
      const typed = validateTyped(
        required,
        String(form.get("expiration_date") ?? ""),
        String(form.get("doc_number") ?? ""),
      );
      if (typed.error) return json({ ok: false, error: typed.error }, 400);

      let incoming: IncomingFile | null = null;
      const file = form.get("file");
      if (file instanceof File && file.size > 0) {
        // Measured from the bytes actually received, not from file.size.
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (bytes.byteLength > MAX_BYTES) {
          return json({
            ok: false,
            error: `File is too large. Maximum 10MB; received ${(bytes.byteLength / 1048576).toFixed(1)}MB.`,
          }, 400);
        }
        // The extension comes from the sniff, not from the filename or header.
        const sniffed = sniffType(bytes.subarray(0, 8));
        if (!sniffed) {
          return json({ ok: false, error: "That file is not a readable PDF, JPG, or PNG." }, 400);
        }
        incoming = { bytes, mimeType: sniffed.mime, ext: sniffed.ext, name: file.name };
      }

      const result = await runCheck(
        supabase,
        target,
        { expiration: typed.expiration, number: typed.number },
        incoming,
      );
      if (!result.ok) return json({ ok: false, error: result.error }, result.status);
      return await respondWithState();
    }

    // ── 3c. The partner left with this slot in Needs a Fix ─────
    if (action === "leave") {
      const open = await loadOpenCheck(supabase, "partner", target.documentId);
      const base = (Deno.env.get("PARTNER_UPLOAD_BASE") || "https://getevidly.com/partners/upload").replace(/\/+$/, "");
      const outcome = await queueFixEmail(supabase, open, {
        to: (app.email as string | null) ?? null,
        documentLabel: target.documentLabel,
        recipientName: "EvidLY",
        senderName: (app.business_name as string | null) ?? null,
        fixUrl: `${base}?token=${encodeURIComponent(token)}&fix=${docType}`,
      });
      return json({ ok: true, ...outcome });
    }

    // ── 3b. Send to EvidLY ──────────────────────────────────────
    if (action === "send") {
      const open = await loadOpenCheck(supabase, "partner", target.documentId);
      const refusal = verifyForSend(target, open);
      if (refusal || !open) return json({ ok: false, error: refusal }, 409);

      // Completeness before this send, so the "all six" email fires only on
      // the transition into complete.
      const { data: priorRows } = await supabase
        .from("partner_documents")
        .select("doc_type, status")
        .eq("application_id", applicationId);
      const prior = (priorRows ?? []) as { doc_type: string; status: string | null }[];
      const wasAlreadyComplete = PARTNER_DOC_TYPES.every((t) =>
        prior.find((r) => r.doc_type === t)?.status === "uploaded"
      );

      const { error: updErr } = await supabase
        .from("partner_documents")
        .update({
          file_path: open.file_path,
          expiration_date: open.typed_expiration_date,
          doc_number: required.number ? open.typed_doc_number : null,
          uploaded_at: new Date().toISOString(),
          status: "uploaded",
          review_status: "waiting_for_acceptance",
          check_rows: open.check_rows,
          content_sha256: open.file_sha256,
          tamper_detection_at: null,
          accepted_at: null,
          accepted_by: null,
          // A new document starts its own reminder cycle.
          last_expiry_notified_at: null,
        })
        .eq("id", target.documentId);

      if (updErr) {
        console.error("[partner-upload] send failed:", updErr.message);
        return json({ ok: false, error: "Could not send that document. Try again." }, 500);
      }
      await markSent(supabase, open.id);

      // The superseded file is no longer referenced by anything.
      const priorPath = slotRow.file_path as string | null;
      if (priorPath && priorPath !== open.file_path) {
        const { error: rmErr } = await supabase.storage.from(BUCKET).remove([priorPath]);
        if (rmErr) console.warn(`[partner-upload] could not remove superseded ${priorPath}:`, rmErr.message);
      }

      const state = await partnerDocsState(supabase, applicationId);
      if (!state.ok) return json({ ok: false, error: "Sent, but could not read the checklist back." }, 500);
      const docs = state.docs as { doc_type: string; uploaded: boolean; expiration_date: string | null }[];

      // ── All six sent? Tell Arthur. Never fails the send. ──────
      if (docs.every((d) => d.uploaded) && !wasAlreadyComplete) {
        const businessName = String(app.business_name ?? "A partner");
        const rows = docs.map((d) =>
          `<tr><td style="padding: 4px 16px 4px 0; color: #64748b;">${esc(PARTNER_DOC_LABELS[d.doc_type] ?? d.doc_type)}</td>` +
          `<td style="padding: 4px 0;">expires ${esc(d.expiration_date ?? "—")}</td></tr>`
        ).join("");

        const sent = await sendEmail({
          to: ADMIN_EMAIL,
          subject: `Partner Documents Complete: ${businessName}`,
          html: buildEmailHtml({
            recipientName: "Arthur",
            bodyHtml: `
              <p><strong>${esc(businessName)}</strong> has sent all six documents. Every
              detail was checked against the document before it was sent.</p>
              <table style="border-collapse: collapse; font-size: 14px; margin: 16px 0;">${rows}</table>
              <p style="font-size: 13px; color: #64748b;">Waiting for your acceptance in the Partners tab.</p>`,
          }),
        });
        if (!sent) console.error(`[partner-upload] application ${applicationId} complete, completion email failed`);
      }

      /* Tell HoodOps, if this application belongs to a tenant. Not awaited:
       * the document is filed and the answer is ready; the helper swallows
       * its own failures. */
      const notice = notifyHoodopsUpload(
        supabase,
        { id: applicationId, hoodops_tenant_id: (app as { hoodops_tenant_id?: string | null }).hoodops_tenant_id },
        [docType],
      );
      // deno-lint-ignore no-explicit-any
      const runtime = (globalThis as any).EdgeRuntime;
      if (runtime?.waitUntil) runtime.waitUntil(notice);

      return json({ ok: true, docs });
    }

    return json({ ok: false, error: "Check My Document first." }, 400);
  } catch (err) {
    console.error("[partner-upload] unhandled:", err instanceof Error ? err.message : err);
    return json({ ok: false, error: "Something went wrong with that document." }, 500);
  }
});
