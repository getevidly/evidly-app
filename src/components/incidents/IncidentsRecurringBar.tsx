import { AlertCircle } from 'lucide-react';
import type { RecurringPattern } from '../../hooks/incidents/useRecurringPatterns';

interface IncidentsRecurringBarProps {
  patterns: RecurringPattern[];
  onViewPattern?: (pattern: RecurringPattern) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  food_safety: 'Food safety',
  fire_safety: 'Fire safety',
  facility_services: 'Facility services',
};

function formatRootCause(rc: string): string {
  return rc.charAt(0).toUpperCase() + rc.slice(1);
}

function PatternCard({
  pattern,
  onView,
}: {
  pattern: RecurringPattern;
  onView?: (p: RecurringPattern) => void;
}) {
  const categoryLabel = CATEGORY_LABELS[pattern.category] ?? pattern.category;
  const rootCauseLabel = pattern.rootCause
    ? formatRootCause(pattern.rootCause)
    : null;

  return (
    <div
      className="rounded-lg p-4 flex items-start gap-3"
      style={{
        background: 'linear-gradient(90deg, rgba(194,115,26,0.06) 0%, rgba(255,255,255,1) 100%)',
        borderLeft: '4px solid #c2731a',
      }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: 'rgba(194,115,26,0.12)' }}
      >
        <AlertCircle className="w-4 h-4" style={{ color: '#c2731a' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: '#c2731a' }}>
          Recurring pattern identified
        </p>
        <p className="text-[12px] text-[#1E2D4D]/70 mt-0.5">
          {categoryLabel} incidents reported {pattern.count30d} time{pattern.count30d !== 1 ? 's' : ''} in
          the past 30 days.
          {rootCauseLabel && (
            <> Same root cause ({rootCauseLabel}).</>
          )}
          {!rootCauseLabel && pattern.location && (
            <> Same location ({pattern.location}).</>
          )}
        </p>
      </div>
      {onView && (
        <button
          onClick={() => onView(pattern)}
          className="flex-shrink-0 text-[11px] font-semibold text-white px-3 py-1.5 rounded-lg whitespace-nowrap"
          style={{ backgroundColor: '#c2731a' }}
        >
          Open root cause review →
        </button>
      )}
    </div>
  );
}

export function IncidentsRecurringBar({
  patterns,
  onViewPattern,
}: IncidentsRecurringBarProps) {
  if (patterns.length === 0) return null;

  const displayed = patterns.slice(0, 2);
  const remaining = patterns.length - 2;

  return (
    <div className="space-y-2">
      {displayed.map((p) => (
        <PatternCard key={p.patternId} pattern={p} onView={onViewPattern} />
      ))}
      {remaining > 0 && (
        <p className="text-[11px] font-medium text-[#c2731a] pl-1">
          View all {patterns.length} recurring patterns →
        </p>
      )}
    </div>
  );
}
