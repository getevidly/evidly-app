/**
 * QA review hooks for technician app
 *
 * Queries return stubbed empty data.
 * Mutations throw "Not implemented" until wired to Supabase.
 */

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QAPendingJob {
  jobId: string;
  customerName: string;
  technicianName: string;
  completedAt: string;
  photoCount: number;
  deficiencyCount: number;
  checklistStatus: 'complete' | 'incomplete';
}

export type QAStatusValue = 'pending' | 'approved' | 'needs_revision';

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Fetch QA review status for a specific job.
 *
 * TODO: Replace stub with Supabase query against `jobs` or `qa_reviews` table
 *       filtered by job_id.
 */
export function useQAStatus(jobId: string) {
  const [status, setStatus] = useState<QAStatusValue>('pending');
  const [reviewNotes, setReviewNotes] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    try {
      // TODO: Supabase query — supabase.from('qa_reviews').select('status, notes').eq('job_id', jobId).single()
      setStatus('pending');
      setReviewNotes(null);
    } catch {
      // Stub — no error state needed yet
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  return { status, reviewNotes, loading };
}

/**
 * Fetch all jobs pending QA review.
 *
 * TODO: Replace stub with Supabase query against `jobs` table
 *       where qa_status = 'pending', joined with technician/customer info.
 */
export function useQAPendingQueue() {
  const [jobs, setJobs] = useState<QAPendingJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    try {
      // TODO: Supabase query — supabase.from('jobs').select('*, profiles!assigned_to(full_name)').eq('qa_status', 'pending')
      setJobs([]);
    } catch {
      // Stub — no error state needed yet
    } finally {
      setLoading(false);
    }
  }, []);

  return { jobs, loading };
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Submit a completed job for QA review.
 *
 * TODO: Supabase update — supabase.from('jobs').update({ qa_status: 'pending' }).eq('id', jobId)
 */
export function useSubmitForQA() {
  const mutate = useCallback(async (jobId: string) => {
    // TODO: Wire to Supabase
    throw new Error('Not implemented');
  }, []);

  return { mutate };
}

/**
 * Approve a job's QA review.
 *
 * TODO: Supabase update — supabase.from('qa_reviews').upsert({ job_id: jobId, status: 'approved', notes })
 *       Also update jobs.qa_status = 'approved'.
 */
export function useApproveQA() {
  const mutate = useCallback(
    async (params: { jobId: string; notes?: string }) => {
      // TODO: Wire to Supabase
      throw new Error('Not implemented');
    },
    [],
  );

  return { mutate };
}

/**
 * Request revision for a job's QA review.
 *
 * TODO: Supabase update — supabase.from('qa_reviews').upsert({ job_id: jobId, status: 'needs_revision', notes: comments, flagged_items: flaggedItems })
 *       Also update jobs.qa_status = 'needs_revision'.
 */
export function useRequestRevision() {
  const mutate = useCallback(
    async (params: {
      jobId: string;
      comments: string;
      flaggedItems?: string[];
    }) => {
      // TODO: Wire to Supabase
      throw new Error('Not implemented');
    },
    [],
  );

  return { mutate };
}
