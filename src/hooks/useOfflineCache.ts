import { useEffect } from 'react';
import { cacheData } from '../lib/offlineDb';
import { supabase } from '../lib/supabase';

/**
 * Primes the offline cache with recent data for kitchen roles.
 * Runs on mount when online; no-op when offline.
 * Uses existing offlineDb (IndexedDB) for storage.
 */
export function useOfflineCache(orgId: string, locationId: string) {
  useEffect(() => {
    if (!orgId || !locationId) return;

    async function prime() {
      if (!navigator.onLine) return;

      const [tempLogs, checklists, equipment] = await Promise.all([
        supabase.from('temperature_logs')
          .select('*')
          .eq('org_id', orgId)
          .eq('facility_id', locationId)
          .gte('reading_time', new Date(Date.now() - 7 * 86400000).toISOString())
          .order('reading_time', { ascending: false }),
        supabase.from('checklists')
          .select('*')
          .eq('org_id', orgId)
          .eq('location_id', locationId)
          .eq('status', 'active'),
        supabase.from('equipment')
          .select('*')
          .eq('org_id', orgId)
          .eq('location_id', locationId),
      ]);

      const TTL = 4 * 3600000; // 4 hours

      if (tempLogs.data) await cacheData('cache_temp_logs', tempLogs.data, TTL);
      if (checklists.data) await cacheData('cache_checklists', checklists.data, TTL);
      if (equipment.data) await cacheData('cache_equipment', equipment.data, TTL);
    }

    prime();
  }, [orgId, locationId]);
}
