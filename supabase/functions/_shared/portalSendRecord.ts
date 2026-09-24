/**
 * _shared/portalSendRecord.ts — the /portal/<token> link mechanism.
 *
 * A client reads a document without logging in at
 * https://app.getevidly.com/portal/<secure_token>. portal-access resolves the
 * token against compliance_document_send_records and lists the documents
 * named by its compliance_document_send_items rows.
 *
 * These helpers write those two tables exactly as county-briefing's
 * buildCertLinkForRecipient does: recipient_type 'client_legal' (the value
 * the live CHECK accepts for a client), crypto.randomUUID() as the token, and
 * every item written with recommendation_tier 'manual' and
 * included_in_send true — portal-access filters on included_in_send, so an
 * item without it never shows.
 *
 * Requires a SERVICE-ROLE client. Callers enforce their own auth.
 */

// deno-lint-ignore no-explicit-any
type Supa = any;

export const PORTAL_BASE_URL = "https://app.getevidly.com/portal";

export function portalUrlFor(token: string): string {
  return `${PORTAL_BASE_URL}/${token}`;
}

/** Create a send record and one item per document. Returns the new token. */
export async function createPortalSendRecord(
  supabase: Supa,
  p: {
    organizationId: string;
    recipientName: string;
    recipientEmail: string | null;
    purpose: string;
    coverMessage?: string | null;
    expiresAt: Date;
    documentIds: string[];
    metadata?: Record<string, unknown>;
  },
): Promise<{ id: string; secureToken: string }> {
  const secureToken = crypto.randomUUID();

  const { data: rec, error: recErr } = await supabase
    .from("compliance_document_send_records")
    .insert({
      organization_id: p.organizationId,
      recipient_type: "client_legal",
      recipient_name: p.recipientName,
      recipient_email: p.recipientEmail,
      purpose: p.purpose,
      cover_message: p.coverMessage ?? null,
      secure_token: secureToken,
      secure_token_expires_at: p.expiresAt.toISOString(),
      metadata: p.metadata ?? {},
    })
    .select("id")
    .single();

  if (recErr || !rec) {
    throw new Error(`send-record insert failed: ${recErr?.message || "no row"}`);
  }

  await addDocumentsToSendRecord(supabase, rec.id as string, p.documentIds);
  return { id: rec.id as string, secureToken };
}

/**
 * Add documents to an existing send record. Idempotent: the table is unique
 * on (send_record_id, document_id), so a document already in the package is
 * left alone rather than rejected.
 */
export async function addDocumentsToSendRecord(
  supabase: Supa,
  sendRecordId: string,
  documentIds: string[],
): Promise<void> {
  if (documentIds.length === 0) return;

  const { error } = await supabase
    .from("compliance_document_send_items")
    .upsert(
      documentIds.map((docId) => ({
        send_record_id: sendRecordId,
        document_id: docId,
        recommendation_tier: "manual",
        included_in_send: true,
      })),
      { onConflict: "send_record_id,document_id", ignoreDuplicates: true },
    );

  if (error) throw new Error(`send-items insert failed: ${error.message}`);
}
