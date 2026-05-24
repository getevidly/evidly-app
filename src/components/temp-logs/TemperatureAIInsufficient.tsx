import { BarChart3 } from 'lucide-react';

interface Props {
  readingsCount: number;
  tier: number;
  windowDays: number;
}

const TIERS = [
  {
    level: 1,
    header: 'Tier 1',
    threshold: '20+ readings',
    description: 'Basic compliance trend. Failure rate direction.',
  },
  {
    level: 2,
    header: 'Tier 2',
    threshold: '50+ readings',
    description: 'Full detection across all 7 detectors. Day-of-week, time-of-day, equipment, recurring failures.',
  },
  {
    level: 3,
    header: 'Tier 3',
    threshold: '100+ readings \u00b7 4+ weeks',
    description: 'Multi-week drift detection. Shift correlations. Equipment trend analysis.',
  },
];

export function TemperatureAIInsufficient({ readingsCount, tier, windowDays }: Props) {
  const nextTier = TIERS.find(t => t.level > tier) || TIERS[0];
  const nextThreshold = nextTier.level === 1 ? 20 : nextTier.level === 2 ? 50 : 100;
  const moreNeeded = Math.max(0, nextThreshold - readingsCount);

  return (
    <div
      className="rounded-xl p-5"
      style={{ border: '2px dashed #E2DDD4', backgroundColor: '#FAFAF8' }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#FAF7F0', border: '1px solid #E2DDD4' }}
        >
          <BarChart3 className="w-6 h-6" style={{ color: '#A08C5A' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold" style={{ color: '#1E2D4D' }}>
            Not enough data yet for pattern analysis
          </h4>
          <p className="text-xs mt-1" style={{ color: '#6B7F96' }}>
            You have {readingsCount} reading{readingsCount !== 1 ? 's' : ''} in the
            last {windowDays === 0 ? 'all time' : `${windowDays} days`}.
            Patterns emerge with more data. Here&apos;s what unlocks as you log:
          </p>
        </div>
      </div>

      {/* Tier progression */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {TIERS.map(t => {
          const isCurrent = t.level === tier || (tier === 0 && t.level === 1);
          const isUnlocked = t.level <= tier;

          return (
            <div
              key={t.level}
              className="rounded-lg p-3"
              style={{
                backgroundColor: isCurrent ? '#FFF8ED' : isUnlocked ? '#f0fdf4' : '#FAFAF8',
                border: `1px solid ${isCurrent ? '#c2731a' : isUnlocked ? '#86efac' : '#E2DDD4'}`,
              }}
            >
              <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: isCurrent ? '#c2731a' : isUnlocked ? '#2f7a4d' : '#6B7F96' }}>
                {isCurrent && tier === 0 ? 'Next' : isUnlocked ? 'Unlocked' : t.level === tier + 1 ? 'Next' : 'Locked'} &middot; {t.header}
              </p>
              <p className="text-xs font-semibold mt-1" style={{ color: '#1E2D4D' }}>
                {t.threshold}
              </p>
              <p className="text-[10px] mt-1" style={{ color: '#6B7F96' }}>
                {t.description}
                {isCurrent && moreNeeded > 0 && (
                  <span className="font-semibold" style={{ color: '#c2731a' }}>
                    {' '}{moreNeeded} more reading{moreNeeded !== 1 ? 's' : ''} needed.
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
