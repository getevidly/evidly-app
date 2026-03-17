import { useMemo } from 'react';
import { Clock, Send } from 'lucide-react';
import {
  type ShiftEntry,
  SHIFT_STATUS_CONFIG,
  getWeekDates,
  DAY_LABELS,
  calculateWeekTotals,
} from '../../data/timecardsDemoData';
import { HoursBreakdown } from './HoursBreakdown';
import { AnomalyBadge } from './AnomalyBadge';

interface MyTimecardProps {
  shifts: ShiftEntry[];
  employeeId: string;
  employeeName: string;
  onClockIn: () => void;
  onClockOut: () => void;
  onViewShift: (shift: ShiftEntry) => void;
  onSubmitTimecard: () => void;
}

export function MyTimecard({ shifts, employeeId, employeeName, onClockIn, onClockOut, onViewShift, onSubmitTimecard }: MyTimecardProps) {
  const weekDates = useMemo(() => getWeekDates(), []);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const myShifts = useMemo(() => shifts.filter(s => s.employeeId === employeeId), [shifts, employeeId]);
  const activeShift = useMemo(() => myShifts.find(s => s.date === todayStr && s.clockOut === null), [myShifts, todayStr]);
  const totals = useMemo(() => calculateWeekTotals(myShifts), [myShifts]);

  const allComplete = useMemo(() => {
    const pastDates = weekDates.filter(d => d <= todayStr);
    return pastDates.length > 0 && pastDates.every(d => {
      const shift = myShifts.find(s => s.date === d);
      return !shift || (shift.clockOut !== null);
    });
  }, [weekDates, todayStr, myShifts]);

  // Compute current duration for active shift
  const clockedInDuration = useMemo(() => {
    if (!activeShift?.clockIn) return '';
    const now = new Date();
    // parse clockIn like "6:00 AM"
    const match = activeShift.clockIn.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return '';
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    const start = new Date(now);
    start.setHours(h, m, 0, 0);
    const diffMin = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 60000));
    const hrs = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `${hrs}h ${mins}m`;
  }, [activeShift]);

  return (
    <div className="space-y-5">
      {/* Clock status banner */}
      {activeShift ? (
        <div className="rounded-xl border p-5 flex items-center justify-between" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#166534' }}>
              <Clock className="w-4 h-4 inline mr-1.5" style={{ verticalAlign: '-2px' }} />
              Clocked in at {activeShift.clockIn}
            </p>
            <p className="text-xs mt-1" style={{ color: '#15803d' }}>Working for {clockedInDuration}</p>
          </div>
          <button
            onClick={onClockOut}
            className="px-5 py-2 text-sm font-semibold rounded-lg text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#dc2626' }}
          >
            Clock Out
          </button>
        </div>
      ) : (
        <div className="rounded-xl border p-5 flex items-center justify-between" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#0B1628' }}>Not clocked in</p>
            <p className="text-xs mt-1" style={{ color: '#6B7F96' }}>{employeeName} &middot; {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <button
            onClick={onClockIn}
            className="px-5 py-2 text-sm font-semibold rounded-lg text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#16a34a' }}
          >
            Clock In
          </button>
        </div>
      )}

      {/* Week grid */}
      <div className="rounded-xl border" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: '#D1D9E6' }}>
          <h4 className="text-sm font-semibold" style={{ color: '#0B1628' }}>This Week</h4>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-sm" style={{ minWidth: 580 }}>
            <thead>
              <tr style={{ backgroundColor: '#F4F6FA' }}>
                {['Day', 'In', 'Out', 'Break', 'Total', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold" style={{ color: '#6B7F96' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekDates.map((date, idx) => {
                const shift = myShifts.find(s => s.date === date);
                const isToday = date === todayStr;
                const isFuture = date > todayStr;
                const stat = shift ? SHIFT_STATUS_CONFIG[shift.status] : null;

                return (
                  <tr
                    key={date}
                    className={`border-t ${shift ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    style={{
                      borderColor: '#E8EDF5',
                      backgroundColor: isToday ? '#eff6ff' : undefined,
                    }}
                    onClick={() => shift && onViewShift(shift)}
                  >
                    <td className="px-4 py-2.5" style={{ color: '#0B1628' }}>
                      <span className="font-medium">{DAY_LABELS[idx]}</span>
                      {isToday && <span className="ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded" style={{ color: '#1e4d6b', backgroundColor: '#dbeafe' }}>Today</span>}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: '#3D5068' }}>{isFuture ? '—' : shift?.clockIn || '—'}</td>
                    <td className="px-4 py-2.5" style={{ color: '#3D5068' }}>{isFuture ? '—' : shift?.clockOut || (shift?.clockIn ? 'Active' : '—')}</td>
                    <td className="px-4 py-2.5" style={{ color: '#3D5068' }}>{isFuture ? '—' : shift ? `${shift.breakMinutes}m` : '—'}</td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: '#0B1628' }}>{isFuture ? '—' : shift ? `${shift.totalHours.toFixed(1)}h` : '—'}</td>
                    <td className="px-4 py-2.5">
                      {!isFuture && stat && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color: stat.color, backgroundColor: stat.bg }}>
                          {stat.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {shift && shift.anomalies.length > 0 && <AnomalyBadge anomalies={shift.anomalies} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Week totals */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
        <h4 className="text-sm font-semibold mb-3" style={{ color: '#0B1628' }}>Week Totals</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Regular', value: totals.regular, color: '#3D5068' },
            { label: 'Overtime', value: totals.ot, color: '#854d0e' },
            { label: 'Double Time', value: totals.dt, color: '#9a3412' },
            { label: 'Total', value: totals.total, color: '#0B1628' },
          ].map(t => (
            <div key={t.label} className="text-center p-3 rounded-lg" style={{ backgroundColor: '#F4F6FA' }}>
              <p className="text-xs font-medium" style={{ color: '#6B7F96' }}>{t.label}</p>
              <p className="text-lg font-bold mt-1" style={{ color: t.color }}>{t.value.toFixed(1)}h</p>
            </div>
          ))}
        </div>
        <HoursBreakdown regular={totals.regular} ot={totals.ot} dt={totals.dt} total={totals.total} />
      </div>

      {/* Submit */}
      <button
        onClick={onSubmitTimecard}
        disabled={!allComplete}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl text-white transition-colors disabled:opacity-50"
        style={{ backgroundColor: '#1e4d6b' }}
      >
        <Send className="w-4 h-4" />
        Submit Timecard
      </button>
    </div>
  );
}
