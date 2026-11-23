// ═══════════════════════════════════════════════════════════
// documentCheck — reads an inbound vendor document and compares it with
// what the sender typed, ON THE SENDER'S SCREEN, before anything is sent.
//
// Shared by both inbound flows (vendor-secure-upload for kitchen requests,
// partner-upload for Trusted Partners). Two halves, kept apart on purpose:
//
//   readDocument()    one Anthropic call per FILE. The values it reads
//                     depend only on the file, so they are stored and
//                     re-used: changing a typed field re-runs the
//                     comparison without reading the file again.
//   compareDetails()  pure and deterministic: typed vs read, row by row.
//
// The comparison is the only gate on Send. It never guesses: a detail the
// document does not show is "Not Found on the Document", and that keeps
// Send off exactly like a mismatch does.
// ═══════════════════════════════════════════════════════════

import Anthropic from "npm:@anthropic-ai/sdk@1.6.0";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import type { RequiredFields } from "./vendorDocumentRules.ts";

export const CHECK_MODEL = "claude-opus-5-5";

export interface ReadValues {
  expiration_date: string | null;
  doc_number: string | null;
  insured_name: string | null;
  legible: boolean;
}

export type RowKey = "expiration" | "number" | "insured_name";
export type RowResult = "match" | "mismatch" | "not_found";

export interface CheckRow {
  key: RowKey;
  detail: string;
  you_typed: string | null;
  on_document: string | null;
  result: RowResult;
  /** Title Case button label for the sender, or null when the row matches. */
  fix: string | null;
}

export interface CheckOutcome {
  passed: boolean;
  rows: CheckRow[];
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["legible", "expiration_date", "doc_number", "insured_name"],
  properties: {
    legible: { type: "boolean" },
    expiration_date: { type: ["string", "null"] },
    doc_number: { type: ["string", "null"] },
    insured_name: { type: ["string", "null"] },
  },
};

const SYSTEM =
  "You read business documents that a vendor is submitting to a client: " +
  "certificates of insurance, business and professional licenses, " +
  "certifications, W-9 forms and agreements. Report only what is printed " +
  "on the document. Never infer or guess a value; use null when the " +
  "document does not show it or it cannot be read.";

function instruction(documentLabel: string): string {
  return [
    `The sender says this document is: ${documentLabel}.`,
    "Return:",
    "- legible: false if the document cannot be read at all.",
    "- expiration_date: the date this document, policy, license or certification expires, as YYYY-MM-DD.",
    "  On a certificate of insurance with several policies, use the policy that matches the document named above.",
    "- doc_number: the policy number, license number or certificate number for that same policy or license, exactly as printed.",
    "- insured_name: the insured, licensee or certificate holder business name as printed (on a W-9, the name on line 1 or the business name on line 2).",
  ].join("\n");
}

export type ReadResult = { ok: true; read: ReadValues } | { ok: false; error: string };

/** Reads one PDF, JPEG or PNG. Never throws. */
export async function readDocument(
  bytes: Uint8Array,
  mimeType: string,
  documentLabel: string,
): Promise<ReadResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return { ok: false, error: "reader_not_configured" };

  const data = encodeBase64(bytes);
  const fileBlock = mimeType === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
    : {
      type: "image",
      source: { type: "base64", media_type: mimeType === "image/png" ? "image/png" : "image/jpeg", data },
    };

  const client = new Anthropic({ apiKey });

  try {
    // Server-side fallback on a refusal, so one declined read does not leave
    // the sender stuck. Effort low: this is a short extraction.
    // deno-lint-ignore no-explicit-any
    const params: any = {
      model: CHECK_MODEL,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SCHEMA },
      },
      messages: [{
        role: "user",
        content: [fileBlock, { type: "text", text: instruction(documentLabel) }],
      }],
    };
    // deno-lint-ignore no-explicit-any
    const msg: any = await client.beta.messages.create(params);

    if (msg.stop_reason === "refusal") return { ok: false, error: "reader_declined" };

    // deno-lint-ignore no-explicit-any
    const text = (msg.content as any[]).find((b) => b.type === "text")?.text;
    if (!text) return { ok: false, error: "reader_empty" };

    const parsed = JSON.parse(text) as Partial<ReadValues>;
    const date = typeof parsed.expiration_date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(parsed.expiration_date)
      ? parsed.expiration_date
      : null;
    const str = (v: unknown) =>
      typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : null;

    return {
      ok: true,
      read: {
        legible: parsed.legible !== false,
        expiration_date: date,
        doc_number: str(parsed.doc_number),
        insured_name: str(parsed.insured_name),
      },
    };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return { ok: false, error: "reader_busy" };
    if (err instanceof Anthropic.APIError) {
      console.error("[documentCheck] API error", err.status, err.message);
      return { ok: false, error: "reader_failed" };
    }
    console.error("[documentCheck] read failed:", err instanceof Error ? err.message : err);
    return { ok: false, error: "reader_failed" };
  }
}

/** What the sender sees when the file could not be read at all. */
export function readErrorMessage(code: string): string {
  if (code === "reader_busy") return "The document reader is busy. Try Check My Document again in a minute.";
  if (code === "reader_not_configured") return "The document reader is not set up yet. Contact the person who sent you this link.";
  return "We could not read that file. Upload a clear PDF or photo of the whole document.";
}

/** SHA-256 hex of the exact bytes: the file the check was run on. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const normNumber = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

const SUFFIXES = /\b(llc|l l c|inc|incorporated|co|corp|corporation|company|ltd|limited|lp|llp|pc|dba)\b/g;
const normName = (s: string) =>
  s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9 ]/g, " ")
    .replace(SUFFIXES, " ").replace(/\s+/g, " ").trim();

/** Same business: equal after normalising, or one name contains the other. */
export function namesMatch(a: string, b: string): boolean {
  const x = normName(a);
  const y = normName(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

/** MM/DD/YYYY for people; the stored value stays YYYY-MM-DD. */
export function usDate(iso: string | null): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
}

/**
 * Compares typed details with what was read. `nameOnFile` is the vendor
 * business name the request was sent to; the insured name on the document
 * must match it. `documentLabel` names the "Upload the Current ..." action
 * when the file itself is the problem.
 */
export function compareDetails(
  required: RequiredFields,
  typed: { expiration: string | null; number: string | null },
  nameOnFile: string | null,
  read: ReadValues,
  documentLabel: string,
  todayIso: string,
): CheckOutcome {
  const uploadCurrent = `Upload the Current ${documentLabel}`;
  const rows: CheckRow[] = [];

  if (required.expiry) {
    const onDoc = read.expiration_date;
    let result: RowResult = "match";
    let fix: string | null = null;
    if (!onDoc) {
      result = "not_found";
      fix = uploadCurrent;
    } else if (onDoc < todayIso) {
      // The document itself has run out: retyping the date cannot fix that.
      result = "mismatch";
      fix = uploadCurrent;
    } else if (onDoc !== typed.expiration) {
      result = "mismatch";
      fix = "Fix Expiration Date";
    }
    rows.push({
      key: "expiration",
      detail: "Expiration Date",
      you_typed: usDate(typed.expiration),
      on_document: usDate(onDoc),
      result,
      fix,
    });
  }

  if (required.number) {
    const onDoc = read.doc_number;
    let result: RowResult = "match";
    let fix: string | null = null;
    if (!onDoc) {
      result = "not_found";
      fix = uploadCurrent;
    } else if (!typed.number || normNumber(onDoc) !== normNumber(typed.number)) {
      result = "mismatch";
      fix = "Fix Number";
    }
    rows.push({
      key: "number",
      detail: required.numberLabel,
      you_typed: typed.number,
      on_document: onDoc,
      result,
      fix,
    });
  }

  {
    const onDoc = read.insured_name;
    let result: RowResult = "match";
    let fix: string | null = null;
    if (!onDoc) {
      result = "not_found";
      fix = uploadCurrent;
    } else if (!nameOnFile || !namesMatch(onDoc, nameOnFile)) {
      result = "mismatch";
      fix = uploadCurrent;
    }
    rows.push({
      key: "insured_name",
      detail: "Insured Name",
      you_typed: nameOnFile,
      on_document: onDoc,
      result,
      fix,
    });
  }

  const passed = read.legible && rows.every((r) => r.result === "match");
  return { passed, rows };
}
