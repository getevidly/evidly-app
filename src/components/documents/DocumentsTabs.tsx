export type DocumentTabId = 'kitchen' | 'service' | 'business';

interface Tab {
  id: DocumentTabId;
  label: string;
  desc: string;
}

const TABS: Tab[] = [
  { id: 'kitchen',  label: 'Kitchen & Employee',         desc: 'Health permits, food handler cards, ServSafe certs, and employee records.' },
  { id: 'service',  label: 'Vendor Service Records',     desc: 'Hood cleaning reports, fire suppression tests, pest control, grease trap logs, and fan performance records.' },
  { id: 'business', label: 'Vendor Business Information', desc: 'Vendor compliance posture \u2014 COI, W-9, licenses, workers comp.' },
];

export interface RequiredCountEntry {
  required: number;
  uploaded: number;
}

interface DocumentsTabsProps {
  activeTab: DocumentTabId;
  onTabChange: (tab: DocumentTabId) => void;
  counts: Record<DocumentTabId, number>;
  pendingCounts: Record<DocumentTabId, number>;
  requiredCounts?: Record<DocumentTabId, RequiredCountEntry | null>;
}

export function DocumentsTabs({ activeTab, onTabChange, counts, pendingCounts, requiredCounts }: DocumentsTabsProps) {
  return (
    <div>
      <div className="border-b border-[#E2DDD4] bg-white overflow-x-auto">
        <div className="flex gap-1">
          {TABS.map((t) => {
            const active = activeTab === t.id;
            const pending = pendingCounts[t.id];
            const req = requiredCounts?.[t.id];
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className="relative whitespace-nowrap px-4 py-3.5 text-[13px] cursor-pointer bg-transparent border-none flex items-center gap-1 flex-wrap max-[480px]:flex-col max-[480px]:items-start"
                style={{
                  borderBottom: active ? '3px solid #A08C5A' : '3px solid transparent',
                  fontWeight: active ? 700 : 500,
                  color: active ? '#1E2D4D' : '#8A93A6',
                }}
              >
                <span>
                  {t.label}{' '}
                  <span className="font-medium text-[#8A93A6]">({counts[t.id]})</span>
                </span>
                {req && req.required > 0 && (
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold"
                    style={
                      req.uploaded >= req.required
                        ? { backgroundColor: '#FAF7F0', color: '#1E2D4D' }
                        : { backgroundColor: '#FEF3C7', color: '#B45309' }
                    }
                  >
                    {req.uploaded >= req.required
                      ? `${req.required} of ${req.required} on file`
                      : `${req.required - req.uploaded} of ${req.required} missing`}
                  </span>
                )}
                {pending > 0 && (
                  <span className="inline-flex items-center justify-center ml-1 w-[18px] h-[18px] text-[10px] font-bold text-white bg-[#B91C1C] rounded-full">
                    {pending}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="px-0 py-3 text-[13px] text-[#8A93A6]">
        {TABS.find((t) => t.id === activeTab)?.desc}
      </div>
    </div>
  );
}
