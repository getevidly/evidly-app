import { useState } from 'react';
import { Modal } from '../../ui/Modal';

interface SkipReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirementLabel: string;
  onConfirm: (reason: string) => void;
}

export function SkipReasonModal({ isOpen, onClose, requirementLabel, onConfirm }: SkipReasonModalProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-5">
        <h3 className="text-base font-semibold text-[#1E2D4D] mb-1">Skip "{requirementLabel}"</h3>
        <p className="text-xs text-[#8A93A6] mb-4">
          This item won't appear in your work tab. You can resume it later from the summary.
        </p>
        <label className="block text-xs font-medium text-[#1E2D4D]/70 mb-1">
          Why are you skipping this?
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Not applicable to our facility, handling separately..."
          className="w-full border border-[#E2DDD4] rounded-lg p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-[#1E2D4D]/20"
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm border border-[#E2DDD4] rounded-lg text-[#1E2D4D]/70 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim()}
            className="flex-1 px-4 py-2 text-sm bg-[#1E2D4D] text-[#FAF7F0] rounded-lg disabled:opacity-40 hover:bg-[#1E2D4D]/90"
          >
            Skip item
          </button>
        </div>
      </div>
    </Modal>
  );
}
