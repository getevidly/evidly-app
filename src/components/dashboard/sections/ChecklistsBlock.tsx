/**
 * ChecklistsBlock — C11 dispatcher
 *
 * owner/exec/compliance → ChecklistsSummary (rolled-up 1-card)
 * chef/kitchen_manager  → ChecklistsBlockGrid (3-card interactive)
 */

import { useRole } from '../../../contexts/RoleContext';
import type { DashboardRole } from '../../../constants/dashboardComposition';
import { ChecklistsSummary } from './ChecklistsSummary';
import { ChecklistsBlockGrid } from './ChecklistsBlockGrid';

export function ChecklistsBlock() {
  const { userRole } = useRole();
  const role: DashboardRole = userRole === 'platform_admin' ? 'owner_operator' : userRole as DashboardRole;

  if (role === 'owner_operator' || role === 'executive' || role === 'compliance_manager') {
    return <ChecklistsSummary />;
  }

  if (role === 'chef' || role === 'kitchen_manager') {
    return <ChecklistsBlockGrid readonly={false} />;
  }

  return null;
}
