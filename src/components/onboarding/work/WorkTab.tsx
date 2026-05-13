import { useState, useEffect, useCallback } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { usePillarRequirements, type PillarRequirement } from '../../../hooks/onboarding/usePillarRequirements';
import { useOnboardingState } from '../../../hooks/onboarding/useOnboardingState';
import { PillarHeader } from '../shared/PillarHeader';
import { EmptyStateMessage } from '../shared/EmptyStateMessage';
import { PillarWorkCard } from './PillarWorkCard';
import { useOnboardingView } from '../../../contexts/OnboardingViewContext';
import type { CommitEntry, InviteInfo } from './RequirementWorkRow';
import { UploadDocumentModal } from './modals/UploadDocumentModal';
import { IdentifyVendorModal } from './modals/IdentifyVendorModal';
import { RequestDocumentModal } from './modals/RequestDocumentModal';
import { InviteRoleModal } from './modals/InviteRoleModal';
import { toast } from 'sonner';

interface WorkTabProps {
  responsibilitiesLocked: boolean;
  onGoToResponsibilities: () => void;
}

interface ActiveModal {
  type: 'upload' | 'identify_vendor' | 'invite';
  requirement: PillarRequirement;
}

interface COIRequest {
  vendorId: string;
  vendorEmail: string;
  vendorName: string;
  requirement: PillarRequirement;
}

/**
 * Work tab — pre-lock: read-only preview, post-lock: interactive execution surface.
 * Wires PillarWorkCard rows to drill-down modals + completion detection.
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

  const [commits, setCommits] = useState<CommitEntry[]>([]);
  const [invites, setInvites] = useState<InviteInfo[]>([]);
  const [orgName, setOrgName] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  const [coiRequest, setCOIRequest] = useState<COIRequest | null>(null);

  // Fetch committed choices + invite statuses (post-lock only)
  useEffect(() => {
    if (!orgId || !responsibilitiesLocked) {
      setDataLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setDataLoading(true);

      const { data: orgData } = await supabase
        .from('organizations')
        .select('onboarding_team_invited, name')
        .eq('id', orgId)
        .maybeSingle();

      if (cancelled) return;
      setCommits((orgData?.onboarding_team_invited as CommitEntry[]) || []);
      setOrgName((orgData?.name as string) || '');

      const { data: invData } = await supabase
        .from('user_invitations')
        .select('email, full_name, status, role')
        .eq('organization_id', orgId);

      if (cancelled) return;
      setInvites((invData || []).map(i => ({
        email: i.email,
        full_name: i.full_name || null,
        status: i.status as 'pending' | 'accepted' | 'expired',
        role: i.role,
      })));

      setDataLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, [orgId, responsibilitiesLocked]);

  const handleAction = useCallback((requirement: PillarRequirement, type: 'upload' | 'identify_vendor' | 'request' | 'invite') => {
    if (type === 'request') return; // COI requests come from IdentifyVendorModal
    setActiveModal({ type, requirement });
  }, []);

  const handleModalClose = useCallback(() => {
    setActiveModal(null);
  }, []);

  const handleModalComplete = useCallback(() => {
    refreshState();
  }, [refreshState]);

  const handleConfirm = useCallback(async (requirementCode: string) => {
    await skipItem(requirementCode);
    toast.success('Confirmed');
    refreshState();
  }, [skipItem, refreshState]);

  const handleResume = useCallback(async (requirementCode: string) => {
    await unskipItem(requirementCode);
    refreshState();
  }, [unskipItem, refreshState]);

  const handleResendInvite = useCallback(async (_requirementCode: string) => {
    toast.info('Invite was already sent. The team member can use the original link.');
  }, []);

  const handleRequestCOI = useCallback((vendorId: string, vendorEmail: string, vendorName: string) => {
    if (activeModal?.requirement) {
      setCOIRequest({ vendorId, vendorEmail, vendorName, requirement: activeModal.requirement });
    }
  }, [activeModal]);

  const handleCOIComplete = useCallback(() => {
    setCOIRequest(null);
    refreshState();
  }, [refreshState]);

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
  if (stateLoading || dataLoading) {
    return <div className="flex items-center justify-center py-12"><div className="w-5 h-5 border-2 border-[#1E2D4D]/30 border-t-[#1E2D4D] rounded-full animate-spin" /></div>;
  }

  // --- Post-lock: interactive work surface ---
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <PillarWorkCard
        pillar="food_safety"
        requirements={fsReqs}
        pillarState={foodSafety.items}
        commits={commits}
        invites={invites}
        skippedItems={skippedItems}
        onAction={handleAction}
        onConfirm={handleConfirm}
        onResume={handleResume}
        onResendInvite={handleResendInvite}
        hideOwnerControls={viewMode === 'invitee'}
      />
      <PillarWorkCard
        pillar="fire_safety"
        requirements={firReqs}
        pillarState={fireSafety.items}
        commits={commits}
        invites={invites}
        skippedItems={skippedItems}
        onAction={handleAction}
        onConfirm={handleConfirm}
        onResume={handleResume}
        onResendInvite={handleResendInvite}
        hideOwnerControls={viewMode === 'invitee'}
      />

      {activeModal?.type === 'upload' && (
        <UploadDocumentModal
          isOpen
          onClose={handleModalClose}
          requirement={activeModal.requirement}
          organizationId={orgId!}
          onComplete={handleModalComplete}
        />
      )}
      {activeModal?.type === 'identify_vendor' && (
        <IdentifyVendorModal
          isOpen
          onClose={handleModalClose}
          requirement={activeModal.requirement}
          organizationId={orgId!}
          onComplete={handleModalComplete}
          onRequestCOI={handleRequestCOI}
        />
      )}
      {activeModal?.type === 'invite' && (
        <InviteRoleModal
          isOpen
          onClose={handleModalClose}
          requirement={activeModal.requirement}
          organizationId={orgId!}
          onComplete={handleModalComplete}
        />
      )}
      {coiRequest && (
        <RequestDocumentModal
          isOpen
          onClose={() => setCOIRequest(null)}
          vendorId={coiRequest.vendorId}
          vendorEmail={coiRequest.vendorEmail}
          vendorName={coiRequest.vendorName}
          requirementCode={coiRequest.requirement.requirement_code}
          requirementLabel={coiRequest.requirement.label}
          organizationId={orgId!}
          organizationName={orgName}
          onComplete={handleCOIComplete}
        />
      )}
    </div>
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
