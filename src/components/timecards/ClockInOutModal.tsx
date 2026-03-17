import { useState, useEffect } from 'react';
import { X, Clock, MapPin, Camera, CheckCircle } from 'lucide-react';

interface ClockInOutModalProps {
  mode: 'in' | 'out';
  currentDuration?: string;
  onClose: () => void;
  onSubmit: (notes: string) => void;
}

export function ClockInOutModal({ mode, currentDuration, onClose, onSubmit }: ClockInOutModalProps) {
  const [now, setNow] = useState(new Date());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeDisplay = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-md rounded-xl shadow-xl border"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#D1D9E6' }}>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" style={{ color: '#1e4d6b' }} />
            <h3 className="text-lg font-semibold" style={{ color: '#0B1628' }}>
              {mode === 'in' ? 'Clock In' : 'Clock Out'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2.5 -m-1 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Close">
            <X className="w-5 h-5" style={{ color: '#6B7F96' }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Large Time Display */}
          <div className="text-center py-4">
            <p className="text-4xl font-mono font-bold tracking-wider" style={{ color: '#0B1628' }}>
              {timeDisplay}
            </p>
            <p className="text-sm mt-1" style={{ color: '#6B7F96' }}>
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Duration (clock out only) */}
          {mode === 'out' && currentDuration && (
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#f0fdf4' }}>
              <p className="text-sm" style={{ color: '#166534' }}>
                You've been working for <span className="font-bold">{currentDuration}</span>
              </p>
            </div>
          )}

          {/* Location (demo stub) */}
          <div className="p-3 rounded-lg border" style={{ borderColor: '#D1D9E6', backgroundColor: '#EEF1F7' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" style={{ color: '#3D5068' }} />
                <span className="text-sm font-medium" style={{ color: '#0B1628' }}>Downtown Kitchen</span>
              </div>
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: '#16a34a', backgroundColor: '#f0fdf4' }}>
                <CheckCircle className="w-3 h-3" /> Within Geofence
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={mode === 'in' ? 'Any notes for this shift...' : 'End of shift notes...'}
              className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
              style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
            />
          </div>

          {/* Photo (demo stub) */}
          <button
            onClick={() => alert('Camera integration available in the live app.')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed transition-colors hover:bg-gray-50"
            style={{ borderColor: '#D1D9E6', color: '#6B7F96' }}
          >
            <Camera className="w-4 h-4" />
            <span className="text-sm">Take Verification Photo</span>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: '#D1D9E6' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50 transition-colors"
            style={{ borderColor: '#D1D9E6', color: '#3D5068' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(notes.trim())}
            className="px-6 py-2 text-sm font-semibold rounded-lg text-white transition-colors"
            style={{ backgroundColor: mode === 'in' ? '#16a34a' : '#dc2626' }}
          >
            {mode === 'in' ? 'Clock In' : 'Clock Out'}
          </button>
        </div>
      </div>
    </div>
  );
}
