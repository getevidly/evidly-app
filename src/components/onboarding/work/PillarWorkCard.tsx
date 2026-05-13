import type { PillarRequirement } from '../../../hooks/onboarding/usePillarRequirements';
import type { RequirementState } from '../../../hooks/onboarding/useOnboardingState';
import type { EvidenceThreadSummary } from '../../../hooks/onboarding/useItemEvidenceTrail';
import { PillarHeader } from '../shared/PillarHeader';
import { RequirementWorkRow, type CommitEntry, type InviteInfo } from './RequirementWorkRow';

interface PillarWorkCardProps {
  pillar: 'food_safety' | 'fire_safety';
  requirements: PillarRequirement[];
  pillarState: RequirementState[];
  commits: CommitEntry[];
  invites: InviteInfo[];
  skippedItems: string[];
  onAction: (requirement: PillarRequirement, type: 'upload' | 'identify_vendor' | 'request' | 'invite') => void;
  onConfirm: (requirementCode: string) => void;
  onResume: (requirementCode: string) => void;
  onResendInvite: (requirementCode: string) => void;
  hideOwnerControls?: boolean;
  evidenceSummaries?: Record<string, EvidenceThreadSummary>;
}

export function PillarWorkCard({
  pillar,
  requirements,
  pillarState,
  commits,
  invites,
  skippedItems,
  onAction,
  onConfirm,
  onResume,
  onResendInvite,
  hideOwnerControls,
  evidenceSummaries,
}: PillarWorkCardProps) {
  const doneCount = pillarState.filter(s => s.status === 'done').length;
  const pendingCount = pillarState.filter(s => s.status === 'pending').length;
  const skippedCount = pillarState.filter(s => s.status === 'skipped').length;

  return (
    <div className="mb-4">
      <div className="px-4">
        <PillarHeader pillar={pillar} completedCount={doneCount} totalCount={requirements.length} />
      </div>

      <div className="mx-3 mt-1 mb-2 border-l-[3px] border-[#1E2D4D] bg-[#F7F5EE] rounded-r-lg overflow-hidden">
        <div className="px-3 pt-2 pb-1">
          <span className="text-[10px] uppercase tracking-wider text-[#8A93A6] font-medium">
            EvidLY found these requirements
          </span>
        </div>

        {requirements.map(req => {
          const commit = commits.find(c => c.requirement_code === req.requirement_code) || null;
          const invite = commit?.choice === 'invite' && commit.invite_role
            ? invites.find(i => i.role === commit.invite_role) || null
            : null;
          const state = pillarState.find(s => s.requirement.requirement_code === req.requirement_code);
          const isComplete = state?.status === 'done';
          const isSkipped = skippedItems.includes(req.requirement_code);

          return (
            <RequirementWorkRow
              key={req.id}
              requirement={req}
              commitEntry={commit}
              inviteInfo={invite}
              isComplete={isComplete}
              isSkipped={isSkipped}
              onAction={(type) => onAction(req, type)}
              onConfirm={() => onConfirm(req.requirement_code)}
              onResume={() => onResume(req.requirement_code)}
              onResendInvite={() => onResendInvite(req.requirement_code)}
              hideOwnerControls={hideOwnerControls}
              evidenceSummary={evidenceSummaries?.[req.requirement_code] ?? null}
            />
          );
        })}

        <div className="px-3 py-2 flex justify-end">
          <span className="text-[10px] text-[#8A93A6]">
            {doneCount > 0 && `${doneCount} done`}
            {doneCount > 0 && pendingCount > 0 && ' · '}
            {pendingCount > 0 && `${pendingCount} pending`}
            {(doneCount > 0 || pendingCount > 0) && skippedCount > 0 && ' · '}
            {skippedCount > 0 && `${skippedCount} skipped`}
          </span>
        </div>
      </div>
    </div>
  );
}
