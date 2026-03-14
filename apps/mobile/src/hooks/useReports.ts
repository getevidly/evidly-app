/**
 * Report generation hooks for technician app
 *
 * Queries return stubbed empty data.
 * Mutations throw "Not implemented" until wired to Supabase.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JobReport {
  id: string;
  job_id: string;
  report_type: 'service_report' | 'inspection_report' | 'deficiency_report';
  report_number: string;
  pdf_url: string | null;
  pdf_generated_at: string | null;
  tech_signature_url: string | null;
  tech_signed_at: string | null;
  customer_signature_url: string | null;
  customer_signed_at: string | null;
  customer_signer_name: string | null;
  emailed_to: string[];
  qa_status: 'pending' | 'approved' | 'needs_revision' | null;
}

/**
 * Ref handle for the signature canvas component.
 * The actual implementation will use a signature pad library
 * (e.g., react-native-signature-canvas).
 */
export interface SignatureRef {
  clear: () => void;
  toDataURL: () => string;
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Fetch reports for a job.
 *
 * TODO: Replace stub with Supabase query against `job_reports` table
 *       filtered by job_id.
 */
export function useJobReports(jobId: string) {
  const [reports, setReports] = useState<JobReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    try {
      // TODO: Supabase query — supabase.from('job_reports').select('*').eq('job_id', jobId).order('pdf_generated_at', { ascending: false })
      setReports([]);
    } catch {
      // Stub — no error state needed yet
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  return { reports, loading };
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Generate a report via the generate-job-report edge function.
 *
 * TODO: Call Supabase edge function `generate-job-report` with jobId and reportType,
 *       which assembles data and generates a PDF stored in Supabase Storage.
 */
export function useGenerateReport() {
  const mutate = useCallback(
    async (params: {
      jobId: string;
      reportType: 'service_report' | 'inspection_report' | 'deficiency_report';
    }) => {
      // TODO: Wire to Supabase edge function
      throw new Error('Not implemented');
    },
    [],
  );

  return { mutate };
}

/**
 * Manage a signature capture pad.
 *
 * Returns a ref to attach to a signature canvas component,
 * plus helper functions to clear and extract the signature image.
 *
 * TODO: Wire to an actual signature pad library (react-native-signature-canvas).
 */
export function useCaptureSignature() {
  const signatureRef = useRef<SignatureRef | null>(null);

  const clearSignature = useCallback(() => {
    signatureRef.current?.clear();
  }, []);

  const getSignatureImage = useCallback((): string | null => {
    return signatureRef.current?.toDataURL() ?? null;
  }, []);

  return { signatureRef, clearSignature, getSignatureImage };
}

/**
 * Email a report to one or more recipients.
 *
 * TODO: Call Supabase edge function or API to send the report PDF
 *       via email to the specified addresses.
 */
export function useEmailReport() {
  const mutate = useCallback(
    async (params: { reportId: string; emails: string[] }) => {
      // TODO: Wire to Supabase edge function
      throw new Error('Not implemented');
    },
    [],
  );

  return { mutate };
}
