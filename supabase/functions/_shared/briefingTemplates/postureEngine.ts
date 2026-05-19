// briefingTemplates/postureEngine.ts — posture derivation from data snapshot

import type { DataSnapshot, Posture } from './types.ts';

/**
 * Compute posture from data snapshot. Alarm-first evaluation (most-severe-wins).
 *
 * alarm: any urgent item, 3+ open items, or any proven drift
 * watch:  1-2 open items, or any drift activity in last 30 days
 * solid:  nothing open, no recent drift
 */
export function computePosture(snapshot: DataSnapshot): Posture {
  const hasUrgent = snapshot.open_items.some((i) => i.urgency === 'urgent');
  const totalOpen = snapshot.open_items.length;
  const hasProvenDrift = snapshot.active_proven_drift_count > 0;

  if (hasUrgent || totalOpen >= 3 || hasProvenDrift) return 'alarm';
  if (totalOpen >= 1 || snapshot.recent_drift_count_30d > 0) return 'watch';
  return 'solid';
}
