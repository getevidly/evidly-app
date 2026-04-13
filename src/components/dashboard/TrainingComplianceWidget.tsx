import { useMemo } from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { TRAINING_EMPLOYEES, getCertStats } from '../../data/trainingRecordsDemoData';
import { NAVY, BODY_TEXT } from './shared/constants';

interface Props {
  navigate: (path: string) => void;
}

export function TrainingComplianceWidget({ navigate }: Props) {
  const stats = useMemo(() => getCertStats(TRAINING_EMPLOYEES), []);

  if (stats.comingDue === 0 && stats.needsRenewal === 0) return null;

  return (
    <div className="bg-white rounded-xl" style={{ border: '1px solid #e5e7eb' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #F0F0F0' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🎓</span>
          <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>
            Training Compliance
          </h3>
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            color: stats.needsRenewal > 0 ? '#991b1b' : NAVY,
            backgroundColor: stats.needsRenewal > 0 ? '#fef2f2' : '#eef4f8',
          }}
        >
          {stats.needsRenewal > 0
            ? `${stats.needsRenewal} expired`
            : `${stats.comingDue} expiring`}
        </span>
      </div>

      {/* Metrics row */}
      <div className="px-4 py-3 flex items-center gap-4 text-xs">
        {stats.needsRenewal > 0 && (
          <span className="flex items-center gap-1 text-red-600 font-semibold">
            <AlertTriangle size={12} />
            {stats.needsRenewal} Needs Renewal
          </span>
        )}
        {stats.comingDue > 0 && (
          <span className="text-amber-600 font-medium">
            {stats.comingDue} Coming Due
          </span>
        )}
        <span className="text-[#1E2D4D]/50 ml-auto">
          {stats.completionPct}% training complete
        </span>
      </div>

      {/* View all link */}
      <button
        type="button"
        onClick={() => navigate('/dashboard/training')}
        className="w-full px-4 py-3 text-center text-xs font-semibold transition-colors hover:bg-[#FAF7F0]"
        style={{ color: NAVY, borderTop: '1px solid #F0F0F0' }}
      >
        View All <ChevronRight size={12} className="inline" />
      </button>
    </div>
  );
}
