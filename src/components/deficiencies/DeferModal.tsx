import { useState } from 'react';
import { X, Clock } from 'lucide-react';

interface DeferModalProps {
  deficiencyCode: string;
  deficiencyTitle: string;
  onClose: () => void;
  onSubmit: (reason: string, deferUntil: string | null) => void;
}

export function DeferModal({ deficiencyCode, deficiencyTitle, onClose, onSubmit }: DeferModalProps) {
  const [reason, setReason] = useState('');
  const [deferUntil, setDeferUntil] = useState('');
  const canSubmit = reason.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-md rounded-xl shadow-xl border"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#D1D9E6' }}>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" style={{ color: '#6b7280' }} />
            <h3 className="text-lg font-semibold" style={{ color: '#0B1628' }}>Defer Deficiency</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" style={{ color: '#6B7F96' }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm" style={{ color: '#3D5068' }}>
            Defer <span className="font-semibold">{deficiencyCode}</span> — {deficiencyTitle}
          </p>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>
              Reason for Deferral <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Explain why this deficiency is being deferred..."
              className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
              style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>
              Defer Until (Optional)
            </label>
            <input
              type="date"
              value={deferUntil}
              onChange={(e) => setDeferUntil(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
              style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: '#D1D9E6' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50 transition-colors"
            style={{ borderColor: '#D1D9E6', color: '#3D5068' }}
          >
            Cancel
          </button>
          <button
            onClick={() => canSubmit && onSubmit(reason.trim(), deferUntil || null)}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#6b7280' }}
          >
            Defer
          </button>
        </div>
      </div>
    </div>
  );
}
