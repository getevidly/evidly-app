/**
 * AvailabilitySubmissionPage — Technician submits weekly availability.
 * Route: /availability
 */
import { useState, useMemo } from 'react';
import { CalendarCheck, Clock, AlertTriangle, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useAvailabilitySubmission,
  useSubmitAvailability,
  useAvailabilityDeadline,
  useNextWeekDates,
} from '../../hooks/api/useAvailability';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY } from '../../components/dashboard/shared/constants';

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const URGENCY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  green: { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0' },
  yellow: { bg: '#fef9c3', text: '#a16207', border: '#fef08a' },
  orange: { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' },
  red: { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' },
};

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Not Submitted', bg: '#e5e7eb', text: '#6b7280' },
  submitted: { label: 'Submitted', bg: '#dcfce7', text: '#16a34a' },
  late: { label: 'Late — Pending Approval', bg: '#ffedd5', text: '#c2410c' },
  approved: { label: 'Approved', bg: '#dbeafe', text: '#2563eb' },
  rejected: { label: 'Rejected', bg: '#fee2e2', text: '#dc2626' },
};

interface DayState {
  available: boolean;
  startTime: string;
  endTime: string;
  notes: string;
}

export function AvailabilitySubmissionPage() {
  const { dates, weekStart } = useNextWeekDates();
  const deadline = useAvailabilityDeadline();
  const { data: existing, isLoading } = useAvailabilitySubmission(weekStart);
  const submitMutation = useSubmitAvailability();
  const [showConfirm, setShowConfirm] = useState(false);
  const [preferredAreas, setPreferredAreas] = useState('');

  const [days, setDays] = useState<DayState[]>(() =>
    DAY_LABELS.map(() => ({ available: true, startTime: '07:00', endTime: '17:00', notes: '' }))
  );

  const updateDay = (idx: number, patch: Partial<DayState>) => {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));
  };

  const totalAvailable = useMemo(() => days.filter(d => d.available).length, [days]);

  const deadlineLabel = useMemo(() => {
    if (!deadline.isBeforeDeadline) return 'Past deadline — requires approval';
    const h = Math.floor(deadline.hoursRemaining);
    if (h >= 24) return `Due by Thursday 2:00 PM (${Math.floor(h / 24)}d ${h % 24}h remaining)`;
    if (h >= 1) return `Due by Thursday 2:00 PM (${h}h remaining)`;
    return `Due in less than 1 hour!`;
  }, [deadline]);

  const urgStyle = URGENCY_STYLES[deadline.urgency];
  const existingStatus = existing?.status || 'pending';
  const statusBadge = STATUS_BADGES[existingStatus];

  const handleSubmit = () => {
    setShowConfirm(false);
    alert('Availability submitted (save pending — Supabase table required)');
  };

  const formatDate = (d: string) => {
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <CalendarCheck className="w-6 h-6" style={{ color: NAVY }} />
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Submit Availability</h1>
        </div>
        <p className="text-sm" style={{ color: TEXT_TERTIARY }}>
          Set your availability for the week of {formatDate(dates[0])} — {formatDate(dates[6])}
        </p>
      </div>

      {/* Deadline banner */}
      <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: urgStyle.bg, border: `1px solid ${urgStyle.border}` }}>
        <Clock className="w-5 h-5 flex-shrink-0" style={{ color: urgStyle.text }} />
        <span className="text-sm font-medium" style={{ color: urgStyle.text }}>{deadlineLabel}</span>
      </div>

      {/* Existing submission status */}
      {existing && (
        <div className="flex items-center gap-2">
          <span className="text-xs">Status:</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: statusBadge.bg, color: statusBadge.text }}>
            {statusBadge.label}
          </span>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg p-3 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <p className="text-xs" style={{ color: TEXT_TERTIARY }}>Available Days</p>
          <p className="text-xl font-bold mt-0.5" style={{ color: '#16a34a' }}>{totalAvailable}</p>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <p className="text-xs" style={{ color: TEXT_TERTIARY }}>Unavailable</p>
          <p className="text-xl font-bold mt-0.5" style={{ color: '#dc2626' }}>{7 - totalAvailable}</p>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <p className="text-xs" style={{ color: TEXT_TERTIARY }}>Week Of</p>
          <p className="text-sm font-bold mt-1" style={{ color: NAVY }}>{formatDate(dates[0])}</p>
        </div>
      </div>

      {/* Day-by-day */}
      <div className="space-y-3">
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            className="rounded-xl p-4 border transition-colors"
            style={{
              background: days[i].available ? '#f0fdf4' : '#f9fafb',
              borderColor: days[i].available ? '#bbf7d0' : CARD_BORDER,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-semibold" style={{ color: NAVY }}>{label}</span>
                <span className="text-xs ml-2" style={{ color: TEXT_TERTIARY }}>{formatDate(dates[i])}</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs" style={{ color: TEXT_TERTIARY }}>
                  {days[i].available ? 'Available' : 'Unavailable'}
                </span>
                <div
                  className="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
                  style={{ background: days[i].available ? '#16a34a' : '#d1d5db' }}
                  onClick={() => updateDay(i, { available: !days[i].available })}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                    style={{ left: days[i].available ? '22px' : '2px' }}
                  />
                </div>
              </label>
            </div>

            {days[i].available && (
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs" style={{ color: TEXT_TERTIARY }}>Start</label>
                  <input
                    type="time"
                    value={days[i].startTime}
                    onChange={e => updateDay(i, { startTime: e.target.value })}
                    className="px-2 py-1 text-sm border rounded-lg"
                    style={{ borderColor: CARD_BORDER, color: NAVY }}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs" style={{ color: TEXT_TERTIARY }}>End</label>
                  <input
                    type="time"
                    value={days[i].endTime}
                    onChange={e => updateDay(i, { endTime: e.target.value })}
                    className="px-2 py-1 text-sm border rounded-lg"
                    style={{ borderColor: CARD_BORDER, color: NAVY }}
                  />
                </div>
                <input
                  value={days[i].notes}
                  onChange={e => updateDay(i, { notes: e.target.value })}
                  placeholder="Notes (optional)"
                  className="flex-1 min-w-[140px] px-2 py-1 text-sm border rounded-lg"
                  style={{ borderColor: CARD_BORDER, color: NAVY }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Preferred areas */}
      <div className="rounded-xl p-4 border" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
        <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_TERTIARY }}>
          Preferred Jobs / Areas (optional)
        </label>
        <input
          value={preferredAreas}
          onChange={e => setPreferredAreas(e.target.value)}
          placeholder="e.g., Downtown area, restaurants only"
          className="w-full px-3 py-2 text-sm border rounded-lg"
          style={{ borderColor: CARD_BORDER, color: NAVY }}
        />
      </div>

      {/* Submit button */}
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white rounded-xl transition-colors"
        style={{ background: NAVY }}
      >
        <Send className="w-4 h-4" />
        {!deadline.isBeforeDeadline ? 'Submit Late Availability' : 'Submit Availability'}
      </button>

      {!deadline.isBeforeDeadline && (
        <p className="text-xs text-center" style={{ color: '#c2410c' }}>
          <AlertTriangle className="w-3 h-3 inline mr-1" />
          Late submission — will require supervisor approval
        </p>
      )}

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold mb-2" style={{ color: NAVY }}>Confirm Submission</h3>
            <p className="text-sm mb-1" style={{ color: TEXT_TERTIARY }}>
              Week of {formatDate(dates[0])} — {formatDate(dates[6])}
            </p>
            <p className="text-sm mb-4" style={{ color: TEXT_TERTIARY }}>
              {totalAvailable} days available, {7 - totalAvailable} unavailable
            </p>
            {!deadline.isBeforeDeadline && (
              <p className="text-xs mb-4 p-2 rounded-lg" style={{ background: '#fee2e2', color: '#dc2626' }}>
                This is a late submission and will require supervisor approval.
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border" style={{ borderColor: CARD_BORDER, color: NAVY }}>
                Cancel
              </button>
              <button onClick={handleSubmit} className="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ background: NAVY }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
