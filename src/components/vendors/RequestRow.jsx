import { useNavigate } from 'react-router-dom';
import { ChevronRight, Eye, Bell } from 'lucide-react';
import { StatePill } from './StatePill';

/**
 * RequestRow — card for a single request in the requests tab.
 *
 * Props:
 *   request: MockRequest
 */
export function RequestRow({ request }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/vendors/requests/${request.id}`)}
      className="w-full text-left bg-white rounded-lg px-4 py-3.5 transition-colors hover:bg-[#FDFCF9]"
      style={{ border: '1px solid #E2DDD4' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Title + state pill */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="truncate" style={{ fontSize: '14px', fontWeight: 500, color: '#1E2D4D' }}>
              {request.title}
            </p>
            <StatePill state={request.state} />
          </div>

          {/* Vendor + sent date */}
          <p className="mt-0.5" style={{ fontSize: '11px', color: '#5A6478' }}>
            {request.vendorName} · Sent {request.sentDate}
          </p>

          {/* AI answer line */}
          <p className="mt-1.5" style={{ fontSize: '12px', color: '#1E2D4D', lineHeight: '1.4' }}>
            {request.answerLine}
          </p>

          {/* Status indicators */}
          <div className="flex items-center gap-3 mt-2">
            {request.viewedDate && (
              <span className="inline-flex items-center gap-1" style={{ fontSize: '10px', color: '#5A6478' }}>
                <Eye size={10} />
                Viewed {request.viewedDate}
              </span>
            )}
            {request.reminders > 0 && (
              <span className="inline-flex items-center gap-1" style={{ fontSize: '10px', color: '#5A6478' }}>
                <Bell size={10} />
                {request.reminders} reminder{request.reminders > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* CTA + chevron */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {request.cta.variant === 'primary' ? (
            <span
              className="px-2.5 py-1 rounded-md"
              style={{ fontSize: '11px', fontWeight: 500, backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
            >
              {request.cta.label}
            </span>
          ) : (
            <span
              className="px-2.5 py-1 rounded-md"
              style={{ fontSize: '11px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #1E2D4D' }}
            >
              {request.cta.label}
            </span>
          )}
          <ChevronRight size={16} style={{ color: '#5A6478' }} />
        </div>
      </div>
    </button>
  );
}
