import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboardingView } from '../../contexts/OnboardingViewContext';
import { supabase } from '../../lib/supabase';
import { checkOnboardingConditions } from '../../lib/onboarding/completionDetection';
import { usePillarRequirements } from '../../hooks/onboarding/usePillarRequirements';
import { OnboardingHeader } from './OnboardingHeader';
import { OnboardingTabs, type OnboardingTabId } from './OnboardingTabs';
import { ResponsibilitiesTab } from './responsibilities/ResponsibilitiesTab';
import { WorkTab } from './work/WorkTab';
import { SummaryTab } from './summary/SummaryTab';

/**
 * Root onboarding card — tab orchestration.
 * All three tabs render at all times with real content.
 */
export function OnboardingCard() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const { requirements } = usePillarRequirements();
  const { viewMode, assignedRequirementCodes, loading: viewLoading } = useOnboardingView();
  const isInvitee = viewMode === 'invitee';

  const [activeTab, setActiveTab] = useState<OnboardingTabId>(isInvitee ? 'work' : 'responsibilities');
  const [responsibilitiesLocked, setResponsibilitiesLocked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  // Check if responsibilities are already locked + onboarding completed
  useEffect(() => {
    if (!orgId) return;

    async function checkLockState() {
      const { data } = await supabase
        .from('organizations')
        .select('metadata')
        .eq('id', orgId)
        .maybeSingle();

      const meta = (data?.metadata as Record<string, unknown>) || {};
      if (meta.responsibilities_locked === true) {
        setResponsibilitiesLocked(true);
      }

      // Live-evaluate 4 conditions instead of trusting latched flag
      const complete = await checkOnboardingConditions(orgId!);
      setOnboardingComplete(complete);
    }

    checkLockState();
  }, [orgId]);

  const handleLocked = useCallback(() => {
    setResponsibilitiesLocked(true);
    setActiveTab('work');
  }, []);

  // Compute progress for header
  const [committedCount, setCommittedCount] = useState(0);
  useEffect(() => {
    if (!orgId) return;

    async function countCommitted() {
      const { data } = await supabase
        .from('organizations')
        .select('onboarding_team_invited, onboarding_skipped_items')
        .eq('id', orgId)
        .maybeSingle();

      const teamInvited = (data?.onboarding_team_invited as unknown[]) || [];
      const skipped = (data?.onboarding_skipped_items as string[]) || [];
      const codes = new Set([
        ...teamInvited.map((t: any) => t.requirement_code),
        ...skipped,
      ]);
      setCommittedCount(codes.size);
    }

    countCommitted();
  }, [orgId, activeTab]);

  const totalItems = requirements.length;
  const progressText = totalItems > 0 ? `${committedCount} of ${totalItems} set` : '';

  const headerConfig: Record<OnboardingTabId, { title: string; subtitle: string }> = {
    responsibilities: {
      title: 'Set responsibilities',
      subtitle: 'You set the kitchen up. EvidLY helps you invite the right people for the rest.',
    },
    work: {
      title: 'Complete your work',
      subtitle: 'Upload documents, identify vendors, and verify requirements.',
    },
    summary: {
      title: 'Summary',
      subtitle: 'Overview of your onboarding progress across both pillars.',
    },
  };

  const { title, subtitle } = headerConfig[activeTab];

  // Invitee empty state — no assigned items
  if (!viewLoading && isInvitee && assignedRequirementCodes.size === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-[#E2DDD4] px-6 py-8 text-center">
        <p className="text-sm font-medium text-[#1E2D4D]">No items assigned to you yet</p>
        <p className="text-xs text-[#8A93A6] mt-1">Your team owner hasn't assigned onboarding tasks to you.</p>
      </div>
    );
  }

  // Auto-collapse when onboarding is complete
  if (onboardingComplete && collapsed) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-[#E2DDD4] px-4 py-3 flex items-center gap-3">
        <CheckCircle2 size={18} className="text-[#2E7D32]" />
        <span className="text-sm font-medium text-[#1E2D4D]">Setup complete</span>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="ml-auto text-xs text-[#1E2D4D] hover:underline"
        >
          Expand
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E2DDD4] overflow-hidden flex flex-col max-h-[80vh]">
      {onboardingComplete && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#E2DDD4] bg-[#F6FFF6]">
          <CheckCircle2 size={16} className="text-[#2E7D32]" />
          <span className="text-xs font-medium text-[#2E7D32]">Setup complete</span>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="ml-auto text-xs text-[#1E2D4D] hover:underline"
          >
            Collapse
          </button>
        </div>
      )}
      <OnboardingHeader title={title} subtitle={subtitle} progress={progressText} />
      <OnboardingTabs activeTab={activeTab} onTabChange={setActiveTab} responsibilitiesLocked={responsibilitiesLocked} viewMode={viewMode} />

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {!isInvitee && activeTab === 'responsibilities' && (
          <ResponsibilitiesTab onLocked={handleLocked} />
        )}
        {activeTab === 'work' && (
          <WorkTab
            responsibilitiesLocked={isInvitee || responsibilitiesLocked}
            onGoToResponsibilities={() => setActiveTab('responsibilities')}
          />
        )}
        {!isInvitee && activeTab === 'summary' && (
          <SummaryTab onSwitchToResponsibilities={() => setActiveTab('responsibilities')} />
        )}
      </div>
    </div>
  );
}
