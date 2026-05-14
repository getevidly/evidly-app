/**
 * useVendors — fetches org-scoped vendors for the Roster tab.
 * RLS on the vendors table handles org filtering automatically.
 */
import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApiQuery, type ApiQueryResult } from './api/useApiQuery';

export interface VendorListRow {
  id: string;
  company_name: string;
  service_type: string | null;
  status: string;
  invite_status: string | null;
  primary_contact_name: string | null;
  email: string | null;
  primary_contact_email: string | null;
  phone: string | null;
  created_at: string;
}

export function useVendors(): ApiQueryResult<VendorListRow[]> {
  const queryFn = useCallback(async (): Promise<VendorListRow[]> => {
    const { data, error } = await supabase
      .from('vendors')
      .select('id, company_name, service_type, status, invite_status, primary_contact_name, email, primary_contact_email, phone, created_at')
      .order('company_name', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }, []);

  return useApiQuery('vendors-roster', queryFn, []);
}
