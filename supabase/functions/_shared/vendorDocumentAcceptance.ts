// ═══════════════════════════════════════════════════════════
// vendorDocumentAcceptance — the recipient side of an inbound vendor
// document: tamper detection and the "Ask Vendor a Question" email.
//
// Used by document-review-action (kitchen recipient) and partner-admin
// (Arthur, for Trusted Partner documents). The recipient previews and
// accepts; they never fix anything.
//
// Tamper detection: the file's SHA-256 was taken when the sender's check
// passed (content_sha256). Accepting re-hashes the stored file and refuses
// if it changed; after that, fileIntact() can be asked at any time.
// ═══════════════════════════════════════════════════════════

import { sha256Hex } from "./documentCheck.ts";
import { buildEmailHtml, sendEmail } from "./email.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

/** true = same bytes as checked, false = changed or missing, null = nothing to compare. */
export async function fileIntact(
  db: Db,
  bucket: string,
  path: string | null,
  expectedSha: string | null,
): Promise<boolean | null> {
  if (!path || !expectedSha) return null;
  const { data: blob, error } = await db.storage.from(bucket).download(path);
  if (error || !blob) return false;
  const actual = await sha256Hex(new Uint8Array(await blob.arrayBuffer()));
  return actual === expectedSha;
}

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Emails the vendor one question from the recipient. Never throws. */
export async function emailVendorQuestion(msg: {
  to: string;
  vendorName: string;
  documentLabel: string;
  askedBy: string;
  replyTo: string | null;
  question: string;
}): Promise<boolean> {
  const sent = await sendEmail({
    to: msg.to,
    replyTo: msg.replyTo ?? undefined,
    subject: `A Question About Your ${msg.documentLabel}`,
    html: buildEmailHtml({
      recipientName: msg.vendorName,
      bodyHtml: `
        <p>${esc(msg.askedBy)} has a question about the ${esc(msg.documentLabel)} you sent:</p>
        <blockquote style="margin: 16px 0; padding: 12px 16px; border-left: 3px solid #1E2D4D; background: #FAF7F0;">
          ${esc(msg.question).replace(/\n/g, "<br>")}
        </blockquote>
        <p>Reply to this email to answer.</p>`,
    }),
  });
  return Boolean(sent);
}
