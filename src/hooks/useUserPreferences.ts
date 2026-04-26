import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

/**
 * useUserPreferences — generic JSONB preferences storage per user.
 *
 * Backed by user_preferences table (user_id PK, preferences jsonb, updated_at).
 * Use for any per-user setting that survives logout: view defaults, dismissal flags,
 * dashboard customization, calendar 24-hour toggle, etc.
 *
 * Keys are arbitrary strings stored under preferences.{key}.
 *
 * Example:
 *   const { getPreference, setPreference } = useUserPreferences();
 *   const is24h = getPreference('calendar_24h_view', false);
 *   await setPreference('calendar_24h_view', true);
 */
export function useUserPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch on mount + user change
  useEffect(() => {
    if (!user?.id) {
      setPreferences({});
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('[useUserPreferences] fetch error', error);
        setPreferences({});
      } else {
        setPreferences((data?.preferences as Record<string, unknown>) || {});
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const getPreference = useCallback(
    <T,>(key: string, defaultValue: T): T => {
      const value = preferences[key];
      return value === undefined ? defaultValue : (value as T);
    },
    [preferences]
  );

  const setPreference = useCallback(
    async (key: string, value: unknown): Promise<void> => {
      if (!user?.id) return;

      // Optimistic update
      const next = { ...preferences, [key]: value };
      setPreferences(next);

      // Upsert to DB
      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          { user_id: user.id, preferences: next, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('[useUserPreferences] upsert error', error);
        // Revert optimistic update
        setPreferences(preferences);
      }
    },
    [user?.id, preferences]
  );

  return { preferences, getPreference, setPreference, isLoading };
}
