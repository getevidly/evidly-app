/**
 * Locations API hook — fetches active locations for the current org.
 * Used by EquipmentFormModal to populate the location dropdown.
 */
import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApiQuery, type ApiQueryResult } from './useApiQuery';

export interface LocationOption {
  id: string;
  name: string;
}

export function useLocations(): ApiQueryResult<LocationOption[]> {
  const queryFn = useCallback(async (): Promise<LocationOption[]> => {
    const { data, error } = await supabase
      .from('locations')
      .select('id, name')
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data ?? []).map(row => ({ id: row.id, name: row.name }));
  }, []);

  return useApiQuery('locations-active', queryFn, []);
}
