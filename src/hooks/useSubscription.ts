import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import type { PlanTier } from '../lib/featureGating';
import { hasAccess, getFeatureDefinition, isFeatureEnabled } from '../lib/featureGating';

export function useSubscription() {
  const { profile } = useAuth();
  const { isDemoMode, presenterMode } = useDemo();

  // Presenter mode: simulate Enterprise tier (unlock everything)
  if (isDemoMode && presenterMode) {
    return {
      currentTier: 'enterprise' as PlanTier,
      isActive: true,
      trialDaysLeft: null,
    };
  }

  // Demo mode: simulate Professional tier (show most features, enterprise gated)
  if (isDemoMode) {
    return {
      currentTier: 'professional' as PlanTier,
      isActive: true,
      trialDaysLeft: null,
    };
  }

  // In production, pull from user profile or org metadata
  const currentTier: PlanTier = (profile as any)?.plan || 'founder';
  const isActive = true;

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
    hasAccess: isFeatureEnabled(feature.id) && hasAccess(currentTier, feature.requiredTier, feature.id),
    feature,
    currentTier,
  };
}
