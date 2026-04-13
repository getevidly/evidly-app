import { useState } from 'react';
import { FileText, Check, AlertTriangle, Clock, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import type { VendorDocRecord } from '../../types/vendorDocuments';
import { FlagDocumentModal } from './FlagDocumentModal';
import { VersionHistoryPanel } from './VersionHistoryPanel';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';

const STATUS_BADGES: Record<string, { label: string; bg: string; color: string }> = {
  pending_review: { label: 'Pending Review', bg: '#EFF6FF', color: '#2563EB' },
  accepted: { label: 'Accepted', bg: '#F0FDF4', color: '#16A34A' },
  flagged: { label: 'Flagged', bg: '#FEF2F2', color: '#DC2626' },
  expired: { label: 'Expired', bg: '#FEF2F2', color: '#DC2626' },
  superseded: { label: 'Superseded', bg: '#F3F4F6', color: '#6B7280' },
};

const UPLOAD_METHOD_LABELS: Record<string, string> = {
  manual: 'Manual Upload',
  secure_link: 'Secure Link',
  vendor_portal: 'Vendor Portal',
  auto_request: 'Auto-Request',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

interface DocumentReviewCardProps {
  document: VendorDocRecord;
  vendorName: string;
  onAccept: (docId: string) => void;
  onFlag: (docId: string, reason: string, category: string) => void;
}

export function DocumentReviewCard({ document: doc, vendorName, onAccept, onFlag }: DocumentReviewCardProps) {
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const statusBadge = STATUS_BADGES[doc.status] || STATUS_BADGES.pending_review;

  return (
    <>
      {showFlagModal && (
        <FlagDocumentModal
          documentTitle={doc.title}
          vendorName={vendorName}
          onClose={() => setShowFlagModal(false)}
          onSubmit={(reason, category) => {
            onFlag(doc.id, reason, category);
            setShowFlagModal(false);
          }}
        />
      )}

      <div
        className="bg-white rounded-xl border p-4 sm:p-5"
        style={{ borderColor: doc.status === 'pending_review' ? '#BFDBFE' : '#E5E7EB' }}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${GOLD}15` }}
            >
              <FileText className="h-5 w-5" style={{ color: GOLD }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold" style={{ color: NAVY }}>
                  {doc.document_type}
                </h4>
                <span className="text-xs text-gray-500">— {vendorName}</span>
                {doc.version > 1 && (
                  <button
                    onClick={() => setShowVersionHistory(!showVersionHistory)}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors hover:bg-gray-100"
                    style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
                  >
                    v{doc.version}
                    {showVersionHistory ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </button>
                )}
              </div>
              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {timeAgo(doc.created_at)}
                </span>
                <span>Via: {UPLOAD_METHOD_LABELS[doc.upload_method] || doc.upload_method}</span>
                {doc.ai_classified && doc.ai_confidence && (
                  <span className="flex items-center gap-1">
                    <Shield size={11} />
                    AI: {Math.round(doc.ai_confidence * 100)}%
                  </span>
                )}
                {doc.expiration_date && (
                  <span>Exp: {doc.expiration_date}</span>
                )}
              </div>
            </div>
          </div>
          {/* Status badge */}
          <span
            className="flex-shrink-0 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: statusBadge.bg, color: statusBadge.color }}
          >
            {statusBadge.label}
          </span>
        </div>

        {/* Vendor notes */}
        {doc.vendor_notes && (
          <div className="mt-3 ml-[52px] px-3 py-2 rounded-md text-xs" style={{ backgroundColor: '#F9FAFB', color: '#4B5563' }}>
            <span className="font-medium text-gray-600">Vendor Notes: </span>
            {doc.vendor_notes}
          </div>
        )}

        {/* Version history (collapsible) */}
        {showVersionHistory && (
          <div className="mt-3 ml-[52px]">
            <VersionHistoryPanel documentId={doc.id} documentType={doc.document_type} />
          </div>
        )}

        {/* Action buttons */}
        {doc.status === 'pending_review' && (
          <div className="flex items-center gap-2 mt-3 ml-[52px]">
            <button
              onClick={() => onAccept(doc.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#1e4d6b' }}
            >
              <Check size={14} />
              Accept & File
            </button>
            <button
              onClick={() => setShowFlagModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-red-100"
              style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
            >
              <AlertTriangle size={14} />
              Flag Issue
            </button>
          </div>
        )}

        {/* Review info for accepted/flagged */}
        {(doc.status === 'accepted' || doc.status === 'flagged') && doc.reviewed_at && (
          <div className="mt-3 ml-[52px] text-xs text-gray-500">
            {doc.status === 'accepted' ? 'Accepted' : 'Flagged'} {timeAgo(doc.reviewed_at)}
            {doc.review_notes && <span> — {doc.review_notes}</span>}
          </div>
        )}
      </div>
    </>
  );
}
