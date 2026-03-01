import { Check, ChevronRight } from 'lucide-react';
import { getVersionHistory, getReviewsForDocument } from '../../data/vendorDocumentsDemoData';

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  accepted: { bg: '#F0FDF4', color: '#16A34A', label: 'Accepted' },
  superseded: { bg: '#F3F4F6', color: '#6B7280', label: 'Superseded' },
  pending_review: { bg: '#EFF6FF', color: '#2563EB', label: 'Pending Review' },
  flagged: { bg: '#FEF2F2', color: '#DC2626', label: 'Flagged' },
  expired: { bg: '#FEF2F2', color: '#DC2626', label: 'Expired' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface VersionHistoryPanelProps {
  documentId: string;
  documentType: string;
}

export function VersionHistoryPanel({ documentId, documentType }: VersionHistoryPanelProps) {
  const versions = getVersionHistory(documentId);

  if (versions.length <= 1) return null;

  return (
    <div
      className="rounded-lg border p-3"
      style={{ backgroundColor: '#FAFBFC', borderColor: '#E5E7EB' }}
    >
      <h5 className="text-xs font-semibold text-gray-600 mb-2">
        Version History — {documentType}
      </h5>
      <div className="space-y-0">
        {versions.map((ver, i) => {
          const statusCfg = STATUS_COLORS[ver.status] || STATUS_COLORS.superseded;
          const reviews = getReviewsForDocument(ver.id);
          const reviewer = reviews.length > 0 ? reviews[0].reviewer_name : null;
          const isCurrent = i === 0;

          return (
            <div
              key={ver.id}
              className="flex items-start gap-2 py-1.5"
              style={{ borderLeft: '2px solid', borderColor: isCurrent ? '#16A34A' : '#D1D5DB', paddingLeft: 10, marginLeft: 4 }}
            >
              {/* Version indicator */}
              <div
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: isCurrent ? '#16A34A' : '#E5E7EB' }}
              >
                {isCurrent
                  ? <Check size={10} color="#FFFFFF" strokeWidth={3} />
                  : <ChevronRight size={8} color="#9CA3AF" />
                }
              </div>

              {/* Version details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-gray-700">
                    v{ver.version} {isCurrent ? '(Current)' : ''}
                  </span>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
                  >
                    {statusCfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5 flex-wrap">
                  <span>{formatDate(ver.created_at)}</span>
                  {reviewer && <span>Reviewed by {reviewer}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
