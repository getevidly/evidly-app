import { ReactNode } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { useDemo } from '../contexts/DemoContext';
import { getFeatureDefinition, hasAccess } from '../lib/featureGating';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { PremiumFeaturePreview } from './PremiumFeaturePreview';

interface FeatureGateProps {
  flagKey: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * AUDIT-FIX-06 / A-4: Compile-time FeatureGate now also checks the DB-backed
 * feature_flags table via useFeatureFlag. Admin toggles take effect without
 * redeployment — if DB says disabled, the feature is blocked regardless of
 * compile-time config.
 */
export function FeatureGate({ flagKey, children, fallback }: FeatureGateProps) {
  const { currentTier } = useSubscription();
  const { isDemoMode } = useDemo();
  const feature = getFeatureDefinition(flagKey);

  // AUDIT-FIX-06 / A-4: DB-backed flag check (admin toggle)
  const { enabled: dbEnabled, loading: dbLoading } = useFeatureFlag(flagKey);

  // Unknown feature or demo mode → show everything
  if (!feature || isDemoMode) return <>{children}</>;

  // DB flag explicitly disabled → block (admin toggle takes precedence)
  if (!dbLoading && !dbEnabled) {
    if (fallback) return <>{fallback}</>;
    return <PremiumFeaturePreview feature={feature} currentTier={currentTier} />;
  }

  // Check compile-time kill-switch + tier access
  if (hasAccess(currentTier, feature.requiredTier, flagKey)) return <>{children}</>;

  // Locked → show fallback or preview
  if (fallback) return <>{fallback}</>;

  return <PremiumFeaturePreview feature={feature} currentTier={currentTier} />;
}
