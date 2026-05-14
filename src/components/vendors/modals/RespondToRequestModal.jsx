import { useState } from 'react';
import { X } from 'lucide-react';
import { Modal } from '../../ui/Modal';

/**
 * RespondToRequestModal — operator responds to a pending_operator request.
 * Shows operator's original proposed_slot_1/2/3 as radio options.
 * Operator picks one to confirm or declines.
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   request: { id, raw } — raw has proposed_slot_1/2/3, vendor_name, service_type
 *   onConfirm: (requestId, selectedSlot) => Promise<void>
 *   onDecline: (requestId) => Promise<void>
 */
export function RespondToRequestModal({ isOpen, onClose, request, onConfirm, onDecline }) {
  const [selectedSlot, setSelectedSlot] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !request?.raw) return null;

  const raw = request.raw;
  const slots = [raw.proposed_slot_1, raw.proposed_slot_2, raw.proposed_slot_3].filter(Boolean);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      await onConfirm(request.id, selectedSlot);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    try {
      await onDecline(request.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedSlot('');
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <div className="px-5 pt-5 pb-2">
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#1E2D4D' }}>
            Respond to request
          </h2>
          <button type="button" onClick={handleClose} className="p-1 rounded-md hover:bg-[#F4F1EA]">
            <X size={18} style={{ color: '#5A6478' }} />
          </button>
        </div>
      </div>

      <div className="px-5 pb-5">
        <p className="mb-3" style={{ fontSize: '13px', color: '#1E2D4D' }}>
          Select a date to confirm for{' '}
          <span style={{ fontWeight: 500 }}>{raw.service_type}</span>
          {raw.vendor_name ? ` with ${raw.vendor_name}` : ''}.
        </p>

        {slots.length > 0 ? (
          <div className="flex flex-col gap-2 mb-4">
            {slots.map((slot, i) => {
              const isSelected = selectedSlot === slot;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className="text-left rounded-lg px-4 py-3 transition-colors"
                  style={{
                    border: isSelected ? '2px solid #1E2D4D' : '1px solid #E2DDD4',
                    backgroundColor: isSelected ? '#FCFBF8' : '#FFFFFF',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{
                        border: isSelected ? '2px solid #1E2D4D' : '2px solid #E2DDD4',
                        backgroundColor: isSelected ? '#1E2D4D' : 'transparent',
                      }}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#1E2D4D' }}>
                        {formatDate(slot)}
                      </p>
                      <p style={{ fontSize: '11px', color: '#5A6478' }}>
                        {formatTime(slot)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mb-4" style={{ fontSize: '12px', color: '#5A6478' }}>
            No proposed dates available.
          </p>
        )}

        <div className="flex items-center justify-between mt-5">
          <button
            type="button"
            onClick={handleDecline}
            disabled={submitting}
            className="px-4 py-2 rounded-md transition-opacity"
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#B91C1C',
              border: '1px solid #E2DDD4',
              opacity: submitting ? 0.4 : 1,
            }}
          >
            Decline
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedSlot || submitting}
            className="px-4 py-2 rounded-md transition-opacity"
            style={{
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: '#1E2D4D',
              color: '#FAF7F0',
              opacity: (!selectedSlot || submitting) ? 0.4 : 1,
            }}
          >
            {submitting ? 'Confirming...' : 'Confirm date'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
