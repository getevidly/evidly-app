/**
 * DriftsCaught — C12 dispatcher
 *
 * owner_operator, executive → standard list (all pillars)
 * facilities_manager → standard list (fire_safety only)
 * chef → standard list (food_safety only)
 */

import { useRole } from '../../../contexts/RoleContext';
import type { DashboardRole } from '../../../constants/dashboardComposition';
import { DriftsCaughtList } from './DriftsCaughtList';

export function DriftsCaught() {
  const { userRole } = useRole();
  const role: DashboardRole = userRole === 'platform_admin' ? 'owner_operator' : userRole as DashboardRole;

  if (role === 'owner_operator' || role === 'executive') {
    return <DriftsCaughtList variant="standard" />;
  }
  if (role === 'facilities_manager') {
    return <DriftsCaughtList variant="standard" pillarFilter="fire_safety" />;
  }
  if (role === 'chef') {
    return <DriftsCaughtList variant="standard" pillarFilter="food_safety" />;
  }
  return null;
}
