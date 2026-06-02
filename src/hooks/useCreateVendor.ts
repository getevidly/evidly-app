/**
 * AUDIT-FIX-04 / FIX 4 — Create vendor mutation hook
 *
 * Extracted from AddVendorModal to remove direct supabase.from() calls.
 * Inserts vendor + vendor_client_relationships.
 */

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface VendorInsert {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  contact_phone: string | null;
  service_type: string;
  status: string;
  invite_status: string;
  license_cert_number: string | null;
  has_insurance_coi: boolean;
  notes: string | null;
  location_ids: string[] | null;
  primary_contact_name?: string | null;
  primary_contact_email?: string | null;
  address?: string | null;
  service_area?: string | null;
  service_type_codes?: string[] | null;
}

export function useCreateVendor() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createVendor = useCallback(async (
    vendor: VendorInsert,
    organizationId: string,
  ): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    const { data: vendorData, error: vendorError } = await supabase
      .from('vendors')
      .insert({ ...vendor, organization_id: organizationId })
      .select('id')
      .single();

    if (vendorError) {
      setError(vendorError.message);
      setIsLoading(false);
      return null;
    }

    if (vendorData) {
      const { error: relError } = await supabase.from('vendor_client_relationships').insert({
        vendor_id: vendorData.id,
        organization_id: organizationId,
        status: 'active',
      });

      if (relError) {
        // Clean up orphaned vendor row
        await supabase.from('vendors').delete().eq('id', vendorData.id);
        setError(relError.message);
        setIsLoading(false);
        return null;
      }
    }

    setIsLoading(false);
    return vendorData?.id || null;
  }, []);

  return { createVendor, isLoading, error };
}
