import { useState, useEffect, useCallback } from 'react';
import { usePillarRequirements } from '../../../hooks/onboarding/usePillarRequirements';
import { useDelegationSuggestion } from '../../../hooks/onboarding/useDelegationSuggestion';
import { useAuth } from '../../../contexts/AuthContext';
import { commitResponsibility, lockResponsibilities } from '../../../lib/onboarding/responsibilityCommit';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';
import { PillarSection } from './PillarSection';
import { LockResponsibilitiesCTA } from './LockResponsibilitiesCTA';
import { EmptyStateMessage } from '../shared/EmptyStateMessage';
import type { ChipChoice } from './RequirementChipRow';
import { TeamInviteModal } from '../../TeamInviteModal';

interface ResponsibilitiesTabProps {
  onLocked: () => void;
}

export function ResponsibilitiesTab({ onLocked }: ResponsibilitiesTabProps) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const { foodSafety, fireSafety, requirements, loading: reqLoading, stateCode } = usePillarRequirements();
  const { suggestions } = useDelegationSuggestion();

  const [choices, setChoices] = useState<Record<string, ChipChoice>>({});
  const [locking, setLocking] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<string>('');
  const [pendingInviteItems, setPendingInviteItems] = useState<string[]>([]);

  // Load existing choices from org data
  useEffect(() => {
    if (!orgId) return;

    async function loadExisting() {
      const { data } = await supabase
        .from('organizations')
        .select('onboarding_team_invited, onboarding_skipped_items')
        .eq('id', orgId)
        .maybeSingle();

      if (!data) return;

      const teamInvited = (data.onboarding_team_invited as Array<{ requirement_code: string; choice: string }>) || [];
      const skipped = (data.onboarding_skipped_items as string[]) || [];

      const loaded: Record<string, ChipChoice> = {};
      for (const item of teamInvited) {
        loaded[item.requirement_code] = item.choice as ChipChoice;
      }
      // Skipped items override
      for (const code of skipped) {
        loaded[code] = 'skip';
      }
      setChoices(loaded);
    }

    loadExisting();
  }, [orgId]);

  const handleChoose = useCallback(async (requirementCode: string, choice: 'me' | 'invite' | 'skip', skipReason?: string) => {
    if (!orgId) return;

    if (choice === 'invite') {
      const req = requirements.find(r => r.requirement_code === requirementCode);
      setInviteRole(req?.typical_role || '');
      setPendingInviteItems([requirementCode]);
      setInviteModalOpen(true);
      return;
    }

    // Optimistic update
    setChoices(prev => ({ ...prev, [requirementCode]: choice }));

    const { error } = await commitResponsibility({
      organizationId: orgId,
      requirementCode,
      choice,
      skipReason,
    });

    if (error) {
      toast.error('Failed to save choice');
      setChoices(prev => ({ ...prev, [requirementCode]: null }));
    }
  }, [orgId, requirements]);

  const handleBulkApply = useCallback(async (role: string) => {
    if (!orgId) return;

    // Find all pending items with this typical_role
    const matching = requirements.filter(r => r.typical_role === role && !choices[r.requirement_code]);
    if (matching.length === 0) return;

    setInviteRole(role);
    setPendingInviteItems(matching.map(r => r.requirement_code));
    setInviteModalOpen(true);
  }, [orgId, requirements, choices]);

  const handleInviteSent = useCallback(() => {
    // Mark all pending invite items as 'invite'
    const updated = { ...choices };
    for (const code of pendingInviteItems) {
      updated[code] = 'invite';
    }
    setChoices(updated);

    // Persist each
    for (const code of pendingInviteItems) {
      commitResponsibility({
        organizationId: orgId!,
        requirementCode: code,
        choice: 'invite',
        inviteRole,
      });
    }

    setInviteModalOpen(false);
    setPendingInviteItems([]);
    toast.success('Invite sent');
  }, [choices, pendingInviteItems, orgId, inviteRole]);

  const handleLock = useCallback(async () => {
    if (!orgId) return;
    setLocking(true);

    const { error } = await lockResponsibilities(orgId);
    if (error) {
      toast.error('Failed to lock responsibilities');
      setLocking(false);
      return;
    }

    toast.success('Responsibilities locked');
    setLocking(false);
    onLocked();
  }, [orgId, onLocked]);

  if (reqLoading) {
    return <div className="flex items-center justify-center py-12"><div className="w-5 h-5 border-2 border-[#1E2D4D]/30 border-t-[#1E2D4D] rounded-full animate-spin" /></div>;
  }

  if (requirements.length === 0) {
    return <EmptyStateMessage stateName={stateCode || undefined} />;
  }

  const totalItems = requirements.length;
  const pendingCount = requirements.filter(r => !choices[r.requirement_code]).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <PillarSection
          pillar="food_safety"
          requirements={foodSafety}
          choices={choices}
          suggestions={suggestions}
          onChoose={handleChoose}
          onBulkApply={handleBulkApply}
        />
        <PillarSection
          pillar="fire_safety"
          requirements={fireSafety}
          choices={choices}
          suggestions={suggestions}
          onChoose={handleChoose}
          onBulkApply={handleBulkApply}
        />
      </div>

      <LockResponsibilitiesCTA
        pendingCount={pendingCount}
        totalCount={totalItems}
        onLock={handleLock}
        loading={locking}
      />

      {orgId && (
        <TeamInviteModal
          isOpen={inviteModalOpen}
          onClose={() => { setInviteModalOpen(false); setPendingInviteItems([]); }}
          organizationId={orgId}
          onInviteSent={handleInviteSent}
        />
      )}
    </div>
  );
}
