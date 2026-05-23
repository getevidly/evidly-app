/**
 * useTemperatureDriftDetection.ts
 *
 * Queries the last 3 ambient readings per active holding equipment and
 * computes a simple linear slope. A unit is "drifting" when:
 *   - Cold unit: slope > 0 (warming) AND current temp ≥ upper 30% of safe range
 *   - Hot unit:  slope < 0 (cooling) AND current temp ≤ lower 30% of safe range
 *
 * Returns the list of drifting units for the PRP PREDICT signal and the
 * TemperatureDriftCallout component.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { isHoldingHot, isHoldingCold } from '../../lib/equipmentHelpers';

export interface DriftingUnit {
  equipment_id: string;
  equipment_name: string;
  equipment_type: string;
  variant: 'hot' | 'cold';
  current_temp: number;
  slope: number;
  readings: { temp: number; time: string }[];
  min_temp: number;
  max_temp: number;
}

export function useTemperatureDriftDetection() {
  const { profile } = useAuth();
  const { getAccessibleLocations } = useRole();
  const orgId = profile?.organization_id;
  const locationIds = getAccessibleLocations().map(l => l.locationId).filter(Boolean);

  const [drifting, setDrifting] = useState<DriftingUnit[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDrift = useCallback(async () => {
    if (!orgId || locationIds.length === 0) {
      setDrifting([]);
      return;
    }
    setLoading(true);
    try {
      const { data: eqData, error: eqErr } = await supabase
        .from('temperature_equipment')
        .select('id, name, equipment_type, min_temp, max_temp, location_id')
        .in('location_id', locationIds)
        .eq('is_active', true);

      if (eqErr) throw eqErr;

      const equipment = eqData ?? [];
      const holdingEq = equipment.filter(
        e => isHoldingHot(e.equipment_type) || isHoldingCold(e.equipment_type),
      );

      if (holdingEq.length === 0) {
        setDrifting([]);
        setLoading(false);
        return;
      }

      const { data: logs, error: logErr } = await supabase
        .from('temperature_logs')
        .select('equipment_id, temperature, reading_time')
        .in('equipment_id', holdingEq.map(e => e.id))
        .is('menu_item_id', null)
        .is('superseded_by_log_id', null)
        .order('reading_time', { ascending: false });

      if (logErr) throw logErr;

      // Group by equipment — keep at most 3 newest readings per unit
      const readingsByEq = new Map<string, { temp: number; time: string }[]>();
      for (const log of logs ?? []) {
        const arr = readingsByEq.get(log.equipment_id) ?? [];
        if (arr.length < 3) {
          arr.push({ temp: log.temperature, time: log.reading_time });
          readingsByEq.set(log.equipment_id, arr);
        }
      }

      const results: DriftingUnit[] = [];

      for (const eq of holdingEq) {
        const readings = readingsByEq.get(eq.id);
        if (!readings || readings.length < 3) continue;

        // readings are newest-first; reverse for slope (oldest → newest)
        const ordered = [...readings].reverse();
        const slope = (ordered[2].temp - ordered[0].temp) / 2;
        const currentTemp = ordered[2].temp;
        const range = eq.max_temp - eq.min_temp;
        if (range <= 0) continue;

        const isHot = isHoldingHot(eq.equipment_type);
        const lowerBound = eq.min_temp + range * 0.3;
        const upperBound = eq.max_temp - range * 0.3;

        let isDrifting = false;
        if (isHot && slope < -0.5 && currentTemp <= lowerBound) {
          isDrifting = true;
        } else if (!isHot && slope > 0.5 && currentTemp >= upperBound) {
          isDrifting = true;
        }

        if (isDrifting) {
          results.push({
            equipment_id: eq.id,
            equipment_name: eq.name,
            equipment_type: eq.equipment_type,
            variant: isHot ? 'hot' : 'cold',
            current_temp: currentTemp,
            slope,
            readings: ordered,
            min_temp: eq.min_temp,
            max_temp: eq.max_temp,
          });
        }
      }

      setDrifting(results);
    } catch (e) {
      console.warn('[useTemperatureDriftDetection]', e instanceof Error ? e.message : e);
      setDrifting([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, locationIds.join(',')]);

  useEffect(() => {
    fetchDrift();
  }, [fetchDrift]);

  return { drifting, loading, refetch: fetchDrift };
}
