import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApiQuery, type ApiQueryResult } from './useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export interface SensorDevice {
  id: string;
  organization_id: string;
  location_id: string;
  display_name: string;
  vendor_name: string | null;
  model: string | null;
  protocol: string;
  device_identifier: string | null;
  connection_config: Record<string, unknown> | null;
  default_input_method: string | null;
  equipment_id: string | null;
  vendor_contact_id: string | null;
  is_active: boolean;
  paired_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface UseSensorDevicesOptions {
  isActiveOnly?: boolean;
}

// ── Hook ──────────────────────────────────────────────────────

export function useSensorDevices(
  locationId: string,
  options?: UseSensorDevicesOptions,
): ApiQueryResult<SensorDevice[]> {
  const { isActiveOnly = true } = options ?? {};

  const queryFn = useCallback(async (): Promise<SensorDevice[]> => {
    let query = supabase.from('sensor_devices').select('*');
    if (isActiveOnly) query = query.eq('is_active', true);
    query = query.order('display_name');
    const { data, error } = await query;
    if (error) throw error;
    return (data as SensorDevice[]) ?? [];
  }, [isActiveOnly]);

  // locationId scopes the useApiQuery cache key. Actual row filtering is enforced by RLS, not by .eq() — the user's location_access list determines what they see.
  return useApiQuery(`sensor-devices-${locationId}`, queryFn, []);
}
