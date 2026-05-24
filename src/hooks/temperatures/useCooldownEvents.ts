/**
 * useCooldownEvents.ts
 *
 * Fetches cooldown_events for the org, computes card state client-side,
 * and performs client-side failure flip for missed deadlines.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';

// ── Types ───────────────────────────────────────────────────

export type CooldownStatus = 'in_progress' | 'stage_1_complete' | 'completed' | 'failed' | 'cancelled';
export type CardState = 'crit' | 'warn' | 'ok' | 'failed' | 'complete';

export interface CooldownCheck {
  id: string;
  temperature: number;
  checked_at: string;
  notes: string | null;
  checked_by: string | null;
}

export interface CooldownEvent {
  id: string;
  organization_id: string;
  location_id: string;
  food_item_name: string;
  cooling_location: string | null;
  starting_temperature: number;
  started_at: string;
  stage_1_target_at: string;
  stage_2_target_at: string;
  stage_1_completed_at: string | null;
  stage_2_completed_at: string | null;
  status: CooldownStatus;
  failed_stage: number | null;
  disposition: string | null;
  disposition_notes: string | null;
  disposition_witnessed_by: string | null;
  disposition_corrective_action_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CooldownEventWithState extends CooldownEvent {
  cardState: CardState;
  activeStage: 1 | 2;
  pctElapsed: number;
  lastCheck: CooldownCheck | null;
  timeRemaining: number; // ms until current stage deadline
}

// ── Hook ────────────────────────────────────────────────────

export function useCooldownEvents() {
  const { profile } = useAuth();
  const { getAccessibleLocations } = useRole();
  const orgId = profile?.organization_id;
  const locationIds = getAccessibleLocations().map(l => l.locationId).filter(Boolean);

  const [events, setEvents] = useState<CooldownEventWithState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!orgId || locationIds.length === 0) {
      setEvents([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch cooldown events (not cancelled)
      const { data: eventsData, error: evErr } = await supabase
        .from('cooldown_events')
        .select('*')
        .in('location_id', locationIds)
        .neq('status', 'cancelled')
        .order('started_at', { ascending: false });

      if (evErr) throw evErr;
      const rawEvents = (eventsData ?? []) as CooldownEvent[];

      if (rawEvents.length === 0) {
        setEvents([]);
        setIsLoading(false);
        return;
      }

      // 2. Fetch last check per event
      const eventIds = rawEvents.map(e => e.id);
      const { data: checksData, error: chErr } = await supabase
        .from('cooldown_checks')
        .select('id, cooldown_event_id, temperature, checked_at, notes, checked_by')
        .in('cooldown_event_id', eventIds)
        .order('checked_at', { ascending: false });

      if (chErr) throw chErr;

      const lastCheckByEvent = new Map<string, CooldownCheck>();
      for (const row of checksData ?? []) {
        if (!lastCheckByEvent.has(row.cooldown_event_id)) {
          lastCheckByEvent.set(row.cooldown_event_id, {
            id: row.id,
            temperature: row.temperature,
            checked_at: row.checked_at,
            notes: row.notes,
            checked_by: row.checked_by,
          });
        }
      }

      // 3. Client-side failure flip + state computation
      const now = Date.now();
      const failFlips: { id: string; failedStage: number }[] = [];

      const enriched: CooldownEventWithState[] = rawEvents.map(ev => {
        const lastCheck = lastCheckByEvent.get(ev.id) ?? null;
        let status = ev.status;
        let failedStage = ev.failed_stage;

        // Client-side failure detection
        // TODO: replace with server-side cron
        if (status === 'in_progress') {
          const s1Target = new Date(ev.stage_1_target_at).getTime();
          if (now > s1Target) {
            status = 'failed';
            failedStage = 1;
            failFlips.push({ id: ev.id, failedStage: 1 });
          }
        } else if (status === 'stage_1_complete') {
          const s2Target = new Date(ev.stage_2_target_at).getTime();
          if (now > s2Target) {
            status = 'failed';
            failedStage = 2;
            failFlips.push({ id: ev.id, failedStage: 2 });
          }
        }

        // Determine active stage
        const activeStage: 1 | 2 = status === 'stage_1_complete' ? 2 : 1;

        // Compute pct elapsed for current stage
        const startMs = new Date(ev.started_at).getTime();
        const s1TargetMs = new Date(ev.stage_1_target_at).getTime();
        const s2TargetMs = new Date(ev.stage_2_target_at).getTime();

        let pctElapsed = 0;
        let timeRemaining = 0;

        if (status === 'completed') {
          pctElapsed = 1;
          timeRemaining = 0;
        } else if (status === 'failed') {
          pctElapsed = 1;
          timeRemaining = 0;
        } else if (activeStage === 1) {
          const stageLen = s1TargetMs - startMs;
          pctElapsed = stageLen > 0 ? Math.min(1, (now - startMs) / stageLen) : 1;
          timeRemaining = Math.max(0, s1TargetMs - now);
        } else {
          // Stage 2: time runs from stage_1_completed_at to stage_2_target_at
          const s1CompMs = ev.stage_1_completed_at ? new Date(ev.stage_1_completed_at).getTime() : s1TargetMs;
          const stageLen = s2TargetMs - s1CompMs;
          pctElapsed = stageLen > 0 ? Math.min(1, (now - s1CompMs) / stageLen) : 1;
          timeRemaining = Math.max(0, s2TargetMs - now);
        }

        // Card state
        let cardState: CardState;
        if (status === 'failed') {
          cardState = 'failed';
        } else if (status === 'completed') {
          cardState = 'complete';
        } else if (pctElapsed >= 0.90) {
          cardState = 'crit';
        } else if (pctElapsed >= 0.75) {
          cardState = 'warn';
        } else {
          cardState = 'ok';
        }

        return {
          ...ev,
          status: status as CooldownStatus,
          failed_stage: failedStage,
          cardState,
          activeStage,
          pctElapsed,
          lastCheck,
          timeRemaining,
        };
      });

      // 4. Fire-and-forget failure flips to Supabase
      for (const flip of failFlips) {
        supabase
          .from('cooldown_events')
          .update({ status: 'failed', failed_stage: flip.failedStage })
          .eq('id', flip.id)
          .then(); // fire-and-forget
      }

      // 5. Sort: failed-without-disposition first, then crit, warn, ok, complete
      const stateOrder: Record<CardState, number> = { failed: 0, crit: 1, warn: 2, ok: 3, complete: 4 };
      enriched.sort((a, b) => {
        // Failed without disposition gets absolute priority
        const aNeedsDispo = a.cardState === 'failed' && !a.disposition;
        const bNeedsDispo = b.cardState === 'failed' && !b.disposition;
        if (aNeedsDispo && !bNeedsDispo) return -1;
        if (!aNeedsDispo && bNeedsDispo) return 1;
        return stateOrder[a.cardState] - stateOrder[b.cardState];
      });

      setEvents(enriched);
    } catch (err) {
      let message: string;
      if (err instanceof Error) {
        message = err.message;
      } else if (err && typeof err === 'object' && 'message' in err) {
        // PostgrestError or similar: { message, code, details, hint }
        const pgErr = err as { message?: string; code?: string; details?: string };
        message = pgErr.message || pgErr.details || pgErr.code || 'Unknown error';
      } else {
        message = String(err);
      }
      setError(new Error(message));
      console.warn('[useCooldownEvents]', message);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, locationIds.join(',')]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { data: events, isLoading, error, refetch: fetchEvents };
}
