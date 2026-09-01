import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";

/**
 * partner-upload — receives one document for one slot of a partner
 * application.
 *
 * Public: no JWT. The token in the multipart body is the credential, same
 * posture as partner-token and sealed-evidence-share. getevidly.com/partners/upload
 * POSTs here once per document.
 *
 * POST multipart/form-data: token, doc_type, file, expiration_date
 *
 * Returns the same docs[] shape partner-token returns, so the page can render
 * N-of-6 from this response alone and survive a reload without a second call.
 *
 * The declared mimetype is checked against the allow-list AND the first bytes
 * of the file are sniffed to confirm the declaration is honest. The extension
 * comes from the sniff, not from the filename or the header, so a .pdf that is
 * actually a PNG lands as .png and nothing downstream is misled.
 */

const DOC_TYPES = [
  "business_license",
  "professional_license",
  "w9",
  "liability_insurance",
  "workers_comp",
  "auto_insurance",
] as const;

const BUCKET = "partner-documents";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ADMIN_EMAIL = "arthur@getevidly.com";

/** Declared type → extension. Only these three are accepted. */
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Sniff the real type from the leading bytes. Returns null if the file is not
 * one of the three we accept, whatever the header claimed.
 */
function sniffType(bytes: Uint8Array): "application/pdf" | "image/jpeg" | "image/png" | null {
  if (bytes.length >= 4 &&
      bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "application/pdf"; // %PDF
  }
  if (bytes.length >= 3 &&
      bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return "image/png";
  }
  return null;
}

/** Strict YYYY-MM-DD that is also a real calendar date — 2026-02-30 is not. */
function parseDateOnly(raw: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return null;
  const [, y, mo, d] = m;
  const dt = new Date(`${y}-${mo}-${d}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getUTCFullYear() !== Number(y) ||
      dt.getUTCMonth() + 1 !== Number(mo) ||
      dt.getUTCDate() !== Number(d)) return null;
  return `${y}-${mo}-${d}`;
}

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
    const expirationRaw = String(form.get("expiration_date") ?? "").trim();
    const file = form.get("file");

    // ── 1. Token ────────────────────────────────────────────────
    if (!token) return unusable();

    const { data: app, error: appErr } = await supabase
      .from("partner_applications")
      .select("id, business_name, token_expires_at")
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
    if (!(DOC_TYPES as readonly string[]).includes(docType)) {
      return json({
        ok: false,
        error: `doc_type must be one of: ${DOC_TYPES.join(", ")}. Received "${docType}".`,
      }, 400);
    }

    // ── 3. expiration_date ──────────────────────────────────────
    if (!expirationRaw) {
      return json({ ok: false, error: "expiration_date is required (YYYY-MM-DD)." }, 400);
    }
    const expirationDate = parseDateOnly(expirationRaw);
    if (!expirationDate) {
      return json({
        ok: false,
        error: `expiration_date must be a real date in YYYY-MM-DD form. Received "${expirationRaw}".`,
      }, 400);
    }

    // ── 4. File — declared type, real bytes, real size ──────────
    if (!(file instanceof File)) {
      return json({ ok: false, error: "file is required." }, 400);
    }

    const declared = file.type || "";
    if (!ALLOWED_TYPES[declared]) {
      return json({
        ok: false,
        error: "File must be a PDF, JPG, or PNG.",
      }, 400);
    }

    // Measured from the bytes actually received, not from file.size.
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (bytes.byteLength === 0) {
      return json({ ok: false, error: "That file is empty." }, 400);
    }
    if (bytes.byteLength > MAX_BYTES) {
      return json({
        ok: false,
        error: `File is too large. Maximum 10MB; received ${(bytes.byteLength / 1048576).toFixed(1)}MB.`,
      }, 400);
    }

    const sniffed = sniffType(bytes.subarray(0, 8));
    if (!sniffed) {
      return json({
        ok: false,
        error: "That file is not a readable PDF, JPG, or PNG.",
      }, 400);
    }
    if (sniffed !== declared) {
      return json({
        ok: false,
        error: `File contents are ${sniffed}, but it was sent as ${declared}.`,
      }, 400);
    }

    // ── Store ───────────────────────────────────────────────────
    const ext = ALLOWED_TYPES[sniffed];
    const storagePath = `${applicationId}/${docType}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: sniffed,
        upsert: true, // re-uploading a slot replaces it cleanly
      });

    if (uploadErr) {
      console.error("[partner-upload] storage upload failed:", uploadErr.message);
      return json({ ok: false, error: "Could not store that file." }, 500);
    }

    // ── Mark the slot ───────────────────────────────────────────
    // The prior path is read first: if the partner replaces a PDF with a PNG
    // the extension changes, and the old object would otherwise linger in the
    // bucket unreferenced.
    const { data: priorRow } = await supabase
      .from("partner_documents")
      .select("file_path")
      .eq("application_id", applicationId)
      .eq("doc_type", docType)
      .maybeSingle();

    const priorPath = (priorRow?.file_path as string | null) ?? null;

    const { error: updErr } = await supabase
      .from("partner_documents")
      .update({
        file_path: storagePath,
        expiration_date: expirationDate,
        uploaded_at: new Date().toISOString(),
        status: "uploaded",
      })
      .eq("application_id", applicationId)
      .eq("doc_type", docType);

    if (updErr) {
      // The object is deliberately left in place. If this was a first upload
      // the orphan is invisible — the slot still reads as empty and the next
      // attempt overwrites it. If it was a replacement, deleting would destroy
      // a file the row may still point at.
      console.error("[partner-upload] slot update failed:", updErr.message);
      return json({ ok: false, error: "Stored the file but could not record it." }, 500);
    }

    if (priorPath && priorPath !== storagePath) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove([priorPath]);
      if (rmErr) {
        console.warn(`[partner-upload] could not remove superseded ${priorPath}:`, rmErr.message);
      }
    }

    // ── Full state back, same shape as partner-token ────────────
    type DocRow = { doc_type: string; file_path: string | null; expiration_date: string | null };

    const { data: docs, error: docsErr } = await supabase
      .from("partner_documents")
      .select("doc_type, file_path, expiration_date")
      .eq("application_id", applicationId);

    if (docsErr) {
      console.error("[partner-upload] document re-read failed:", docsErr.message);
      return json({ ok: false, error: "Saved, but could not read the checklist back." }, 500);
    }

    const byType = new Map<string, DocRow>(
      ((docs ?? []) as DocRow[]).map((d) => [d.doc_type, d]),
    );

    const state = DOC_TYPES.map((doc_type) => {
      const row = byType.get(doc_type);
      return {
        doc_type,
        uploaded: Boolean(row?.file_path),
        expiration_date: row?.expiration_date ?? null,
      };
    });

    // ── All six in? Tell Arthur. Never fails the upload. ────────
    const uploadedCount = state.filter((d) => d.uploaded).length;

    if (uploadedCount === DOC_TYPES.length) {
      const businessName = String(app.business_name ?? "A partner");
      const rows = state.map((d) =>
        `<tr><td style="padding: 4px 16px 4px 0; color: #64748b;">${esc(d.doc_type.replace(/_/g, " "))}</td>` +
        `<td style="padding: 4px 0;">expires ${esc(d.expiration_date ?? "—")}</td></tr>`
      ).join("");

      const sent = await sendEmail({
        to: ADMIN_EMAIL,
        subject: `Partner documents complete — ${businessName}`,
        html: buildEmailHtml({
          recipientName: "Arthur",
          bodyHtml: `
            <p><strong>${esc(businessName)}</strong> has uploaded all six documents.</p>
            <table style="border-collapse: collapse; font-size: 14px; margin: 16px 0;">${rows}</table>
            <p style="font-size: 13px; color: #64748b;">Ready for review.</p>`,
        }),
      });

      if (!sent) {
        console.error(
          `[partner-upload] application ${applicationId} complete, completion email failed`,
        );
      }
    }

    return json({ ok: true, docs: state });
  } catch (err) {
    console.error("[partner-upload] unhandled:", err instanceof Error ? err.message : err);
    return json({ ok: false, error: "Something went wrong storing that document." }, 500);
  }
});
