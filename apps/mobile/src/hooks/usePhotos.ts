/**
 * Photo hooks for technician app
 *
 * Queries return stubbed empty data.
 * Mutations throw "Not implemented" until wired to Supabase.
 */

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DetectedIssue {
  type: string;
  location: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

export interface AIPhotoAnalysis {
  grease_level: 'none' | 'light' | 'moderate' | 'heavy' | 'severe';
  grease_percentage: number;
  cleanliness_score: number;
  condition_rating: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  detected_issues: DetectedIssue[];
  recommended_actions: string[];
  confidence: number;
  comparison_to_before?: {
    improvement_score: number;
    summary: string;
  };
}

export interface JobPhoto {
  id: string;
  job_id: string;
  photo_url: string;
  thumbnail_url: string;
  phase: 'before' | 'during' | 'after';
  category: string;
  equipment_id: string | null;
  captured_at: string;
  captured_by: string;
  ai_analyzed: boolean;
  ai_analysis?: AIPhotoAnalysis;
  notes: string | null;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Fetch photos for a job, optionally filtered by phase.
 *
 * TODO: Replace stub with Supabase query against `job_photos` table
 *       filtered by job_id and optionally phase.
 */
export function useJobPhotos(jobId: string, phase?: string) {
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    try {
      // TODO: Supabase query — supabase.from('job_photos').select('*').eq('job_id', jobId)
      //       Add .eq('phase', phase) if phase is provided
      setPhotos([]);
    } catch {
      // Stub — no error state needed yet
    } finally {
      setLoading(false);
    }
  }, [jobId, phase]);

  return { photos, loading };
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Capture and upload a photo.
 *
 * TODO: Upload image to Supabase Storage, then insert row into `job_photos` table.
 */
export function useCapturePhoto() {
  const mutate = useCallback(
    async (params: {
      jobId: string;
      uri: string;
      phase: 'before' | 'during' | 'after';
      category: string;
      equipmentId?: string;
      checklistItemId?: string;
    }) => {
      // TODO: Wire to Supabase Storage + job_photos insert
      throw new Error('Not implemented');
    },
    [],
  );

  return { mutate };
}

/**
 * Run AI analysis on a photo via the ai-photo-analysis edge function.
 *
 * TODO: Call Supabase edge function `ai-photo-analysis` with photoId,
 *       then update `job_photos.ai_analysis` and `ai_analyzed = true`.
 */
export function useAnalyzePhoto() {
  const mutate = useCallback(async (photoId: string) => {
    // TODO: Wire to Supabase edge function
    throw new Error('Not implemented');
  }, []);

  return { mutate };
}

/**
 * Compare a before and after photo pair.
 *
 * TODO: Call Supabase edge function or client-side comparison logic
 *       to produce an improvement score and summary.
 */
export function useComparePhotos() {
  const mutate = useCallback(
    async (params: { beforePhotoId: string; afterPhotoId: string }) => {
      // TODO: Wire to Supabase edge function
      throw new Error('Not implemented');
    },
    [],
  );

  return { mutate };
}
