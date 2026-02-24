/**
 * DEPRECATED: Use featureGating.ts instead. This file will be removed post-launch.
 *
 * AI feature flags have been merged into the unified FEATURES registry in
 * src/lib/featureGating.ts. New code should use <FeatureGate> or
 * useFeatureAccess() from hooks/useSubscription.ts.
 *
 * AI Tier — Pricing gate for AI Compliance Copilot features
 *
 * Standard ($99/mo): AI Chat (20 messages/day), weekly digest, basic pattern alerts
 * Premium (future):   Unlimited chat, all proactive features, auto-corrective actions,
 *                     predictive alerts, health dept response drafts
 */

export type AiTier = 'standard' | 'premium';

export interface AiTierLimits {
  chatMessagesPerDay: number;
  proactiveAlerts: boolean;
  autoCorrectiveActions: boolean;
  predictiveAlerts: boolean;
  weeklyDigest: boolean;
  healthDeptDrafts: boolean;
  documentAnalysis: boolean;
  inspectionPrep: boolean;
}

const TIER_LIMITS: Record<AiTier, AiTierLimits> = {
  standard: {
    chatMessagesPerDay: 20,
    proactiveAlerts: true,      // basic pattern alerts
    autoCorrectiveActions: false,
    predictiveAlerts: false,
    weeklyDigest: true,
    healthDeptDrafts: false,
    documentAnalysis: true,     // 5/day
    inspectionPrep: true,       // 3/week
  },
  premium: {
    chatMessagesPerDay: Infinity,
    proactiveAlerts: true,
    autoCorrectiveActions: true,
    predictiveAlerts: true,
    weeklyDigest: true,
    healthDeptDrafts: true,
    documentAnalysis: true,
    inspectionPrep: true,
  },
};

/**
 * Get the current user's AI tier.
 * In demo mode, returns 'standard' by default.
 * In presenter mode, returns 'premium' to unlock all AI features.
 * In production, would check the organization's subscription.
 */
export function getAiTier(_isDemoMode: boolean, presenterMode = false): AiTier {
  if (presenterMode) return 'premium';
  return 'standard';
}

export function getTierLimits(tier: AiTier): AiTierLimits {
  return TIER_LIMITS[tier];
}

/**
 * Check if a specific feature is available for the current tier.
 */
export function isFeatureAvailable(tier: AiTier, feature: keyof AiTierLimits): boolean {
  const limits = TIER_LIMITS[tier];
  const value = limits[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  return false;
}

/**
 * Track daily usage for rate limiting (client-side counter, backed by server).
 */
export interface AiUsageState {
  chatMessagesToday: number;
  documentAnalysesToday: number;
  inspectionPrepsThisWeek: number;
  lastResetDate: string; // YYYY-MM-DD
}

const USAGE_KEY = 'evidly_ai_usage';

export function getUsageState(): AiUsageState {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as AiUsageState;
      const today = new Date().toISOString().split('T')[0];
      if (state.lastResetDate !== today) {
        // Reset daily counters
        return { chatMessagesToday: 0, documentAnalysesToday: 0, inspectionPrepsThisWeek: state.inspectionPrepsThisWeek, lastResetDate: today };
      }
      return state;
    }
  } catch { /* ignore */ }
  return { chatMessagesToday: 0, documentAnalysesToday: 0, inspectionPrepsThisWeek: 0, lastResetDate: new Date().toISOString().split('T')[0] };
}

export function incrementUsage(field: 'chatMessagesToday' | 'documentAnalysesToday' | 'inspectionPrepsThisWeek'): AiUsageState {
  const state = getUsageState();
  state[field]++;
  localStorage.setItem(USAGE_KEY, JSON.stringify(state));
  return state;
}

export function canSendChat(tier: AiTier): { allowed: boolean; remaining: number; limit: number } {
  const limits = TIER_LIMITS[tier];
  const usage = getUsageState();
  const remaining = Math.max(0, limits.chatMessagesPerDay - usage.chatMessagesToday);
  return {
    allowed: remaining > 0,
    remaining,
    limit: limits.chatMessagesPerDay,
  };
}
