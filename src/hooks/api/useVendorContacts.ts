import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApiQuery, type ApiQueryResult } from './useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export interface VendorContact {
  id: string;
  organization_id: string;
  location_id: string | null;
  name: string;
  vendor_type: string;
  contact_email: string | null;
  contact_phone: string | null;
  after_hours_phone: string | null;
  service_area: string | null;
  equipment_types: string[] | null;
  response_sla_hours: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UseVendorContactsOptions {
  isActiveOnly?: boolean;
}

// ── Hook ──────────────────────────────────────────────────────

export function useVendorContacts(
  locationId: string,
  options?: UseVendorContactsOptions,
): ApiQueryResult<VendorContact[]> {
  const { isActiveOnly = true } = options ?? {};

  const queryFn = useCallback(async (): Promise<VendorContact[]> => {
    let query = supabase.from('vendor_contacts').select('*');
    if (isActiveOnly) query = query.eq('is_active', true);
    query = query.order('name');
    const { data, error } = await query;
    if (error) throw error;
    return (data as VendorContact[]) ?? [];
  }, [isActiveOnly]);

  // locationId scopes the useApiQuery cache key. Actual row filtering is enforced by RLS, not by .eq() — the user's location_access list determines what they see.
  return useApiQuery(`vendor-contacts-${locationId}`, queryFn, []);
}
