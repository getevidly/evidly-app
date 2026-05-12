import { useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { StatePill } from '../StatePill';

/**
 * BulkApproveModal — approve multiple routine (non-flagged) documents.
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   onApprove: (docIds: string[]) => void
 *   docs: Array<{ id, title, vendorName, state, aiFlagged, uploadedDate }>
 */
export function BulkApproveModal({ isOpen, onClose, onApprove, docs = [] }) {
  const eligible = docs.filter(d => d.state === 'attention' && !d.aiFlagged);
  const [selected, setSelected] = useState(() => eligible.map(d => d.id));

  const toggleDoc = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleApprove = () => {
    onApprove?.(selected);
    handleClose();
  };

  const handleClose = () => {
    setSelected(eligible.map(d => d.id));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <div className="px-5 pt-5 pb-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#1E2D4D' }}>
            Bulk approve documents
          </h2>
          <button type="button" onClick={handleClose} className="p-1 rounded-md hover:bg-[#F4F1EA]">
            <X size={18} style={{ color: '#5A6478' }} />
          </button>
        </div>

        <p className="mb-4" style={{ fontSize: '12px', color: '#5A6478', lineHeight: '1.5' }}>
          The following documents passed AI review with no issues. Select the ones you want to approve.
        </p>

        {/* Flagged warning */}
        {docs.some(d => d.aiFlagged) && (
          <div
            className="flex items-start gap-2 px-3 py-2 mb-4 rounded-md"
            style={{ backgroundColor: '#FFF8E1', border: '1px solid #E2DDD4' }}
          >
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#B45309' }} />
            <p style={{ fontSize: '11px', color: '#1E2D4D', lineHeight: '1.4' }}>
              {docs.filter(d => d.aiFlagged).length} document{docs.filter(d => d.aiFlagged).length > 1 ? 's' : ''} with AI flags excluded from bulk approve. Review individually.
            </p>
          </div>
        )}

        {/* Document list */}
        <div className="flex flex-col gap-2 mb-4 max-h-60 overflow-y-auto">
          {eligible.map(doc => {
            const isSelected = selected.includes(doc.id);
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => toggleDoc(doc.id)}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors"
                style={{
                  backgroundColor: isSelected ? '#F4EFE0' : '#FFFFFF',
                  border: isSelected ? '1px solid #1E2D4D' : '1px solid #E2DDD4',
                }}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: isSelected ? '#1E2D4D' : '#FFFFFF',
                    border: isSelected ? 'none' : '1px solid #E2DDD4',
                  }}
                >
                  {isSelected && <CheckCircle size={12} style={{ color: '#FAF7F0' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate" style={{ fontSize: '13px', fontWeight: 500, color: '#1E2D4D' }}>
                    {doc.title}
                  </p>
                  <p style={{ fontSize: '11px', color: '#5A6478' }}>
                    {doc.vendorName} · {doc.uploadedDate}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {eligible.length === 0 && (
          <p className="text-center py-4" style={{ fontSize: '13px', color: '#5A6478' }}>
            No documents eligible for bulk approve.
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <p style={{ fontSize: '11px', color: '#5A6478' }}>
            {selected.length} of {eligible.length} selected
          </p>
          <div className="flex items-center gap-2">
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
              onClick={handleApprove}
              disabled={selected.length === 0}
              className="px-4 py-2 rounded-md flex items-center gap-1.5 transition-opacity"
              style={{
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: '#1E2D4D',
                color: '#FAF7F0',
                opacity: selected.length > 0 ? 1 : 0.4,
              }}
            >
              <CheckCircle size={13} />
              Approve {selected.length} document{selected.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
