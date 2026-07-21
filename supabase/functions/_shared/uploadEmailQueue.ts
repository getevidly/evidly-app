/**
 * Upload-notification email queue — enqueue + flush.
 *
 * Both vendor-secure-upload and notify-document-upload call
 * enqueueUploadNotification() then triggerDelayedFlush().
 *
 * flushUploadQueue() is the core batch processor:
 *   1. Atomically claim queued items whose batch window elapsed.
 *   2. Determine actor line (single actor → named, mixed → neutral).
 *   3. Build payload via shared helper.
 *   4. Resolve recipients via shared resolver (routing, opt-out, location).
 *   5. Send one email per recipient via vendor-document-notify.
 *   6. Mark items as 'sent' (or 'failed').
 */

// deno-lint-ignore-file no-explicit-any
import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { buildUploadNotificationPayload, type UploadedBy } from "./buildUploadNotification.ts";
import { resolveUploadRecipients } from "./resolveUploadRecipients.ts";
import { getServerRoutingForDocType } from "./uploadNotificationRouting.ts";
import { logger } from "./logger.ts";

/** Default batch window in seconds. Items aren't flushed until the oldest
 *  queued item exceeds this age. */
const BATCH_WINDOW_SECONDS = 60;

/* ── Types ─────────────────────────────────────────────────────── */

export interface EnqueueItem {
  organization_id: string;
  document_id: string;
  uploaded_by_type: "vendor" | "user";
  uploaded_by_name: string;
  uploaded_by_user_id: string | null;
}

/* ── Enqueue ───────────────────────────────────────────────────── */

export async function enqueueUploadNotification(
  supabase: SupabaseClient,
  items: EnqueueItem[],
): Promise<void> {
  if (items.length === 0) return;

  const rows = items.map((i) => ({
    organization_id: i.organization_id,
    document_id: i.document_id,
    uploaded_by_type: i.uploaded_by_type,
    uploaded_by_name: i.uploaded_by_name,
    uploaded_by_user_id: i.uploaded_by_user_id || null,
  }));

  // ON CONFLICT with the partial unique index (document_id WHERE
  // status IN ('queued','processing')) silently ignores duplicates.
  const { error } = await supabase
    .from("document_upload_email_queue")
    .insert(rows);

  if (error) {
    // 23505 = unique_violation — expected for double-enqueue, ignore
    if (error.code !== "23505") {
      logger.error("[QUEUE] Enqueue failed", error.message);
    }
  }
}

/* ── Trigger delayed flush ─────────────────────────────────────── */

/**
 * Schedules a delayed flush via EdgeRuntime.waitUntil.
 * The delay (BATCH_WINDOW_SECONDS + 30s buffer) ensures the batch
 * window has elapsed before the flush fires.
 */
export function triggerDelayedFlush(
  supabaseUrl: string,
  serviceKey: string,
  organizationId: string,
): void {
  const flushUrl = `${supabaseUrl}/functions/v1/flush-upload-notifications`;
  const delayMs = (BATCH_WINDOW_SECONDS + 30) * 1000;

  const flushTask = new Promise<void>((resolve) => {
    setTimeout(async () => {
      try {
        await fetch(flushUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ organization_id: organizationId }),
        });
      } catch {
        // Non-critical — a subsequent upload will retry
      }
      resolve();
    }, delayMs);
  });

  try {
    // @ts-ignore EdgeRuntime provided by Supabase edge runtime
    EdgeRuntime.waitUntil(flushTask);
  } catch {
    // EdgeRuntime not available — fire immediately as fallback
    flushTask.catch(() => {});
  }
}

/* ── Flush ─────────────────────────────────────────────────────── */

export async function flushUploadQueue(
  supabase: SupabaseClient,
  organizationId: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<{ sent: boolean; emailCount: number }> {
  const batchKey = crypto.randomUUID();

  // ── 1. Atomic claim ────────────────────────────────────────
  const { data: claimed, error: claimErr } = await supabase
    .rpc("claim_upload_queue_batch", {
      p_org_id: organizationId,
      p_batch_key: batchKey,
      p_window_seconds: BATCH_WINDOW_SECONDS,
    });

  if (claimErr) {
    logger.error("[FLUSH] Claim RPC failed", claimErr.message);
    return { sent: false, emailCount: 0 };
  }

  if (!claimed || claimed.length === 0) {
    return { sent: false, emailCount: 0 };
  }

  logger.info("[FLUSH] Claimed batch", `${claimed.length} items`, organizationId);

  try {
    // ── 2. Determine actor line ──────────────────────────────
    const actors = new Map<string, { type: string; name: string }>();
    const uploaderUserIds: string[] = [];

    for (const item of claimed as any[]) {
      const key = `${item.uploaded_by_type}:${item.uploaded_by_name}`;
      actors.set(key, { type: item.uploaded_by_type, name: item.uploaded_by_name });
      if (item.uploaded_by_user_id) {
        uploaderUserIds.push(item.uploaded_by_user_id);
      }
    }

    const isMixed = actors.size > 1;
    const singleActor = isMixed ? null : [...actors.values()][0];

    const uploadedBy: UploadedBy = isMixed
      ? { type: "mixed" as any, name: "" }
      : { type: singleActor!.type as "vendor" | "user", name: singleActor!.name };

    // ── 3. Fetch documents for routing + payload ─────────────
    const documentIds = (claimed as any[]).map((c) => c.document_id);

    const { data: docs } = await supabase
      .from("compliance_documents")
      .select("id, type, name, category, vendor_id, service_type_code, location_id")
      .in("id", documentIds);

    const docList: any[] = docs || [];

    // ── 4. Apply routing — filter to email-eligible docs ─────
    const emailDocs = docList.filter((d) => {
      const routing = getServerRoutingForDocType(d.type);
      return routing.channels.includes("email");
    });

    if (emailDocs.length === 0) {
      // No docs eligible for email — mark as sent and return
      await markBatchStatus(supabase, batchKey, "sent");
      logger.info("[FLUSH] No email-eligible docs — skipped", organizationId);
      return { sent: true, emailCount: 0 };
    }

    // Union of roles across email-eligible docs
    const allRoles = [
      ...new Set(
        emailDocs.flatMap((d) => getServerRoutingForDocType(d.type).roles),
      ),
    ];

    // Union of location_ids
    const allLocationIds = [
      ...new Set(
        emailDocs.map((d) => d.location_id).filter(Boolean) as string[],
      ),
    ];

    // ── 5. Build notification payload ────────────────────────
    const emailDocIds = emailDocs.map((d) => d.id);
    const payload = await buildUploadNotificationPayload(supabase, {
      document_ids: emailDocIds,
      organization_id: organizationId,
      uploaded_by: uploadedBy,
    });

    // ── 6. Resolve recipients ────────────────────────────────
    const recipients = await resolveUploadRecipients({
      supabase,
      organizationId,
      roles: allRoles,
      locationIds: allLocationIds,
      documentIds: emailDocIds,
      excludeUserIds: [...new Set(uploaderUserIds)],
    });

    if (recipients.length === 0) {
      await markBatchStatus(supabase, batchKey, "sent");
      logger.info("[FLUSH] No recipients after filtering", organizationId);
      return { sent: true, emailCount: 0 };
    }

    // ── 7. Send emails via vendor-document-notify ────────────
    const notifyUrl = `${supabaseUrl}/functions/v1/vendor-document-notify`;
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 15_000);

    const results = await Promise.allSettled(
      recipients.map((r) =>
        fetch(notifyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            recipientEmail: r.email,
            recipientName: r.name,
            vendor_name: payload.vendor_name,
            org_name: payload.org_name,
            doc_count: payload.doc_count,
            records: payload.records,
            standing: payload.standing,
            uploaded_by: payload.uploaded_by,
            action_url: r.actionUrl,
          }),
          signal: controller.signal,
        }),
      ),
    );

    const sentCount = results.filter((r) => r.status === "fulfilled").length;
    logger.info("[FLUSH] Sent", `${sentCount}/${recipients.length} emails`, organizationId);

    // ── 8. Mark batch as sent ────────────────────────────────
    await markBatchStatus(supabase, batchKey, "sent");

    return { sent: true, emailCount: sentCount };
  } catch (err) {
    logger.error("[FLUSH] Processing failed", (err as Error).message);
    await markBatchStatus(supabase, batchKey, "failed");
    return { sent: false, emailCount: 0 };
  }
}

/* ── Helpers ───────────────────────────────────────────────────── */

async function markBatchStatus(
  supabase: SupabaseClient,
  batchKey: string,
  status: "sent" | "failed",
): Promise<void> {
  await supabase
    .from("document_upload_email_queue")
    .update({
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    })
    .eq("batch_key", batchKey);
}
