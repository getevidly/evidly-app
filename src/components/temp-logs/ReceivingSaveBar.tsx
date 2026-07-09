import { Check, Loader2 } from 'lucide-react';

interface ReceivingItem {
  itemDescription: string;
  temperature: number;
  isPass: boolean;
  category: string;
  maxTemp?: number;
  ccpDeviation?: {
    actionTaken: string;
    notes: string;
    reMeasuredTemp?: number;
  };
}

interface ReceivingSaveBarProps {
  items: ReceivingItem[];
  vendorName: string;
  receivedBy: string;
  loading: boolean;
  onSave: () => void;
}

export function ReceivingSaveBar({ items, vendorName, receivedBy, loading, onSave }: ReceivingSaveBarProps) {
  const failedCount = items.filter(i => !i.isPass).length;
  const allPass = items.length > 0 && failedCount === 0;
  const hasFlagged = failedCount > 0;
  const canSave = items.length > 0 && vendorName && receivedBy;

  // Blank state — no items added
  if (items.length === 0) {
    return (
      <div
        className="rounded-xl p-4 text-center"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2DDD4' }}
      >
        <p className="text-xs mb-3" style={{ color: '#6B7F96' }}>
          Add items to enable Save. Once added, each temperature is validated against the food category target range.
        </p>
        <button
          disabled
          className="w-full px-6 py-3.5 rounded-lg text-sm font-semibold text-white opacity-40"
          style={{ backgroundColor: '#8A93A6' }}
        >
          Save Receiving Log
        </button>
      </div>
    );
  }

  // Flagged state — some items out of range
  if (hasFlagged) {
    return (
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #c2731a' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium" style={{ color: '#1E2D4D' }}>
            {items.length} item{items.length !== 1 ? 's' : ''} from {vendorName}
          </p>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
            style={{ backgroundColor: 'rgba(194,115,26,0.12)', color: '#c2731a' }}
          >
            Needs action
          </span>
        </div>
        <p className="text-xs mb-3" style={{ color: '#6B7F96' }}>
          {failedCount} item{failedCount !== 1 ? 's' : ''} flagged with CCP-01 corrective action recorded.
        </p>
        <button
          onClick={onSave}
          disabled={!canSave || loading}
          className="w-full px-6 py-3.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: '#c2731a' }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save & Log Corrective Action \u2192'
          )}
        </button>
      </div>
    );
  }

  // Ready state — all items in range
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #2f7a4d' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <p className="text-sm font-medium" style={{ color: '#1E2D4D' }}>
          {items.length} item{items.length !== 1 ? 's' : ''} from {vendorName}
        </p>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
          style={{ backgroundColor: 'rgba(47,122,77,0.12)', color: '#2f7a4d' }}
        >
          Ready
        </span>
      </div>
      <p className="text-xs mb-3" style={{ color: '#6B7F96' }}>
        All items within acceptable temperature range.
      </p>
      <button
        onClick={onSave}
        disabled={!canSave || loading}
        className="w-full px-6 py-3.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ backgroundColor: '#2f7a4d' }}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            Save Receiving Log
          </>
        )}
      </button>
    </div>
  );
}
