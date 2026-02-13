import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import type { PlanTier } from '../lib/featureGating';
import { hasAccess, getFeatureDefinition } from '../lib/featureGating';

export function useSubscription() {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();

  // Demo mode: simulate Professional tier (show most features, enterprise gated)
  if (isDemoMode) {
    return {
      currentTier: 'professional' as PlanTier,
      isActive: true,
      trialDaysLeft: null,
    };
  }

  // In production, pull from user profile or org metadata
  // The subscriptions table has plan_name: 'founder' | 'professional' | 'enterprise'
  // For now, default to 'founder' for logged-in users (baseline paid tier)
  const currentTier: PlanTier = (profile as any)?.plan || 'founder';
  const isActive = true; // Would check subscription status in production

  return { currentTier, isActive, trialDaysLeft: null };
}

export function useFeatureAccess(featureId: string): {
  hasAccess: boolean;
  feature: ReturnType<typeof getFeatureDefinition>;
  currentTier: PlanTier;
} {
  const { currentTier } = useSubscription();
  const feature = getFeatureDefinition(featureId);
  const { isDemoMode } = useDemo();

  // Demo mode: all features accessible
  if (isDemoMode) {
    return { hasAccess: true, feature, currentTier };
  }

  if (!feature) {
    return { hasAccess: true, feature: undefined, currentTier };
  }

  return {
    hasAccess: hasAccess(currentTier, feature.requiredTier),
    feature,
    currentTier,
  };
}
