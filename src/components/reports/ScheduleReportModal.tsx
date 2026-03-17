/**
 * ScheduleReportModal — Create/edit scheduled report delivery.
 */
import { useState } from 'react';
import { X, Loader2, CalendarClock } from 'lucide-react';
import { NAVY, CARD_BG, CARD_BORDER, TEXT_TERTIARY, MUTED } from '../dashboard/shared/constants';

interface ScheduleReportModalProps {
  reportSlug: string;
  reportTitle: string;
  onClose: () => void;
  onSave: (schedule: {
    slug: string;
    reportTitle: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    recipients: string[];
    format: 'pdf' | 'excel';
    isActive: boolean;
  }) => void;
  saving?: boolean;
}

export function ScheduleReportModal({ reportSlug, reportTitle, onClose, onSave, saving }: ScheduleReportModalProps) {
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [time, setTime] = useState('08:00');
  const [recipients, setRecipients] = useState('');
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');

  const handleSave = () => {
    onSave({
      slug: reportSlug,
      reportTitle,
      frequency,
      dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
      dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
      time,
      recipients: recipients.split(',').map(r => r.trim()).filter(Boolean),
      format,
      isActive: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="rounded-xl w-full max-w-lg mx-4"
        style={{ background: CARD_BG, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: CARD_BORDER }}>
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5" style={{ color: '#1e4d6b' }} />
            <h2 className="text-base font-bold" style={{ color: NAVY }}>Schedule Report</h2>
          </div>
          <button onClick={onClose} className="p-2.5 -m-1 rounded hover:bg-gray-100" aria-label="Close"><X className="w-5 h-5" style={{ color: TEXT_TERTIARY }} /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm" style={{ color: MUTED }}>Scheduling: <strong>{reportTitle}</strong></p>

          {/* Frequency */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: MUTED }}>Frequency</label>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors capitalize"
                  style={{
                    background: frequency === f ? '#1e4d6b' : CARD_BG,
                    color: frequency === f ? 'white' : NAVY,
                    borderColor: frequency === f ? '#1e4d6b' : CARD_BORDER,
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Day selection */}
          {frequency === 'weekly' && (
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: MUTED }}>Day of Week</label>
              <select
                value={dayOfWeek}
                onChange={e => setDayOfWeek(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{ borderColor: CARD_BORDER, color: NAVY }}
              >
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => (
                  <option key={d} value={i}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {frequency === 'monthly' && (
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: MUTED }}>Day of Month</label>
              <select
                value={dayOfMonth}
                onChange={e => setDayOfMonth(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{ borderColor: CARD_BORDER, color: NAVY }}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Time */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: MUTED }}>Delivery Time</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            />
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: MUTED }}>Recipients (comma-separated emails)</label>
            <input
              value={recipients}
              onChange={e => setRecipients(e.target.value)}
              placeholder="john@company.com, jane@company.com"
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            />
          </div>

          {/* Format */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: MUTED }}>Export Format</label>
            <div className="flex gap-2">
              {(['pdf', 'excel'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors uppercase"
                  style={{
                    background: format === f ? '#1e4d6b' : CARD_BG,
                    color: format === f ? 'white' : NAVY,
                    borderColor: format === f ? '#1e4d6b' : CARD_BORDER,
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t" style={{ borderColor: CARD_BORDER }}>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50" style={{ borderColor: CARD_BORDER, color: NAVY }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ background: saving ? '#9CA3AF' : '#1e4d6b' }}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Schedule Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
