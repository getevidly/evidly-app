/**
 * useMobileNavSlots — the per-user override for the three middle slots of
 * the mobile bottom nav.
 *
 * Storage: user_preferences.mobile_nav_slots (jsonb).
 *   NULL          -> use the role default
 *   3 distinct keys -> that exact order
 *
 * The column carries a CHECK for exactly 3 distinct keys from ALLOWED_SLOT_KEYS,
 * so a malformed write is refused by the database, not just by this hook.
 * RLS on user_preferences is own-row for select/insert/update, so a user can
 * only ever read or write their own value.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const ALLOWED_SLOT_KEYS = [
  'fire', 'food', 'facilities', 'records', 'checklists', 'temps', 'report', 'calendar',
] as const;

export type SlotKey = typeof ALLOWED_SLOT_KEYS[number];

export function isSlotKey(v: unknown): v is SlotKey {
  return typeof v === 'string' && (ALLOWED_SLOT_KEYS as readonly string[]).includes(v);
}

/** A stored value is only usable if it is exactly 3 distinct known keys. */
export function parseSlots(raw: unknown): SlotKey[] | null {
  if (!Array.isArray(raw) || raw.length !== 3) return null;
  if (!raw.every(isSlotKey)) return null;
  if (new Set(raw).size !== 3) return null;
  return raw as SlotKey[];
}

export interface MobileNavSlotsState {
  /** null = no override stored; use the role default. */
  slots: SlotKey[] | null;
  /** True until the first read settles. Callers render the role default meanwhile. */
  loading: boolean;
  /** Writes 3 keys, or null to clear back to the role default. Optimistic. */
  save: (next: SlotKey[] | null) => Promise<{ ok: boolean; error?: string }>;
}

export function useMobileNavSlots(): MobileNavSlotsState {
  const { user } = useAuth();
  const userId = user?.id;
  const [slots, setSlots] = useState<SlotKey[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setSlots(null); setLoading(false); return; }
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('mobile_nav_slots')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      setSlots(parseSlots(data?.mobile_nav_slots));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  const save = useCallback(async (next: SlotKey[] | null) => {
    if (!userId) return { ok: false, error: 'Not signed in.' };
    if (next !== null && parseSlots(next) === null) {
      return { ok: false, error: 'Pick 3 different tabs.' };
    }

    const previous = slots;
    setSlots(next); // optimistic

    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        { user_id: userId, mobile_nav_slots: next },
        { onConflict: 'user_id' },
      );

    if (error) {
      setSlots(previous); // roll back
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, [userId, slots]);

  return { slots, loading, save };
}
