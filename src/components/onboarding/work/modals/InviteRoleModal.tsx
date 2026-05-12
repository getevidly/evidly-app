import { TeamInviteModal } from '../../../TeamInviteModal';
import { ROLE_LABELS } from '../workConstants';
import { evaluateOnboardingComplete } from '../../../../lib/onboarding/completionDetection';
import type { PillarRequirement } from '../../../../hooks/onboarding/usePillarRequirements';

interface InviteRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirement: PillarRequirement;
  organizationId: string;
  onComplete: () => void;
}

export function InviteRoleModal({ isOpen, onClose, requirement, organizationId, onComplete }: InviteRoleModalProps) {
  const handleInviteSent = () => {
    evaluateOnboardingComplete(organizationId);
    onComplete();
    onClose();
  };

  return (
    <TeamInviteModal
      isOpen={isOpen}
      onClose={onClose}
      organizationId={organizationId}
      onInviteSent={handleInviteSent}
      mode="single"
    />
  );
}
