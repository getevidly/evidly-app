import { Clock } from 'lucide-react';
import type { CoverageGap } from '../../hooks/temperatures/useCoverageGaps';

interface TemperatureHistoryGapCalloutProps {
  gaps: CoverageGap[];
  onShowGaps: () => void;
}

function formatGapDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m gap`;
  if (m === 0) return `${h}h gap`;
  return `${h}h ${m}m gap`;
}

export function TemperatureHistoryGapCallout({ gaps, onShowGaps }: TemperatureHistoryGapCalloutProps) {
  if (gaps.length === 0) return null;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        border: '1px solid #c2731a',
        background: 'linear-gradient(135deg, #fdf8f0 0%, #fef6e8 100%)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(194, 115, 26, 0.12)' }}
        >
          <Clock className="w-4 h-4" style={{ color: '#c2731a' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold" style={{ color: '#1E2D4D' }}>
            Coverage gaps detected
          </h4>
          <p className="text-xs mt-1" style={{ color: '#6B7F96' }}>
            {gaps.length} equipment unit{gaps.length !== 1 ? 's' : ''} ha{gaps.length !== 1 ? 've' : 's'} gaps
            exceeding their required check interval in this period.
          </p>
          <div className="mt-3 space-y-2">
            {gaps.slice(0, 3).map((gap, i) => (
              <div
                key={`${gap.equipmentId}-${i}`}
                className="flex items-center gap-2 text-xs rounded-lg px-3 py-2"
                style={{ backgroundColor: 'rgba(255,255,255,0.7)', border: '0.5px solid #E2DDD4' }}
              >
                <span
                  className="w-2 h-2 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: '#c2731a' }}
                />
                <span className="font-medium truncate" style={{ color: '#1E2D4D' }}>
                  {gap.equipmentName}
                </span>
                <span className="ml-auto whitespace-nowrap" style={{ color: '#c2731a' }}>
                  {formatGapDuration(gap.gapMinutes)}
                </span>
              </div>
            ))}
          </div>
          {gaps.length > 3 && (
            <p className="text-[10px] mt-2" style={{ color: '#6B7F96' }}>
              +{gaps.length - 3} more unit{gaps.length - 3 !== 1 ? 's' : ''}
            </p>
          )}
          <button
            type="button"
            onClick={onShowGaps}
            className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: '#c2731a', color: '#fff' }}
          >
            Show gaps only
          </button>
        </div>
      </div>
    </div>
  );
}
