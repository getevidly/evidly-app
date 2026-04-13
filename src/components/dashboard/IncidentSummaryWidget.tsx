import { useMemo } from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { NAVY, BODY_TEXT } from './shared/constants';

interface Props {
  navigate: (path: string) => void;
}

// Hardcoded from 8 DEMO_INCIDENTS in IncidentLog.tsx
// (demo data is not exported; mirrors the inline array)
const DEMO_STATS = {
  // INC-001 critical/in_progress, INC-004 major/assigned,
  // INC-005 critical/in_progress, INC-008 major/reported
  openCount: 4,
  criticalCount: 2,
};

export function IncidentSummaryWidget({ navigate }: Props) {
  const stats = useMemo(() => DEMO_STATS, []);

  if (stats.openCount === 0) return null;

  return (
    <div className="bg-white rounded-xl" style={{ border: '1px solid #e5e7eb' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #F0F0F0' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">⚠️</span>
          <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>
            Open Incidents
          </h3>
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            color: stats.criticalCount > 0 ? '#991b1b' : NAVY,
            backgroundColor: stats.criticalCount > 0 ? '#fef2f2' : '#eef4f8',
          }}
        >
          {stats.openCount} open
        </span>
      </div>

      {/* Metrics row */}
      <div className="px-4 py-3 flex items-center gap-4 text-xs">
        {stats.criticalCount > 0 && (
          <span className="flex items-center gap-1 text-red-600 font-semibold">
            <AlertTriangle size={12} />
            {stats.criticalCount} Critical
          </span>
        )}
        <span className="text-amber-600 font-medium">
          {stats.openCount - stats.criticalCount} Other Open
        </span>
      </div>

      {/* View all link */}
      <button
        type="button"
        onClick={() => navigate('/incidents')}
        className="w-full px-4 py-3 text-center text-xs font-semibold transition-colors hover:bg-[#FAF7F0]"
        style={{ color: NAVY, borderTop: '1px solid #F0F0F0' }}
      >
        View All <ChevronRight size={12} className="inline" />
      </button>
    </div>
  );
}
