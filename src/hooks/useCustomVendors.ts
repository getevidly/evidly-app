/**
 * AUDIT-FIX-04 / FIX 4 — Custom vendor data hook
 *
 * Extracted from VendorCombobox to remove direct supabase.from() calls.
 * Handles loading + saving custom vendors for a location.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface CustomVendor {
  name: string;
  lastUsedAt: string;
}

const DEMO_STORAGE_KEY = 'evidly_custom_vendors';

export function useCustomVendors(locationId: string | undefined, isDemoMode: boolean) {
  const [customVendors, setCustomVendors] = useState<CustomVendor[]>([]);

  // Load on mount
  useEffect(() => {
    if (isDemoMode) {
      try {
        const stored = sessionStorage.getItem(DEMO_STORAGE_KEY);
        if (stored) setCustomVendors(JSON.parse(stored));
      } catch { /* noop */ }
    } else if (locationId) {
      loadFromDb();
    }
  }, [isDemoMode, locationId]);

  const loadFromDb = async () => {
    if (!locationId) return;
    const { data } = await supabase
      .from('location_custom_vendors')
      .select('vendor_name, last_used_at')
      .eq('location_id', locationId)
      .order('last_used_at', { ascending: false });
    if (data) {
      setCustomVendors(data.map(d => ({ name: d.vendor_name, lastUsedAt: d.last_used_at })));
    }
  };

  const saveCustomVendor = useCallback(async (name: string) => {
    const now = new Date().toISOString();
    const updated = [{ name, lastUsedAt: now }, ...customVendors.filter(v => v.name !== name)];
    setCustomVendors(updated);

    if (isDemoMode) {
      try { sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated)); } catch { /* noop */ }
    } else if (locationId) {
      await supabase.from('location_custom_vendors').upsert(
        { location_id: locationId, vendor_name: name, last_used_at: now },
        { onConflict: 'location_id,vendor_name' },
      );
    }
  }, [customVendors, isDemoMode, locationId]);

  const updateLastUsed = useCallback(async (name: string) => {
    const isCustom = customVendors.some(v => v.name === name);
    if (!isCustom) return;
    await saveCustomVendor(name);
  }, [customVendors, saveCustomVendor]);

  return { customVendors, saveCustomVendor, updateLastUsed };
}
