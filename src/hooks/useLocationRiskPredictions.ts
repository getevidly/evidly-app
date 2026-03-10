// TODO: PREDICT-SP07-01 — wire full SP-07 "which location to visit first" when component is built.
//       Use highestRisk from this hook + top_risk_reasons for recommendation text.

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';

export interface LocationRiskPrediction {
  id: string;
  location_id: string;
  organization_id: string;
  failure_probability: number;
  risk_level: 'critical' | 'high' | 'moderate' | 'low' | 'unknown';
  score_trajectory: 'improving' | 'stable' | 'declining' | 'unknown';
  trajectory_confidence: number | null;
  recommended_service_date: string | null;
  service_urgency: 'immediate' | 'soon' | 'scheduled' | 'none' | null;
  top_risk_pillars: string[];
  top_risk_reasons: string[];
  input_checklist_rate_30d: number | null;
  input_temp_pass_rate_30d: number | null;
  input_days_since_service: number | null;
  input_open_corrective_actions: number;
  model_version: string;
  prediction_method: 'rules' | 'mindsdb' | 'ml-python';
  predicted_at: string;
  expires_at: string;
  location_name?: string;
}

export function useLocationRiskPredictions(locationId?: string) {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [predictions, setPredictions] = useState<LocationRiskPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPredictions() {
      setLoading(true);
      setError(null);

      // Demo mode: return empty — no fake prediction data
      if (isDemoMode) {
        setPredictions([]);
        setLoading(false);
        return;
      }

      if (!profile?.organization_id) {
        setPredictions([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('location_risk_predictions')
        .select('*, locations(name)')
        .eq('organization_id', profile.organization_id)
        .gt('expires_at', new Date().toISOString())
        .order('failure_probability', { ascending: false });

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error: queryError } = await query.limit(50);

      if (queryError) {
        setError('Failed to load risk predictions');
        setPredictions([]);
      } else {
        setPredictions(
          (data ?? []).map((row: any) => ({
            ...row,
            location_name: row.locations?.name ?? 'Unknown Location',
          }))
        );
      }
      setLoading(false);
    }

    fetchPredictions();
  }, [profile?.organization_id, locationId, isDemoMode]);

  const highestRisk = predictions[0] ?? null;

  const riskCounts = {
    critical: predictions.filter(p => p.risk_level === 'critical').length,
    high: predictions.filter(p => p.risk_level === 'high').length,
    moderate: predictions.filter(p => p.risk_level === 'moderate').length,
    low: predictions.filter(p => p.risk_level === 'low').length,
  };

  return { predictions, loading, error, highestRisk, riskCounts };
}
