import { useState } from 'react';
import { X, XCircle } from 'lucide-react';
import { Modal } from '../../ui/Modal';

/**
 * DeclineDocumentModal — captures operator's typed decline reason.
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   onDecline: (reason: string) => Promise<void>
 */
export function DeclineDocumentModal({ isOpen, onClose, onDecline }) {
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);

  const handleDecline = async () => {
    if (!reason.trim()) return;
    setPending(true);
    try {
      await onDecline(reason.trim());
    } finally {
      setPending(false);
      handleClose();
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm">
      <div className="px-5 pt-5 pb-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#1E2D4D' }}>
            Reject document
          </h2>
          <button type="button" onClick={handleClose} className="p-1 rounded-md hover:bg-[#F4F1EA]">
            <X size={18} style={{ color: '#5A6478' }} />
          </button>
        </div>

        <p className="mb-3" style={{ fontSize: '12px', color: '#5A6478', lineHeight: '1.5' }}>
          Provide a reason for rejecting this document. The vendor will see this explanation.
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection..."
          rows={3}
          className="w-full px-3 py-2 rounded-md mb-4 resize-none"
          style={{
            fontSize: '13px',
            color: '#1E2D4D',
            border: '1px solid #E2DDD4',
            outline: 'none',
          }}
          onFocus={(e) => { e.target.style.borderColor = '#1E2D4D'; }}
          onBlur={(e) => { e.target.style.borderColor = '#E2DDD4'; }}
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-md"
            style={{ fontSize: '12px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #E2DDD4' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={!reason.trim() || pending}
            className="px-4 py-2 rounded-md flex items-center gap-1.5 transition-opacity"
            style={{
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: '#B91C1C',
              color: '#FAF7F0',
              opacity: reason.trim() && !pending ? 1 : 0.4,
            }}
          >
            <XCircle size={13} />
            Reject
          </button>
        </div>
      </div>
    </Modal>
  );
}
