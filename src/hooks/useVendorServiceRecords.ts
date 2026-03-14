/**
 * AUDIT-FIX-04 / FIX 4 — Vendor service records data hook
 *
 * Extracted from PSESafeguardsSection to remove direct supabase.from() calls.
 * Fetches vendor_service_records for PSE safeguard types.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface VendorServiceRecord {
  safeguard_type: string;
  vendor_name: string | null;
  cert_number: string | null;
  service_date: string | null;
  next_due_date: string | null;
  interval_label: string | null;
  certificate_url: string | null;
}

export function useVendorServiceRecords(
  organizationId: string,
  locationId: string,
  skip: boolean = false,
) {
  const [data, setData] = useState<Map<string, VendorServiceRecord>>(new Map());
  const [isLoading, setIsLoading] = useState(!skip);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (skip) return;
    setIsLoading(true);
    setError(null);

    const { data: rows, error: queryError } = await supabase
      .from('vendor_service_records')
      .select('safeguard_type, vendor_name, cert_number, service_date, next_due_date, interval_label, certificate_url')
      .eq('organization_id', organizationId)
      .eq('location_id', locationId)
      .eq('is_sample', false)
      .in('safeguard_type', ['hood_cleaning', 'fire_suppression', 'fire_alarm', 'sprinklers']);

    if (queryError) {
      setError(queryError.message);
    } else if (rows) {
      const map = new Map<string, VendorServiceRecord>();
      for (const row of rows) map.set(row.safeguard_type, row);
      setData(map);
    }
    setIsLoading(false);
  }, [organizationId, locationId, skip]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, isLoading, error, refetch };
}
