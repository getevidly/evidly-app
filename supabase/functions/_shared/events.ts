// Non-blocking event logger for Policy Lens funnel events.

import { createClient } from "npm:@supabase/supabase-js@2";
import { logger } from "./logger.ts";

/**
 * Log a Policy Lens funnel event. Catches all errors and never
 * throws — safe to await without breaking the main flow.
 */
export async function logEvent(
  supabase: ReturnType<typeof createClient>,
  event: {
    event_type: string;
    intake_id?: string;
    referral_code?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await supabase.from("policy_lens_events").insert({
      event_type: event.event_type,
      intake_id: event.intake_id || null,
      referral_code: event.referral_code || null,
      metadata: event.metadata || null,
    });
  } catch (err) {
    logger.error("[events] Failed to log event", event.event_type, err);
  }
}
