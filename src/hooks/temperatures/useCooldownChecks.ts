/**
 * useCooldownChecks.ts
 *
 * Query hook for a single cooldown event's check readings.
 */

import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApiQuery, type ApiQueryResult } from '../api/useApiQuery';

export interface CooldownCheckRow {
  id: string;
  cooldown_event_id: string;
  temperature: number;
  checked_at: string;
  notes: string | null;
  checked_by: string | null;
}

export function useCooldownChecks(cooldownEventId: string | null): ApiQueryResult<CooldownCheckRow[]> {
  const queryFn = useCallback(async (): Promise<CooldownCheckRow[]> => {
    if (!cooldownEventId) return [];
    const { data, error } = await supabase
      .from('cooldown_checks')
      .select('*')
      .eq('cooldown_event_id', cooldownEventId)
      .order('checked_at', { ascending: false });

    if (error) throw error;
    return (data as CooldownCheckRow[]) ?? [];
  }, [cooldownEventId]);

  return useApiQuery(`cooldown-checks-${cooldownEventId ?? 'none'}`, queryFn, []);
}
