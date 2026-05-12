import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
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

  const [activeTab, setActiveTab] = useState<OnboardingTabId>('responsibilities');
  const [responsibilitiesLocked, setResponsibilitiesLocked] = useState(false);

  // Check if responsibilities are already locked
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E2DDD4] overflow-hidden flex flex-col max-h-[80vh]">
      <OnboardingHeader title={title} subtitle={subtitle} progress={progressText} />
      <OnboardingTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'responsibilities' && (
          <ResponsibilitiesTab onLocked={handleLocked} />
        )}
        {activeTab === 'work' && (
          <WorkTab
            responsibilitiesLocked={responsibilitiesLocked}
            onGoToResponsibilities={() => setActiveTab('responsibilities')}
          />
        )}
        {activeTab === 'summary' && (
          <SummaryTab />
        )}
      </div>
    </div>
  );
}
