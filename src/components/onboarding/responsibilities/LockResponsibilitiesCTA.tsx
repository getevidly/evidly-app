import { Lock } from 'lucide-react';

interface LockResponsibilitiesCTAProps {
  pendingCount: number;
  totalCount: number;
  onLock: () => void;
  loading?: boolean;
}

export function LockResponsibilitiesCTA({ pendingCount, totalCount, onLock, loading }: LockResponsibilitiesCTAProps) {
  const allSet = pendingCount === 0 && totalCount > 0;

  return (
    <div className="sticky bottom-0 border-t border-[#E2DDD4] bg-white px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        {allSet ? (
          <p className="text-xs text-emerald-700 font-medium">All {totalCount} items set. Lock to continue.</p>
        ) : (
          <p className="text-xs text-[#8A93A6]">
            {pendingCount} item{pendingCount !== 1 ? 's' : ''} still need a decision &middot; the rest of EvidLY unlocks when all are set
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onLock}
        disabled={!allSet || loading}
        className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#1E2D4D] text-[#FAF7F0] rounded-lg disabled:opacity-40 hover:bg-[#1E2D4D]/90 whitespace-nowrap"
      >
        <Lock size={13} />
        Lock &amp; continue
      </button>
    </div>
  );
}
