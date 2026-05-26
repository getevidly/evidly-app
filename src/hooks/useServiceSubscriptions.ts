/**
 * useServiceSubscriptions — detects which add-on services (FPM, RGC, GFX) are
 * active for the current org + location. A service is "active" if at least one
 * vendor_service_records row exists with that service_type_code in the last 12 months.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ServiceSubscriptions {
  hasFPM: boolean;
  hasRGC: boolean;
  hasGFX: boolean;
  loading: boolean;
}

export function useServiceSubscriptions(
  organizationId: string | undefined,
  locationId: string | undefined,
): ServiceSubscriptions {
  const [subs, setSubs] = useState<ServiceSubscriptions>({
    hasFPM: false,
    hasRGC: false,
    hasGFX: false,
    loading: true,
  });

  const check = useCallback(async () => {
    if (!organizationId || !locationId) {
      setSubs({ hasFPM: false, hasRGC: false, hasGFX: false, loading: false });
      return;
    }

    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const { data: rows } = await supabase
      .from('vendor_service_records')
      .select('service_type_code')
      .eq('organization_id', organizationId)
      .eq('location_id', locationId)
      .eq('is_sample', false)
      .in('service_type_code', ['FPM', 'RGC', 'GFX'])
      .gte('service_date', cutoffStr)
      .limit(50);

    const codes = new Set((rows || []).map(r => r.service_type_code));

    setSubs({
      hasFPM: codes.has('FPM'),
      hasRGC: codes.has('RGC'),
      hasGFX: codes.has('GFX'),
      loading: false,
    });
  }, [organizationId, locationId]);

  useEffect(() => { check(); }, [check]);

  return subs;
}
