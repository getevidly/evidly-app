import { useMemo } from 'react';
import {
  DEMO_SHIFTS,
  SHIFT_STATUS_CONFIG,
  getWeekDates,
  DAY_LABELS,
  calculateWeekTotals,
} from '../../data/timecardsDemoData';
import { HoursBreakdown } from '../timecards/HoursBreakdown';

interface EmployeeTimecardsProps {
  employeeId: string;
}

export function EmployeeTimecards({ employeeId }: EmployeeTimecardsProps) {
  const weekDates = useMemo(() => getWeekDates(), []);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const shifts = useMemo(() => DEMO_SHIFTS.filter(s => s.employeeId === employeeId), [employeeId]);
  const totals = useMemo(() => calculateWeekTotals(shifts), [shifts]);

  return (
    <div className="space-y-5">
      {/* Week grid */}
      <div className="rounded-xl border" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: '#D1D9E6' }}>
          <h4 className="text-sm font-semibold" style={{ color: '#0B1628' }}>This Week</h4>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-sm" style={{ minWidth: 520 }}>
            <thead>
              <tr style={{ backgroundColor: '#F4F6FA' }}>
                {['Day', 'In', 'Out', 'Break', 'Total', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold" style={{ color: '#6B7F96' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekDates.map((date, idx) => {
                const shift = shifts.find(s => s.date === date);
                const isToday = date === todayStr;
                const isFuture = date > todayStr;
                const stat = shift ? SHIFT_STATUS_CONFIG[shift.status] : null;

                return (
                  <tr key={date} className="border-t" style={{ borderColor: '#E8EDF5', backgroundColor: isToday ? '#eff6ff' : undefined }}>
                    <td className="px-4 py-2.5" style={{ color: '#0B1628' }}>
                      <span className="font-medium">{DAY_LABELS[idx]}</span>
                      {isToday && <span className="ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded" style={{ color: '#1e4d6b', backgroundColor: '#dbeafe' }}>Today</span>}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: '#3D5068' }}>{isFuture ? '—' : shift?.clockIn || '—'}</td>
                    <td className="px-4 py-2.5" style={{ color: '#3D5068' }}>{isFuture ? '—' : shift?.clockOut || (shift ? 'Active' : '—')}</td>
                    <td className="px-4 py-2.5" style={{ color: '#3D5068' }}>{isFuture ? '—' : shift ? `${shift.breakMinutes}m` : '—'}</td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: '#0B1628' }}>{isFuture ? '—' : shift ? `${shift.totalHours.toFixed(1)}h` : '—'}</td>
                    <td className="px-4 py-2.5">
                      {!isFuture && stat && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color: stat.color, backgroundColor: stat.bg }}>
                          {stat.label}
                        </span>
                      )}
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
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Regular', value: totals.regular },
            { label: 'Overtime', value: totals.ot },
            { label: 'Double Time', value: totals.dt },
            { label: 'Total', value: totals.total },
          ].map(t => (
            <div key={t.label} className="text-center p-3 rounded-lg" style={{ backgroundColor: '#F4F6FA' }}>
              <p className="text-xs" style={{ color: '#6B7F96' }}>{t.label}</p>
              <p className="text-lg font-bold mt-1" style={{ color: '#0B1628' }}>{t.value.toFixed(1)}h</p>
            </div>
          ))}
        </div>
        <HoursBreakdown regular={totals.regular} ot={totals.ot} dt={totals.dt} total={totals.total} />
      </div>
    </div>
  );
}
