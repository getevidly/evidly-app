import { useState } from 'react';
import { toast } from 'sonner';
import { AISynthesisStrip } from '../../../components/vendors/AISynthesisStrip';
import { MetricsStrip } from '../../../components/vendors/MetricsStrip';
import { DocReviewRow } from '../../../components/vendors/DocReviewRow';
import { BulkApproveModal } from '../../../components/vendors/modals/BulkApproveModal';
import { useVendorSubmissions } from '../../../hooks/useVendorSubmissions';

/**
 * DocumentReviewTab — Surface 5.
 * Incoming vendor documents pending review/approval, with AI flags.
 */
export function DocumentReviewTab() {
  const [filter, setFilter] = useState('all');
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const { submissions, loading, bulkApprove } = useVendorSubmissions();

  const docs = submissions.map(sub => {
    const aiResult = sub.ai_validation_result;
    let state = 'attention';
    if (sub.review_status === 'approved') state = 'current';
    else if (sub.review_status === 'declined') state = 'action';
    else if (sub.ai_validation_status === 'failed') state = 'action';

    let cta = null;
    if (sub.review_status !== 'approved') {
      if (sub.ai_validation_status === 'failed') cta = { variant: 'primary', label: 'Review' };
      else if (sub.review_status === 'pending') cta = { variant: 'secondary', label: 'Review' };
    }

    return {
      id: sub.id,
      title: sub.vendor_documents?.title ?? '',
      state,
      aiFlagged: sub.ai_validation_status === 'failed',
      vendorName: sub.vendors?.name ?? '',
      uploadedDate: sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '',
      answerLine: aiResult?.summary ?? null,
      aiCaughtText: aiResult?.issues?.length ? aiResult.issues.join('. ') : null,
      cta,
    };
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#1E2D4D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div
        className="bg-white rounded-lg px-4 py-4"
        style={{ border: '1px solid #E2DDD4' }}
      >
        <p style={{ fontSize: '15px', color: '#1E2D4D', lineHeight: '1.6' }}>
          Every document a vendor sends lands here for review before it's
          filed against your compliance record. EvidLY pre-screens for
          anomalies — coverage limit shortfalls, expired credentials,
          date discrepancies, missing signatures — so what reads as
          routine actually is, and what isn't, you see immediately.
        </p>
        <p className="mt-3.5" style={{ fontSize: '15px', color: '#1E2D4D', lineHeight: '1.6' }}>
          Routine documents can be batch-approved with a single
          confirmation. Flagged documents open into a side-by-side review
          with a drafted correction request, ready to send.
        </p>
      </div>
    );
  }

  const actionCount = docs.filter(d => d.state === 'action').length;
  const attentionCount = docs.filter(d => d.state === 'attention').length;
  const currentCount = docs.filter(d => d.state === 'current').length;
  const aiFlaggedCount = docs.filter(d => d.aiFlagged).length;

  const metricCards = [
    { label: 'Pending review', value: docs.filter(d => d.state !== 'current').length, valueColor: 'navy' },
    { label: 'AI flagged', value: aiFlaggedCount, valueColor: 'action' },
    { label: 'Routine', value: attentionCount, valueColor: 'attention' },
    { label: 'Approved', value: currentCount, valueColor: 'current' },
  ];

  const filteredDocs = filter === 'all'
    ? docs
    : filter === 'ai_flagged'
      ? docs.filter(d => d.aiFlagged)
      : docs.filter(d => d.state === filter);

  return (
    <div>
      <AISynthesisStrip message={null} />
      <MetricsStrip cards={metricCards} />

      {/* Filter row */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto">
        {[
          { key: 'all', label: 'All', count: docs.length },
          { key: 'action', label: 'Action', count: actionCount },
          { key: 'ai_flagged', label: 'AI flagged', count: aiFlaggedCount },
          { key: 'attention', label: 'Attention', count: attentionCount },
          { key: 'current', label: 'Approved', count: currentCount },
        ].map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className="px-3 py-1.5 rounded-full whitespace-nowrap transition-colors"
            style={{
              fontSize: '11px',
              fontWeight: 500,
              backgroundColor: filter === f.key ? '#1E2D4D' : '#FFFFFF',
              color: filter === f.key ? '#FAF7F0' : '#1E2D4D',
              border: filter === f.key ? 'none' : '1px solid #E2DDD4',
            }}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Bulk approve hint */}
      {docs.filter(d => d.state === 'attention' && !d.aiFlagged).length >= 2 && filter !== 'current' && (
        <div
          className="flex items-center justify-between px-3 py-2 mb-3 rounded-md"
          style={{ backgroundColor: '#FCFBF8', border: '1px solid #E2DDD4' }}
        >
          <p style={{ fontSize: '11px', color: '#5A6478' }}>
            {docs.filter(d => d.state === 'attention' && !d.aiFlagged).length} routine documents eligible for bulk approve
          </p>
          <button
            type="button"
            onClick={() => setBulkApproveOpen(true)}
            className="px-2.5 py-1 rounded-md"
            style={{ fontSize: '11px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #1E2D4D' }}
          >
            Bulk approve
          </button>
        </div>
      )}

      {/* Doc review cards */}
      <div className="flex flex-col gap-2.5">
        {filteredDocs.map(doc => (
          <DocReviewRow key={doc.id} doc={doc} />
        ))}
      </div>

      <BulkApproveModal
        isOpen={bulkApproveOpen}
        onClose={() => setBulkApproveOpen(false)}
        onApprove={async (docIds) => {
          const { succeeded, failed } = await bulkApprove(docIds);
          if (failed === 0 && succeeded > 0) {
            toast.success(`${succeeded} approved`);
          } else if (succeeded === 0) {
            toast.error('Bulk approval failed');
          } else {
            toast.error(`${succeeded} approved, ${failed} failed`);
          }
        }}
        docs={docs}
      />
    </div>
  );
}
