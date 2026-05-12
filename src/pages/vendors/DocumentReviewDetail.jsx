/**
 * DocumentReviewDetail — placeholder shell for Commit 4.
 * Surface 9: /vendors/documents/:docId
 */
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function DocumentReviewDetail() {
  const { docId } = useParams();

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
      <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#1E2D4D' }}>
        Document review
      </h1>
      <p className="mt-2" style={{ fontSize: '13px', color: '#5A6478' }}>
        Document ID: {docId}
      </p>
    </div>
  );
}
