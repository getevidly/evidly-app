import { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';

interface AcknowledgeModalProps {
  deficiencyCode: string;
  deficiencyTitle: string;
  onClose: () => void;
  onSubmit: (notificationMethod: 'in_person' | 'email' | 'phone', notes: string) => void;
}

const METHODS = [
  { value: 'in_person' as const, label: 'In Person' },
  { value: 'email' as const, label: 'Email' },
  { value: 'phone' as const, label: 'Phone' },
];

export function AcknowledgeModal({ deficiencyCode, deficiencyTitle, onClose, onSubmit }: AcknowledgeModalProps) {
  const [method, setMethod] = useState<'in_person' | 'email' | 'phone'>('in_person');
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 modal-backdrop-enter">
      <div
        className="w-full max-w-md rounded-xl shadow-xl border"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#D1D9E6' }}>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" style={{ color: '#d97706' }} />
            <h3 className="text-lg font-semibold tracking-tight" style={{ color: '#0B1628' }}>Acknowledge Deficiency</h3>
          </div>
          <button onClick={onClose} className="p-2.5 -m-1 rounded-lg hover:bg-[#1E2D4D]/5 transition-colors" aria-label="Close">
            <X className="w-5 h-5" style={{ color: '#6B7F96' }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm" style={{ color: '#3D5068' }}>
            Acknowledge <span className="font-semibold">{deficiencyCode}</span> — {deficiencyTitle}
          </p>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#0B1628' }}>
              Notification Method <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              {METHODS.map((m) => (
                <label key={m.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="method"
                    value={m.value}
                    checked={method === m.value}
                    onChange={() => setMethod(m.value)}
                    className="accent-[#1E2D4D]"
                  />
                  <span className="text-sm" style={{ color: '#0B1628' }}>{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes about acknowledgement..."
              className="w-full px-3 py-2 border rounded-xl text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
              style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: '#D1D9E6' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-xl border hover:bg-[#FAF7F0] transition-colors"
            style={{ borderColor: '#D1D9E6', color: '#3D5068' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(method, notes.trim())}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors"
            style={{ backgroundColor: '#1E2D4D' }}
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
