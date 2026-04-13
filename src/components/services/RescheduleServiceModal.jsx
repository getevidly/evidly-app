/**
 * RescheduleServiceModal — RESCHEDULE-EVIDLY-01
 *
 * Modal for rescheduling a vendor service from ServiceComplianceList.
 * Date picker, urgency selector, optional reason.
 * Follows RequestServiceModal.tsx pattern with inline styles.
 */
import { useState } from 'react';
import { X, CalendarClock, Check } from 'lucide-react';
import { useRescheduleRequests } from '../../hooks/useRescheduleRequests';
import { useDemo } from '../../contexts/DemoContext';

const URGENCY_OPTIONS = [
  { id: 'normal', label: 'Normal', desc: 'Within next cycle' },
  { id: 'soon', label: 'Soon', desc: 'Within 1-2 weeks' },
  { id: 'urgent', label: 'Urgent', desc: 'Within a few days' },
];

export function RescheduleServiceModal({
  isOpen,
  onClose,
  locationId,
  organizationId,
  serviceTypeCode,
  serviceName,
  currentDueDate,
  scheduleId,
}) {
  const { isDemoMode } = useDemo();
  const { submitReschedule } = useRescheduleRequests(locationId);

  const [requestedDate, setRequestedDate] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!requestedDate) return;
    setSubmitting(true);

    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 1000));
        setSubmitted(true);
        setSubmitting(false);
        return;
      }

      const result = await submitReschedule({
        organization_id: organizationId,
        location_id: locationId,
        service_type_code: serviceTypeCode,
        schedule_id: scheduleId || null,
        original_due_date: currentDueDate,
        requested_date: requestedDate,
        reason: reason || undefined,
        urgency,
      });

      if (result) {
        setSubmitted(true);
      }
    } catch {
      // Error handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRequestedDate('');
    setUrgency('normal');
    setReason('');
    setSubmitting(false);
    setSubmitted(false);
    onClose();
  };

  if (!isOpen) return null;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
        onClick={handleClose}
      />
      <div style={{
        position: 'relative', background: '#fff', borderRadius: 16,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #f3f4f6',
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>
            Reschedule Service
          </h2>
          <button
            onClick={handleClose}
            style={{
              padding: 8, border: 'none', background: 'none',
              color: '#9CA3AF', cursor: 'pointer', borderRadius: 8,
            }}
            aria-label="Close"
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {submitted ? (
          /* ═══ SUCCESS STATE ═══ */
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Check style={{ width: 28, height: 28, color: '#22C55E' }} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
              Reschedule Requested
            </h3>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>
              Your reschedule request for <strong>{serviceName}</strong> to{' '}
              <strong>{new Date(requestedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong>{' '}
              has been submitted. You can manually confirm it or wait for vendor confirmation.
            </p>
            <button
              onClick={handleClose}
              style={{
                padding: '10px 24px', borderRadius: 10,
                background: '#1E2D4D', border: 'none',
                fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          /* ═══ FORM ═══ */
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Service context */}
            <div style={{
              background: '#f9fafb', borderRadius: 10, padding: 12,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <CalendarClock style={{ width: 18, height: 18, color: '#6B7F96', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{serviceName}</div>
                <div style={{ fontSize: 11, color: '#6B7F96' }}>
                  Currently due: {currentDueDate
                    ? new Date(currentDueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Not set'}
                </div>
              </div>
            </div>

            {/* Requested date */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                New Requested Date *
              </label>
              <input
                type="date"
                value={requestedDate}
                onChange={e => setRequestedDate(e.target.value)}
                min={minDate}
                style={{
                  width: '100%', border: '1px solid #D1D5DB', borderRadius: 10,
                  padding: '10px 12px', fontSize: 13, boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            {/* Urgency */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                Urgency
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {URGENCY_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setUrgency(opt.id)}
                    style={{
                      padding: '10px 8px', borderRadius: 10, textAlign: 'left',
                      border: urgency === opt.id ? '2px solid #1E2D4D' : '2px solid #E5E7EB',
                      background: urgency === opt.id ? '#eff6ff' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{opt.label}</div>
                    <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                Reason (optional)
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Why is this service being rescheduled?"
                style={{
                  width: '100%', border: '1px solid #D1D5DB', borderRadius: 10,
                  padding: '10px 12px', fontSize: 13, resize: 'none',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !requestedDate}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 12,
                background: submitting || !requestedDate ? '#9CA3AF' : '#1E2D4D',
                border: 'none', fontSize: 13, fontWeight: 600, color: '#fff',
                cursor: submitting || !requestedDate ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {submitting ? (
                <div style={{
                  width: 18, height: 18, border: '2px solid transparent',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }} />
              ) : (
                <>
                  <CalendarClock style={{ width: 16, height: 16 }} />
                  Submit Reschedule Request
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
