// ═══════════════════════════════════════════════════════════
// partnerDocState — the docs[] shape partner-token and partner-upload both
// return, now with the sender-side check for each slot.
//
// One builder so the two functions can never disagree about what the
// partner's page shows. Built from DOC_TYPES, not from the rows, so the
// page always renders the same six slots in the same order.
//
// `check` is the partner's own open draft (draft or needs_fix): what they
// typed, what was read, and the comparison rows. It is only ever returned
// to the token holder, never to the recipient's Partners tab.
// ═══════════════════════════════════════════════════════════

import { requiredFields } from "./vendorDocumentRules.ts";
import { CHECK_FIELDS, type CheckRecord, publicCheckState } from "./vendorDocumentCheckFlow.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

export const PARTNER_DOC_TYPES = [
  "business_license",
  "professional_license",
  "w9",
  "liability_insurance",
  "workers_comp",
  "auto_insurance",
] as const;

export const PARTNER_DOC_LABELS: Record<string, string> = {
  business_license: "Business License",
  professional_license: "Professional License",
  w9: "W-9",
  liability_insurance: "Liability Insurance",
  workers_comp: "Workers' Comp",
  auto_insurance: "Auto Insurance",
};

interface Row {
  id: string;
  doc_type: string;
  file_path: string | null;
  expiration_date: string | null;
  doc_number: string | null;
  review_status: string | null;
}

export async function partnerDocsState(
  db: Db,
  applicationId: string,
): Promise<{ ok: true; docs: unknown[] } | { ok: false }> {
  const { data: rows, error } = await db
    .from("partner_documents")
    .select("id, doc_type, file_path, expiration_date, doc_number, review_status")
    .eq("application_id", applicationId);
  if (error) {
    console.error("[partnerDocState] document read failed:", error.message);
    return { ok: false };
  }

  const byType = new Map<string, Row>(((rows ?? []) as Row[]).map((r) => [r.doc_type, r]));
  const ids = ((rows ?? []) as Row[]).map((r) => r.id);

  const checksByDoc = new Map<string, CheckRecord>();
  if (ids.length) {
    const { data: checks } = await db
      .from("vendor_document_checks")
      .select(CHECK_FIELDS)
      .in("partner_document_id", ids)
      .neq("status", "sent");
    for (const c of (checks ?? []) as CheckRecord[]) {
      if (c.partner_document_id) checksByDoc.set(c.partner_document_id, c);
    }
  }

  return {
    ok: true,
    docs: PARTNER_DOC_TYPES.map((doc_type) => {
      const row = byType.get(doc_type);
      const req = requiredFields("partner", doc_type);
      return {
        doc_type,
        uploaded: Boolean(row?.file_path),
        expiration_date: row?.expiration_date ?? null,
        doc_number: row?.doc_number ?? null,
        review_status: row?.review_status ?? null,
        needs_number: req.number,
        number_label: req.numberLabel,
        check: row ? publicCheckState(checksByDoc.get(row.id) ?? null) : null,
      };
    }),
  };
}
