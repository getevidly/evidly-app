import { FileDown } from 'lucide-react';
import { toast } from 'sonner';

const STATE_LABELS: Record<string, string> = {
  CA: 'California',
  TX: 'Texas',
  NY: 'New York',
  FL: 'Florida',
};

interface SummaryHeaderProps {
  stateCode: string | null;
  totalCount: number;
  counts: { done: number; assigned: number; skipped: number; pending: number };
}

export function SummaryHeader({ stateCode, totalCount, counts }: SummaryHeaderProps) {
  const stateLabel = stateCode ? (STATE_LABELS[stateCode] || stateCode) : null;

  const parts: string[] = [];
  if (stateLabel) parts.push(stateLabel);
  parts.push(`${totalCount} items`);
  if (counts.done > 0) parts.push(`${counts.done} done`);
  if (counts.assigned > 0) parts.push(`${counts.assigned} assigned`);
  if (counts.skipped > 0) parts.push(`${counts.skipped} skipped`);
  if (counts.pending > 0) parts.push(`${counts.pending} pending`);

  return (
    <div className="px-4 py-3 border-b border-[#E2DDD4] flex items-center justify-between gap-3">
      <p className="text-xs text-[#8A93A6] truncate">
        {parts.join(' · ')}
      </p>
      <button
        type="button"
        onClick={() => toast('PDF export coming soon')}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium border border-[#E2DDD4] text-[#1E2D4D] rounded-full hover:bg-[#1E2D4D]/5 transition-colors whitespace-nowrap"
      >
        <FileDown size={12} />
        Export PDF
      </button>
    </div>
  );
}
