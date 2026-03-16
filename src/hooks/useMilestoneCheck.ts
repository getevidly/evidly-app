/**
 * useMilestoneCheck — AMBASSADOR-SCRIPT-01
 *
 * Thin hook for checking & awarding milestones.
 * Demo: uses sessionStorage to prevent repeat fires per session.
 * Prod: queries user_milestones table via ambassadorSystem.
 */
import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import {
  MILESTONE_CONFIG,
  checkAndAwardMilestone,
  type MilestoneKey,
  type MilestoneConfig,
} from '../lib/ambassadorSystem';
import { supabase } from '../lib/supabase';

export function useMilestoneCheck() {
  const { isDemoMode } = useDemo();
  const { user, profile } = useAuth();
  const [pendingMilestone, setPendingMilestone] = useState<MilestoneConfig | null>(null);

  const checkMilestone = useCallback(
    async (key: MilestoneKey) => {
      if (isDemoMode) {
        const shownKey = `evidly_milestone_${key}`;
        if (sessionStorage.getItem(shownKey)) return;
        sessionStorage.setItem(shownKey, 'true');
        setPendingMilestone(MILESTONE_CONFIG[key]);
        return;
      }

      if (!user?.id || !profile?.organization_id) return;
      const result = await checkAndAwardMilestone(
        supabase,
        user.id,
        profile.organization_id,
        key,
      );
      if (result) setPendingMilestone(result);
    },
    [isDemoMode, user?.id, profile?.organization_id],
  );

  const dismissMilestone = useCallback(() => setPendingMilestone(null), []);

  return { pendingMilestone, checkMilestone, dismissMilestone };
}
