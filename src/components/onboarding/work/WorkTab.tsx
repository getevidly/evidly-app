import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { usePillarRequirements, type PillarRequirement } from '../../../hooks/onboarding/usePillarRequirements';
import { useOnboardingState } from '../../../hooks/onboarding/useOnboardingState';
import { PillarHeader } from '../shared/PillarHeader';
import { EmptyStateMessage } from '../shared/EmptyStateMessage';
import { useOnboardingView } from '../../../contexts/OnboardingViewContext';
import { ChecklistView } from './ChecklistView';

interface WorkTabProps {
  responsibilitiesLocked: boolean;
  onGoToResponsibilities: () => void;
}

/**
 * Work tab — pre-lock: read-only preview, post-lock: ChecklistView document checklist.
 */
export function WorkTab({ responsibilitiesLocked, onGoToResponsibilities }: WorkTabProps) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const { foodSafety: fsReqsAll, fireSafety: firReqsAll, requirements: allRequirements, loading: reqLoading, stateCode } = usePillarRequirements();
  const { viewMode, assignedRequirementCodes } = useOnboardingView();
  const { foodSafety, fireSafety, skippedItems, skipItem, unskipItem, refreshState, loading: stateLoading } = useOnboardingState();

  // Scope requirements to assigned items for invitees
  const requirements = viewMode === 'invitee'
    ? allRequirements.filter(r => assignedRequirementCodes.has(r.requirement_code))
    : allRequirements;
  const fsReqs = viewMode === 'invitee'
    ? fsReqsAll.filter(r => assignedRequirementCodes.has(r.requirement_code))
    : fsReqsAll;
  const firReqs = viewMode === 'invitee'
    ? firReqsAll.filter(r => assignedRequirementCodes.has(r.requirement_code))
    : firReqsAll;

  // --- Loading ---
  if (reqLoading) {
    return <div className="flex items-center justify-center py-12"><div className="w-5 h-5 border-2 border-[#1E2D4D]/30 border-t-[#1E2D4D] rounded-full animate-spin" /></div>;
  }

  if (requirements.length === 0) {
    return <EmptyStateMessage stateName={stateCode || undefined} />;
  }

  // --- Pre-lock: banner + preview rows ---
  if (!responsibilitiesLocked) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-4 mt-3 mb-2 px-4 py-3 bg-[#F7F5EE] border-l-2 border-[#1E2D4D] rounded-r-lg">
          <p className="text-xs text-[#1E2D4D]/80 mb-2">
            Lock your responsibilities to start working on these.
          </p>
          <button type="button" onClick={onGoToResponsibilities}
            className="text-xs font-medium text-[#1E2D4D] flex items-center gap-1 hover:underline">
            Go to Responsibilities <ArrowRight size={12} />
          </button>
        </div>
        <WorkPillarPreview pillar="food_safety" requirements={fsReqs} />
        <WorkPillarPreview pillar="fire_safety" requirements={firReqs} />
      </div>
    );
  }

  // --- Post-lock loading ---
  if (stateLoading) {
    return <div className="flex items-center justify-center py-12"><div className="w-5 h-5 border-2 border-[#1E2D4D]/30 border-t-[#1E2D4D] rounded-full animate-spin" /></div>;
  }

  // --- Post-lock: ChecklistView document checklist ---
  const allPillarItems = [...foodSafety.items, ...fireSafety.items];

  return (
    <ChecklistView
      requirements={requirements}
      pillarItems={allPillarItems}
      skippedItems={skippedItems}
      organizationId={orgId!}
      onSkip={skipItem}
      onUnskip={unskipItem}
      onRefresh={refreshState}
    />
  );
}

/* Pre-lock preview components */

const ROLE_LABELS: Record<string, string> = {
  compliance_manager: 'Compliance Officer',
  facilities_manager: 'Facilities Manager',
  kitchen_manager: 'Kitchen Manager',
  chef: 'Chef',
  executive: 'Executive',
  owner_operator: 'Owner/Operator',
  kitchen_staff: 'Kitchen Staff',
};

function WorkPillarPreview({ pillar, requirements }: { pillar: 'food_safety' | 'fire_safety'; requirements: PillarRequirement[] }) {
  return (
    <div className="mb-2">
      <div className="px-4">
        <PillarHeader pillar={pillar} completedCount={0} totalCount={requirements.length} />
      </div>
      <div className="border-t border-[#E2DDD4]/50">
        {requirements.map(req => (
          <WorkPreviewRow key={req.id} requirement={req} />
        ))}
      </div>
    </div>
  );
}

function WorkPreviewRow({ requirement }: { requirement: PillarRequirement }) {
  const roleLabel = ROLE_LABELS[requirement.typical_role] || requirement.typical_role;
  const actionLabel =
    requirement.action_type === 'upload' ? 'Document upload'
    : requirement.action_type === 'route_out' ? 'In-app action'
    : requirement.action_type === 'confirm' ? 'Confirmation'
    : requirement.action_type === 'identify_vendor' ? 'Vendor setup'
    : 'Team invite';

  return (
    <div className="px-4 py-3 border-b border-[#E2DDD4]/50 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#1E2D4D]">{requirement.label}</span>
          {requirement.citation && (
            <span className="text-[10px] text-[#8A93A6] font-mono">{requirement.citation}</span>
          )}
        </div>
        <p className="text-xs text-[#8A93A6] mt-0.5">
          {roleLabel} &middot; {actionLabel}
        </p>
      </div>
    </div>
  );
}
