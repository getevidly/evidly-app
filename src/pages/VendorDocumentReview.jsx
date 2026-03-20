import { useState, useMemo } from 'react';
import { useVendorSubmissions } from '../hooks/useVendorSubmissions';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { useDemo } from '../contexts/DemoContext';
import { requestReupload } from '../lib/vendorDocumentActions';
import {
  FileText, CheckCircle2, XCircle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Eye, ThumbsUp, ThumbsDown, RefreshCw,
  Brain, Shield,
} from 'lucide-react';

const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#D1D9E6';
const BODY_TEXT = '#0B1628';
const NAVY = '#163a5f';
const GOLD = '#C49A2B';
const TEXT_TERTIARY = '#6B7F96';

const FONT = { fontFamily: "'Inter', system-ui, -apple-system, sans-serif" };

const STATUS_CONFIG = {
  pending:  { label: 'Pending Review', color: '#C49A2B', bg: '#FFFBEB', icon: Clock },
  approved: { label: 'Approved',       color: '#166534', bg: '#F0FDF4', icon: CheckCircle2 },
  declined: { label: 'Declined',       color: '#991B1B', bg: '#FEF2F2', icon: XCircle },
};

const AI_STATUS_CONFIG = {
  pending: { label: 'AI Pending',  color: '#6B7F96', icon: Clock },
  passed:  { label: 'AI Passed',   color: '#166534', icon: CheckCircle2 },
  failed:  { label: 'AI Flagged',  color: '#dc2626', icon: AlertTriangle },
  error:   { label: 'AI Error',    color: '#6B7F96', icon: AlertTriangle },
};

const FILTER_TABS = [
  { key: 'all',      label: 'All' },
  { key: 'pending',  label: 'Pending Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'declined', label: 'Declined' },
];

export default function VendorDocumentReview() {
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const [filter, setFilter] = useState('pending');
  const { submissions, loading, approve, decline, refetch } = useVendorSubmissions(filter === 'all' ? 'all' : filter);
  const [expandedId, setExpandedId] = useState(null);
  const [declineModal, setDeclineModal] = useState(null);
  const [declineReason, setDeclineReason] = useState('');

  const counts = useMemo(() => {
    return { total: submissions.length };
  }, [submissions]);

  const handleApprove = async (submissionId) => {
    if (isDemoMode) { alert('Approve action is disabled in demo mode.'); return; }
    guardAction(async () => {
      await approve(submissionId);
    });
  };

  const handleDecline = async () => {
    if (!declineModal || !declineReason.trim()) return;
    if (isDemoMode) { alert('Decline action is disabled in demo mode.'); return; }
    guardAction(async () => {
      await decline(declineModal, declineReason.trim());
      setDeclineModal(null);
      setDeclineReason('');
    });
  };

  const handleRequestReupload = async (vendorDocumentId) => {
    if (isDemoMode) { alert('Re-upload request is disabled in demo mode.'); return; }
    guardAction(async () => {
      const result = await requestReupload(vendorDocumentId);
      if (result.success) {
        alert(`Re-upload link generated:\n${result.uploadUrl}\n\nVendor will be notified.`);
      } else {
        alert(`Failed: ${result.error}`);
      }
    });
  };

  return (
    <div className="space-y-6" style={FONT}>
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: BODY_TEXT }}>Document Review</h1>
        <p className="text-sm mt-1" style={{ color: TEXT_TERTIARY }}>
          Review and approve vendor document submissions
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
            style={{
              backgroundColor: filter === tab.key ? NAVY : '#F4F6FA',
              color: filter === tab.key ? '#fff' : TEXT_TERTIARY,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300" style={{ borderTopColor: NAVY }} />
        </div>
      )}

      {/* Empty state */}
      {!loading && submissions.length === 0 && (
        <div
          className="rounded-lg p-8 text-center"
          style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        >
          <FileText className="mx-auto mb-3" size={40} style={{ color: TEXT_TERTIARY }} />
          <p className="text-sm font-medium" style={{ color: BODY_TEXT }}>
            {isDemoMode
              ? 'Document review is available in live mode. Connect your Supabase account to get started.'
              : filter === 'pending'
                ? 'No documents pending review'
                : `No ${filter} submissions found`
            }
          </p>
          {!isDemoMode && filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-3 text-sm font-semibold"
              style={{ color: NAVY }}
            >
              View all submissions
            </button>
          )}
        </div>
      )}

      {/* Submission cards */}
      {!loading && submissions.map((sub) => {
        const status = STATUS_CONFIG[sub.review_status] || STATUS_CONFIG.pending;
        const StatusIcon = status.icon;
        const aiStatus = AI_STATUS_CONFIG[sub.ai_validation_status] || AI_STATUS_CONFIG.pending;
        const AIIcon = aiStatus.icon;
        const isExpanded = expandedId === sub.id;
        const vendorName = sub.vendors?.name || 'Unknown Vendor';
        const docType = sub.vendor_documents?.document_type || 'Document';
        const uploadDate = new Date(sub.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        });

        return (
          <div
            key={sub.id}
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
          >
            {/* Card header — always visible */}
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : sub.id)}
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div
                className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: status.bg }}
              >
                <StatusIcon size={18} style={{ color: status.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate" style={{ color: BODY_TEXT }}>
                    {vendorName}
                  </p>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                    style={{ backgroundColor: status.bg, color: status.color }}
                  >
                    {status.label}
                  </span>
                </div>
                <p className="text-[12px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
                  {docType} &middot; {uploadDate}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1"
                  style={{ color: aiStatus.color, backgroundColor: `${aiStatus.color}10` }}
                >
                  <AIIcon size={10} />
                  {aiStatus.label}
                </span>
                {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t" style={{ borderColor: CARD_BORDER }}>
                {/* Document preview */}
                {sub.vendor_documents?.file_url && (
                  <div className="mt-3 rounded-lg overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
                    {sub.vendor_documents.file_type?.startsWith('image/') ? (
                      <img
                        src={sub.vendor_documents.file_url}
                        alt={docType}
                        className="w-full max-h-[300px] object-contain bg-gray-50"
                      />
                    ) : sub.vendor_documents.file_type === 'application/pdf' ? (
                      <div className="bg-gray-50 p-4 text-center">
                        <FileText className="mx-auto mb-2" size={32} style={{ color: TEXT_TERTIARY }} />
                        <a
                          href={sub.vendor_documents.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium flex items-center justify-center gap-1"
                          style={{ color: NAVY }}
                        >
                          <Eye size={14} /> View PDF Document
                        </a>
                        <p className="text-[11px] mt-1" style={{ color: TEXT_TERTIARY }}>
                          {sub.vendor_documents.file_size
                            ? `${(sub.vendor_documents.file_size / 1024).toFixed(0)} KB`
                            : ''
                          }
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 text-center">
                        <FileText className="mx-auto mb-2" size={32} style={{ color: TEXT_TERTIARY }} />
                        <a
                          href={sub.vendor_documents.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium"
                          style={{ color: NAVY }}
                        >
                          Download Document
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Vendor notes */}
                {sub.vendor_documents?.vendor_notes && (
                  <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: '#F4F6FA' }}>
                    <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: TEXT_TERTIARY }}>
                      Vendor Notes
                    </p>
                    <p className="text-sm" style={{ color: BODY_TEXT }}>
                      {sub.vendor_documents.vendor_notes}
                    </p>
                  </div>
                )}

                {/* AI Analysis */}
                {sub.ai_validated && sub.ai_validation_result && (
                  <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: '#F4F6FA' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Brain size={14} style={{ color: NAVY }} />
                      <p className="text-[11px] font-semibold uppercase" style={{ color: TEXT_TERTIARY }}>
                        AI Analysis
                      </p>
                      {sub.ai_validation_result.confidence != null && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded ml-auto"
                          style={{
                            backgroundColor: sub.ai_validation_result.confidence >= 0.9 ? '#dcfce7' : sub.ai_validation_result.confidence >= 0.7 ? '#fef3c7' : '#fee2e2',
                            color: sub.ai_validation_result.confidence >= 0.9 ? '#166534' : sub.ai_validation_result.confidence >= 0.7 ? '#92400e' : '#991b1b',
                          }}
                        >
                          {Math.round(sub.ai_validation_result.confidence * 100)}% Confidence
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {sub.ai_validation_result.summary && (
                        <p className="text-[13px]" style={{ color: BODY_TEXT }}>
                          {sub.ai_validation_result.summary}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="flex items-center gap-1.5">
                          {sub.ai_validation_result.document_type_match
                            ? <CheckCircle2 size={12} className="text-green-600" />
                            : <XCircle size={12} className="text-red-600" />
                          }
                          <span className="text-[11px]" style={{ color: BODY_TEXT }}>
                            Type Match: {sub.ai_validation_result.detected_type || 'Unknown'}
                          </span>
                        </div>

                        {sub.ai_validation_result.expiry_detected && (
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} style={{ color: TEXT_TERTIARY }} />
                            <span className="text-[11px]" style={{ color: BODY_TEXT }}>
                              Expires: {sub.ai_validation_result.expiry_date || 'Unknown'}
                            </span>
                          </div>
                        )}
                      </div>

                      {sub.ai_validation_result.issues?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[11px] font-semibold mb-1" style={{ color: '#991b1b' }}>
                            Issues Found:
                          </p>
                          <ul className="space-y-0.5">
                            {sub.ai_validation_result.issues.map((issue, i) => (
                              <li key={i} className="text-[11px] flex items-start gap-1" style={{ color: '#991b1b' }}>
                                <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {sub.auto_approved && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium" style={{ color: '#166534' }}>
                        <Shield size={12} />
                        Auto-approved by AI (high confidence, no issues)
                      </div>
                    )}
                  </div>
                )}

                {/* Decline reason (if declined) */}
                {sub.review_status === 'declined' && sub.decline_reason && (
                  <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: '#FEF2F2' }}>
                    <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: '#991b1b' }}>
                      Decline Reason
                    </p>
                    <p className="text-sm" style={{ color: '#991b1b' }}>
                      {sub.decline_reason}
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                {sub.review_status === 'pending' && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleApprove(sub.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
                      style={{ backgroundColor: '#166534' }}
                    >
                      <ThumbsUp size={14} /> Approve
                    </button>
                    <button
                      onClick={() => setDeclineModal(sub.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
                      style={{ backgroundColor: '#991B1B' }}
                    >
                      <ThumbsDown size={14} /> Decline
                    </button>
                  </div>
                )}

                {sub.review_status === 'declined' && (
                  <div className="mt-4">
                    <button
                      onClick={() => handleRequestReupload(sub.vendor_document_id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                      style={{ backgroundColor: '#F4F6FA', color: NAVY, border: `1px solid ${CARD_BORDER}` }}
                    >
                      <RefreshCw size={14} /> Request Re-upload
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Decline modal */}
      {declineModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            className="rounded-xl p-6 w-full max-w-md"
            style={{ backgroundColor: CARD_BG }}
          >
            <h3 className="text-lg font-semibold mb-3" style={{ color: BODY_TEXT }}>
              Decline Document
            </h3>
            <p className="text-sm mb-3" style={{ color: TEXT_TERTIARY }}>
              Please provide a reason for declining this document. The vendor will be notified.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g., Document is expired, wrong document type, missing information..."
              className="w-full p-3 rounded-lg text-sm resize-none"
              style={{ border: `1px solid ${CARD_BORDER}`, minHeight: 100, color: BODY_TEXT }}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setDeclineModal(null); setDeclineReason(''); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                style={{ backgroundColor: '#F4F6FA', color: TEXT_TERTIARY }}
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={!declineReason.trim()}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: '#991B1B' }}
              >
                Decline & Notify Vendor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo upgrade modal */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center">
            <h3 className="text-lg font-semibold mb-2">{upgradeFeature || 'Feature'}</h3>
            <p className="text-sm text-gray-500 mb-4">This feature requires a live account.</p>
            <button
              onClick={() => setShowUpgrade(false)}
              className="px-6 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: NAVY }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
