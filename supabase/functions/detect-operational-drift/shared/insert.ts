// detect-operational-drift — idempotent INSERT + notification creation
// Uses ON CONFLICT DO NOTHING via the partial unique index uq_drift_catches_idempotent.
// Creates one notification per DM-role user per inserted catch.

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  DriftCatchInsert,
  InsertedCatch,
  DmUserRow,
  LocationRow,
  DRIFT_TYPE_LABELS,
  PILLAR_NOTIFY_ROLES,
  SEVERITY_PRIORITY,
} from './types.ts';

// Severity-based escalation deadlines (minutes until escalation fires)
const ESCALATION_MINUTES: Record<string, number> = {
  urgent: 30,
  high: 60,
  medium: 120,
  low: 480, // 8 hours
};

/**
 * Batch insert drift catches with ON CONFLICT DO NOTHING.
 * Returns only the rows that were actually inserted (not deduped).
 */
export async function insertDriftCatches(
  supabase: SupabaseClient,
  catches: DriftCatchInsert[],
): Promise<InsertedCatch[]> {
  if (catches.length === 0) return [];

  // Supabase JS doesn't support ON CONFLICT DO NOTHING directly.
  // Use .upsert with ignoreDuplicates: true and onConflict on the PK.
  // Since our dedup is via a partial unique index (not the PK), we use raw SQL.
  const inserted: InsertedCatch[] = [];

  for (const c of catches) {
    // Use raw insert via .from() — the partial unique index will reject duplicates
    // with a unique_violation error, which we catch and skip.
    const { data: row, error: insertErr } = await supabase
      .from('drift_catches')
      .insert({
        org_id: c.org_id,
        location_id: c.location_id,
        drift_type: c.drift_type,
        pillar: c.pillar,
        source_table: c.source_table,
        source_record_id: c.source_record_id,
        expected_value: c.expected_value,
        actual_value: c.actual_value,
        severity: c.severity,
        estimated_savings_cents: c.estimated_savings_cents,
      })
      .select('id, detected_at, org_id, location_id, drift_type, pillar, source_table, source_record_id, expected_value, actual_value, severity, estimated_savings_cents')
      .maybeSingle();

    if (insertErr) {
      // 23505 = unique_violation — the partial unique index rejected it (idempotent)
      if (insertErr.code === '23505') continue;
      console.error(`[drift-insert] Error inserting ${c.drift_type} for location ${c.location_id}:`, insertErr.message);
      continue;
    }
    if (row) {
      inserted.push(row as InsertedCatch);
    }
  }

  return inserted;
}

/**
 * Create notifications for each inserted catch.
 * One notification per DM-role user who should see this catch.
 */
export async function createNotifications(
  supabase: SupabaseClient,
  catches: InsertedCatch[],
  dmUsers: DmUserRow[],
  locations: LocationRow[],
): Promise<number> {
  if (catches.length === 0 || dmUsers.length === 0) return 0;

  const locationMap = new Map(locations.map((l) => [l.id, l.name]));
  const notifications: Array<Record<string, unknown>> = [];

  for (const c of catches) {
    const targetRoles = PILLAR_NOTIFY_ROLES[c.pillar] || [];
    const targetUsers = dmUsers.filter((u) => targetRoles.includes(u.role));

    if (targetUsers.length === 0) continue;

    const locationName = locationMap.get(c.location_id) || 'Unknown location';
    const label = DRIFT_TYPE_LABELS[c.drift_type] || c.drift_type;
    const title = `${label} — ${locationName}`;
    const body = `EvidLY caught a pulling item: ${label.toLowerCase()}. Review and acknowledge.`;
    const priority = SEVERITY_PRIORITY[c.severity] || 'medium';

    const escalationMinutes = ESCALATION_MINUTES[priority] || 120;
    const escalationDeadline = new Date(Date.now() + escalationMinutes * 60_000).toISOString();

    for (const user of targetUsers) {
      notifications.push({
        organization_id: c.org_id,
        user_id: user.id,
        type: 'drift_catch',
        title,
        body,
        action_url: '/dashboard',
        priority,
        source_type: 'drift_catch',
        source_id: c.id,
        escalation_deadline: escalationDeadline,
      });
    }
  }

  if (notifications.length === 0) return 0;

  // Batch insert in chunks of 100
  let created = 0;
  for (let i = 0; i < notifications.length; i += 100) {
    const chunk = notifications.slice(i, i + 100);
    const { error } = await supabase.from('notifications').insert(chunk);
    if (error) {
      console.error(`[drift-notify] Error inserting notifications batch:`, error.message);
    } else {
      created += chunk.length;
    }
  }

  return created;
}
