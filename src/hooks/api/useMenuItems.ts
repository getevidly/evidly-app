import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApiQuery, type ApiQueryResult } from './useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export interface MenuItem {
  id: string;
  organization_id: string;
  location_id: string;
  name: string;
  description: string | null;
  category: string | null;
  default_cook_target_f: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface UseMenuItemsOptions {
  isActiveOnly?: boolean;
}

// ── Hook ──────────────────────────────────────────────────────

export function useMenuItems(
  locationId: string,
  options?: UseMenuItemsOptions,
): ApiQueryResult<MenuItem[]> {
  const { isActiveOnly = true } = options ?? {};

  const queryFn = useCallback(async (): Promise<MenuItem[]> => {
    let query = supabase.from('menu_items').select('*');
    if (isActiveOnly) query = query.eq('is_active', true);
    query = query.order('name');
    const { data, error } = await query;
    if (error) throw error;
    return (data as MenuItem[]) ?? [];
  }, [isActiveOnly]);

  // locationId scopes the useApiQuery cache key. Actual row filtering is enforced by RLS, not by .eq() — the user's location_access list determines what they see.
  return useApiQuery(`menu-items-${locationId}`, queryFn, []);
}
