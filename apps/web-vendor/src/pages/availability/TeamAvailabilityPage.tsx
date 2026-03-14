/**
 * TeamAvailabilityPage — Supervisor view of team availability for a week.
 * Route: /availability/team
 */
import { useState, useMemo } from 'react';
import { Users, ChevronLeft, ChevronRight, Download, Filter } from 'lucide-react';
import { useTeamAvailability, useNextWeekDates, type AvailabilitySubmission } from '../../hooks/api/useAvailability';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY } from '@shared/components/dashboard/shared/constants';

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_DOT: Record<string, string> = {
  pending: '#9ca3af',
  submitted: '#16a34a',
  late: '#c2410c',
  approved: '#2563eb',
  rejected: '#dc2626',
};

export function TeamAvailabilityPage() {
  const { dates, weekStart } = useNextWeekDates();
  const [weekOffset, setWeekOffset] = useState(0);

  const adjustedWeekStart = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + weekOffset * 7);
    return d.toISOString().slice(0, 10);
  }, [weekStart, weekOffset]);

  const adjustedDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(adjustedWeekStart);
      d.setDate(d.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [adjustedWeekStart]);

  const { data: team, isLoading } = useTeamAvailability(adjustedWeekStart);
  const submissions = team || [];
  const [filter, setFilter] = useState<'all' | 'submitted'>('all');

  const filtered = useMemo(() => {
    if (filter === 'submitted') return submissions.filter(s => s.status !== 'pending');
    return submissions;
  }, [submissions, filter]);

  const formatDate = (d: string) => {
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getHoursForDay = (sub: AvailabilitySubmission, dateStr: string): string => {
    const day = sub.days.find(d => d.date === dateStr);
    if (!day || !day.available) return '—';
    if (day.startTime && day.endTime) return `${day.startTime}–${day.endTime}`;
    return '✓';
  };

  const handleExport = () => {
    alert('CSV export — coming soon');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-6 h-6" style={{ color: NAVY }} />
            <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Team Availability</h1>
          </div>
          <p className="text-sm" style={{ color: TEXT_TERTIARY }}>View and manage team availability submissions.</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50"
          style={{ borderColor: CARD_BORDER, color: NAVY }}
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Week selector */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekOffset(o => o - 1)} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5" style={{ color: NAVY }} />
        </button>
        <span className="text-sm font-semibold" style={{ color: NAVY }}>
          {formatDate(adjustedDates[0])} — {formatDate(adjustedDates[6])}
        </span>
        <button onClick={() => setWeekOffset(o => o + 1)} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronRight className="w-5 h-5" style={{ color: NAVY }} />
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as 'all' | 'submitted')}
          className="text-sm border rounded-lg px-3 py-1.5"
          style={{ borderColor: CARD_BORDER, color: NAVY }}
        >
          <option value="all">Show All</option>
          <option value="submitted">Submitted Only</option>
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <Users className="w-10 h-10 mx-auto mb-3" style={{ color: TEXT_TERTIARY }} />
          <p className="text-sm font-semibold" style={{ color: NAVY }}>No availability submitted for this week</p>
          <p className="text-xs mt-1" style={{ color: TEXT_TERTIARY }}>Team members haven't submitted their availability yet.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-x-auto border" style={{ borderColor: CARD_BORDER }}>
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr style={{ background: '#F4F6FA' }}>
                <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-[#F4F6FA] z-10" style={{ color: NAVY }}>Employee</th>
                <th className="text-center px-2 py-3 font-semibold" style={{ color: NAVY }}>Status</th>
                {DAY_SHORT.map((d, i) => (
                  <th key={d} className="text-center px-2 py-3 font-semibold" style={{ color: NAVY }}>
                    <div>{d}</div>
                    <div className="text-[10px] font-normal" style={{ color: TEXT_TERTIARY }}>
                      {formatDate(adjustedDates[i])}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(sub => (
                <tr key={sub.id} className="border-t" style={{ borderColor: CARD_BORDER, background: CARD_BG }}>
                  <td className="px-4 py-2.5 font-medium sticky left-0 bg-white z-10" style={{ color: NAVY }}>
                    {sub.employeeName}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      title={sub.status}
                      style={{ background: STATUS_DOT[sub.status] || '#9ca3af' }}
                    />
                  </td>
                  {adjustedDates.map(dateStr => {
                    const hours = getHoursForDay(sub, dateStr);
                    const isAvail = hours !== '—';
                    return (
                      <td
                        key={dateStr}
                        className="px-2 py-2.5 text-center text-xs"
                        style={{
                          background: isAvail ? '#f0fdf410' : undefined,
                          color: isAvail ? '#16a34a' : '#9ca3af',
                          fontWeight: isAvail ? 500 : 400,
                        }}
                      >
                        {hours}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
