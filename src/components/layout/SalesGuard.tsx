/**
 * SalesGuard — Route guard for sales/marketing pages
 *
 * Only super_admin and sales staff roles can access these routes.
 * Redirects all other admin users to /admin.
 * Uses useEffect for navigation to avoid React Error #310.
 */
import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvidlyPermissions } from '../../hooks/useEvidlyPermissions';

export function SalesGuard({ children }: { children: ReactNode }) {
  const { canSeeSalesMarketing, loading } = useEvidlyPermissions();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !canSeeSalesMarketing) {
      navigate('/admin', { replace: true });
    }
  }, [loading, canSeeSalesMarketing, navigate]);

  if (loading) return null;
  if (!canSeeSalesMarketing) return null;

  return <>{children}</>;
}
