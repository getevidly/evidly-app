import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Eye, Bell, Send } from 'lucide-react';
import { AISynthesisStrip } from '../../components/vendors/AISynthesisStrip';
import { StatePill } from '../../components/vendors/StatePill';
/**
 * RequestDetail — Surface 8.
 * Drill-down for a single request showing thread timeline,
 * view/reminder tracking, and fulfillment status.
 */
export default function RequestDetail() {
  const { requestId } = useParams();
  const request = [].find(r => r.id === requestId);

  if (!request) {
    return (
      <div className="min-h-screen px-4 pt-5" style={{ backgroundColor: '#F4F1EA' }}>
        <Link
          to="/vendors?tab=requests"
          className="inline-flex items-center gap-1 mb-4"
          style={{ fontSize: '12px', fontWeight: 500, color: '#5A6478' }}
        >
          <ArrowLeft size={14} />
          Back to requests
        </Link>
        <p style={{ fontSize: '14px', color: '#5A6478' }}>Request not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F1EA' }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <Link
          to="/vendors?tab=requests"
          className="inline-flex items-center gap-1 mb-3"
          style={{ fontSize: '12px', fontWeight: 500, color: '#5A6478' }}
        >
          <ArrowLeft size={14} />
          Back to requests
        </Link>
        <p
          className="uppercase tracking-wider mb-1"
          style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#A08C5A' }}
        >
          Request detail
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#1E2D4D' }}>
            {request.title}
          </h1>
          <StatePill state={request.state} />
        </div>
        <p className="mt-1" style={{ fontSize: '12px', color: '#5A6478' }}>
          {request.vendorName} · Sent {request.sentDate}
        </p>
      </div>

      <div className="px-4 pb-24">
        {/* AI synthesis */}
        <AISynthesisStrip message={request.answerLine} />

        {/* Timeline */}
        <p
          className="uppercase tracking-wider mb-2"
          style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#5A6478' }}
        >
          Timeline
        </p>
        <div
          className="bg-white rounded-lg px-4 py-3 mb-4"
          style={{ border: '1px solid #E2DDD4' }}
        >
          <div className="flex flex-col gap-3">
            {/* Sent event */}
            <div className="flex items-start gap-3">
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                style={{ backgroundColor: '#E8F2E5' }}
              >
                <Send size={12} style={{ color: '#2E7D32' }} />
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 500, color: '#1E2D4D' }}>
                  Request sent
                </p>
                <p style={{ fontSize: '11px', color: '#5A6478' }}>
                  {request.sentDate}
                </p>
              </div>
            </div>

            {/* Viewed event */}
            {request.viewedDate && (
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: '#F4EFE0' }}
                >
                  <Eye size={12} style={{ color: '#A08C5A' }} />
                </div>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: '#1E2D4D' }}>
                    Viewed by vendor
                  </p>
                  <p style={{ fontSize: '11px', color: '#5A6478' }}>
                    {request.viewedDate}
                  </p>
                </div>
              </div>
            )}

            {/* Reminders */}
            {request.reminders > 0 && (
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: '#FFF8E1' }}
                >
                  <Bell size={12} style={{ color: '#B45309' }} />
                </div>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: '#1E2D4D' }}>
                    {request.reminders} reminder{request.reminders > 1 ? 's' : ''} sent
                  </p>
                  <p style={{ fontSize: '11px', color: '#5A6478' }}>
                    Auto-reminders
                  </p>
                </div>
              </div>
            )}

            {/* Fulfilled */}
            {request.state === 'fulfilled' && (
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: '#E8F2E5' }}
                >
                  <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5.5L4 7.5L8 3" stroke="#2E7D32" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: '#2E7D32' }}>
                    Fulfilled
                  </p>
                  <p style={{ fontSize: '11px', color: '#5A6478' }}>
                    Document received and filed
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {request.state !== 'fulfilled' && (
            <button
              type="button"
              className="w-full py-2.5 rounded-md"
              style={{ fontSize: '13px', fontWeight: 500, backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
            >
              {request.cta.label}
            </button>
          )}
          <button
            type="button"
            className="w-full py-2.5 rounded-md"
            style={{ fontSize: '13px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #1E2D4D' }}
          >
            Send reminder
          </button>
        </div>
      </div>
    </div>
  );
}
