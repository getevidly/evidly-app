/**
 * useVendorSubmissions — VENDOR-COMPLIANCE-01
 *
 * Queries vendor_document_submissions joined with vendor_documents + vendors.
 * Supabase realtime subscription for live updates.
 * Demo mode → empty array.
 */

import { useState, useEffect, useCallback } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { VendorDocumentSubmission, ReviewStatus } from '../types/vendorCompliance';

interface UseVendorSubmissionsReturn {
  submissions: VendorDocumentSubmission[];
  loading: boolean;
  approve: (submissionId: string, notes?: string) => Promise<void>;
  decline: (submissionId: string, reason: string) => Promise<void>;
  bulkApprove: (submissionIds: string[]) => Promise<{ succeeded: number; failed: number }>;
  refetch: () => void;
}

export function useVendorSubmissions(
  filterStatus?: ReviewStatus | 'all'
): UseVendorSubmissionsReturn {
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const [submissions, setSubmissions] = useState<VendorDocumentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const orgId = profile?.organization_id;

  const fetchSubmissions = useCallback(async () => {
    if (isDemoMode || !orgId) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('vendor_document_submissions')
        .select(`
          *,
          vendor_documents!vendor_document_id (
            id, document_type, title, file_url, file_type,
            file_size, status, expiration_date, version,
            uploaded_by_vendor, vendor_notes
          ),
          vendors!vendor_id (
            id, name, contact_name, contact_email
          )
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (filterStatus && filterStatus !== 'all') {
        query = query.eq('review_status', filterStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching submissions:', error);
        setSubmissions([]);
      } else {
        setSubmissions((data || []) as unknown as VendorDocumentSubmission[]);
      }
    } catch (err) {
      console.error('Error in useVendorSubmissions:', err);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, orgId, filterStatus]);

  // Initial fetch
  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Realtime subscription
  useEffect(() => {
    if (isDemoMode || !orgId) return;

    const channel = supabase
      .channel('vendor_doc_submissions_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendor_document_submissions',
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          fetchSubmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDemoMode, orgId, fetchSubmissions]);

  const approve = useCallback(async (submissionId: string, notes?: string) => {
    if (isDemoMode || !profile?.id) return;

    const { error: subError } = await supabase
      .from('vendor_document_submissions')
      .update({
        review_status: 'approved',
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
      })
      .eq('id', submissionId);

    if (subError) {
      console.error('Error approving submission:', subError);
      throw new Error(`Failed to approve submission: ${subError.message}`);
    }

    // Also update the vendor_document status
    const submission = submissions.find(s => s.id === submissionId);
    if (submission?.vendor_document_id) {
      const { error: docError } = await supabase
        .from('vendor_documents')
        .update({
          status: 'accepted',
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
        })
        .eq('id', submission.vendor_document_id);

      if (docError) {
        // Revert submission to avoid split state
        await supabase
          .from('vendor_document_submissions')
          .update({
            review_status: 'pending_review',
            reviewed_by: null,
            reviewed_at: null,
            review_notes: null,
          })
          .eq('id', submissionId);

        throw new Error(`Document update failed after submission approved — reverted to pending. ${docError.message}`);
      }
    }

    fetchSubmissions();
  }, [isDemoMode, profile, submissions, fetchSubmissions]);

  const decline = useCallback(async (submissionId: string, reason: string) => {
    if (isDemoMode || !profile?.id) return;

    const { error: subError } = await supabase
      .from('vendor_document_submissions')
      .update({
        review_status: 'declined',
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
        decline_reason: reason,
      })
      .eq('id', submissionId);

    if (subError) {
      console.error('Error declining submission:', subError);
      throw new Error(`Failed to decline submission: ${subError.message}`);
    }

    // Update vendor_document status to flagged
    const submission = submissions.find(s => s.id === submissionId);
    if (submission?.vendor_document_id) {
      const { error: docError } = await supabase
        .from('vendor_documents')
        .update({
          status: 'flagged',
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
          review_notes: `Declined: ${reason}`,
        })
        .eq('id', submission.vendor_document_id);

      if (docError) {
        // Revert submission to avoid split state
        await supabase
          .from('vendor_document_submissions')
          .update({
            review_status: 'pending_review',
            reviewed_by: null,
            reviewed_at: null,
            decline_reason: null,
          })
          .eq('id', submissionId);

        throw new Error(`Document update failed after submission declined — reverted to pending. ${docError.message}`);
      }
    }

    fetchSubmissions();
  }, [isDemoMode, profile, submissions, fetchSubmissions]);

  const bulkApprove = useCallback(async (submissionIds: string[]): Promise<{ succeeded: number; failed: number }> => {
    if (isDemoMode || !profile?.id) return { succeeded: 0, failed: 0 };
    let succeeded = 0;
    let failed = 0;
    for (const id of submissionIds) {
      try {
        const { error: subError } = await supabase
          .from('vendor_document_submissions')
          .update({
            review_status: 'approved',
            reviewed_by: profile.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (subError) {
          failed++;
          continue;
        }

        const submission = submissions.find(s => s.id === id);
        if (submission?.vendor_document_id) {
          const { error: docError } = await supabase
            .from('vendor_documents')
            .update({
              status: 'accepted',
              reviewed_by: profile.id,
              reviewed_at: new Date().toISOString(),
            })
            .eq('id', submission.vendor_document_id);

          if (docError) {
            // Revert submission to avoid split state
            await supabase
              .from('vendor_document_submissions')
              .update({
                review_status: 'pending_review',
                reviewed_by: null,
                reviewed_at: null,
                review_notes: null,
              })
              .eq('id', id);

            failed++;
            continue;
          }
        }
        succeeded++;
      } catch {
        failed++;
      }
    }
    fetchSubmissions();
    return { succeeded, failed };
  }, [isDemoMode, profile, submissions, fetchSubmissions]);

  return { submissions, loading, approve, decline, bulkApprove, refetch: fetchSubmissions };
}
