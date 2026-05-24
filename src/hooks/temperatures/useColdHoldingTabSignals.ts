/**
 * useColdHoldingTabSignals.ts
 *
 * Queries temperature_logs for cold holding equipment at the org's locations.
 *
 * PREDICT = units where next check is due within 30 min (last_reading + 4h <= now + 30m).
 * REDUCE  = units with most recent reading above 41°F (temp_pass = false).
 * PROVE   = cold holding checks logged today where temp_pass = true.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { isHoldingCold } from '../../lib/equipmentHelpers';
import { TEMP_CHECK_INTERVALS } from '../../config/tempConfig';

export interface ColdHoldingTabSignals {
  checksDue: number;
  itemsAtRisk: number;
  inRangeToday: number;
  criticalUnits: string[];
  staleUnits: string[];
  loading: boolean;
}

export function useColdHoldingTabSignals(): ColdHoldingTabSignals {
  const { profile } = useAuth();
  const { getAccessibleLocations } = useRole();
  const orgId = profile?.organization_id;
  const locationIds = getAccessibleLocations().map(l => l.locationId).filter(Boolean);

  const [signals, setSignals] = useState<Omit<ColdHoldingTabSignals, 'loading'>>({
    checksDue: 0,
    itemsAtRisk: 0,
    inRangeToday: 0,
    criticalUnits: [],
    staleUnits: [],
  });
  const [loading, setLoading] = useState(false);

  const fetchSignals = useCallback(async () => {
    if (!orgId || locationIds.length === 0) {
      setSignals({ checksDue: 0, itemsAtRisk: 0, inRangeToday: 0, criticalUnits: [], staleUnits: [] });
      return;
    }
    setLoading(true);
    try {
      // 1. Get all cold holding equipment
      const { data: eqData, error: eqErr } = await supabase
        .from('temperature_equipment')
        .select('id, name, equipment_type, location_id')
        .in('location_id', locationIds)
        .eq('is_active', true);

      if (eqErr) throw eqErr;

      const coldEq = (eqData ?? []).filter(eq => isHoldingCold(eq.equipment_type));
      if (coldEq.length === 0) {
        setSignals({ checksDue: 0, itemsAtRisk: 0, inRangeToday: 0, criticalUnits: [], staleUnits: [] });
        setLoading(false);
        return;
      }

      const coldEqIds = coldEq.map(e => e.id);
      const eqNameMap = new Map(coldEq.map(e => [e.id, e.name]));

      // 2. Get last ambient reading per unit
      const { data: lastReadings, error: lrErr } = await supabase
        .from('temperature_logs')
        .select('equipment_id, temperature, reading_time, temp_pass')
        .in('equipment_id', coldEqIds)
        .is('menu_item_id', null)
        .is('superseded_by_log_id', null)
        .order('reading_time', { ascending: false });

      if (lrErr) throw lrErr;

      // Deduplicate: keep only most recent per equipment
      const lastByEq = new Map<string, { temperature: number; reading_time: string; temp_pass: boolean }>();
      for (const row of lastReadings ?? []) {
        if (!lastByEq.has(row.equipment_id)) {
          lastByEq.set(row.equipment_id, row);
        }
      }

      const now = Date.now();
      const overdueMs = TEMP_CHECK_INTERVALS.COLD_HOLDING_OVERDUE_MINUTES * 60 * 1000;
      const predictWindowMs = 30 * 60 * 1000; // 30 minutes

      let checksDue = 0;
      let itemsAtRisk = 0;
      const criticalUnits: string[] = [];
      const staleUnits: string[] = [];

      for (const eq of coldEq) {
        const last = lastByEq.get(eq.id);
        if (!last) {
          // No readings at all — stale
          staleUnits.push(eqNameMap.get(eq.id) ?? eq.id);
          checksDue++;
          continue;
        }

        const readingAge = now - new Date(last.reading_time).getTime();
        const nextCheckDue = new Date(last.reading_time).getTime() + overdueMs;

        // Stale: no reading in >24h
        if (readingAge > 24 * 60 * 60 * 1000) {
          staleUnits.push(eqNameMap.get(eq.id) ?? eq.id);
          checksDue++;
          continue;
        }

        // Check due: next check within 30 min window
        if (nextCheckDue <= now + predictWindowMs) {
          checksDue++;
        }

        // Critical: above 41°F (temp_pass = false)
        if (!last.temp_pass) {
          itemsAtRisk++;
          criticalUnits.push(eqNameMap.get(eq.id) ?? eq.id);
        }
      }

      // 3. PROVE: cold holding checks logged today that passed
      const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString();
      const { count: todayPassCount, error: todayErr } = await supabase
        .from('temperature_logs')
        .select('id', { count: 'exact', head: true })
        .in('equipment_id', coldEqIds)
        .is('menu_item_id', null)
        .is('superseded_by_log_id', null)
        .eq('temp_pass', true)
        .gte('reading_time', todayStart);

      if (todayErr) throw todayErr;

      setSignals({
        checksDue,
        itemsAtRisk,
        inRangeToday: todayPassCount ?? 0,
        criticalUnits,
        staleUnits,
      });
    } catch (e) {
      console.warn('[useColdHoldingTabSignals]', e instanceof Error ? e.message : e);
    } finally {
      setLoading(false);
    }
  }, [orgId, locationIds.join(',')]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  return { ...signals, loading };
}
