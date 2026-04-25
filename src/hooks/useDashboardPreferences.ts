import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  ALL_CARDS, ROLE_PRESETS, sortCardsForDisplay,
  type CardSpec,
} from '../config/dashboardPresets';

export interface CardOrderEntry {
  id: string;
  visible: boolean;
}

export interface UseDashboardPreferencesReturn {
  cards: CardSpec[];
  rawOrder: CardOrderEntry[];
  loading: boolean;
  error: Error | null;
  setCardOrder: (newOrder: CardOrderEntry[]) => Promise<void>;
  resetToPreset: () => Promise<void>;
}

function buildPresetOrder(role: string): CardOrderEntry[] {
  const preset = ROLE_PRESETS[role] ?? ROLE_PRESETS.owner_operator;
  return preset.map(id => ({ id, visible: true }));
}

export function useDashboardPreferences(): UseDashboardPreferencesReturn {
  const [rawOrder, setRawOrder] = useState<CardOrderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch user + role + preferences on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) {
          if (!cancelled) setLoading(false);
          return;
        }

        if (!cancelled) setUserId(user.id);

        // Get role from user_profiles
        const { data: profile, error: profileErr } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileErr || !profile) {
          if (!cancelled) {
            setError(new Error('Could not load user profile'));
            setLoading(false);
          }
          return;
        }

        const role = profile.role || 'owner_operator';
        if (!cancelled) setUserRole(role);

        // Query existing preferences
        const { data: prefs, error: prefsErr } = await supabase
          .from('user_dashboard_preferences')
          .select('card_order')
          .eq('user_id', user.id)
          .single();

        if (prefsErr && prefsErr.code !== 'PGRST116') {
          // PGRST116 = no rows — that's expected for new users
          if (!cancelled) {
            setError(new Error('Could not load dashboard preferences'));
            setLoading(false);
          }
          return;
        }

        if (prefs?.card_order && Array.isArray(prefs.card_order) && prefs.card_order.length > 0) {
          // Existing row — use it
          if (!cancelled) {
            setRawOrder(prefs.card_order as CardOrderEntry[]);
            setLoading(false);
          }
          return;
        }

        // No row — seed from role preset
        const defaultOrder = buildPresetOrder(role);

        const { error: insertErr } = await supabase
          .from('user_dashboard_preferences')
          .insert({ user_id: user.id, card_order: defaultOrder });

        if (insertErr) {
          // If insert fails (e.g. race condition), try fetching again
          const { data: retry } = await supabase
            .from('user_dashboard_preferences')
            .select('card_order')
            .eq('user_id', user.id)
            .single();

          if (!cancelled) {
            setRawOrder(
              retry?.card_order && Array.isArray(retry.card_order)
                ? (retry.card_order as CardOrderEntry[])
                : defaultOrder
            );
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setRawOrder(defaultOrder);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Derived: visible cards only, mapped to CardSpec, sorted
  const cards = useMemo(
    () => sortCardsForDisplay(rawOrder.filter(e => e.visible).map(e => e.id)),
    [rawOrder]
  );

  const setCardOrder = useCallback(async (newOrder: CardOrderEntry[]) => {
    if (!userId) return;
    setRawOrder(newOrder);

    const { error: updateErr } = await supabase
      .from('user_dashboard_preferences')
      .update({ card_order: newOrder, last_modified_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (updateErr) {
      setError(new Error('Could not save dashboard preferences'));
    }
  }, [userId]);

  const resetToPreset = useCallback(async () => {
    if (!userId || !userRole) return;
    const defaultOrder = buildPresetOrder(userRole);
    setRawOrder(defaultOrder);

    const { error: updateErr } = await supabase
      .from('user_dashboard_preferences')
      .update({ card_order: defaultOrder, last_modified_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (updateErr) {
      setError(new Error('Could not reset dashboard preferences'));
    }
  }, [userId, userRole]);

  return { cards, rawOrder, loading, error, setCardOrder, resetToPreset };
}
