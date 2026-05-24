import { CheckCircle } from 'lucide-react';

interface Props {
  readingsCount: number;
  windowDays: number;
}

export function TemperatureAIClean({ readingsCount, windowDays }: Props) {
  const windowLabel = windowDays === 0 ? 'all time' : `${windowDays} days`;

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: '#f0fdf4',
        border: '1px solid #86efac',
        borderLeftWidth: 4,
        borderLeftColor: '#2f7a4d',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#dcfce7' }}
        >
          <CheckCircle className="w-4 h-4" style={{ color: '#2f7a4d' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold" style={{ color: '#1E2D4D' }}>
            Your kitchen is running clean
          </h4>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: '#6B7F96' }}>
            All 7 pattern detectors ran on {readingsCount} readings. No statistically
            significant drift, clustering, recurring failures, or coverage gaps detected.
            The only pattern visible: consistent operations.
          </p>
          <div
            className="mt-3 rounded-lg px-3 py-2 text-[10px] leading-relaxed"
            style={{ backgroundColor: '#dcfce7', color: '#166534' }}
          >
            <span className="font-bold uppercase tracking-wider">Nothing to report is a signal</span>
            {' '}&middot; An inspector seeing {windowLabel} of clean operations + zero gaps +
            sensor-probe agreement has every reason to trust your records. Keep the routine.
          </div>
        </div>
      </div>
    </div>
  );
}
