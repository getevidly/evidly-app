/**
 * ChecklistsBlockReadonly — C11
 *
 * kitchen_staff → ChecklistsBlockGrid (3-card readonly)
 */

import { useRole } from '../../../contexts/RoleContext';
import { ChecklistsBlockGrid } from './ChecklistsBlockGrid';

export function ChecklistsBlockReadonly() {
  const { userRole } = useRole();

  if (userRole === 'kitchen_staff') {
    return <ChecklistsBlockGrid readonly={true} />;
  }

  return null;
}
