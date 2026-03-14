/**
 * Deficiency hooks for technician app
 *
 * Queries return stubbed empty data.
 * Mutations throw "Not implemented" until wired to Supabase.
 */

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Deficiency {
  id: string;
  job_id: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  photo_url: string | null;
  equipment_component: string;
  nfpa_reference: string | null;
  measurements: Record<string, unknown> | null;
  recommended_action: string | null;
  estimated_repair_cost: number | null;
  detected_by: 'manual' | 'ai' | 'checklist';
  ai_confidence: number | null;
  voice_transcription: string | null;
  customer_notified: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Fetch deficiencies for a job.
 *
 * TODO: Replace stub with Supabase query against `deficiencies` table
 *       filtered by job_id.
 */
export function useJobDeficiencies(jobId: string) {
  const [deficiencies, setDeficiencies] = useState<Deficiency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    try {
      // TODO: Supabase query — supabase.from('deficiencies').select('*').eq('job_id', jobId).order('created_at', { ascending: false })
      setDeficiencies([]);
    } catch {
      // Stub — no error state needed yet
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  return { deficiencies, loading };
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Create a new deficiency record.
 *
 * TODO: Supabase insert into `deficiencies` table.
 */
export function useCreateDeficiency() {
  const mutate = useCallback(
    async (params: {
      jobId: string;
      photoId: string;
      equipment: string;
      component: string;
      description: string;
      severity: 'minor' | 'major' | 'critical';
      nfpaReference?: string;
      measurements?: Record<string, unknown>;
      recommendedAction?: string;
      estimatedRepairCost?: number;
    }) => {
      // TODO: Wire to Supabase
      throw new Error('Not implemented');
    },
    [],
  );

  return { mutate };
}

/**
 * Update an existing deficiency.
 *
 * TODO: Supabase update on `deficiencies` table filtered by id.
 */
export function useUpdateDeficiency() {
  const mutate = useCallback(
    async (id: string, updates: Partial<Deficiency>) => {
      // TODO: Wire to Supabase
      throw new Error('Not implemented');
    },
    [],
  );

  return { mutate };
}

/**
 * Use AI to analyze a photo and suggest deficiency details.
 *
 * TODO: Call Supabase edge function `ai-analyze-deficiency` with photoId,
 *       returns suggested description, severity, NFPA reference, etc.
 */
export function useAIAnalyzeDeficiency() {
  const mutate = useCallback(async (photoId: string) => {
    // TODO: Wire to Supabase edge function
    throw new Error('Not implemented');
  }, []);

  return { mutate };
}
