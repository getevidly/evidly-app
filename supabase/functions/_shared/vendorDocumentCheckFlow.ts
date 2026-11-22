// ═══════════════════════════════════════════════════════════
// vendorDocumentCheckFlow — the sender-side Check My Document / Send steps,
// shared by vendor-secure-upload (kitchen requests) and partner-upload
// (Trusted Partners). Everything here runs with the service role against
// vendor_document_checks, which the recipient cannot read.
//
//   runCheck()   store the draft file if a new one came in, read it once
//                per file (Anthropic), compare with the typed values, and
//                save the result as draft (all match) or needs_fix.
//   verifyForSend()  re-proves the stored check before anything is sent:
//                same file that was read, typed values unchanged, every
//                row a match. Send is refused otherwise.
// ═══════════════════════════════════════════════════════════

import {
  compareDetails,
  readDocument,
  readErrorMessage,
  sha256Hex,
  type CheckRow,
  type ReadValues,
} from "./documentCheck.ts";
import type { Flow, RequiredFields } from "./vendorDocumentRules.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

export const CHECK_FIELDS =
  "id, flow, compliance_document_id, partner_document_id, status, file_bucket, file_path, " +
  "file_mime_type, file_size_bytes, file_sha256, original_filename, typed_expiration_date, " +
  "typed_doc_number, read_sha256, read_expiration_date, read_doc_number, read_insured_name, " +
  "read_legible, read_error, read_at, check_rows, check_passed, checked_at, sent_at";

export interface CheckRecord {
  id: string;
  flow: Flow;
  compliance_document_id: string | null;
  partner_document_id: string | null;
  status: "draft" | "needs_fix" | "sent";
  file_bucket: string | null;
  file_path: string | null;
  file_mime_type: string | null;
  file_size_bytes: number | null;
  file_sha256: string | null;
  original_filename: string | null;
  typed_expiration_date: string | null;
  typed_doc_number: string | null;
  read_sha256: string | null;
  read_expiration_date: string | null;
  read_doc_number: string | null;
  read_insured_name: string | null;
  read_legible: boolean | null;
  read_error: string | null;
  read_at: string | null;
  check_rows: CheckRow[];
  check_passed: boolean;
  checked_at: string | null;
  sent_at: string | null;
}

export interface Target {
  flow: Flow;
  /** compliance_documents.id or partner_documents.id */
  documentId: string;
  bucket: string;
  /** Path for a new draft file, given its extension. */
  draftPath: (ext: string) => string;
  required: RequiredFields;
  nameOnFile: string | null;
  documentLabel: string;
}

export interface IncomingFile {
  bytes: Uint8Array;
  mimeType: string;
  ext: string;
  name: string;
}

const targetColumn = (flow: Flow) =>
  flow === "kitchen" ? "compliance_document_id" : "partner_document_id";

const todayIso = () => new Date().toISOString().slice(0, 10);

/** The open (not yet sent) check for a document, or null. */
export async function loadOpenCheck(db: Db, flow: Flow, documentId: string): Promise<CheckRecord | null> {
  const { data } = await db
    .from("vendor_document_checks")
    .select(CHECK_FIELDS)
    .eq(targetColumn(flow), documentId)
    .maybeSingle();
  if (!data || data.status === "sent") return null;
  return data as CheckRecord;
}

/** What the sender's screen needs. Never includes paths or hashes. */
export function publicCheckState(c: CheckRecord | null) {
  if (!c) return null;
  return {
    status: c.status,
    has_file: Boolean(c.file_path),
    file_name: c.original_filename,
    typed_expiration_date: c.typed_expiration_date,
    typed_doc_number: c.typed_doc_number,
    rows: c.check_rows ?? [],
    passed: c.check_passed,
    checked_at: c.checked_at,
    read_error: c.read_error ? readErrorMessage(c.read_error) : null,
  };
}

/**
 * Stores the draft file (if one came in), reads it when the file is new,
 * compares, and saves. The recipient sees none of it.
 */
export async function runCheck(
  db: Db,
  target: Target,
  typed: { expiration: string | null; number: string | null },
  file: IncomingFile | null,
): Promise<{ ok: true; check: CheckRecord } | { ok: false; error: string; status: number }> {
  const column = targetColumn(target.flow);
  const now = new Date().toISOString();

  // Existing row (any status). A sent row is recycled into a new draft:
  // that is a renewal or a replacement going through the same check.
  const { data: existingRaw } = await db
    .from("vendor_document_checks")
    .select(CHECK_FIELDS)
    .eq(column, target.documentId)
    .maybeSingle();
  let existing = existingRaw as CheckRecord | null;
  if (existing?.status === "sent") existing = { ...existing, file_path: null, file_sha256: null, read_sha256: null };

  if (!file && !existing?.file_path) {
    return { ok: false, error: "Choose the file first.", status: 400 };
  }

  const patch: Record<string, unknown> = {
    flow: target.flow,
    [column]: target.documentId,
    typed_expiration_date: typed.expiration,
    typed_doc_number: typed.number,
    updated_at: now,
  };

  let fileSha = existing?.file_sha256 ?? null;
  let mimeType = existing?.file_mime_type ?? null;
  let bytes: Uint8Array | null = null;
  let priorDraftPath: string | null = null;

  if (file) {
    bytes = file.bytes;
    fileSha = await sha256Hex(file.bytes);
    mimeType = file.mimeType;
    const path = target.draftPath(file.ext);
    const { error: upErr } = await db.storage.from(target.bucket).upload(path, file.bytes, {
      contentType: file.mimeType,
      upsert: true,
    });
    if (upErr) {
      console.error("[documentCheck] draft upload failed:", upErr.message);
      return { ok: false, error: "Could not store that file. Try again.", status: 500 };
    }
    if (existing?.file_path && existing.file_path !== path && existing.status !== "sent") {
      priorDraftPath = existing.file_path;
    }
    Object.assign(patch, {
      file_bucket: target.bucket,
      file_path: path,
      file_mime_type: file.mimeType,
      file_size_bytes: file.bytes.byteLength,
      file_sha256: fileSha,
      original_filename: file.name.slice(0, 200),
    });
  }

  // Read the file only when these bytes have not been read before.
  let read: ReadValues | null = null;
  let readError: string | null = null;
  const alreadyRead = existing && existing.read_sha256 && existing.read_sha256 === fileSha && !existing.read_error;

  if (alreadyRead) {
    read = {
      expiration_date: existing!.read_expiration_date,
      doc_number: existing!.read_doc_number,
      insured_name: existing!.read_insured_name,
      legible: existing!.read_legible !== false,
    };
  } else {
    if (!bytes) {
      const { data: blob, error: dlErr } = await db.storage
        .from(existing!.file_bucket ?? target.bucket)
        .download(existing!.file_path!);
      if (dlErr || !blob) return { ok: false, error: "Could not open the stored file. Upload it again.", status: 500 };
      bytes = new Uint8Array(await blob.arrayBuffer());
    }
    const result = await readDocument(bytes, mimeType ?? "application/pdf", target.documentLabel);
    if (result.ok) {
      read = result.read;
    } else {
      readError = result.error;
    }
    Object.assign(patch, {
      read_sha256: fileSha,
      read_expiration_date: read?.expiration_date ?? null,
      read_doc_number: read?.doc_number ?? null,
      read_insured_name: read?.insured_name ?? null,
      read_legible: read?.legible ?? null,
      read_error: readError,
      read_at: now,
    });
  }

  let rows: CheckRow[] = [];
  let passed = false;
  if (read) {
    const outcome = compareDetails(target.required, typed, target.nameOnFile, read, target.documentLabel, todayIso());
    rows = outcome.rows;
    passed = outcome.passed;
  }

  Object.assign(patch, {
    check_rows: rows,
    check_passed: passed,
    checked_at: now,
    // A failed read is not a mismatch the sender can fix by typing; it stays
    // a draft with a read error and Send stays off.
    status: passed || readError ? "draft" : "needs_fix",
    sent_at: null,
  });

  const query = existingRaw
    ? db.from("vendor_document_checks").update(patch).eq("id", existingRaw.id)
    : db.from("vendor_document_checks").insert(patch);
  const { data: saved, error: saveErr } = await query.select(CHECK_FIELDS).single();
  if (saveErr || !saved) {
    console.error("[documentCheck] save failed:", saveErr?.message);
    return { ok: false, error: "Could not save the check. Try again.", status: 500 };
  }

  if (priorDraftPath) {
    await db.storage.from(target.bucket).remove([priorDraftPath]).catch(() => {});
  }

  return { ok: true, check: saved as CheckRecord };
}

/**
 * Re-proves the stored check right before Send. Nothing is trusted from
 * the browser: the comparison is recomputed from the stored typed and
 * read values, and the read must belong to the stored file.
 */
export function verifyForSend(target: Target, c: CheckRecord | null): string | null {
  if (!c || !c.file_path) return "Check My Document first.";
  if (c.status === "sent") return "This document was already sent.";
  if (!c.read_sha256 || c.read_sha256 !== c.file_sha256 || c.read_error) {
    return "Check My Document first.";
  }
  const outcome = compareDetails(
    target.required,
    { expiration: c.typed_expiration_date, number: c.typed_doc_number },
    target.nameOnFile,
    {
      expiration_date: c.read_expiration_date,
      doc_number: c.read_doc_number,
      insured_name: c.read_insured_name,
      legible: c.read_legible !== false,
    },
    target.documentLabel,
    todayIso(),
  );
  if (!outcome.passed) return "Every detail has to match before you can send.";
  return null;
}

/** Marks the check sent, after the document row has been written. */
export async function markSent(db: Db, checkId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await db
    .from("vendor_document_checks")
    .update({ status: "sent", sent_at: now, updated_at: now })
    .eq("id", checkId);
  if (error) console.error("[documentCheck] markSent failed:", error.message);
}

/** Sniffs PDF / JPEG / PNG from the first bytes; null for anything else. */
export function sniffType(bytes: Uint8Array): { mime: string; ext: string } | null {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { mime: "application/pdf", ext: "pdf" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (
    bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }
  return null;
}
