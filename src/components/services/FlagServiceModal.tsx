import { useState } from 'react';
import { X, Flag } from 'lucide-react';

const FLAG_CATEGORIES = [
  { value: 'incomplete_work', label: 'Incomplete Work' },
  { value: 'wrong_service', label: 'Wrong Service Performed' },
  { value: 'safety_concern', label: 'Safety Concern' },
  { value: 'documentation_issue', label: 'Documentation Issue' },
  { value: 'other', label: 'Other' },
] as const;

interface FlagServiceModalProps {
  serviceName: string;
  vendorName: string;
  onClose: () => void;
  onSubmit: (reason: string, category: string) => void;
}

export function FlagServiceModal({ serviceName, vendorName, onClose, onSubmit }: FlagServiceModalProps) {
  const [category, setCategory] = useState('');
  const [reason, setReason] = useState('');

  const canSubmit = category && reason.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 modal-backdrop-enter">
      <div
        className="w-full max-w-md rounded-xl shadow-xl border"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#D1D9E6' }}>
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold tracking-tight" style={{ color: '#0B1628' }}>Flag Service Record</h3>
          </div>
          <button onClick={onClose} className="p-2.5 -m-1 rounded-lg hover:bg-[#1E2D4D]/5 transition-colors" aria-label="Close">
            <X className="w-5 h-5" style={{ color: '#6B7F96' }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm" style={{ color: '#3D5068' }}>
            Flag <span className="font-semibold">{serviceName}</span> by{' '}
            <span className="font-semibold">{vendorName}</span> for review.
          </p>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>
              Issue Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
              style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
            >
              <option value="">Select a category...</option>
              {FLAG_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Describe the issue with this service record..."
              className="w-full px-3 py-2 border rounded-xl text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
              style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: '#D1D9E6' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-xl border hover:bg-[#FAF7F0] transition-colors"
            style={{ borderColor: '#D1D9E6', color: '#3D5068' }}
          >
            Cancel
          </button>
          <button
            onClick={() => canSubmit && onSubmit(reason.trim(), category)}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: canSubmit ? '#dc2626' : '#dc2626' }}
          >
            Submit Flag
          </button>
        </div>
      </div>
    </div>
  );
}
