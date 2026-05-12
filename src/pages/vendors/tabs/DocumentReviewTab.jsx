import { useState } from 'react';
import { AISynthesisStrip } from '../../../components/vendors/AISynthesisStrip';
import { MetricsStrip } from '../../../components/vendors/MetricsStrip';
import { DocReviewRow } from '../../../components/vendors/DocReviewRow';
import { MOCK_DOC_REVIEWS, AI_MESSAGES } from '../../../lib/mock/vendorsMockData';

/**
 * DocumentReviewTab — Surface 5.
 * Incoming vendor documents pending review/approval, with AI flags.
 */
export function DocumentReviewTab() {
  const [filter, setFilter] = useState('all');
  const docs = MOCK_DOC_REVIEWS;

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
      <AISynthesisStrip message={AI_MESSAGES.docReview} />
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
    </div>
  );
}
