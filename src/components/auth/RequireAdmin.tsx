/**
 * ADMIN-SECURITY-02 — RequireAdmin route guard
 *
 * Wraps admin routes to enforce platform_admin access.
 * Non-admin authenticated users → redirect to /dashboard with toast.
 * Unauthenticated users → redirect to /login.
 * Logs unauthorized attempts to platform_audit_log.
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { useDemo } from '../../contexts/DemoContext';
import { useAuditLog } from '../../hooks/useAuditLog';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

export function RequireAdmin() {
  const { user, isAdmin, loading } = useAuth();
  const { userRole } = useRole();
  const { isDemoMode } = useDemo();
  const { logEvent } = useAuditLog();
  const loggedRef = useRef(false);

  // Log unauthorized access attempt (once per mount)
  useEffect(() => {
    if (!loading && user && !isAdmin && !isDemoMode && !loggedRef.current) {
      loggedRef.current = true;
      logEvent(
        'security.unauthorized_route_access',
        'admin_route',
        window.location.pathname,
        { attempted_role: userRole },
      );
      toast.error('Admin access required');
    }
  }, [loading, user, isAdmin, isDemoMode, userRole, logEvent]);

  if (loading) return null;

  // Not authenticated → login
  if (!user) return <Navigate to="/login" replace />;

  // Demo mode → allow through (admin pages have useDemoGuard for write protection)
  if (isDemoMode) return <Outlet />;

  // Not admin → dashboard
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
