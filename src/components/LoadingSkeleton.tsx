export { Skeleton, SkeletonCard, SkeletonTable, SkeletonChart, SkeletonScore, SkeletonKPI, SkeletonList } from './ui/Skeleton';

export function LoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-[#1E2D4D]/8 rounded ${className}`}></div>
  );
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A08C5A] mx-auto"></div>
        <p className="mt-4 text-[#1E2D4D]/70">Loading...</p>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5">
          <LoadingSkeleton className="h-4 w-32 mx-auto mb-6" />
          <LoadingSkeleton className="h-48 w-48 rounded-full mx-auto" />
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5">
          <LoadingSkeleton className="h-6 w-48 mb-6" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <LoadingSkeleton className="h-4 w-24" />
                <LoadingSkeleton className="h-8 w-32" />
                <LoadingSkeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5">
          <LoadingSkeleton className="h-6 w-32 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <LoadingSkeleton className="h-4 w-full" />
                <LoadingSkeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5">
          <LoadingSkeleton className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border border-[#1E2D4D]/10 rounded-xl">
                <LoadingSkeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-2">
                  <LoadingSkeleton className="h-4 w-48" />
                  <LoadingSkeleton className="h-3 w-32" />
                </div>
                <LoadingSkeleton className="h-8 w-16 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
