import { useState } from 'react';
import { X, Clock, MapPin, AlertTriangle, CheckCircle, XCircle, Shield } from 'lucide-react';
import {
  SHIFT_STATUS_CONFIG,
  ANOMALY_LABELS,
  type ShiftEntry,
} from '../../data/timecardsDemoData';

interface ShiftDetailModalProps {
  shift: ShiftEntry;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onFlag: (reason: string) => void;
  canApprove: boolean;
}

export function ShiftDetailModal({ shift, onClose, onApprove, onReject, onFlag, canApprove }: ShiftDetailModalProps) {
  const [rejectMode, setRejectMode] = useState(false);
  const [flagMode, setFlagMode] = useState(false);
  const [reason, setReason] = useState('');

  const stat = SHIFT_STATUS_CONFIG[shift.status];
  const dateLabel = new Date(shift.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const handleReject = () => {
    if (reason.trim()) {
      onReject(reason.trim());
      setRejectMode(false);
      setReason('');
    }
  };

  const handleFlag = () => {
    if (reason.trim()) {
      onFlag(reason.trim());
      setFlagMode(false);
      setReason('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl shadow-xl border"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10" style={{ borderColor: '#D1D9E6' }}>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" style={{ color: '#1E2D4D' }} />
            <h3 className="text-lg font-semibold" style={{ color: '#0B1628' }}>Shift Details</h3>
          </div>
          <button onClick={onClose} className="p-2.5 -m-1 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Close">
            <X className="w-5 h-5" style={{ color: '#6B7F96' }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Employee + Date */}
          <div>
            <p className="text-lg font-semibold" style={{ color: '#0B1628' }}>{shift.employeeName}</p>
            <p className="text-sm" style={{ color: '#3D5068' }}>{dateLabel}</p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ color: stat.color, backgroundColor: stat.bg }}
              >
                {stat.label}
              </span>
              <span className="flex items-center gap-1 text-xs" style={{ color: '#6B7F96' }}>
                <MapPin className="w-3 h-3" /> {shift.locationName}
              </span>
            </div>
          </div>

          {/* Clock Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg text-center" style={{ backgroundColor: '#EEF1F7' }}>
              <p className="text-xs font-medium" style={{ color: '#6B7F96' }}>Clock In</p>
              <p className="text-lg font-bold mt-1" style={{ color: '#0B1628' }}>{shift.clockIn || '—'}</p>
            </div>
            <div className="p-3 rounded-lg text-center" style={{ backgroundColor: '#EEF1F7' }}>
              <p className="text-xs font-medium" style={{ color: '#6B7F96' }}>Clock Out</p>
              <p className="text-lg font-bold mt-1" style={{ color: '#0B1628' }}>{shift.clockOut || 'Active'}</p>
            </div>
            <div className="p-3 rounded-lg text-center" style={{ backgroundColor: '#EEF1F7' }}>
              <p className="text-xs font-medium" style={{ color: '#6B7F96' }}>Break</p>
              <p className="text-lg font-bold mt-1" style={{ color: '#0B1628' }}>{shift.breakMinutes}m</p>
            </div>
          </div>

          {/* Hours Breakdown */}
          <div className="rounded-lg border p-4" style={{ borderColor: '#D1D9E6' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: '#0B1628' }}>Hours Breakdown</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: '#3D5068' }}>Regular</span>
                <span className="font-medium" style={{ color: '#0B1628' }}>{shift.regularHours.toFixed(2)}h</span>
              </div>
              {shift.overtimeHours > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#fffbeb', color: '#854d0e' }}>OT (1.5x)</span>
                  <span className="font-medium" style={{ color: '#854d0e' }}>{shift.overtimeHours.toFixed(2)}h</span>
                </div>
              )}
              {shift.doubleTimeHours > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#fff7ed', color: '#9a3412' }}>DT (2x)</span>
                  <span className="font-medium" style={{ color: '#9a3412' }}>{shift.doubleTimeHours.toFixed(2)}h</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm pt-2 border-t" style={{ borderColor: '#E8EDF5' }}>
                <span className="font-semibold" style={{ color: '#0B1628' }}>Total</span>
                <span className="font-bold" style={{ color: '#0B1628' }}>{shift.totalHours.toFixed(2)}h</span>
              </div>
            </div>
          </div>

          {/* Anomalies */}
          {shift.anomalies.length > 0 && (
            <div className="rounded-lg border p-4" style={{ borderColor: '#fed7aa', backgroundColor: '#fff7ed' }}>
              <p className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#9a3412' }}>
                <AlertTriangle className="w-4 h-4" /> Anomalies Detected
              </p>
              <div className="space-y-1">
                {shift.anomalies.map((a) => (
                  <p key={a} className="text-sm" style={{ color: '#9a3412' }}>{ANOMALY_LABELS[a]}</p>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {shift.notes && (
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Notes</p>
              <p className="text-sm" style={{ color: '#3D5068' }}>{shift.notes}</p>
            </div>
          )}

          {/* Rejection reason */}
          {shift.status === 'rejected' && shift.rejectionReason && (
            <div className="rounded-lg border p-4" style={{ borderColor: '#fecaca', backgroundColor: '#fef2f2' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: '#dc2626' }}>Rejection Reason</p>
              <p className="text-sm" style={{ color: '#991b1b' }}>{shift.rejectionReason}</p>
            </div>
          )}

          {/* Verification Checklist (demo) */}
          <div className="rounded-lg border p-4" style={{ borderColor: '#D1D9E6' }}>
            <p className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#0B1628' }}>
              <Shield className="w-4 h-4" style={{ color: '#1E2D4D' }} /> Verification
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'GPS Verified', ok: true },
                { label: 'Photo Verified', ok: false },
                { label: 'Within Geofence', ok: true },
                { label: 'Reasonable Hours', ok: shift.anomalies.length === 0 },
              ].map((v) => (
                <div key={v.label} className="flex items-center gap-1.5 text-xs">
                  {v.ok
                    ? <CheckCircle className="w-3.5 h-3.5" style={{ color: '#16a34a' }} />
                    : <XCircle className="w-3.5 h-3.5" style={{ color: '#dc2626' }} />
                  }
                  <span style={{ color: v.ok ? '#166534' : '#991b1b' }}>{v.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reject/Flag reason input */}
          {(rejectMode || flagMode) && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>
                {rejectMode ? 'Rejection Reason' : 'Flag Reason'} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder={rejectMode ? 'Explain why this shift is rejected...' : 'Describe the issue...'}
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => { setRejectMode(false); setFlagMode(false); setReason(''); }}
                  className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50"
                  style={{ borderColor: '#D1D9E6', color: '#3D5068' }}
                >
                  Cancel
                </button>
                <button
                  onClick={rejectMode ? handleReject : handleFlag}
                  disabled={!reason.trim()}
                  className="px-3 py-1.5 text-xs rounded-lg text-white disabled:opacity-50"
                  style={{ backgroundColor: rejectMode ? '#dc2626' : '#ea580c' }}
                >
                  {rejectMode ? 'Reject' : 'Flag'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: '#D1D9E6' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50 transition-colors"
            style={{ borderColor: '#D1D9E6', color: '#3D5068' }}
          >
            Close
          </button>
          {canApprove && shift.status === 'pending' && !rejectMode && !flagMode && (
            <>
              <button
                onClick={() => setFlagMode(true)}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#ea580c' }}
              >
                Flag
              </button>
              <button
                onClick={() => setRejectMode(true)}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#dc2626' }}
              >
                Reject
              </button>
              <button
                onClick={onApprove}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#16a34a' }}
              >
                Approve
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
