/**
 * DashboardSkeleton — Pulse skeleton loading state for all dashboards
 *
 * Matches loaded layout to prevent layout shift. No spinners.
 */

import { FONT } from './constants';

export function DashboardSkeleton() {
  return (
    <div style={{ ...FONT, backgroundColor: '#F5F6F8', minHeight: '100vh' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-4">
        {/* Hero skeleton */}
        <div className="rounded-xl animate-pulse" style={{ background: '#263d56', height: 120 }} />
        {/* Banner skeleton */}
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 animate-pulse">
          <div className="w-40 h-3 bg-[#1E2D4D]/8 rounded mb-2" />
          <div className="w-64 h-2 bg-[#1E2D4D]/5 rounded" />
        </div>
        {/* Location list skeleton */}
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 animate-pulse">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
            <div className="w-32 h-3 bg-[#1E2D4D]/8 rounded" />
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
              <div className="w-24 h-3 bg-[#1E2D4D]/8 rounded mb-2" />
              <div className="flex gap-4">
                <div className="w-20 h-2 bg-[#1E2D4D]/5 rounded" />
                <div className="w-20 h-2 bg-[#1E2D4D]/5 rounded" />
              </div>
            </div>
          ))}
        </div>
        {/* Tasks skeleton */}
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 animate-pulse">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
            <div className="w-28 h-3 bg-[#1E2D4D]/8 rounded" />
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
              <div className="w-4 h-4 bg-[#1E2D4D]/8 rounded-full" />
              <div className="flex-1">
                <div className="w-48 h-2.5 bg-[#1E2D4D]/8 rounded" />
              </div>
              <div className="w-16 h-2 bg-[#1E2D4D]/5 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
