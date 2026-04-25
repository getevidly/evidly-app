/**
 * DashboardLoadingSkeleton — Shimmer skeleton for top-level Dashboard initial load.
 * Matches Today tab layout. Separate from shared/DashboardSkeleton (used by role dashboards).
 */

import { FONT } from './shared/constants';

const SHIMMER_CSS = `
  @keyframes evidly-shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes evidly-skeleton-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

function ShimmerBox({ width, height, rounded = 4, style }: {
  width: number | string;
  height: number;
  rounded?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: rounded,
        background: 'linear-gradient(90deg, #E8EDF5 25%, #F4F6FA 50%, #E8EDF5 75%)',
        backgroundSize: '800px 100%',
        animation: 'evidly-shimmer 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

function SkeletonCard({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <div
      className="bg-white rounded-xl"
      style={{
        border: '1px solid #e5e7eb',
        opacity: 0,
        animation: `evidly-skeleton-fade-in 0.3s ease-out ${delay}ms both`,
      }}
    >
      {children}
    </div>
  );
}

export function DashboardLoadingSkeleton() {
  return (
    <div style={{ ...FONT }}>
      <style>{SHIMMER_CSS}</style>

      <div className="max-w-4xl mx-auto space-y-5">
        {/* Stat cards row — mirrors 3-column summary strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map(i => (
            <SkeletonCard key={i} delay={i * 80}>
              <div className="p-4 space-y-3">
                <ShimmerBox width={80} height={10} />
                <ShimmerBox width={48} height={24} rounded={6} />
                <ShimmerBox width={64} height={10} />
              </div>
            </SkeletonCard>
          ))}
        </div>

        {/* Tasks section skeleton */}
        <SkeletonCard delay={240}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
            <ShimmerBox width={120} height={12} />
          </div>
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className="px-4 py-3 flex items-center gap-3"
              style={{ borderBottom: '1px solid #F0F0F0' }}
            >
              <ShimmerBox width={16} height={16} rounded={8} />
              <div className="flex-1 space-y-1.5">
                <ShimmerBox width="70%" height={10} />
                <ShimmerBox width="40%" height={8} />
              </div>
              <ShimmerBox width={56} height={18} rounded={9} />
            </div>
          ))}
        </SkeletonCard>

        {/* Quick actions row skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => (
            <SkeletonCard key={i} delay={320 + i * 80}>
              <div className="p-4 flex items-center gap-3">
                <ShimmerBox width={34} height={34} rounded={8} />
                <div className="flex-1 space-y-1.5">
                  <ShimmerBox width="60%" height={10} />
                  <ShimmerBox width="80%" height={8} />
                </div>
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>
    </div>
  );
}
