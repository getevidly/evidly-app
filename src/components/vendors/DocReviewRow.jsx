import { useNavigate } from 'react-router-dom';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { StatePill } from './StatePill';

/**
 * DocReviewRow — card for a single document review in the doc review tab.
 *
 * Props:
 *   doc: MockDocReview
 */
export function DocReviewRow({ doc }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/vendors/documents/${doc.id}`)}
      className="w-full text-left bg-white rounded-lg px-4 py-3.5 transition-colors hover:bg-[#FDFCF9]"
      style={{ border: '1px solid #E2DDD4' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Title + state pill + AI flag */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="truncate" style={{ fontSize: '14px', fontWeight: 500, color: '#1E2D4D' }}>
              {doc.title}
            </p>
            <StatePill state={doc.state} />
            {doc.aiFlagged && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                style={{ fontSize: '9px', fontWeight: 500, backgroundColor: '#FCE8E4', color: '#B91C1C' }}
              >
                <AlertTriangle size={9} />
                AI flagged
              </span>
            )}
          </div>

          {/* Vendor + upload date */}
          <p className="mt-0.5" style={{ fontSize: '11px', color: '#5A6478' }}>
            {doc.vendorName} · Uploaded {doc.uploadedDate}
          </p>

          {/* AI answer line */}
          <p className="mt-1.5" style={{ fontSize: '12px', color: '#1E2D4D', lineHeight: '1.4' }}>
            {doc.answerLine}
          </p>

          {/* AI caught text (expanded) */}
          {doc.aiFlagged && doc.aiCaughtText && (
            <div
              className="mt-2 px-3 py-2 rounded-md"
              style={{ backgroundColor: '#FFF8E1', border: '1px solid #E2DDD4' }}
            >
              <p style={{ fontSize: '11px', color: '#1E2D4D', lineHeight: '1.5' }}>
                {doc.aiCaughtText}
              </p>
            </div>
          )}
        </div>

        {/* CTA + chevron */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {doc.cta.variant === 'primary' ? (
            <span
              className="px-2.5 py-1 rounded-md"
              style={{ fontSize: '11px', fontWeight: 500, backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
            >
              {doc.cta.label}
            </span>
          ) : (
            <span
              className="px-2.5 py-1 rounded-md"
              style={{ fontSize: '11px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #1E2D4D' }}
            >
              {doc.cta.label}
            </span>
          )}
          <ChevronRight size={16} style={{ color: '#5A6478' }} />
        </div>
      </div>
    </button>
  );
}
