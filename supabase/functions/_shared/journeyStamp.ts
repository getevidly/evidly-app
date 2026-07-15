// Journey-stage idempotent stamper.
// Single source of truth — every stage writer calls this.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const ORDER = [
  "invited",
  "record_viewed",
  "demo_scheduled",
  "demo_completed",
  "policies_uploaded",
  "policies_read",
  "cc_on_file",
  "loa_signed",
  "account_configured",
  "training_completed",
] as const;

export type JourneyStage = (typeof ORDER)[number];

export function isValidStage(s: string): s is JourneyStage {
  return (ORDER as readonly string[]).includes(s);
}

// Manual stages require attribution — the staff member who clicked.
const MANUAL_STAGES: Partial<Record<JourneyStage, string>> = {
  demo_completed: "demo_completed_by",
  training_completed: "training_completed_by",
};

/**
 * Idempotent journey-stage stamp.
 *
 * - orgId null/undefined → silent no-op (prospect, no journey row)
 * - No existing row → insert with {org_id, <stage>_at, current_stage}
 * - Row exists, <stage>_at already set → no-op
 * - Row exists, <stage>_at null → set it; advance current_stage only
 *   if new stage is further along the ORDER than current
 *
 * For manual stages (demo_completed, training_completed), actorId is
 * written to the matching _by column. training_completed REQUIRES
 * actorId — throws if missing (the DB CHECK constraint would reject
 * it anyway; fail loud so the UI gets a clear error).
 *
 * Expects a service-role client. Throws on hard errors for manual
 * stages so callers can surface them. Silent log-and-return for
 * automatic stages.
 */
export async function stampJourneyStage(
  supabase: SupabaseClient,
  orgId: string | null | undefined,
  stage: JourneyStage,
  actorId?: string | null,
): Promise<void> {
  if (!orgId) return;

  // training_completed MUST have attribution.
  if (stage === "training_completed" && !actorId) {
    throw new Error(
      "training_completed requires actorId (staff attribution is mandatory)",
    );
  }

  const column = `${stage}_at`;
  const byColumn = MANUAL_STAGES[stage];
  const now = new Date().toISOString();

  const { data: row, error: selErr } = await supabase
    .from("journey_stages")
    .select("org_id, current_stage, " + column)
    .eq("org_id", orgId)
    .maybeSingle();

  if (selErr) {
    const msg = `[journeyStamp] select failed: ${selErr.message}`;
    if (byColumn) throw new Error(msg);
    console.error(msg);
    return;
  }

  if (!row) {
    // No journey row — create one.
    const insert: Record<string, unknown> = {
      org_id: orgId,
      [column]: now,
      current_stage: stage,
    };
    if (byColumn && actorId) insert[byColumn] = actorId;

    const { error: insErr } = await supabase
      .from("journey_stages")
      .insert(insert);

    if (insErr) {
      const msg = `[journeyStamp] insert failed: ${insErr.message}`;
      if (byColumn) throw new Error(msg);
      console.error(msg);
    }
    return;
  }

  // Row exists — already stamped? (append-only trigger blocks re-stamp)
  if (row[column]) {
    if (byColumn) {
      throw new Error(
        `${stage} already stamped at ${row[column]} — append-only, cannot re-stamp`,
      );
    }
    return;
  }

  // Stamp the _at column; advance current_stage only forward.
  const currentIdx = ORDER.indexOf(row.current_stage as JourneyStage);
  const newIdx = ORDER.indexOf(stage);
  const update: Record<string, unknown> = { [column]: now };
  if (byColumn && actorId) update[byColumn] = actorId;
  if (newIdx > currentIdx) {
    update.current_stage = stage;
  }

  const { error: updErr } = await supabase
    .from("journey_stages")
    .update(update)
    .eq("org_id", orgId);

  if (updErr) {
    const msg = `[journeyStamp] update failed: ${updErr.message}`;
    if (byColumn) throw new Error(msg);
    console.error(msg);
  }
}
