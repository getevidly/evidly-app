import { ArrowRight, MessageCircle } from 'lucide-react';
import { usePillarRequirements, type PillarRequirement } from '../../../hooks/onboarding/usePillarRequirements';
import { PillarHeader } from '../shared/PillarHeader';
import { EmptyStateMessage } from '../shared/EmptyStateMessage';

const ROLE_LABELS: Record<string, string> = {
  compliance_manager: 'Compliance Officer',
  facilities_manager: 'Facilities Manager',
  kitchen_manager: 'Kitchen Manager',
  chef: 'Chef',
  executive: 'Executive',
  owner_operator: 'Owner/Operator',
  kitchen_staff: 'Kitchen Staff',
};

interface WorkTabProps {
  responsibilitiesLocked: boolean;
  onGoToResponsibilities: () => void;
}

/**
 * Work tab — read-only preview of upcoming work items.
 * Pre-lock: banner CTA to lock responsibilities first.
 * Post-lock: same rows, ready for Checkpoint 2 action verbs.
 */
export function WorkTab({ responsibilitiesLocked, onGoToResponsibilities }: WorkTabProps) {
  const { foodSafety, fireSafety, requirements, loading, stateCode } = usePillarRequirements();

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-5 h-5 border-2 border-[#1E2D4D]/30 border-t-[#1E2D4D] rounded-full animate-spin" /></div>;
  }

  if (requirements.length === 0) {
    return <EmptyStateMessage stateName={stateCode || undefined} />;
  }

  return (
    <div className="overflow-y-auto">
      {!responsibilitiesLocked && (
        <div className="mx-4 mt-3 mb-2 px-4 py-3 bg-[#F7F5EE] border-l-2 border-[#1E2D4D] rounded-r-lg">
          <p className="text-xs text-[#1E2D4D]/80 mb-2">
            Lock your responsibilities to start working on these.
          </p>
          <button
            type="button"
            onClick={onGoToResponsibilities}
            className="text-xs font-medium text-[#1E2D4D] flex items-center gap-1 hover:underline"
          >
            Go to Responsibilities <ArrowRight size={12} />
          </button>
        </div>
      )}

      <WorkPillarSection pillar="food_safety" requirements={foodSafety} />
      <WorkPillarSection pillar="fire_safety" requirements={fireSafety} />
    </div>
  );
}

function WorkPillarSection({ pillar, requirements }: { pillar: 'food_safety' | 'fire_safety'; requirements: PillarRequirement[] }) {
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
          {roleLabel} &middot; {requirement.action_type === 'upload' ? 'Document upload' : requirement.action_type === 'route_out' ? 'In-app action' : requirement.action_type === 'confirm' ? 'Confirmation' : 'Team invite'}
        </p>
      </div>
      <button
        type="button"
        className="p-1.5 rounded-md hover:bg-[#1E2D4D]/5 text-[#8A93A6] flex-shrink-0 mt-1"
        title="Item discussion"
        onClick={() => {}}
      >
        <MessageCircle size={16} />
      </button>
    </div>
  );
}
