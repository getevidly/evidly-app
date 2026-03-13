/**
 * LogUsageModal — Modal form to log inventory usage against a job.
 */
import { useState } from 'react';
import { X } from 'lucide-react';

const NAVY = '#163a5f';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#D1D9E6';
const TEXT_TERTIARY = '#6B7F96';

interface LogUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogUsageModal({ isOpen, onClose }: LogUsageModalProps) {
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [jobReference, setJobReference] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Usage logged (not yet implemented)');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md mx-4 rounded-xl shadow-xl"
        style={{ background: CARD_BG }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${CARD_BORDER}` }}
        >
          <h2 className="text-base font-bold" style={{ color: NAVY }}>
            Log Usage
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: TEXT_TERTIARY }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Item selector */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: NAVY }}>
              Item
            </label>
            <input
              type="text"
              placeholder="Search or type item name"
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#163a5f]/20"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: NAVY }}>
              Quantity
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#163a5f]/20"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            />
          </div>

          {/* Job reference */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: NAVY }}>
              Job Reference{' '}
              <span className="font-normal" style={{ color: TEXT_TERTIARY }}>
                (optional)
              </span>
            </label>
            <input
              type="text"
              placeholder="e.g. JOB-1234"
              value={jobReference}
              onChange={e => setJobReference(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#163a5f]/20"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: NAVY }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#163a5f]/20 resize-none"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            />
          </div>

          {/* Actions */}
          <div
            className="flex items-center justify-end gap-3 pt-4"
            style={{ borderTop: `1px solid ${CARD_BORDER}` }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50 transition-colors"
              style={{ borderColor: CARD_BORDER, color: TEXT_TERTIARY }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors hover:opacity-90"
              style={{ background: NAVY }}
            >
              Log Usage
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
