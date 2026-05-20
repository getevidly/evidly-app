/**
 * DriftsCaughtAudit — C12 dispatcher
 *
 * compliance_manager → audit variant (evidence trail)
 */

import { useRole } from '../../../contexts/RoleContext';
import { DriftsCaughtList } from './DriftsCaughtList';

export function DriftsCaughtAudit() {
  const { userRole } = useRole();

  if (userRole === 'compliance_manager') {
    return <DriftsCaughtList variant="audit" />;
  }
  return null;
}
