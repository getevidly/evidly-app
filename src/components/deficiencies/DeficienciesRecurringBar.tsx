import { AlertCircle } from 'lucide-react';
import type { DefRecurringPattern } from '../../hooks/deficiencies/useDeficiencyRecurringPatterns';

function PatternCard({ pattern }: { pattern: DefRecurringPattern }) {
  const inspectorCount = pattern.inspectorNames.length;

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
          Recurring violation identified
        </p>
        <p className="text-[12px] text-[#1E2D4D]/70 mt-0.5">
          <span className="font-mono font-medium">{pattern.code}</span> cited{' '}
          {pattern.deficiencyIds.length} time{pattern.deficiencyIds.length !== 1 ? 's' : ''}.
          {inspectorCount > 1 && (
            <> Noted by {inspectorCount} different inspectors.</>
          )}
          {' '}Permanent fix recommended before next routine inspection.
        </p>
      </div>
    </div>
  );
}

export function DeficienciesRecurringBar({
  patterns,
}: {
  patterns: DefRecurringPattern[];
}) {
  if (patterns.length === 0) return null;

  const displayed = patterns.slice(0, 2);
  const remaining = patterns.length - 2;

  return (
    <div className="space-y-2">
      {displayed.map((p) => (
        <PatternCard key={p.patternId} pattern={p} />
      ))}
      {remaining > 0 && (
        <p className="text-[11px] font-medium text-[#c2731a] pl-1">
          View all {patterns.length} recurring violations →
        </p>
      )}
    </div>
  );
}
