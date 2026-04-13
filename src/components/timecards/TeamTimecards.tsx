import { useState, useMemo } from 'react';
import { CheckCircle, Eye, Filter, DollarSign, AlertTriangle } from 'lucide-react';
import {
  type ShiftEntry,
  SHIFT_STATUS_CONFIG,
  DAY_LABELS,
  getWeekDates,
  getEmployeeWeekSummaries,
  getJobMargins,
} from '../../data/timecardsDemoData';
import { AnomalyBadge } from './AnomalyBadge';
import { OvertimeSummary } from './OvertimeSummary';

interface TeamTimecardsProps {
  shifts: ShiftEntry[];
  onApprove: (shiftId: string) => void;
  onBulkApprove: (shiftIds: string[]) => void;
  onViewShift: (shift: ShiftEntry) => void;
  userRole: string;
}

export function TeamTimecards({ shifts, onApprove, onBulkApprove, onViewShift, userRole }: TeamTimecardsProps) {
  const [locationFilter, setLocationFilter] = useState('all');
  const [pendingOnly, setPendingOnly] = useState(false);

  const weekDates = useMemo(() => getWeekDates(), []);
  const summaries = useMemo(() => getEmployeeWeekSummaries(), []);
  const isOwnerOrExec = userRole === 'owner_operator' || userRole === 'executive' || userRole === 'platform_admin';

  const locations = useMemo(() => {
    const locs = new Set(summaries.map(s => s.locationName));
    return ['all', ...Array.from(locs)];
  }, [summaries]);

  const filtered = useMemo(() => {
    let list = summaries;
    if (locationFilter !== 'all') {
      list = list.filter(s => s.locationName === locationFilter);
    }
    if (pendingOnly) {
      list = list.filter(s => s.pendingCount > 0);
    }
    return list;
  }, [summaries, locationFilter, pendingOnly]);

  const pendingShiftIds = useMemo(() => {
    return shifts.filter(s => s.status === 'pending').map(s => s.id);
  }, [shifts]);

  const totalPending = pendingShiftIds.length;

  const jobMargins = useMemo(() => {
    const locId = locationFilter === 'all' ? undefined : summaries.find(s => s.locationName === locationFilter)?.locationName;
    // Map location name to ID for filtering
    const locMap: Record<string, string> = {
      'Downtown Kitchen': 'downtown',
      'Airport Concourse B': 'airport',
      'University Dining Hall': 'university',
    };
    const id = locationFilter === 'all' ? undefined : locMap[locationFilter];
    return getJobMargins(id);
  }, [locationFilter, summaries]);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: '#6B7F96' }} />
          <select
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            className="text-sm border rounded-xl px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
            style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
          >
            {locations.map(l => (
              <option key={l} value={l}>{l === 'all' ? 'All Locations' : l}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: '#3D5068' }}>
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={e => setPendingOnly(e.target.checked)}
            className="rounded"
          />
          Show only pending
        </label>
        {totalPending > 0 && (
          <button
            onClick={() => onBulkApprove(pendingShiftIds)}
            className="ml-auto flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#16a34a' }}
          >
            <CheckCircle className="w-4 h-4" />
            Approve All ({totalPending})
          </button>
        )}
      </div>

      {/* Team grid */}
      <div className="rounded-xl border" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-sm" style={{ minWidth: 800 }}>
            <thead>
              <tr style={{ backgroundColor: '#F4F6FA' }}>
                <th className="px-4 py-2 text-left text-xs font-semibold" style={{ color: '#6B7F96' }}>Employee</th>
                {DAY_LABELS.map(d => (
                  <th key={d} className="px-3 py-2 text-center text-xs font-semibold" style={{ color: '#6B7F96' }}>{d}</th>
                ))}
                <th className="px-3 py-2 text-center text-xs font-semibold" style={{ color: '#6B7F96' }}>Reg</th>
                <th className="px-3 py-2 text-center text-xs font-semibold" style={{ color: '#854d0e' }}>OT</th>
                <th className="px-3 py-2 text-center text-xs font-semibold" style={{ color: '#9a3412' }}>DT</th>
                <th className="px-3 py-2 text-center text-xs font-semibold" style={{ color: '#6B7F96' }}>Status</th>
                <th className="px-3 py-2 text-center text-xs font-semibold" style={{ color: '#6B7F96' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => {
                const empShifts = shifts.filter(s => s.employeeId === emp.employeeId);
                const hasPending = emp.pendingCount > 0;
                const hasAnomalies = empShifts.some(s => s.anomalies.length > 0);

                return (
                  <tr key={emp.employeeId} className="border-t" style={{ borderColor: '#E8EDF5' }}>
                    <td className="px-4 py-2.5" style={{ color: '#0B1628' }}>
                      <p className="font-medium">{emp.employeeName}</p>
                      <p className="text-xs" style={{ color: '#6B7F96' }}>{emp.locationName}</p>
                    </td>
                    {emp.dailyHours.map((h, i) => {
                      const shift = empShifts.find(s => s.date === weekDates[i]);
                      const stat = shift ? SHIFT_STATUS_CONFIG[shift.status] : null;
                      return (
                        <td
                          key={i}
                          className={`px-3 py-2.5 text-center ${shift ? 'cursor-pointer hover:bg-[#FAF7F0]' : ''}`}
                          onClick={() => shift && onViewShift(shift)}
                          title={stat ? stat.label : undefined}
                        >
                          {h !== null ? (
                            <span className="text-xs font-medium" style={{ color: stat?.color || '#3D5068' }}>
                              {h.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: '#D1D9E6' }}>—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center font-medium" style={{ color: '#0B1628' }}>{emp.totalRegular.toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-center font-medium" style={{ color: emp.totalOT > 0 ? '#854d0e' : '#D1D9E6' }}>{emp.totalOT.toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-center font-medium" style={{ color: emp.totalDT > 0 ? '#9a3412' : '#D1D9E6' }}>{emp.totalDT.toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-center">
                      {hasPending && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color: '#d97706', backgroundColor: '#fffbeb' }}>
                          {emp.pendingCount} pending
                        </span>
                      )}
                      {hasAnomalies && <AnomalyBadge anomalies={empShifts.flatMap(s => s.anomalies).filter((v, i, a) => a.indexOf(v) === i)} />}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {hasPending && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const pendingIds = empShifts.filter(s => s.status === 'pending').map(s => s.id);
                              pendingIds.forEach(id => onApprove(id));
                            }}
                            className="p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                            title="Approve all pending"
                          >
                            <CheckCircle className="w-4 h-4" style={{ color: '#16a34a' }} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const latest = empShifts[empShifts.length - 1];
                            if (latest) onViewShift(latest);
                          }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" style={{ color: '#1E2D4D' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: '#6B7F96' }}>No employees match your filters</p>
          </div>
        )}
      </div>

      {/* Overtime Summary */}
      <OvertimeSummary />

      {/* Profitability (owner/executive only) */}
      {isOwnerOrExec && (
        <div className="rounded-xl border" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
          <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: '#D1D9E6' }}>
            <DollarSign className="w-4 h-4" style={{ color: '#1E2D4D' }} />
            <h4 className="text-sm font-semibold" style={{ color: '#0B1628' }}>Profitability by Job</h4>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full text-sm" style={{ minWidth: 600 }}>
              <thead>
                <tr style={{ backgroundColor: '#F4F6FA' }}>
                  {['Client / Job', 'Location', 'Revenue', 'Cost', 'Margin', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold" style={{ color: '#6B7F96' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobMargins.map(j => (
                  <tr
                    key={j.jobId}
                    className="border-t"
                    style={{ borderColor: '#E8EDF5', backgroundColor: j.flagged ? '#fef2f2' : undefined }}
                  >
                    <td className="px-4 py-2.5 font-medium" style={{ color: '#0B1628' }}>{j.clientName}</td>
                    <td className="px-4 py-2.5" style={{ color: '#3D5068' }}>{j.locationName}</td>
                    <td className="px-4 py-2.5" style={{ color: '#3D5068' }}>${j.revenue.toLocaleString()}</td>
                    <td className="px-4 py-2.5" style={{ color: '#3D5068' }}>${j.cost.toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-semibold" style={{ color: j.flagged ? '#dc2626' : '#166534' }}>
                      {j.margin}%
                    </td>
                    <td className="px-4 py-2.5">
                      {j.flagged ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                          <AlertTriangle className="w-3 h-3" />
                          Unprofitable
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color: '#16a34a', backgroundColor: '#f0fdf4' }}>
                          Healthy
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
