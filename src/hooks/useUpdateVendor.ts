/**
 * useUpdateVendor — UPDATE mutation hook for vendors table.
 * Mirrors useCreateVendor.ts pattern.
 */

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface VendorUpdate {
  company_name: string;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  service_area: string | null;
  service_type: string | null;
  service_type_codes: string[] | null;
  notes: string | null;
}

export function useUpdateVendor() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateVendor = useCallback(async (
    vendorId: string,
    updates: VendorUpdate,
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('vendors')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vendorId);

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
      return false;
    }

    setIsLoading(false);
    return true;
  }, []);

  return { updateVendor, isLoading, error };
}
