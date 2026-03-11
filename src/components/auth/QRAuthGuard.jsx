import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function QRAuthGuard({ children }) {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const isQREntry = searchParams.get('method') === 'qr_scan' || searchParams.get('equipment');

  if (!session && !isQREntry) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {!session && isQREntry && (
        <div style={{
          backgroundColor: '#FFFBEB',
          borderBottom: '1px solid #FDE68A',
          padding: '8px 16px',
          fontSize: 13,
          color: '#92400E',
          textAlign: 'center',
        }}>
          Scanning as guest — sign in to track your activity history
        </div>
      )}
      {children}
    </>
  );
}
