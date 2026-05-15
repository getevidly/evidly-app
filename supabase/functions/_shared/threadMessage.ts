/**
 * _shared/threadMessage.ts — INBOUND-COMMS-02
 *
 * Non-throwing helpers for thread/message management.
 * Pattern matches sendEmail(): returns data or null, never throws.
 */

import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { logger } from "./logger.ts";

interface EnsureThreadParams {
  supabase: SupabaseClient;
  organizationId: string;
  entityType: string;
  entityId: string;
  subject?: string;
}

interface RecordMessageParams {
  supabase: SupabaseClient;
  threadId: string;
  organizationId: string;
  channel: "email" | "sms" | "in_app";
  direction: "inbound" | "outbound";
  senderType: "operator" | "vendor" | "system";
  senderIdentifier?: string;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  providerMessageId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Upsert a message_thread for the given entity.
 * Returns the thread row or null on failure.
 */
export async function ensureThread(
  params: EnsureThreadParams
): Promise<{ id: string; organization_id: string } | null> {
  try {
    const { supabase, organizationId, entityType, entityId, subject } = params;

    const { data, error } = await supabase
      .from("message_threads")
      .upsert(
        {
          organization_id: organizationId,
          entity_type: entityType,
          entity_id: entityId,
          subject: subject || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "entity_type,entity_id,organization_id" }
      )
      .select("id, organization_id")
      .single();

    if (error) {
      logger.error("[THREAD] ensureThread failed", entityType, entityId, error.message);
      return null;
    }
    return data;
  } catch (err) {
    logger.error("[THREAD] ensureThread unexpected", (err as Error).message);
    return null;
  }
}

/**
 * Insert a message row into the messages table.
 * Returns the message row or null on failure.
 */
export async function recordMessage(
  params: RecordMessageParams
): Promise<{ id: string } | null> {
  try {
    const { supabase, threadId, organizationId, channel, direction,
            senderType, senderIdentifier, subject, bodyText, bodyHtml,
            providerMessageId, metadata } = params;

    const { data, error } = await supabase
      .from("messages")
      .insert({
        thread_id: threadId,
        organization_id: organizationId,
        channel,
        direction,
        sender_type: senderType,
        sender_identifier: senderIdentifier || null,
        subject: subject || null,
        body_text: bodyText || null,
        body_html: bodyHtml || null,
        inbound_provider_message_id: providerMessageId || null,
        metadata: metadata || {},
      })
      .select("id")
      .single();

    if (error) {
      // Unique constraint violation = duplicate delivery — not an error
      if (error.code === "23505") {
        logger.info("[THREAD] Duplicate message skipped", providerMessageId);
        return null;
      }
      logger.error("[THREAD] recordMessage failed", error.message);
      return null;
    }
    return data;
  } catch (err) {
    logger.error("[THREAD] recordMessage unexpected", (err as Error).message);
    return null;
  }
}
