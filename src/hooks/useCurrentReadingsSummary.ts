/**
 * useCurrentReadingsSummary.ts
 *
 * Aggregates the latest temperature_logs across all variants (hot holding,
 * cold holding, cooldown, receiving) for the org's locations and derives
 * page-level counts for the Current Readings unified summary view.
 *
 * Data only — no render. Pairs with useUnifiedCurrentReadings (per-row data)
 * which is consumed by CurrentReadingsUnified component.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { isHoldingHot, isHoldingCold } from '../lib/equipmentHelpers';

export interface CurrentReadingsSummary {
  inRange: number;
  overdue: number;
  failing: number;
  awaitingReading: number;
  totalUnits: number;
  totalFoodHeld: number;
}

const HOLDING_WINDOW_HRS_HOT = 4;
const HOLDING_WINDOW_HRS_COLD = 8;
const OVERDUE_AFTER_HRS_HOT = 4;
const OVERDUE_AFTER_HRS_COLD = 4;

export function useCurrentReadingsSummary() {
  const { profile } = useAuth();
  const { getAccessibleLocations } = useRole();
  const orgId = profile?.organization_id;
  const locationIds = getAccessibleLocations().map(l => l.locationId).filter(Boolean);

  const [summary, setSummary] = useState<CurrentReadingsSummary>({
    inRange: 0,
    overdue: 0,
    failing: 0,
    awaitingReading: 0,
    totalUnits: 0,
    totalFoodHeld: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!orgId || locationIds.length === 0) {
      setSummary({
        inRange: 0,
        overdue: 0,
        failing: 0,
        awaitingReading: 0,
        totalUnits: 0,
        totalFoodHeld: 0,
      });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all active equipment across accessible locations
      const { data: eqData, error: eqError } = await supabase
        .from('temperature_equipment')
        .select('id, name, equipment_type, min_temp, max_temp, location_id')
        .in('location_id', locationIds)
        .eq('is_active', true);

      if (eqError) throw eqError;

      const equipment = eqData ?? [];
      const totalUnits = equipment.length;

      if (totalUnits === 0) {
        setSummary({
          inRange: 0,
          overdue: 0,
          failing: 0,
          awaitingReading: 0,
          totalUnits: 0,
          totalFoodHeld: 0,
        });
        setLoading(false);
        return;
      }

      // 2. Fetch latest ambient log per equipment (menu_item_id IS NULL)
      const { data: ambientLogs, error: ambientError } = await supabase
        .from('temperature_logs')
        .select('equipment_id, temperature, temp_pass, reading_time, required_min, required_max')
        .in('equipment_id', equipment.map(e => e.id))
        .is('menu_item_id', null)
        .is('superseded_by_log_id', null)
        .order('reading_time', { ascending: false });

      if (ambientError) throw ambientError;

      // 3. Reduce to latest entry per equipment_id
      const latestByEquipment = new Map<string, { temperature: number; temp_pass: boolean; reading_time: string }>();
      for (const log of (ambientLogs ?? [])) {
        if (!latestByEquipment.has(log.equipment_id)) {
          latestByEquipment.set(log.equipment_id, {
            temperature: log.temperature,
            temp_pass: log.temp_pass,
            reading_time: log.reading_time,
          });
        }
      }

      // 4. Derive per-equipment status
      const now = Date.now();
      let inRange = 0;
      let overdue = 0;
      let failing = 0;
      let awaitingReading = 0;

      for (const eq of equipment) {
        const isHot = isHoldingHot(eq.equipment_type);
        const isCold = isHoldingCold(eq.equipment_type);
        const overdueHrs = isHot ? OVERDUE_AFTER_HRS_HOT : isCold ? OVERDUE_AFTER_HRS_COLD : OVERDUE_AFTER_HRS_HOT;
        const last = latestByEquipment.get(eq.id);
        if (!last) {
          awaitingReading += 1;
          continue;
        }
        const ageMs = now - new Date(last.reading_time).getTime();
        const ageHrs = ageMs / (1000 * 60 * 60);
        if (!last.temp_pass) {
          failing += 1;
        } else if (ageHrs > overdueHrs) {
          overdue += 1;
        } else {
          inRange += 1;
        }
      }

      // 5. Count distinct food items currently held within the relevant window
      const heldCutoffHot = new Date(now - HOLDING_WINDOW_HRS_HOT * 60 * 60 * 1000).toISOString();
      const heldCutoffCold = new Date(now - HOLDING_WINDOW_HRS_COLD * 60 * 60 * 1000).toISOString();
      const cutoff = heldCutoffHot < heldCutoffCold ? heldCutoffHot : heldCutoffCold;

      const { data: foodLogs, error: foodError } = await supabase
        .from('temperature_logs')
        .select('equipment_id, menu_item_id, reading_time')
        .in('equipment_id', equipment.map(e => e.id))
        .not('menu_item_id', 'is', null)
        .is('superseded_by_log_id', null)
        .gte('reading_time', cutoff)
        .order('reading_time', { ascending: false });

      if (foodError) throw foodError;

      const seenFoodKeys = new Set<string>();
      let totalFoodHeld = 0;
      for (const log of (foodLogs ?? [])) {
        const key = `${log.equipment_id}:${log.menu_item_id}`;
        if (seenFoodKeys.has(key)) continue;
        seenFoodKeys.add(key);
        const eq = equipment.find(e => e.id === log.equipment_id);
        if (!eq) continue;
        const isHot = isHoldingHot(eq.equipment_type);
        const windowCutoff = isHot ? heldCutoffHot : heldCutoffCold;
        if (log.reading_time >= windowCutoff) {
          totalFoodHeld += 1;
        }
      }

      setSummary({
        inRange,
        overdue,
        failing,
        awaitingReading,
        totalUnits,
        totalFoodHeld,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load summary';
      console.warn('[useCurrentReadingsSummary]', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [orgId, locationIds.join(',')]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary,
  };
}
