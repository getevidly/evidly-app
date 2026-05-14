import { useState } from 'react';
import { X } from 'lucide-react';
import { Modal } from '../../ui/Modal';

/**
 * ReviewVendorSelectionModal — operator reviews vendor's selected slot.
 * Shows the confirmed slot. Operator can Confirm or Cancel.
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   request: { id, raw } — raw has proposed_slot_1, vendor_name, service_type
 *   onConfirm: (requestId, selectedSlot) => Promise<void>
 *   onCancel: (requestId) => Promise<void>
 */
export function ReviewVendorSelectionModal({ isOpen, onClose, request, onConfirm, onCancel }) {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !request?.raw) return null;

  const raw = request.raw;
  const selectedSlot = raw.proposed_slot_1;

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

  const handleCancel = async () => {
    setSubmitting(true);
    try {
      await onCancel(request.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="px-5 pt-5 pb-2">
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#1E2D4D' }}>
            Review vendor selection
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-[#F4F1EA]">
            <X size={18} style={{ color: '#5A6478' }} />
          </button>
        </div>
      </div>

      <div className="px-5 pb-5">
        <p className="mb-3" style={{ fontSize: '13px', color: '#1E2D4D' }}>
          <span style={{ fontWeight: 500 }}>{raw.vendor_name || 'Vendor'}</span> has selected the following date for{' '}
          <span style={{ fontWeight: 500 }}>{raw.service_type}</span>.
        </p>

        {selectedSlot && (
          <div
            className="rounded-lg px-4 py-3 mb-4"
            style={{ backgroundColor: '#FCFBF8', border: '1px solid #E2DDD4' }}
          >
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#1E2D4D' }}>
              {formatDate(selectedSlot)}
            </p>
            <p style={{ fontSize: '12px', color: '#5A6478' }}>
              {formatTime(selectedSlot)}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mt-5">
          <button
            type="button"
            onClick={handleCancel}
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
            Cancel request
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="px-4 py-2 rounded-md transition-opacity"
            style={{
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: '#1E2D4D',
              color: '#FAF7F0',
              opacity: submitting ? 0.4 : 1,
            }}
          >
            {submitting ? 'Confirming...' : 'Confirm date'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
