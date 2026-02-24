export type PlanTier = 'trial' | 'founder' | 'professional' | 'enterprise';

export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  requiredTier: PlanTier;
  enabled: boolean;             // Admin kill-switch: false = disabled platform-wide
  previewType: 'blur' | 'sample' | 'locked';
  upgradeTier: PlanTier;       // The tier they need to upgrade TO
  upgradePrice: string;         // e.g., "$149/mo"
  upgradeLabel: string;         // e.g., "Professional"
}

const TIER_LEVEL: Record<PlanTier, number> = {
  trial: 0,
  founder: 1,
  professional: 2,
  enterprise: 3,
};

export function hasAccess(userTier: PlanTier, requiredTier: PlanTier, featureId?: string): boolean {
  if (featureId && !isFeatureEnabled(featureId)) return false;
  return TIER_LEVEL[userTier] >= TIER_LEVEL[requiredTier];
}

export function getTierLevel(tier: PlanTier): number {
  return TIER_LEVEL[tier];
}

/** Universal admin kill-switch. Returns false if feature is globally disabled. */
export function isFeatureEnabled(featureId: string): boolean {
  return FEATURES[featureId]?.enabled ?? true;
}

export const FEATURES: Record<string, FeatureDefinition> = {
  'ai-predictive-insights': {
    id: 'ai-predictive-insights',
    name: 'AI Predictive Insights',
    description: 'AI-powered pattern analysis that predicts compliance risks before they become violations.',
    requiredTier: 'professional',
    enabled: false,               // Needs data to accumulate
    previewType: 'blur',
    upgradeTier: 'professional',
    upgradePrice: '$149/mo',
    upgradeLabel: 'Professional',
  },
  'industry-benchmarks': {
    id: 'industry-benchmarks',
    name: 'Industry Benchmarks',
    description: 'Compare your compliance scores against industry averages and top performers.',
    requiredTier: 'professional',
    enabled: false,               // Needs data to accumulate
    previewType: 'sample',
    upgradeTier: 'professional',
    upgradePrice: '$149/mo',
    upgradeLabel: 'Professional',
  },
  'insurance-risk-score': {
    id: 'insurance-risk-score',
    name: 'Insurance Risk Score',
    description: 'Risk rating aligned with insurer underwriting criteria to help reduce your premiums.',
    requiredTier: 'professional',
    enabled: false,               // Needs data to accumulate
    previewType: 'sample',
    upgradeTier: 'professional',
    upgradePrice: '$149/mo',
    upgradeLabel: 'Professional',
  },
  'advanced-analytics': {
    id: 'advanced-analytics',
    name: 'Advanced Analytics',
    description: 'Deep-dive charts, custom date ranges, trend analysis, and exportable analytics.',
    requiredTier: 'professional',
    enabled: false,               // Needs data to accumulate
    previewType: 'blur',
    upgradeTier: 'professional',
    upgradePrice: '$149/mo',
    upgradeLabel: 'Professional',
  },
  'ai-training-recommendations': {
    id: 'ai-training-recommendations',
    name: 'AI Training Recommendations',
    description: 'Personalized staff training suggestions based on compliance gaps and patterns.',
    requiredTier: 'professional',
    enabled: false,               // Needs data to accumulate
    previewType: 'locked',
    upgradeTier: 'professional',
    upgradePrice: '$149/mo',
    upgradeLabel: 'Professional',
  },
  'enterprise-dashboard': {
    id: 'enterprise-dashboard',
    name: 'Enterprise Dashboard',
    description: 'Multi-location comparison, portfolio analytics, and executive reporting.',
    requiredTier: 'enterprise',
    enabled: false,               // Enable only for enterprise accounts
    previewType: 'blur',
    upgradeTier: 'enterprise',
    upgradePrice: 'Custom',
    upgradeLabel: 'Enterprise',
  },
  'custom-compliance-rules': {
    id: 'custom-compliance-rules',
    name: 'Custom Compliance Rules',
    description: 'Add your organization-specific checklist items and scoring rules.',
    requiredTier: 'enterprise',
    enabled: true,
    previewType: 'locked',
    upgradeTier: 'enterprise',
    upgradePrice: 'Custom',
    upgradeLabel: 'Enterprise',
  },
  'api-access': {
    id: 'api-access',
    name: 'API Access',
    description: 'Programmatic access to compliance data via REST API.',
    requiredTier: 'enterprise',
    enabled: true,
    previewType: 'locked',
    upgradeTier: 'enterprise',
    upgradePrice: 'Custom',
    upgradeLabel: 'Enterprise',
  },
  'sso-saml': {
    id: 'sso-saml',
    name: 'SSO / SAML',
    description: 'Single sign-on integration with your identity provider.',
    requiredTier: 'enterprise',
    enabled: true,
    previewType: 'locked',
    upgradeTier: 'enterprise',
    upgradePrice: 'Custom',
    upgradeLabel: 'Enterprise',
  },
  // ── AI Features (merged from aiTier.ts) ────────────────────────────
  'predictive-alerts': {
    id: 'predictive-alerts',
    name: 'AI Predictive Alerts',
    description: 'Proactive alerts that predict compliance failures before they happen using pattern analysis.',
    requiredTier: 'professional',
    enabled: false,               // Needs data to accumulate
    previewType: 'blur',
    upgradeTier: 'professional',
    upgradePrice: '$149/mo',
    upgradeLabel: 'Professional',
  },
  'health-dept-drafts': {
    id: 'health-dept-drafts',
    name: 'Health Dept AI Drafts',
    description: 'AI-generated response drafts for health department inquiries and inspection follow-ups.',
    requiredTier: 'professional',
    enabled: false,               // Needs data to accumulate
    previewType: 'sample',
    upgradeTier: 'professional',
    upgradePrice: '$149/mo',
    upgradeLabel: 'Professional',
  },
};

export function getFeatureDefinition(id: string): FeatureDefinition | undefined {
  return FEATURES[id];
}

// Get badge type for sidebar. Returns null if user has access.
export function getFeatureBadge(featureId: string, userTier: PlanTier): 'PRO' | 'ENT' | null {
  const feature = FEATURES[featureId];
  if (!feature) return null;
  if (hasAccess(userTier, feature.requiredTier, featureId)) return null;
  if (feature.requiredTier === 'enterprise') return 'ENT';
  return 'PRO';
}
