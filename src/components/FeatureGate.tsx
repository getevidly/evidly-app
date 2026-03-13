import { ReactNode } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { useDemo } from '../contexts/DemoContext';
import { getFeatureDefinition, hasAccess } from '../lib/featureGating';
import { PremiumFeaturePreview } from './PremiumFeaturePreview';

interface FeatureGateProps {
  flagKey: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ flagKey, children, fallback }: FeatureGateProps) {
  const { currentTier } = useSubscription();
  const { isDemoMode } = useDemo();
  const feature = getFeatureDefinition(flagKey);

  // Unknown feature or demo mode → show everything
  if (!feature || isDemoMode) return <>{children}</>;

  // Check admin kill-switch + tier access
  if (hasAccess(currentTier, feature.requiredTier, flagKey)) return <>{children}</>;

  // Locked → show fallback or preview
  if (fallback) return <>{fallback}</>;

  return <PremiumFeaturePreview feature={feature} currentTier={currentTier} />;
}
