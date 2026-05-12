import { StatusIcon, type StatusIconState } from '../shared/StatusIcon';
import type { PillarRequirement } from '../../../hooks/onboarding/usePillarRequirements';

type DetailStatus = 'done' | 'assigned' | 'skipped' | 'pending';

interface SummaryRowProps {
  requirement: PillarRequirement;
  ownerText: string;
  ownerAmber: boolean;
  detailText: string;
  detailStatus: DetailStatus;
  actionLabel: string | null;
  onAction?: () => void;
  isPending: boolean;
}

function statusToIcon(status: DetailStatus): StatusIconState {
  switch (status) {
    case 'done': return 'done';
    case 'assigned': return 'in_progress';
    case 'skipped': return 'skipped';
    case 'pending': return 'pending';
  }
}

function statusWordColor(status: DetailStatus): string {
  switch (status) {
    case 'done': return '#2E7D32';
    case 'skipped':
    case 'pending': return '#B45309';
    default: return '#1E2D4D';
  }
}

export function SummaryRow({
  requirement,
  ownerText,
  ownerAmber,
  detailText,
  detailStatus,
  actionLabel,
  onAction,
  isPending,
}: SummaryRowProps) {
  // Split detail text to color the status word differently
  const dotIdx = detailText.indexOf(' · ');
  const statusWord = dotIdx >= 0 ? detailText.slice(0, dotIdx) : detailText;
  const detailRest = dotIdx >= 0 ? detailText.slice(dotIdx) : '';

  return (
    <div
      className={`grid items-center gap-x-3 px-4 py-2.5 border-b border-[#E2DDD4]/50 text-xs ${
        isPending ? 'bg-[#FEF8EC]' : ''
      }`}
      style={{ gridTemplateColumns: '1.4fr 1fr 1.4fr auto' }}
    >
      {/* Col 1: icon + title + citation */}
      <div className="flex items-center gap-2 min-w-0">
        <StatusIcon state={statusToIcon(detailStatus)} size={14} />
        <div className="min-w-0">
          <span className="text-sm font-medium text-[#1E2D4D] truncate block">{requirement.label}</span>
          {requirement.citation && (
            <span className="text-[10px] text-[#5A6478] font-mono">{requirement.citation}</span>
          )}
        </div>
      </div>

      {/* Col 2: owner */}
      <div className="min-w-0 truncate">
        <span className="text-[10px] uppercase tracking-wider text-[#8A93A6]">Owner: </span>
        <span className={ownerAmber ? 'italic text-[#B45309]' : 'text-[#1E2D4D]'}>
          {ownerText}
        </span>
      </div>

      {/* Col 3: detail */}
      <div className="min-w-0 truncate">
        <span style={{ color: statusWordColor(detailStatus) }}>{statusWord}</span>
        <span className="text-[#1E2D4D]">{detailRest}</span>
      </div>

      {/* Col 4: action */}
      <div>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="text-[11px] font-medium text-[#1E2D4D] hover:underline whitespace-nowrap"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
