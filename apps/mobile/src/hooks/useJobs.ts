/**
 * Job hooks for technician app
 *
 * Queries return stubbed empty data.
 * Mutations throw "Not implemented" until wired to Supabase.
 */

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Job {
  id: string;
  vendor_id: string;
  organization_id: string;
  location_id: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  meeting_location: string;
  service_types: string[];
  scheduled_date: string;
  scheduled_time: string;
  estimated_duration: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to: string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  previous_visit_notes: string | null;
}

export interface JobProgress {
  checklists: { total: number; completed: number };
  photos: { total: number; uploaded: number };
  deficiencies: { total: number; documented: number };
  reports: { total: number; generated: number };
  signatures: { tech: boolean; customer: boolean };
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Fetch jobs for a given date (or all jobs if no date provided).
 *
 * TODO: Replace stub with Supabase query against `jobs` table
 *       filtered by assigned_to = current user and scheduled_date = date.
 */
export function useJobs(date?: string) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Supabase query — supabase.from('jobs').select('*').eq('scheduled_date', date)
      setJobs([]);
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { jobs, loading, error, refetch };
}

/**
 * Fetch a single job by ID.
 *
 * TODO: Replace stub with Supabase query against `jobs` table
 *       filtered by id = id.
 */
export function useJob(id: string) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Supabase query — supabase.from('jobs').select('*').eq('id', id).single()
      setJob(null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch job');
    } finally {
      setLoading(false);
    }
  }, [id]);

  return { job, loading, error };
}

/**
 * Fetch completion progress for a job (checklists, photos, deficiencies, etc.).
 *
 * TODO: Replace stub with aggregated Supabase queries across
 *       job_checklists, job_photos, deficiencies, job_reports tables.
 */
export function useJobProgress(id: string) {
  const [progress, setProgress] = useState<JobProgress>({
    checklists: { total: 0, completed: 0 },
    photos: { total: 0, uploaded: 0 },
    deficiencies: { total: 0, documented: 0 },
    reports: { total: 0, generated: 0 },
    signatures: { tech: false, customer: false },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Supabase aggregation queries for job progress
      setProgress({
        checklists: { total: 0, completed: 0 },
        photos: { total: 0, uploaded: 0 },
        deficiencies: { total: 0, documented: 0 },
        reports: { total: 0, generated: 0 },
        signatures: { tech: false, customer: false },
      });
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch job progress');
    } finally {
      setLoading(false);
    }
  }, [id]);

  return { ...progress, loading, error };
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Start a job — updates status to 'in_progress' and records start time.
 *
 * TODO: Supabase update — supabase.from('jobs').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', jobId)
 */
export function useStartJob() {
  const mutate = useCallback(async (jobId: string) => {
    // TODO: Wire to Supabase
    throw new Error('Not implemented');
  }, []);

  return { mutate };
}

/**
 * Complete a job — updates status to 'completed' and records end time.
 *
 * TODO: Supabase update — supabase.from('jobs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', jobId)
 */
export function useCompleteJob() {
  const mutate = useCallback(async (jobId: string) => {
    // TODO: Wire to Supabase
    throw new Error('Not implemented');
  }, []);

  return { mutate };
}
