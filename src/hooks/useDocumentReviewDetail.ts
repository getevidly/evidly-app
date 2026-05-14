/**
 * useDocumentReviewDetail — fetches a single vendor_document_submission by id.
 * Joins vendor_documents + vendors.
 * Realtime subscription on the single row.
 * Demo mode returns null.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import type { VendorDocumentSubmission } from '../types/vendorCompliance';

export interface DocReviewDetail {
  id: string;
  title: string;
  state: 'action' | 'attention' | 'current';
  aiFlagged: boolean;
  vendorName: string;
  uploadedDate: string;
  answerLine: string | null;
  aiCaughtText: string | null;
  cta: { variant: 'primary' | 'secondary'; label: string } | null;
  fileUrl: string | null;
  raw: VendorDocumentSubmission | null;
}

function deriveDocState(sub: VendorDocumentSubmission): 'action' | 'attention' | 'current' {
  if (sub.review_status === 'approved') return 'current';
  if (sub.review_status === 'declined') return 'action';
  if (sub.ai_validation_status === 'failed') return 'action';
  return 'attention';
}

function deriveDocCta(sub: VendorDocumentSubmission): { variant: 'primary' | 'secondary'; label: string } | null {
  if (sub.review_status === 'approved') return null;
  if (sub.ai_validation_status === 'failed') return { variant: 'primary', label: 'Review' };
  if (sub.review_status === 'pending') return { variant: 'secondary', label: 'Review' };
  return null;
}

interface UseDocumentReviewDetailResult {
  doc: DocReviewDetail | null;
  loading: boolean;
  error: string | null;
  approve: (notes?: string) => Promise<void>;
  decline: (reason: string) => Promise<void>;
}

export function useDocumentReviewDetail(docId: string | undefined): UseDocumentReviewDetailResult {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [doc, setDoc] = useState<DocReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = profile?.organization_id;

  const fetchDetail = useCallback(async () => {
    if (isDemoMode || !orgId || !docId) {
      setDoc(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
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
        .eq('id', docId)
        .single();

      if (fetchErr) {
        setError(fetchErr.message);
        setDoc(null);
      } else if (data) {
        const sub = data as unknown as VendorDocumentSubmission;
        const aiResult = sub.ai_validation_result;

        setDoc({
          id: sub.id,
          title: sub.vendor_documents?.title ?? '',
          state: deriveDocState(sub),
          aiFlagged: sub.ai_validation_status === 'failed',
          vendorName: sub.vendors?.name ?? '',
          uploadedDate: sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '',
          answerLine: aiResult?.summary ?? null,
          aiCaughtText: aiResult?.issues?.length ? aiResult.issues.join('. ') : null,
          cta: deriveDocCta(sub),
          fileUrl: sub.vendor_documents?.file_url ?? null,
          raw: sub,
        });
      } else {
        setDoc(null);
      }
    } catch {
      setError('Failed to fetch document details');
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [orgId, isDemoMode, docId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    if (isDemoMode || !orgId || !docId) return;

    const channel = supabase
      .channel(`doc-review-detail-${docId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendor_document_submissions',
          filter: `id=eq.${docId}`,
        },
        () => { fetchDetail(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, isDemoMode, docId, fetchDetail]);

  const approve = async (notes?: string) => {
    if (isDemoMode || !profile?.id || !docId) return;

    await supabase
      .from('vendor_document_submissions')
      .update({
        review_status: 'approved',
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
      })
      .eq('id', docId);

    if (doc?.raw?.vendor_document_id) {
      await supabase
        .from('vendor_documents')
        .update({
          status: 'accepted',
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
        })
        .eq('id', doc.raw.vendor_document_id);
    }

    fetchDetail();
  };

  const decline = async (reason: string) => {
    if (isDemoMode || !profile?.id || !docId) return;

    await supabase
      .from('vendor_document_submissions')
      .update({
        review_status: 'declined',
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
        decline_reason: reason,
      })
      .eq('id', docId);

    if (doc?.raw?.vendor_document_id) {
      await supabase
        .from('vendor_documents')
        .update({
          status: 'flagged',
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
          review_notes: `Declined: ${reason}`,
        })
        .eq('id', doc.raw.vendor_document_id);
    }

    fetchDetail();
  };

  return { doc, loading, error, approve, decline };
}
