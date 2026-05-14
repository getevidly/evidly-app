import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Eye, Bell, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useServiceRequestDetail } from '../../hooks/useServiceRequestDetail';
import { AISynthesisStrip } from '../../components/vendors/AISynthesisStrip';
import { StatePill } from '../../components/vendors/StatePill';
import { ReviewAlternativesModal } from '../../components/services/ReviewAlternativesModal';
import { ReviewVendorSelectionModal } from '../../components/vendors/modals/ReviewVendorSelectionModal';
import { RespondToRequestModal } from '../../components/vendors/modals/RespondToRequestModal';
/**
 * RequestDetail — Surface 8.
 * Drill-down for a single request showing thread timeline,
 * view/reminder tracking, and fulfillment status.
 */
export default function RequestDetail() {
  const { requestId } = useParams();
  const { request, loading, error, acceptAlternative, cancelRequest, resendRequest, sendReminder } = useServiceRequestDetail(requestId);
  const [actionPending, setActionPending] = useState(false);
  const [reviewSelectionOpen, setReviewSelectionOpen] = useState(false);
  const [reviewAltsOpen, setReviewAltsOpen] = useState(false);
  const [respondOpen, setRespondOpen] = useState(false);

  if (loading) {
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
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#1E2D4D] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
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
        <div
          className="bg-white rounded-lg px-4 py-4"
          style={{ border: '1px solid #E2DDD4' }}
        >
          <p style={{ fontSize: '14px', color: '#B91C1C' }}>
            Unable to load request details. Please try again.
          </p>
        </div>
      </div>
    );
  }

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

  const handleCtaClick = async () => {
    if (!request.cta) return;
    const label = request.cta.label;

    if (label === 'Review') {
      setReviewSelectionOpen(true);
    } else if (label === 'Review slots') {
      setReviewAltsOpen(true);
    } else if (label === 'Respond') {
      setRespondOpen(true);
    } else if (label === 'Resend') {
      setActionPending(true);
      try {
        await resendRequest(request.id);
        toast.success('Request resent to vendor');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to resend request');
      } finally {
        setActionPending(false);
      }
    }
  };

  const handleSendReminder = async () => {
    setActionPending(true);
    try {
      await sendReminder(request.id);
      toast.success('Reminder sent to vendor');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reminder');
    } finally {
      setActionPending(false);
    }
  };

  const handleAccept = async (reqId, selectedSlot) => {
    try {
      await acceptAlternative(reqId, selectedSlot);
      toast.success('Date confirmed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm date');
    }
  };

  const handleCancel = async (reqId) => {
    try {
      await cancelRequest(reqId);
      toast.success('Request cancelled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel request');
    }
  };

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
          {request.state !== 'fulfilled' && request.cta && (
            <button
              type="button"
              onClick={handleCtaClick}
              disabled={actionPending}
              className="w-full py-2.5 rounded-md"
              style={{ fontSize: '13px', fontWeight: 500, backgroundColor: '#1E2D4D', color: '#FAF7F0', opacity: actionPending ? 0.5 : 1 }}
            >
              {request.cta.label}
            </button>
          )}
          <button
            type="button"
            onClick={handleSendReminder}
            disabled={actionPending}
            className="w-full py-2.5 rounded-md"
            style={{ fontSize: '13px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #1E2D4D', opacity: actionPending ? 0.5 : 1 }}
          >
            Send reminder
          </button>
        </div>
      </div>

      {/* Modals */}
      <ReviewVendorSelectionModal
        isOpen={reviewSelectionOpen}
        onClose={() => setReviewSelectionOpen(false)}
        request={request}
        onConfirm={handleAccept}
        onCancel={handleCancel}
      />

      {request.raw && (
        <ReviewAlternativesModal
          isOpen={reviewAltsOpen}
          onClose={() => setReviewAltsOpen(false)}
          request={request.raw}
          onAccept={handleAccept}
          onDecline={handleCancel}
        />
      )}

      <RespondToRequestModal
        isOpen={respondOpen}
        onClose={() => setRespondOpen(false)}
        request={request}
        onConfirm={handleAccept}
        onDecline={handleCancel}
      />
    </div>
  );
}
