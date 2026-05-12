import type { EnrichedDocument } from '../../hooks/documents/useDocumentsByTab';
import type { DocumentTabId } from './DocumentsTabs';
import { StatusPill, statusPillColors } from './StatusPill';
import { RequestStateBadge } from './RequestStateBadge';
import { answerLine, answerLineColor } from '../../lib/answerLine';

interface DocumentCardProps {
  doc: EnrichedDocument;
  activeTab: DocumentTabId;
  onClick: (doc: EnrichedDocument) => void;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DocumentCard({ doc, activeTab, onClick }: DocumentCardProps) {
  const { fg } = statusPillColors(doc.status);
  const line = answerLine(doc);

  return (
    <button
      type="button"
      onClick={() => onClick(doc)}
      className="text-left bg-white border border-[#E2DDD4] rounded-lg px-4 py-3.5 w-full cursor-pointer transition-shadow hover:shadow-md"
      style={{ borderLeft: `4px solid ${fg}` }}
    >
      <div className="flex justify-between items-start gap-3">
        {/* Left content */}
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold text-[#1E2D4D] mb-0.5 truncate">
            {doc.name}
          </div>
          <div className="text-[12px] text-[#8A93A6]">
            {doc.type}
            {activeTab === 'kitchen' && doc.category === 'employee' && (
              <span className="ml-1.5 text-[10px] font-bold text-[#1D4ED8] bg-[#DBEAFE] px-1.5 py-px rounded">
                Employee
              </span>
            )}
            {doc.subject_user_name && (
              <> · <span className="font-semibold">{doc.subject_user_name}</span></>
            )}
            {doc.vendor_name && (
              <> · <span className="font-semibold text-[#1E2D4D]">{doc.vendor_name}</span></>
            )}
            {doc.location_name && <> · {doc.location_name}</>}
          </div>
          <div className="text-[11px] text-[#B0B8C8] mt-1.5">
            {doc.expiry_date ? `Expires ${fmtDate(doc.expiry_date)}` : 'No expiration'}
            {doc.requested_at && <> · Last update {fmtDate(doc.requested_at)}</>}
          </div>
          {line && (
            <div
              className="text-[11px] font-semibold mt-1"
              style={{ color: answerLineColor(doc.status) }}
            >
              {line}
            </div>
          )}
        </div>

        {/* Right badges */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <StatusPill status={doc.status} />
          <RequestStateBadge stage={doc.request_stage} />
        </div>
      </div>
    </button>
  );
}
