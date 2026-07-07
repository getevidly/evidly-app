import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Download, X, Clock, Send, RefreshCw, FileText, Archive, ShieldAlert, ShieldCheck, Lock, Loader2 } from 'lucide-react';
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
  resent: 'Request re-sent',
  request_resent: 'Request re-sent',
  request_cancelled: 'Request cancelled',
  submitted: 'Document submitted',
  uploaded: 'Document uploaded',
  viewed: 'Viewed by vendor',
  accepted: 'Document accepted',
  rejected: 'Document rejected',
  archived: 'Document archived',
  expired: 'Document expired',
  expiring_warning: 'Expiry warning sent',
  overdue: 'Document overdue',
  renewed: 'Document renewed',
  sent_to_third_party: 'Sent to third party',
  shared: 'Shared with third party',
  viewed_share: 'Third party viewed',
  downloaded_share: 'Third party downloaded',
  send_revoked: 'Send revoked',
  noted: 'Note added',
};

export function DocumentDetailModal({ doc, onClose, onRefresh }: DocumentDetailModalProps) {
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [resending, setResending] = useState(false);
  const [issuingFresh, setIssuingFresh] = useState(false);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const sealPending = (doc.metadata as Record<string, unknown> | null)?.seal_pending as { reason?: string } | undefined;
  const sealDone = !!(doc.metadata as Record<string, unknown> | null)?.seal_record_id;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const extract = (doc.metadata as Record<string, unknown> | null)?.service_extraction as Record<string, any> | undefined;
  const [confDate, setConfDate] = useState<string>(extract?.service_date || '');
  const [confCert, setConfCert] = useState<string>(extract?.cert_number || '');
  const [confNoCert, setConfNoCert] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  // Fetch signed URL for inline preview
  useEffect(() => {
    if (!doc.storage_path) return;
    setPreviewLoading(true);
    setPreviewError(false);
    setPreviewUrl(null);
    getSignedUrl(BUCKETS.DOCUMENTS, doc.storage_path)
      .then((url) => setPreviewUrl(url))
      .catch(() => setPreviewError(true))
      .finally(() => setPreviewLoading(false));
  }, [doc.id, doc.storage_path]);

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

  // Stale-request computation
  const daysSinceRequest = doc.requested_at
    ? Math.floor((Date.now() - new Date(doc.requested_at).getTime()) / 86400000)
    : null;
  const isStale = daysSinceRequest !== null && daysSinceRequest >= 30;

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const { data, error } = await supabase.functions.invoke('document-review-action', {
        body: { documentId: doc.id, action: 'accept' },
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.bridge === 'seal_deferred') {
        toast.success('Accepted — confirm details to seal');
        onRefresh();
        setConfirmOpen(true);
      } else {
        toast.success('Document accepted');
        onRefresh();
        onClose();
      }
    } catch {
      toast.error('Failed to accept document');
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('document-review-action', {
        body: {
          documentId: doc.id,
          action: 'reject',
          rejectionReason: rejectReason.trim() || undefined,
        },
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (result?.error) {
        toast.error(result.error);
      } else {
        const msg = result.emailed
          ? 'Document rejected \u2014 vendor notified to re-upload'
          : 'Document rejected \u2014 use Send Request to issue a new link';
        toast.success(msg);
        onRefresh();
        onClose();
      }
    } catch {
      toast.error('Failed to reject document');
    } finally {
      setRejecting(false);
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

  const handleResend = async () => {
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('resend-document-request', {
        body: { documentId: doc.id },
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (result?.error) {
        toast.error(result.error);
      } else {
        const msg = result.emailed
          ? `Re-sent to ${doc.request_recipient_email}${result.token_regenerated ? ' (new link generated)' : ''}`
          : 'Request re-sent (email service unavailable)';
        toast.success(msg);
        onRefresh();
      }
    } catch {
      toast.error('Failed to re-send request');
    } finally {
      setResending(false);
    }
  };

  const handleIssueFresh = async () => {
    setIssuingFresh(true);
    try {
      const { data, error } = await supabase.functions.invoke('issue-fresh-request', {
        body: { documentId: doc.id },
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(result.emailed
          ? 'Fresh request sent \u2014 vendor has 14 days to upload'
          : 'Fresh request created (email service unavailable)');
        onRefresh();
      }
    } catch {
      toast.error('Failed to issue fresh request');
    } finally {
      setIssuingFresh(false);
    }
  };

  const handleConfirmSeal = async () => {
    if (!confNoCert && !confCert.trim()) {
      toast.error('Enter the certificate number, or mark that the document has none.');
      return;
    }
    if (!confDate) { toast.error('Confirm the service date.'); return; }
    setSealing(true);
    try {
      const { data, error } = await supabase.functions.invoke('confirm-seal-service', {
        body: { documentId: doc.id, serviceDate: confDate, certNumber: confNoCert ? undefined : confCert.trim(), certAbsent: confNoCert },
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (result?.error) { toast.error(result.error); }
      else { toast.success('Record sealed'); onRefresh(); onClose(); }
    } catch {
      toast.error('Failed to seal record');
    } finally {
      setSealing(false);
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
          {sealPending && !sealDone && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-0.5" style={{ color: '#8A5A0B', backgroundColor: '#FAEEDA' }}>
              <ShieldAlert size={12} /> Needs confirmation
            </span>
          )}
          {sealDone && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-0.5" style={{ color: '#0F6E56', backgroundColor: '#E1F5EE' }}>
              <ShieldCheck size={12} /> Sealed
            </span>
          )}
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

        {/* Seal confirmation panel */}
        {sealPending && !sealDone && (
          <div className="rounded-lg border p-4" style={{ borderColor: '#E8D5A8', backgroundColor: '#FFFDF8' }}>
            <div className="flex items-start gap-2 mb-3">
              <ShieldAlert size={15} className="mt-0.5" style={{ color: '#8A5A0B' }} />
              <p className="text-[12px] font-medium" style={{ color: '#8A5A0B' }}>
                {sealPending.reason === 'cert_number_unconfirmed'
                  ? "The certificate number couldn't be read clearly. Confirm the details below to seal this record."
                  : sealPending.reason === 'service_date_unconfirmed'
                    ? "The service date couldn't be read clearly. Confirm the details below to seal this record."
                    : sealPending.reason === 'no_extraction'
                      ? "The document couldn't be read automatically. Confirm the details below to seal this record."
                      : "Confirm the details below to seal this record."}
              </p>
            </div>
            <div className="mb-3">
              <label className="block text-[11px] font-bold text-[#8A93A6] uppercase tracking-wider mb-1">Service date</label>
              <input type="date" value={confDate} onChange={(e) => setConfDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#E2DDD4] rounded-md text-[13px] text-[#1E2D4D] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/30" />
            </div>
            <div className="mb-2">
              <label className="block text-[11px] font-bold text-[#8A93A6] uppercase tracking-wider mb-1">Certificate number</label>
              <input value={confNoCert ? '' : confCert} disabled={confNoCert} onChange={(e) => setConfCert(e.target.value)}
                placeholder="Enter the number shown on the document"
                className="w-full px-3 py-2 border border-[#E2DDD4] rounded-md text-[13px] text-[#1E2D4D] disabled:bg-[#F4F2EC] disabled:text-[#8A93A6] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/30" />
            </div>
            <label className="flex items-center gap-2 text-[12px] text-[#1E2D4D] cursor-pointer mb-4">
              <input type="checkbox" checked={confNoCert} onChange={(e) => setConfNoCert(e.target.checked)} />
              This document has no certificate number
            </label>
            <div className="flex justify-end">
              <button type="button" onClick={handleConfirmSeal} disabled={sealing}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-md hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}>
                <Lock size={13} /> {sealing ? 'Sealing\u2026' : 'Confirm & seal'}
              </button>
            </div>
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

        {/* Requested status info / stale banner */}
        {doc.status === 'requested' && !isStale && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#FEF3C7] border border-[#FDE68A]">
            <Send size={13} className="text-[#B45309] mt-0.5" />
            <p className="text-[12px] text-[#92400E] font-medium">
              A secure upload link was sent to the vendor. They have 14 calendar days to upload.
            </p>
          </div>
        )}
        {doc.status === 'requested' && isStale && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border" style={{ backgroundColor: '#FAEEDA', borderColor: '#E8D5A8' }}>
            <Clock size={13} className="mt-0.5" style={{ color: '#BA7517' }} />
            <div>
              <p className="text-[12px] font-semibold" style={{ color: '#7A4D0B' }}>
                This request is {daysSinceRequest} days old
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: '#96630F' }}>
                The original link has expired. Issue a fresh request to send a new 14-day upload link.
              </p>
              <button
                type="button"
                onClick={handleIssueFresh}
                disabled={issuingFresh}
                className="mt-2 px-3 py-1.5 text-[11px] font-bold rounded-md hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
              >
                {issuingFresh ? 'Issuing\u2026' : 'Issue Fresh Request'}
              </button>
            </div>
          </div>
        )}

        {/* Inline document preview */}
        {doc.storage_path && (
          previewLoading ? (
            <div className="h-[180px] bg-[#F7F8FA] border border-dashed border-[#E2DDD4] rounded-lg flex items-center justify-center text-[#8A93A6] text-[13px]">
              <Loader2 size={20} className="mr-2 text-[#B0B8C8] animate-spin" />
              Loading preview…
            </div>
          ) : previewError || !previewUrl ? (
            <div className="h-[180px] bg-[#F7F8FA] border border-dashed border-[#E2DDD4] rounded-lg flex flex-col items-center justify-center text-[#8A93A6] text-[13px] gap-2">
              <FileText size={20} className="text-[#B0B8C8]" />
              <span>Preview unavailable</span>
              <button
                type="button"
                onClick={handleDownload}
                className="text-[12px] font-semibold underline"
                style={{ color: '#1E2D4D' }}
              >
                Download to view
              </button>
            </div>
          ) : doc.mime_type === 'application/pdf' ? (
            <iframe
              src={previewUrl}
              title="Document preview"
              className="w-full h-[420px] rounded-lg border border-[#E2DDD4]"
            />
          ) : doc.mime_type?.startsWith('image/') ? (
            <div className="rounded-lg border border-[#E2DDD4] overflow-hidden bg-[#F7F8FA] flex items-center justify-center" style={{ maxHeight: 420 }}>
              <img
                src={previewUrl}
                alt={doc.title || 'Document'}
                className="max-w-full max-h-[420px] object-contain"
              />
            </div>
          ) : (
            <div className="h-[180px] bg-[#F7F8FA] border border-dashed border-[#E2DDD4] rounded-lg flex flex-col items-center justify-center text-[#8A93A6] text-[13px] gap-2">
              <FileText size={20} className="text-[#B0B8C8]" />
              <span>Download to view this file type</span>
              <button
                type="button"
                onClick={handleDownload}
                className="text-[12px] font-semibold underline"
                style={{ color: '#1E2D4D' }}
              >
                Download
              </button>
            </div>
          )
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
              {!rejectMode && (
                <>
                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={accepting || rejecting}
                    className="px-4 py-2 text-[12px] font-bold rounded-md hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
                  >
                    {accepting ? 'Accepting\u2026' : 'Accept \u2713'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectMode(true)}
                    disabled={accepting || rejecting}
                    className="px-4 py-2 bg-transparent text-[#1E2D4D] text-[12px] font-semibold rounded-md border border-[#E2DDD4] hover:bg-gray-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </>
              )}
              {rejectMode && (
                <div className="w-full space-y-2">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Why are you rejecting this? (Optional — sent to vendor)"
                    rows={3}
                    className="w-full px-3 py-2 border border-[#E2DDD4] rounded-md text-[12px] text-[#1E2D4D] resize-y focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/30"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setRejectMode(false); setRejectReason(''); }}
                      disabled={rejecting}
                      className="px-4 py-2 bg-transparent text-[#1E2D4D] text-[12px] font-semibold rounded-md border border-[#E2DDD4] hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={rejecting}
                      className="px-4 py-2 text-[12px] font-bold rounded-md hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: '#B91C1C', color: '#FFF' }}
                    >
                      {rejecting ? 'Rejecting\u2026' : 'Confirm Rejection'}
                    </button>
                  </div>
                </div>
              )}
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
          {doc.status === 'requested' && !isStale && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="flex items-center gap-1.5 px-4 py-2 bg-transparent text-[#1E2D4D] text-[12px] font-semibold rounded-md border border-[#E2DDD4] hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={13} />
              {resending ? 'Sending\u2026' : 'Re-send'}
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
