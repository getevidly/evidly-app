/**
 * RequestDetail — placeholder shell for Commit 4.
 * Surface 8: /vendors/requests/:requestId
 */
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function RequestDetail() {
  const { requestId } = useParams();

  return (
    <div className="min-h-screen px-4 pt-5" style={{ backgroundColor: '#F4F1EA' }}>
      <Link
        to="/vendors?tab=requests"
        className="inline-flex items-center gap-1 mb-4"
        style={{ fontSize: '12px', fontWeight: 500, color: '#5A6478' }}
      >
        <ArrowLeft size={14} />
        Back to requests
      </Link>
      <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#1E2D4D' }}>
        Request detail
      </h1>
      <p className="mt-2" style={{ fontSize: '13px', color: '#5A6478' }}>
        Request ID: {requestId}
      </p>
    </div>
  );
}
