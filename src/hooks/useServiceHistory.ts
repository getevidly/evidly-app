/**
 * useServiceHistory — fetches vendor_service_records for a set of safeguard types.
 * Returns an array ordered by service_date DESC, with cost and document data.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ServiceHistoryRecord {
  id: string;
  service_date: string | null;
  vendor_name: string | null;
  service_type_code: string | null;
  safeguard_type: string;
  price_charged: number | null;
  document_url: string | null;
  certificate_url: string | null;
  cert_number: string | null;
  source: string;
  notes: string | null;
  next_due_date: string | null;
}

export function useServiceHistory(
  organizationId: string | undefined,
  locationId: string | undefined,
  safeguardTypes: string[],
  limit: number = 5,
) {
  const [data, setData] = useState<ServiceHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!organizationId || !locationId || safeguardTypes.length === 0) {
      setData([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const { data: rows, error: queryError } = await supabase
      .from('vendor_service_records')
      .select('id, service_date, vendor_name, service_type_code, safeguard_type, price_charged, document_url, certificate_url, cert_number, source, notes, next_due_date')
      .eq('organization_id', organizationId)
      .eq('location_id', locationId)
      .eq('is_sample', false)
      .in('safeguard_type', safeguardTypes)
      .order('service_date', { ascending: false })
      .limit(limit);

    if (queryError) {
      setError(queryError.message);
    } else {
      setData((rows as ServiceHistoryRecord[]) || []);
    }
    setIsLoading(false);
  }, [organizationId, locationId, safeguardTypes.join(','), limit]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, isLoading, error, refetch };
}
