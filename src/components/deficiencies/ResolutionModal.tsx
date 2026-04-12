import { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

interface ResolutionModalProps {
  deficiencyCode: string;
  deficiencyTitle: string;
  onClose: () => void;
  onSubmit: (notes: string) => void;
}

export function ResolutionModal({ deficiencyCode, deficiencyTitle, onClose, onSubmit }: ResolutionModalProps) {
  const [notes, setNotes] = useState('');
  const canSubmit = notes.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-md rounded-xl shadow-xl border"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#D1D9E6' }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold tracking-tight" style={{ color: '#0B1628' }}>Mark as Resolved</h3>
          </div>
          <button onClick={onClose} className="p-2.5 -m-1 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Close">
            <X className="w-5 h-5" style={{ color: '#6B7F96' }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm" style={{ color: '#3D5068' }}>
            Resolve <span className="font-semibold">{deficiencyCode}</span> — {deficiencyTitle}
          </p>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>
              Resolution Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Describe how the deficiency was resolved..."
              className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37]"
              style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
            />
          </div>

          <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: '#EEF1F7', color: '#3D5068' }}>
            Photo evidence and follow-up service record linking are available in the full version.
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
            onClick={() => canSubmit && onSubmit(notes.trim())}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#16a34a' }}
          >
            Mark Resolved
          </button>
        </div>
      </div>
    </div>
  );
}
