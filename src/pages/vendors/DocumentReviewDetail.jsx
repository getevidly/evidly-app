import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { AISynthesisStrip } from '../../components/vendors/AISynthesisStrip';
import { StatePill } from '../../components/vendors/StatePill';
import { DeclineDocumentModal } from '../../components/vendors/modals/DeclineDocumentModal';
import { useDocumentReviewDetail } from '../../hooks/useDocumentReviewDetail';
/**
 * DocumentReviewDetail — Surface 9.
 * Drill-down for a single document: preview placeholder, AI flags,
 * metadata, approve/reject actions.
 */
export default function DocumentReviewDetail() {
  const { docId } = useParams();
  const { doc, loading, error, approve, decline } = useDocumentReviewDetail(docId);
  const [actionPending, setActionPending] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen px-4 pt-5" style={{ backgroundColor: '#F4F1EA' }}>
        <Link
          to="/vendors?tab=documents"
          className="inline-flex items-center gap-1 mb-4"
          style={{ fontSize: '12px', fontWeight: 500, color: '#5A6478' }}
        >
          <ArrowLeft size={14} />
          Back to document review
        </Link>
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#1E2D4D] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen px-4 pt-5" style={{ backgroundColor: '#F4F1EA' }}>
        <Link
          to="/vendors?tab=documents"
          className="inline-flex items-center gap-1 mb-4"
          style={{ fontSize: '12px', fontWeight: 500, color: '#5A6478' }}
        >
          <ArrowLeft size={14} />
          Back to document review
        </Link>
        <div
          className="bg-white rounded-lg px-4 py-4"
          style={{ border: '1px solid #E2DDD4' }}
        >
          <p style={{ fontSize: '14px', color: '#B91C1C' }}>
            Unable to load document details. Please try again.
          </p>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen px-4 pt-5" style={{ backgroundColor: '#F4F1EA' }}>
        <Link
          to="/vendors?tab=documents"
          className="inline-flex items-center gap-1 mb-4"
          style={{ fontSize: '12px', fontWeight: 500, color: '#5A6478' }}
        >
          <ArrowLeft size={14} />
          Back to document review
        </Link>
        <p style={{ fontSize: '14px', color: '#5A6478' }}>Document not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F1EA' }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <Link
          to="/vendors?tab=documents"
          className="inline-flex items-center gap-1 mb-3"
          style={{ fontSize: '12px', fontWeight: 500, color: '#5A6478' }}
        >
          <ArrowLeft size={14} />
          Back to document review
        </Link>
        <p
          className="uppercase tracking-wider mb-1"
          style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#A08C5A' }}
        >
          Document review
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#1E2D4D' }}>
            {doc.title}
          </h1>
          <StatePill state={doc.state} />
          {doc.aiFlagged && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded"
              style={{ fontSize: '9px', fontWeight: 500, backgroundColor: '#FCE8E4', color: '#B91C1C' }}
            >
              <AlertTriangle size={9} />
              AI flagged
            </span>
          )}
        </div>
        <p className="mt-1" style={{ fontSize: '12px', color: '#5A6478' }}>
          {doc.vendorName} · Uploaded {doc.uploadedDate}
        </p>
      </div>

      <div className="px-4 pb-24">
        {/* AI synthesis */}
        <AISynthesisStrip message={doc.answerLine} />

        {/* AI flagged detail */}
        {doc.aiFlagged && doc.aiCaughtText && (
          <div
            className="mb-4 px-4 py-3 rounded-lg"
            style={{ backgroundColor: '#FFF8E1', border: '1px solid #E2DDD4' }}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#B91C1C' }} />
              <div>
                <p
                  className="uppercase tracking-wider mb-1"
                  style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#B91C1C' }}
                >
                  AI found an issue
                </p>
                <p style={{ fontSize: '12px', color: '#1E2D4D', lineHeight: '1.5' }}>
                  {doc.aiCaughtText}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Document preview placeholder */}
        <p
          className="uppercase tracking-wider mb-2"
          style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#5A6478' }}
        >
          Document preview
        </p>
        <div
          className="bg-white rounded-lg mb-4 flex items-center justify-center"
          style={{ border: '1px solid #E2DDD4', height: '280px' }}
        >
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
              style={{ backgroundColor: '#F4EFE0' }}
            >
              <Download size={20} style={{ color: '#5A6478' }} />
            </div>
            <p style={{ fontSize: '13px', fontWeight: 500, color: '#1E2D4D' }}>
              {doc.title}
            </p>
            <p className="mt-0.5" style={{ fontSize: '11px', color: '#5A6478' }}>
              Preview available after file upload
            </p>
          </div>
        </div>

        {/* Metadata */}
        <p
          className="uppercase tracking-wider mb-2"
          style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#5A6478' }}
        >
          Details
        </p>
        <div
          className="bg-white rounded-lg px-4 py-3 mb-4"
          style={{ border: '1px solid #E2DDD4' }}
        >
          <div className="grid grid-cols-2 gap-y-2.5">
            <div>
              <p style={{ fontSize: '10px', color: '#5A6478', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vendor</p>
              <p style={{ fontSize: '12px', color: '#1E2D4D', fontWeight: 500 }}>{doc.vendorName}</p>
            </div>
            <div>
              <p style={{ fontSize: '10px', color: '#5A6478', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Uploaded</p>
              <p style={{ fontSize: '12px', color: '#1E2D4D', fontWeight: 500 }}>{doc.uploadedDate}</p>
            </div>
            <div>
              <p style={{ fontSize: '10px', color: '#5A6478', textTransform: 'uppercase', letterSpacing: '0.08em' }}>State</p>
              <p style={{ fontSize: '12px', color: '#1E2D4D', fontWeight: 500 }}>
                {doc.state === 'current' ? 'Approved' : doc.state === 'attention' ? 'Pending review' : 'Action required'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '10px', color: '#5A6478', textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI review</p>
              <p style={{ fontSize: '12px', color: doc.aiFlagged ? '#B91C1C' : '#2E7D32', fontWeight: 500 }}>
                {doc.aiFlagged ? 'Issue found' : 'No issues'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        {doc.state !== 'current' && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={actionPending}
              onClick={async () => {
                setActionPending(true);
                try {
                  await approve();
                  toast.success('Document approved');
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to approve document');
                } finally {
                  setActionPending(false);
                }
              }}
              className="w-full py-2.5 rounded-md flex items-center justify-center gap-2"
              style={{ fontSize: '13px', fontWeight: 500, backgroundColor: '#1E2D4D', color: '#FAF7F0', opacity: actionPending ? 0.5 : 1 }}
            >
              <CheckCircle size={16} />
              Approve document
            </button>
            <button
              type="button"
              disabled={actionPending}
              onClick={() => setDeclineOpen(true)}
              className="w-full py-2.5 rounded-md flex items-center justify-center gap-2"
              style={{ fontSize: '13px', fontWeight: 500, color: '#B91C1C', border: '1px solid #B91C1C', opacity: actionPending ? 0.5 : 1 }}
            >
              <XCircle size={16} />
              Reject document
            </button>
          </div>
        )}

        {doc.state === 'current' && (
          <button
            type="button"
            onClick={() => {
              if (doc.fileUrl) window.open(doc.fileUrl, '_blank');
              else toast.error('No file available for download');
            }}
            className="w-full py-2.5 rounded-md flex items-center justify-center gap-2"
            style={{ fontSize: '13px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #1E2D4D' }}
          >
            <Download size={16} />
            Download document
          </button>
        )}
      </div>

      <DeclineDocumentModal
        isOpen={declineOpen}
        onClose={() => setDeclineOpen(false)}
        onDecline={async (reason) => {
          setActionPending(true);
          try {
            await decline(reason);
            toast.success('Document rejected');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to reject document');
          } finally {
            setActionPending(false);
          }
        }}
      />
    </div>
  );
}
