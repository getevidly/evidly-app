/**
 * useOpenDrift — full open drift rows for the OI detail page.
 *
 * Returns all open drift_catches split into food and fire arrays.
 * Food Safety and Fire Safety are NEVER combined — two independent tracks.
 * Joins locations for display name. No row limit (detail page shows all).
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface OpenDriftItem {
  id: string;
  drift_type: string;
  pillar: 'food_safety' | 'fire_safety';
  severity: string;
  status: string;
  detected_at: string;
  source_table: string;
  source_record_id: string | null;
  expected_value: string | null;
  actual_value: string | null;
  requirement_source: string | null;
  dimension: string | null;
  location_id: string;
  location_name: string;
  estimated_savings_cents: number;
}

interface UseOpenDriftResult {
  foodItems: OpenDriftItem[];
  fireItems: OpenDriftItem[];
  loading: boolean;
}

export function useOpenDrift(locationIdFilter?: string | null): UseOpenDriftResult {
  const { profile } = useAuth();
  const orgId = profile?.organization_id || '';
  const [foodItems, setFoodItems] = useState<OpenDriftItem[]>([]);
  const [fireItems, setFireItems] = useState<OpenDriftItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    async function fetchDrift() {
      setLoading(true);

      let q = supabase
        .from('drift_catches')
        .select(
          'id, drift_type, pillar, severity, status, detected_at, ' +
          'source_table, source_record_id, expected_value, actual_value, ' +
          'requirement_source, dimension, location_id, estimated_savings_cents, ' +
          'locations!inner(name)'
        )
        .eq('org_id', orgId)
        .eq('status', 'open')
        .order('detected_at', { ascending: false });

      if (locationIdFilter) {
        q = q.eq('location_id', locationIdFilter);
      }

      const { data, error } = await q;
      if (cancelled) return;

      if (error) {
        console.error('[useOpenDrift]', error.message);
        setLoading(false);
        return;
      }

      const food: OpenDriftItem[] = [];
      const fire: OpenDriftItem[] = [];

      for (const row of data || []) {
        const item: OpenDriftItem = {
          id: row.id,
          drift_type: row.drift_type,
          pillar: row.pillar,
          severity: row.severity,
          status: row.status,
          detected_at: row.detected_at,
          source_table: row.source_table,
          source_record_id: row.source_record_id,
          expected_value: row.expected_value,
          actual_value: row.actual_value,
          requirement_source: row.requirement_source,
          dimension: row.dimension,
          location_id: row.location_id,
          location_name: (row.locations as any)?.name || '',
          estimated_savings_cents: row.estimated_savings_cents ?? 0,
        };

        if (row.pillar === 'food_safety') food.push(item);
        else if (row.pillar === 'fire_safety') fire.push(item);
      }

      setFoodItems(food);
      setFireItems(fire);
      setLoading(false);
    }

    fetchDrift();
    return () => { cancelled = true; };
  }, [orgId, locationIdFilter]);

  return { foodItems, fireItems, loading };
}
