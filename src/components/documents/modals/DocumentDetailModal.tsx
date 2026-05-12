import { useState } from 'react';
import { toast } from 'sonner';
import { Download, X } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { StatusPill } from '../StatusPill';
import { RequestStateBadge } from '../RequestStateBadge';
import { supabase } from '../../../lib/supabase';
import { getSignedUrl, BUCKETS } from '../../../lib/storage';
import type { EnrichedDocument } from '../../../hooks/documents/useDocumentsByTab';

interface DocumentDetailModalProps {
  doc: EnrichedDocument;
  onClose: () => void;
  onRefresh: () => void;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex py-2 border-b border-[#E2DDD4]">
      <div className="w-[130px] text-[12px] text-[#8A93A6] font-semibold">{label}</div>
      <div className="flex-1 text-[13px] text-[#1E2D4D] font-medium">{value}</div>
    </div>
  );
}

export function DocumentDetailModal({ doc, onClose, onRefresh }: DocumentDetailModalProps) {
  const [accepting, setAccepting] = useState(false);

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

  const requestStageLabel = doc.request_stage
    ? { sent: 'Link sent', viewed: 'Viewed by vendor', fulfilled: 'Uploaded', overdue: 'Overdue' }[doc.request_stage] || doc.request_stage
    : null;

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

      {/* Body */}
      <div className="px-5 py-4">
        <Row label="Vendor" value={doc.vendor_name || '\u2014'} />
        <Row label="Location" value={doc.location_name || 'All'} />
        <Row label="Expires" value={fmtDate(doc.expiry_date)} />
        <Row label="Uploaded by" value={doc.request_stage === 'fulfilled' ? 'Vendor' : '\u2014'} />
        {requestStageLabel && <Row label="Request stage" value={requestStageLabel} />}
        {doc.requested_at && <Row label="Last update" value={fmtDate(doc.requested_at)} />}

        {/* PDF preview placeholder */}
        <div className="mt-5 h-[220px] bg-[#F7F8FA] border border-dashed border-[#E2DDD4] rounded-lg flex items-center justify-center text-[#8A93A6] text-[13px]">
          [ PDF preview ]
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {doc.status === 'pending_review' && (
            <>
              <button
                type="button"
                onClick={handleAccept}
                disabled={accepting}
                className="px-4 py-2 bg-[#1E2D4D] text-white text-[12px] font-bold rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {accepting ? 'Accepting\u2026' : 'Accept \u2713'}
              </button>
              <button
                type="button"
                onClick={() => toast.info('Reason required \u2014 coming soon')}
                className="px-4 py-2 bg-transparent text-[#1E2D4D] text-[12px] font-semibold rounded-md border border-[#E2DDD4] hover:bg-gray-50"
              >
                Reject (reason required)
              </button>
            </>
          )}
          {doc.status === 'requested' && (
            <div className="w-full mb-2 text-[12px] text-[#B45309] font-semibold">
              A secure upload link was sent to the vendor. They have 14 calendar days to upload.
            </div>
          )}
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 bg-transparent text-[#1E2D4D] text-[12px] font-semibold rounded-md border border-[#E2DDD4] hover:bg-gray-50"
          >
            <Download size={13} />
            Download
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 bg-transparent text-[#1E2D4D] text-[12px] font-semibold rounded-md border border-[#E2DDD4] hover:bg-gray-50"
          >
            <X size={13} />
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
