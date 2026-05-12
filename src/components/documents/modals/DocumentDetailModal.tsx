import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Download, X, Clock, Send, RefreshCw, FileText, Archive } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { StatusPill } from '../StatusPill';
import { RequestStateBadge } from '../RequestStateBadge';
import { relativeTime, expiryLabel } from '../../../lib/relativeTime';
import { supabase } from '../../../lib/supabase';
import { getSignedUrl, BUCKETS } from '../../../lib/storage';
import type { EnrichedDocument } from '../../../hooks/documents/useDocumentsByTab';

interface DocumentDetailModalProps {
  doc: EnrichedDocument;
  onClose: () => void;
  onRefresh: () => void;
}

interface ActivityEntry {
  id: string;
  event_type: string;
  actor_label: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
}

const EVENT_LABELS: Record<string, string> = {
  requested: 'Request sent',
  request_resent: 'Request re-sent',
  request_cancelled: 'Request cancelled',
  submitted: 'Document submitted',
  viewed: 'Viewed by vendor',
  accepted: 'Document accepted',
  rejected: 'Document rejected',
  archived: 'Document archived',
  expired: 'Document expired',
  expiring_warning: 'Expiry warning sent',
  renewed: 'Document renewed',
  sent_to_third_party: 'Sent to third party',
  send_revoked: 'Send revoked',
  noted: 'Note added',
};

export function DocumentDetailModal({ doc, onClose, onRefresh }: DocumentDetailModalProps) {
  const [accepting, setAccepting] = useState(false);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // Fetch activity timeline
  useEffect(() => {
    setActivityLoading(true);
    supabase
      .from('compliance_document_activity_log')
      .select('id, event_type, actor_label, metadata, occurred_at')
      .eq('document_id', doc.id)
      .order('occurred_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setActivity((data as ActivityEntry[]) || []);
        setActivityLoading(false);
      });
  }, [doc.id]);

  const handleAccept = async () => {
    setAccepting(true);
    const { error } = await supabase
      .from('compliance_documents')
      .update({ status: 'current' })
      .eq('id', doc.id);
    setAccepting(false);
    if (error) {
      toast.error('Failed to accept document');
    } else {
      toast.success('Document accepted');
      onRefresh();
      onClose();
    }
  };

  const handleDownload = async () => {
    if (!doc.storage_path) {
      toast.error('No file attached');
      return;
    }
    try {
      const url = await getSignedUrl(BUCKETS.DOCUMENTS, doc.storage_path);
      window.open(url, '_blank');
    } catch {
      toast.error('Failed to generate download link');
    }
  };

  const handleArchive = async () => {
    const { error } = await supabase
      .from('compliance_documents')
      .update({ status: 'archived' })
      .eq('id', doc.id);
    if (error) {
      toast.error('Failed to archive');
    } else {
      toast.success('Document archived');
      onRefresh();
      onClose();
    }
  };

  // AI insight line — contextual one-liner
  const aiInsight = getInsight(doc);

  return (
    <Modal isOpen onClose={onClose} size="lg">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E2DDD4]" style={{ backgroundColor: '#FAF7F0' }}>
        <div className="text-[11px] text-[#8A93A6] font-semibold uppercase tracking-wider">
          {doc.type || 'Document'}
        </div>
        <div className="text-[18px] font-bold text-[#1E2D4D] mt-1">{doc.name}</div>
        <div className="mt-2 flex items-center gap-2">
          <StatusPill status={doc.status} />
          <RequestStateBadge stage={doc.request_stage} />
        </div>
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* AI Insight banner */}
        {aiInsight && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[#EEF2FF] border border-[#C7D2FE]">
            <span className="text-[14px] mt-0.5">&#x2728;</span>
            <p className="text-[12px] text-[#4338CA] font-medium">{aiInsight}</p>
          </div>
        )}

        {/* Two-column metadata grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <MetaCell label="Vendor" value={doc.vendor_name || '\u2014'} />
          <MetaCell label="Location" value={doc.location_name || 'All locations'} />
          <MetaCell label="Expires" value={doc.expiry_date ? expiryLabel(doc.expiry_date) : '\u2014'} />
          <MetaCell label="Created" value={relativeTime(doc.created_at)} />
          <MetaCell label="Category" value={doc.category} />
          <MetaCell label="Status" value={doc.status} />
          {doc.request_recipient_email && (
            <MetaCell label="Sent to" value={`${doc.request_recipient_name || ''} <${doc.request_recipient_email}>`} />
          )}
          {doc.request_token_days_remaining !== null && doc.request_token_days_remaining !== undefined && (
            <MetaCell
              label="Token expires"
              value={doc.request_token_days_remaining > 0 ? `${doc.request_token_days_remaining} days left` : 'Expired'}
            />
          )}
          {doc.request_viewed_at && (
            <MetaCell label="Vendor viewed" value={relativeTime(doc.request_viewed_at)} />
          )}
        </div>

        {/* Requested status info */}
        {doc.status === 'requested' && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#FEF3C7] border border-[#FDE68A]">
            <Send size={13} className="text-[#B45309] mt-0.5" />
            <p className="text-[12px] text-[#92400E] font-medium">
              A secure upload link was sent to the vendor. They have 14 calendar days to upload.
            </p>
          </div>
        )}

        {/* PDF preview placeholder */}
        {doc.storage_path && (
          <div className="h-[180px] bg-[#F7F8FA] border border-dashed border-[#E2DDD4] rounded-lg flex items-center justify-center text-[#8A93A6] text-[13px]">
            <FileText size={20} className="mr-2 text-[#B0B8C8]" />
            Document preview
          </div>
        )}

        {/* Activity timeline */}
        <div>
          <h3 className="text-[12px] font-bold text-[#8A93A6] uppercase tracking-wider mb-2">Activity</h3>
          {activityLoading ? (
            <p className="text-[12px] text-[#8A93A6]">Loading activity\u2026</p>
          ) : activity.length === 0 ? (
            <p className="text-[12px] text-[#8A93A6]">No activity recorded yet.</p>
          ) : (
            <div className="space-y-0 border-l-2 border-[#E2DDD4] ml-1">
              {activity.map((a) => (
                <div key={a.id} className="pl-4 py-1.5 relative">
                  <div className="absolute left-[-5px] top-[10px] w-[8px] h-[8px] rounded-full bg-[#E2DDD4]" />
                  <p className="text-[12px] text-[#1E2D4D] font-medium">
                    {EVENT_LABELS[a.event_type] || a.event_type}
                  </p>
                  <p className="text-[10px] text-[#8A93A6]">
                    {a.actor_label || 'System'} {'\u00B7'} {relativeTime(a.occurred_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions row */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E2DDD4]">
          {doc.status === 'pending_review' && (
            <>
              <button
                type="button"
                onClick={handleAccept}
                disabled={accepting}
                className="px-4 py-2 text-[12px] font-bold rounded-md hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
              >
                {accepting ? 'Accepting\u2026' : 'Accept \u2713'}
              </button>
              <button
                type="button"
                onClick={() => toast.info('Rejection flow coming soon')}
                className="px-4 py-2 bg-transparent text-[#1E2D4D] text-[12px] font-semibold rounded-md border border-[#E2DDD4] hover:bg-gray-50"
              >
                Reject
              </button>
            </>
          )}
          {doc.storage_path && (
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 bg-transparent text-[#1E2D4D] text-[12px] font-semibold rounded-md border border-[#E2DDD4] hover:bg-gray-50"
            >
              <Download size={13} />
              Download
            </button>
          )}
          {doc.status === 'requested' && (
            <button
              type="button"
              onClick={() => toast.info('Re-send coming soon')}
              className="flex items-center gap-1.5 px-4 py-2 bg-transparent text-[#1E2D4D] text-[12px] font-semibold rounded-md border border-[#E2DDD4] hover:bg-gray-50"
            >
              <RefreshCw size={13} />
              Re-send
            </button>
          )}
          {(doc.status === 'current' || doc.status === 'expired') && (
            <button
              type="button"
              onClick={handleArchive}
              className="flex items-center gap-1.5 px-4 py-2 bg-transparent text-[#1E2D4D] text-[12px] font-semibold rounded-md border border-[#E2DDD4] hover:bg-gray-50"
            >
              <Archive size={13} />
              Archive
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 bg-transparent text-[#1E2D4D] text-[12px] font-semibold rounded-md border border-[#E2DDD4] hover:bg-gray-50 ml-auto"
          >
            <X size={13} />
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-1.5">
      <div className="text-[10px] text-[#8A93A6] font-semibold uppercase tracking-wider">{label}</div>
      <div className="text-[13px] text-[#1E2D4D] font-medium mt-0.5">{value}</div>
    </div>
  );
}

function getInsight(doc: EnrichedDocument): string | null {
  if (doc.status === 'expired') {
    return `This ${doc.type || 'document'} has expired. ${doc.vendor_name ? `Send a request to ${doc.vendor_name} for a replacement.` : 'Upload a replacement or send a request to the responsible vendor.'}`;
  }
  if (doc.status === 'expiring' && doc.days_until_expiry !== null) {
    return `Expires ${doc.days_until_expiry <= 0 ? 'today' : `in ${doc.days_until_expiry} day${doc.days_until_expiry === 1 ? '' : 's'}`}. ${doc.vendor_name ? `Consider sending a renewal request to ${doc.vendor_name}.` : 'Plan for renewal.'}`;
  }
  if (doc.request_stage === 'sent' && doc.request_token_days_remaining !== null && doc.request_token_days_remaining <= 3) {
    return `Upload link expires in ${doc.request_token_days_remaining} day${doc.request_token_days_remaining === 1 ? '' : 's'}. If the vendor hasn't responded, consider re-sending.`;
  }
  if (doc.request_stage === 'viewed' && doc.request_viewed_at) {
    return `The vendor opened the upload link ${relativeTime(doc.request_viewed_at)} but hasn't uploaded yet.`;
  }
  return null;
}
