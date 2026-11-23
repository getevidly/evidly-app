// ═══════════════════════════════════════════════════════════
// vendorDocumentRules — which details a sender must type for an inbound
// vendor document, shared by both inbound flows:
//
//   kitchen  compliance_documents.type, the free-text names a kitchen
//            picks in RequestFromVendorModal (BUSINESS_DOC_TYPES)
//   partner  partner_documents.doc_type, the six Trusted Partner slots
//
// Arthur's rule: the sender types the expiration date AND the policy or
// license number. A W-9 has neither a number nor an expiration date the
// rule can use. Agreements and "Other" have no policy or license number.
// ═══════════════════════════════════════════════════════════

export type Flow = "kitchen" | "partner";

export interface RequiredFields {
  /** Policy or License Number is required. */
  number: boolean;
  /** Expiration Date is required. */
  expiry: boolean;
  /** What to call the number on screen. */
  numberLabel: string;
}

const isW9 = (t: string) => /\bw-?9\b/i.test(t);
const isInsurance = (t: string) =>
  /coi|insurance|liability|workers.?comp/i.test(t);

export function requiredFields(flow: Flow, type: string): RequiredFields {
  const t = (type || "").trim();
  if (isW9(t)) return { number: false, expiry: flow === "partner", numberLabel: "Number" };

  if (flow === "kitchen" && /master service agreement|^other$/i.test(t)) {
    return { number: false, expiry: true, numberLabel: "Number" };
  }

  return {
    number: true,
    expiry: true,
    numberLabel: isInsurance(t) ? "Policy Number" : "License Number",
  };
}

/** Strict YYYY-MM-DD that is also a real calendar date. */
export function parseDateOnly(raw: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((raw || "").trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const dt = new Date(`${y}-${mo}-${d}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return null;
  if (
    dt.getUTCFullYear() !== Number(y) ||
    dt.getUTCMonth() + 1 !== Number(mo) ||
    dt.getUTCDate() !== Number(d)
  ) return null;
  return `${y}-${mo}-${d}`;
}

/** Trimmed, at most 80 characters, or null when empty. */
export function cleanNumber(raw: string): string | null {
  const v = (raw || "").trim().slice(0, 80);
  return v ? v : null;
}

/**
 * Validates the typed fields for one document. Returns an error message for
 * the sender, or null when everything required is present and well formed.
 */
export function validateTyped(
  req: RequiredFields,
  expirationRaw: string,
  numberRaw: string,
): { error: string | null; expiration: string | null; number: string | null } {
  const number = cleanNumber(numberRaw);
  let expiration: string | null = null;

  if (expirationRaw.trim()) {
    expiration = parseDateOnly(expirationRaw);
    if (!expiration) {
      return { error: "Enter the expiration date as a real date.", expiration: null, number };
    }
  }
  if (req.expiry && !expiration) {
    return { error: "Enter the expiration date.", expiration: null, number };
  }
  if (req.number && !number) {
    return { error: `Enter the ${req.numberLabel.toLowerCase()}.`, expiration, number };
  }
  return { error: null, expiration, number: req.number ? number : null };
}
