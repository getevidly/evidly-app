/**
 * resend-inbound-email — INBOUND-COMMS-03
 *
 * Receives inbound email webhooks from Resend.
 * Verifies Svix HMAC-SHA256 signature.
 * Parses reply+{threadId}@reply.getevidly.com, records message,
 * stores attachments, fires org notification.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { parseReplyAddress } from "../_shared/replyAddress.ts";
import { recordMessage } from "../_shared/threadMessage.ts";
import { createOrgNotification } from "../_shared/notify.ts";
import { logger } from "../_shared/logger.ts";
import { PUBLIC_CORS_HEADERS } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...PUBLIC_CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/**
 * Verify Svix webhook signature (HMAC-SHA256).
 * Secret format: "whsec_" + base64-encoded key.
 */
async function verifySvixSignature(
  secret: string,
  msgId: string,
  timestamp: string,
  body: string,
  signatures: string
): Promise<boolean> {
  try {
    // Validate timestamp (5 minute tolerance)
    const ts = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > 300) {
      logger.warn("[INBOUND-EMAIL] Svix timestamp outside tolerance", { ts, now });
      return false;
    }

    // Decode secret (strip "whsec_" prefix, base64-decode)
    const secretBytes = Uint8Array.from(
      atob(secret.startsWith("whsec_") ? secret.slice(6) : secret),
      (c) => c.charCodeAt(0)
    );

    // Build signing content: "{msgId}.{timestamp}.{body}"
    const content = `${msgId}.${timestamp}.${body}`;
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(content));
    const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));

    // Svix sends comma-separated "v1,{base64}" pairs
    const candidates = signatures.split(" ").map((s) => s.trim());
    for (const candidate of candidates) {
      const parts = candidate.split(",");
      if (parts.length === 2 && parts[1] === expected) {
        return true;
      }
    }
    return false;
  } catch (err) {
    logger.error("[INBOUND-EMAIL] Signature verification error", (err as Error).message);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: PUBLIC_CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // ── 1. Read raw body for signature verification ──────────
  const rawBody = await req.text();

  // ── 2. Verify Svix signature ─────────────────────────────
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  const webhookSecret = Deno.env.get("RESEND_INBOUND_WEBHOOK_SECRET");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return jsonResponse({ error: "Missing webhook signature headers" }, 401);
  }

  if (!webhookSecret) {
    logger.warn("[INBOUND-EMAIL] RESEND_INBOUND_WEBHOOK_SECRET not set — rejecting");
    return jsonResponse({ error: "Webhook secret not configured" }, 500);
  }

  const valid = await verifySvixSignature(
    webhookSecret, svixId, svixTimestamp, rawBody, svixSignature
  );
  if (!valid) {
    logger.warn("[INBOUND-EMAIL] Invalid Svix signature");
    return jsonResponse({ error: "Invalid signature" }, 401);
  }

  // ── 3. Parse payload ─────────────────────────────────────
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const from = payload.from as string | undefined;
  const to = payload.to as string[] | string | undefined;
  const subject = payload.subject as string | undefined;
  const text = payload.text as string | undefined;
  const html = payload.html as string | undefined;
  const messageId = (payload.message_id || payload.id || svixId) as string;
  const attachments = payload.attachments as Array<{
    filename?: string;
    content_type?: string;
    content?: string; // base64
    size?: number;
  }> | undefined;

  if (!from || !to) {
    logger.warn("[INBOUND-EMAIL] Missing from/to fields");
    return jsonResponse({ ok: true, skipped: "missing_fields" });
  }

  // ── 4. Resolve thread from reply address ─────────────────
  const toAddresses = Array.isArray(to) ? to : [to];
  let threadId: string | null = null;
  for (const addr of toAddresses) {
    threadId = parseReplyAddress(addr);
    if (threadId) break;
  }

  if (!threadId) {
    logger.info("[INBOUND-EMAIL] No thread ID in recipient — ignoring", toAddresses);
    return jsonResponse({ ok: true, skipped: "no_thread_id" });
  }

  // ── 5. Look up thread and verify it exists ───────────────
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: thread, error: threadErr } = await supabase
    .from("message_threads")
    .select("id, organization_id, entity_type, entity_id")
    .eq("id", threadId)
    .single();

  if (threadErr || !thread) {
    logger.warn("[INBOUND-EMAIL] Thread not found", threadId);
    return jsonResponse({ ok: true, skipped: "thread_not_found" });
  }

  // ── 6. Record the inbound message ────────────────────────
  const msg = await recordMessage({
    supabase,
    threadId: thread.id,
    organizationId: thread.organization_id,
    channel: "email",
    direction: "inbound",
    senderType: "vendor",
    senderIdentifier: from,
    subject: subject || null,
    bodyText: text || null,
    bodyHtml: html || null,
    providerMessageId: messageId,
    metadata: { raw_to: toAddresses },
  });

  if (!msg) {
    // Duplicate or insert failure — acknowledge to prevent retry
    return jsonResponse({ ok: true, skipped: "duplicate_or_error" });
  }

  // ── 7. Store attachments ─────────────────────────────────
  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      if (!att.content || !att.filename) continue;
      try {
        const decoded = Uint8Array.from(atob(att.content), (c) => c.charCodeAt(0));
        const storagePath = `${thread.organization_id}/${thread.id}/${msg.id}/${att.filename}`;

        const { error: uploadErr } = await supabase.storage
          .from("message-attachments")
          .upload(storagePath, decoded, {
            contentType: att.content_type || "application/octet-stream",
            upsert: false,
          });

        if (uploadErr) {
          logger.error("[INBOUND-EMAIL] Attachment upload failed", att.filename, uploadErr.message);
          continue;
        }

        await supabase.from("message_attachments").insert({
          message_id: msg.id,
          organization_id: thread.organization_id,
          file_name: att.filename,
          file_type: att.content_type || null,
          file_size: att.size || decoded.length,
          storage_path: storagePath,
        });
      } catch (err) {
        logger.error("[INBOUND-EMAIL] Attachment processing error", att.filename, (err as Error).message);
      }
    }
  }

  // ── 8. Update thread timestamp ───────────────────────────
  await supabase
    .from("message_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", thread.id);

  // ── 9. Notify org operators (entity-type-aware routing) ──
  let notifTitle = "Vendor Reply Received";
  let notifBody = `New email reply from ${from}${subject ? `: ${subject}` : ""}`;
  let notifUrl = `/vendors?tab=requests`;

  if (thread.entity_type === "vendor_network_contact") {
    notifTitle = "Network Vendor Replied";
    notifBody = `Reply from ${from}${subject ? `: ${subject}` : ""}`;
    notifUrl = `/vendor-network?vendor=${thread.entity_id}&modal=contact`;
  }

  await createOrgNotification({
    supabase,
    organizationId: thread.organization_id,
    type: "vendor_replied",
    category: "vendors",
    title: notifTitle,
    body: notifBody,
    actionUrl: notifUrl,
    priority: "medium",
    severity: "info",
    sourceType: "message",
    sourceId: msg.id,
    deduplicate: false,
  });

  logger.info("[INBOUND-EMAIL] Processed", threadId, from);
  return jsonResponse({ ok: true, message_id: msg.id });
});
