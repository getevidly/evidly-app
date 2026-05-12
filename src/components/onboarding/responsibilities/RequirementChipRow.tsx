import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import type { PillarRequirement } from '../../../hooks/onboarding/usePillarRequirements';
import { SkipReasonModal } from './SkipReasonModal';

export type ChipChoice = 'me' | 'invite' | 'skip' | null;

interface RequirementChipRowProps {
  requirement: PillarRequirement;
  currentChoice: ChipChoice;
  /** Whether the typical_role for this requirement is missing from the team */
  roleMissing: boolean;
  onChoose: (choice: 'me' | 'invite' | 'skip', skipReason?: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
  compliance_manager: 'Compliance Officer',
  facilities_manager: 'Facilities Manager',
  kitchen_manager: 'Kitchen Manager',
  chef: 'Chef',
  executive: 'Executive',
  owner_operator: 'Owner/Operator',
  kitchen_staff: 'Kitchen Staff',
};

export function RequirementChipRow({ requirement, currentChoice, roleMissing, onChoose }: RequirementChipRowProps) {
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showChatPopover, setShowChatPopover] = useState(false);

  const roleLabel = ROLE_LABELS[requirement.typical_role] || requirement.typical_role;
  const isPending = currentChoice === null;
  // Behavior rule: typical_role is a hint. If the role is missing, [Me] defaults to owner handling it.
  const meLabel = roleMissing ? 'Me (Owner)' : 'Me';

  const chipBase = 'px-3 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer select-none';
  const chipSelected = 'bg-[#1E2D4D] text-[#FAF7F0] border-[#1E2D4D]';
  const chipUnselected = 'bg-white text-[#1E2D4D]/70 border-[#E2DDD4] hover:border-[#1E2D4D]/30';

  return (
    <>
      <div className={`relative px-4 py-3 border-b border-[#E2DDD4]/50 ${isPending ? 'bg-[#FEF8EC]' : 'bg-white'}`}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#1E2D4D]">{requirement.label}</span>
              {requirement.citation && (
                <span className="text-[10px] text-[#8A93A6] font-mono">{requirement.citation}</span>
              )}
            </div>
            {isPending && (
              <p className="text-xs text-[#8A93A6] mt-0.5">
                Needs a decision &middot; {roleLabel} typically handles
              </p>
            )}
            {/* Chips */}
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                onClick={() => onChoose('me')}
                className={`${chipBase} ${currentChoice === 'me' ? chipSelected : chipUnselected}`}
              >
                {meLabel}
              </button>
              <button
                type="button"
                onClick={() => onChoose('invite', undefined)}
                className={`${chipBase} ${currentChoice === 'invite' ? chipSelected : chipUnselected}`}
              >
                Invite {roleLabel}
              </button>
              <button
                type="button"
                onClick={() => setShowSkipModal(true)}
                className={`${chipBase} ${currentChoice === 'skip' ? chipSelected : chipUnselected}`}
              >
                Skip
              </button>
            </div>
          </div>
          {/* Chat icon */}
          <button
            type="button"
            onClick={() => setShowChatPopover(!showChatPopover)}
            className="p-1.5 rounded-md hover:bg-[#1E2D4D]/5 text-[#8A93A6] relative flex-shrink-0 mt-1"
            title="Item discussion"
          >
            <MessageCircle size={16} />
          </button>
        </div>

        {/* Chat popover placeholder */}
        {showChatPopover && (
          <div className="absolute right-4 top-12 z-50 w-56 bg-white border border-[#E2DDD4] rounded-lg shadow-lg p-3">
            <p className="text-xs text-[#8A93A6] text-center">
              Chat coming soon for this item
            </p>
            <button
              type="button"
              onClick={() => setShowChatPopover(false)}
              className="mt-2 w-full text-xs text-[#1E2D4D]/60 hover:text-[#1E2D4D] text-center"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      <SkipReasonModal
        isOpen={showSkipModal}
        onClose={() => setShowSkipModal(false)}
        requirementLabel={requirement.label}
        onConfirm={(reason) => onChoose('skip', reason)}
      />
    </>
  );
}
