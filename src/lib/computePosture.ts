/**
 * computePosture — Shared posture derivation rule
 *
 * CANONICAL SERVER-SIDE SOURCE:
 *   supabase/functions/_shared/briefingTemplates/postureEngine.ts
 *
 * This client-side module mirrors the server rule exactly.
 * Both MUST stay in sync. If the server rule changes, update here.
 *
 * alarm:  any urgent item OR 3+ open items OR any proven drift
 * watch:  1-2 open items OR any drift activity in last 30 days
 * solid:  nothing open, no recent drift
 */

export type Posture = 'solid' | 'watch' | 'alarm';

export interface PostureInput {
  openItemCount: number;
  hasUrgentItem: boolean;
  activeProvenDriftCount: number;
  recentDriftCount30d: number;
}

export function computePosture(input: PostureInput): Posture {
  if (input.hasUrgentItem || input.openItemCount >= 3 || input.activeProvenDriftCount > 0) {
    return 'alarm';
  }
  if (input.openItemCount >= 1 || input.recentDriftCount30d > 0) {
    return 'watch';
  }
  return 'solid';
}
