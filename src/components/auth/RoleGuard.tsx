/**
 * ADMIN-SECURITY-02 — RoleGuard inline component guard
 *
 * Conditionally renders children based on user role.
 * Use for hiding buttons, tabs, actions from lower roles.
 *
 * Usage:
 *   <RoleGuard allowedRoles={['platform_admin', 'owner_operator']}>
 *     <DeleteButton />
 *   </RoleGuard>
 */
import { ReactNode } from 'react';
import { useRole } from '../../contexts/RoleContext';
import { useAuth } from '../../contexts/AuthContext';

interface RoleGuardProps {
  allowedRoles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { userRole } = useRole();
  const { isAdmin } = useAuth();

  // Platform admin always has access
  if (isAdmin) return <>{children}</>;

  // Check if user's role is in allowed list
  if (allowedRoles.includes(userRole)) return <>{children}</>;

  return <>{fallback}</>;
}
