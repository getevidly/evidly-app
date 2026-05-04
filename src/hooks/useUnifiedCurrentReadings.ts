/**
 * useUnifiedCurrentReadings.ts
 *
 * Returns per-equipment row data for the Current Readings unified summary view.
 * Groups equipment by variant (hot, cold, cooldown, receiving) with the latest
 * ambient temp, status, overdue clock, and held food count per unit.
 *
 * Pairs with useCurrentReadingsSummary (page-level counts).
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { isHoldingHot, isHoldingCold } from '../lib/equipmentHelpers';

export type UnifiedVariant = 'hot' | 'cold' | 'cooldown' | 'receiving';
export type UnifiedRowStatus = 'pass' | 'fail' | 'overdue' | 'awaiting';

export interface UnifiedReadingRow {
  equipment_id: string;
  equipment_name: string;
  equipment_type: string;
  variant: UnifiedVariant;
  temperature_value: number | null;
  status: UnifiedRowStatus;
  reading_time: string | null;
  age_minutes: number | null;
  held_food_count: number;
  min_temp: number;
  max_temp: number;
  default_input_method: string;
}

export interface UnifiedReadingsByVariant {
  hot: UnifiedReadingRow[];
  cold: UnifiedReadingRow[];
  cooldown: UnifiedReadingRow[];
  receiving: UnifiedReadingRow[];
}

const HELD_WINDOW_HRS_HOT = 4;
const HELD_WINDOW_HRS_COLD = 8;
const OVERDUE_AFTER_HRS = 4;

function deriveVariant(equipmentType: string): UnifiedVariant | null {
  if (isHoldingHot(equipmentType)) return 'hot';
  if (isHoldingCold(equipmentType)) return 'cold';
  return null;
}

export function useUnifiedCurrentReadings() {
  const { profile } = useAuth();
  const { getAccessibleLocations } = useRole();
  const orgId = profile?.organization_id;
  const locationIds = getAccessibleLocations().map(l => l.locationId).filter(Boolean);

  const [rows, setRows] = useState<UnifiedReadingsByVariant>({
    hot: [], cold: [], cooldown: [], receiving: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    if (!orgId || locationIds.length === 0) {
      setRows({ hot: [], cold: [], cooldown: [], receiving: [] });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: eqData, error: eqError } = await supabase
        .from('temperature_equipment')
        .select('id, name, equipment_type, min_temp, max_temp, default_input_method, location_id')
        .in('location_id', locationIds)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (eqError) throw eqError;

      const equipment = eqData ?? [];
      if (equipment.length === 0) {
        setRows({ hot: [], cold: [], cooldown: [], receiving: [] });
        setLoading(false);
        return;
      }

      const equipmentIds = equipment.map(e => e.id);

      const { data: ambientLogs, error: ambientError } = await supabase
        .from('temperature_logs')
        .select('equipment_id, temperature, temp_pass, reading_time')
        .in('equipment_id', equipmentIds)
        .is('menu_item_id', null)
        .is('superseded_by_log_id', null)
        .order('reading_time', { ascending: false });

      if (ambientError) throw ambientError;

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

      const now = Date.now();
      const heldCutoffHot = new Date(now - HELD_WINDOW_HRS_HOT * 60 * 60 * 1000).toISOString();
      const heldCutoffCold = new Date(now - HELD_WINDOW_HRS_COLD * 60 * 60 * 1000).toISOString();
      const broadestCutoff = heldCutoffHot < heldCutoffCold ? heldCutoffHot : heldCutoffCold;

      const { data: foodLogs, error: foodError } = await supabase
        .from('temperature_logs')
        .select('equipment_id, menu_item_id, reading_time')
        .in('equipment_id', equipmentIds)
        .not('menu_item_id', 'is', null)
        .is('superseded_by_log_id', null)
        .gte('reading_time', broadestCutoff)
        .order('reading_time', { ascending: false });

      if (foodError) throw foodError;

      const heldByEquipment = new Map<string, Set<string>>();
      for (const log of (foodLogs ?? [])) {
        const eq = equipment.find(e => e.id === log.equipment_id);
        if (!eq) continue;
        const isHot = isHoldingHot(eq.equipment_type);
        const cutoff = isHot ? heldCutoffHot : heldCutoffCold;
        if (log.reading_time < cutoff) continue;
        if (!log.menu_item_id) continue;
        if (!heldByEquipment.has(log.equipment_id)) {
          heldByEquipment.set(log.equipment_id, new Set());
        }
        heldByEquipment.get(log.equipment_id)!.add(log.menu_item_id);
      }

      const result: UnifiedReadingsByVariant = { hot: [], cold: [], cooldown: [], receiving: [] };

      for (const eq of equipment) {
        const variant = deriveVariant(eq.equipment_type);
        if (!variant) continue;
        const last = latestByEquipment.get(eq.id);
        let status: UnifiedRowStatus;
        let ageMin: number | null = null;
        if (!last) {
          status = 'awaiting';
        } else {
          ageMin = (now - new Date(last.reading_time).getTime()) / (1000 * 60);
          if (!last.temp_pass) {
            status = 'fail';
          } else if (ageMin > OVERDUE_AFTER_HRS * 60) {
            status = 'overdue';
          } else {
            status = 'pass';
          }
        }
        const heldCount = heldByEquipment.get(eq.id)?.size ?? 0;
        const row: UnifiedReadingRow = {
          equipment_id: eq.id,
          equipment_name: eq.name,
          equipment_type: eq.equipment_type,
          variant,
          temperature_value: last?.temperature ?? null,
          status,
          reading_time: last?.reading_time ?? null,
          age_minutes: ageMin,
          held_food_count: heldCount,
          min_temp: eq.min_temp,
          max_temp: eq.max_temp,
          default_input_method: eq.default_input_method ?? 'manual',
        };
        result[variant].push(row);
      }

      setRows(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load readings';
      console.warn('[useUnifiedCurrentReadings]', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [orgId, locationIds.join(',')]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  return {
    rows,
    loading,
    error,
    refetch: fetchRows,
  };
}
