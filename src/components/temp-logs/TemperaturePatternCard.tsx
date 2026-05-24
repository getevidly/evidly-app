import type { TemperaturePattern } from '../../hooks/temperatures/useTemperaturePatternAnalysis';

const PRP_COLORS: Record<string, string> = {
  predict: '#c2731a',
  reduce: '#DC2626',
  prove: '#2f7a4d',
};

const PRP_LABELS: Record<string, string> = {
  predict: 'PREDICT',
  reduce: 'REDUCE',
  prove: 'PROVE',
};

interface Props {
  pattern: TemperaturePattern;
  onViewData?: (filters: Record<string, string>) => void;
}

export function TemperaturePatternCard({ pattern, onViewData }: Props) {
  const color = PRP_COLORS[pattern.prp] || '#6B7F96';

  return (
    <div
      className="bg-white rounded-xl border p-4"
      style={{ borderColor: '#E2DDD4', borderLeftWidth: 4, borderLeftColor: color }}
    >
      {/* Head */}
      <div className="flex items-start justify-between gap-3">
        <h4
          className="text-sm font-bold leading-snug"
          style={{ color: '#1E2D4D', fontFamily: "'Montserrat', sans-serif" }}
        >
          {pattern.title}
        </h4>
        <span
          className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${color}18`, color }}
        >
          {PRP_LABELS[pattern.prp]}
        </span>
      </div>

      {/* Equipment chip */}
      {pattern.equipment_name && (
        <span
          className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: '#FAF7F0', color: '#1E2D4D', border: '1px solid #E2DDD4' }}
        >
          {pattern.equipment_name}
        </span>
      )}

      {/* Evidence block */}
      <div
        className="mt-3 rounded-lg px-3 py-2.5 text-xs leading-relaxed"
        style={{
          backgroundColor: '#FAF7F0',
          color: '#1E2D4D',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {pattern.evidence_summary}
      </div>

      {/* Confidence bar */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: '#E2DDD4' }}>
          <div
            className="h-1.5 rounded-full transition-all"
            style={{
              width: `${pattern.confidence_pct}%`,
              backgroundColor: color,
            }}
          />
        </div>
        <span className="text-[10px] font-semibold" style={{ color: '#6B7F96' }}>
          {pattern.confidence_pct}%
        </span>
      </div>

      {/* Suggested action */}
      <p className="mt-3 text-xs leading-relaxed" style={{ color: '#6B7F96' }}>
        <span className="font-bold" style={{ color: '#1E2D4D' }}>Suggested: </span>
        {pattern.suggested_action}
      </p>

      {/* View data link */}
      {pattern.filter_for_history && onViewData && (
        <button
          type="button"
          onClick={() => onViewData(pattern.filter_for_history!)}
          className="mt-2 text-xs font-semibold"
          style={{ color: '#1E2D4D', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' }}
        >
          View underlying data &rarr;
        </button>
      )}
    </div>
  );
}
