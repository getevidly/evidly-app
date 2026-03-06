/**
 * Intelligence Auto-Routing Engine
 *
 * Determines routing tier for intelligence signals:
 *   - auto:   Low-risk, high-confidence → auto-publish after delay
 *   - notify: Medium-risk → email admin for one-click approve
 *   - hold:   High-risk or low-confidence → manual review required
 *
 * Routing is based on AI analysis (urgency, impact, confidence),
 * signal type, scope, and risk dimensions.
 */

export type RoutingTier = 'auto' | 'notify' | 'hold';

export interface RoutingInput {
  ai_urgency?: string | null;
  ai_impact_score?: number | null;
  ai_confidence?: number | null;
  signal_type?: string | null;
  scope?: string | null;
  risk_revenue?: string | null;
  risk_liability?: string | null;
  risk_cost?: string | null;
  risk_operational?: string | null;
}

export interface RoutingResult {
  tier: RoutingTier;
  severity_score: number;
  confidence_score: number;
  reason: string;
  auto_publish_delay_hours: number;
  review_deadline_hours: number;
}

// ── Severity scoring ───────────────────────────────────────

const URGENCY_SCORES: Record<string, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
  informational: 10,
};

const RISK_SCORES: Record<string, number> = {
  critical: 100,
  high: 75,
  moderate: 50,
  low: 25,
  none: 0,
};

const SCOPE_MULTIPLIERS: Record<string, number> = {
  federal: 1.0,
  statewide: 0.9,
  multi_county: 0.8,
  county: 0.7,
  city: 0.6,
  local: 0.5,
};

// Signal types that always require human review (hold tier)
const HOLD_SIGNAL_TYPES = new Set([
  'enforcement_action',
  'outbreak',
  'legislation',
]);

// Signal types safe for auto-routing
const AUTO_ELIGIBLE_TYPES = new Set([
  'recall',
  'industry_trend',
  'nfpa_update',
  'competitor_activity',
]);

/**
 * Compute a 0-100 severity score from the signal's attributes.
 */
export function computeSeverityScore(input: RoutingInput): number {
  const urgencyScore = URGENCY_SCORES[input.ai_urgency || 'informational'] ?? 10;
  const impactScore = input.ai_impact_score ?? 0;

  // Max risk dimension
  const riskValues = [
    RISK_SCORES[input.risk_revenue || 'none'] ?? 0,
    RISK_SCORES[input.risk_liability || 'none'] ?? 0,
    RISK_SCORES[input.risk_cost || 'none'] ?? 0,
    RISK_SCORES[input.risk_operational || 'none'] ?? 0,
  ];
  const maxRisk = Math.max(...riskValues);

  // Scope multiplier
  const scopeMult = SCOPE_MULTIPLIERS[input.scope || 'statewide'] ?? 0.7;

  // Weighted: 35% urgency, 30% impact, 25% risk, 10% scope
  const raw = (urgencyScore * 0.35) + (impactScore * 0.30) + (maxRisk * 0.25) + (scopeMult * 100 * 0.10);
  return Math.round(Math.min(100, Math.max(0, raw)));
}

/**
 * Determine the routing tier for an intelligence signal.
 *
 * Rules:
 * 1. HOLD if ai_confidence < 60 (low confidence → needs human review)
 * 2. HOLD if signal_type is enforcement_action, outbreak, or legislation
 * 3. HOLD if any risk dimension is "critical"
 * 4. HOLD if severity_score >= 70
 * 5. NOTIFY if severity_score >= 40 OR any risk dimension is "high"
 * 6. AUTO for everything else (low-risk, high-confidence)
 */
export function determineRoutingTier(input: RoutingInput): RoutingResult {
  const confidence = input.ai_confidence ?? 0;
  const severity = computeSeverityScore(input);
  const reasons: string[] = [];

  // Check for critical risk dimensions
  const hasCriticalRisk = [
    input.risk_revenue, input.risk_liability,
    input.risk_cost, input.risk_operational,
  ].some(r => r === 'critical');

  const hasHighRisk = [
    input.risk_revenue, input.risk_liability,
    input.risk_cost, input.risk_operational,
  ].some(r => r === 'high');

  // ── HOLD conditions ──────────────────────────────────────
  if (confidence < 60) {
    reasons.push(`Low AI confidence (${confidence}%)`);
    return {
      tier: 'hold',
      severity_score: severity,
      confidence_score: confidence,
      reason: reasons.join('; '),
      auto_publish_delay_hours: 0,
      review_deadline_hours: 24,
    };
  }

  if (input.signal_type && HOLD_SIGNAL_TYPES.has(input.signal_type)) {
    reasons.push(`Signal type "${input.signal_type}" requires manual review`);
    return {
      tier: 'hold',
      severity_score: severity,
      confidence_score: confidence,
      reason: reasons.join('; '),
      auto_publish_delay_hours: 0,
      review_deadline_hours: 24,
    };
  }

  if (hasCriticalRisk) {
    reasons.push('Critical risk dimension detected');
    return {
      tier: 'hold',
      severity_score: severity,
      confidence_score: confidence,
      reason: reasons.join('; '),
      auto_publish_delay_hours: 0,
      review_deadline_hours: 12,
    };
  }

  if (severity >= 70) {
    reasons.push(`High severity score (${severity})`);
    return {
      tier: 'hold',
      severity_score: severity,
      confidence_score: confidence,
      reason: reasons.join('; '),
      auto_publish_delay_hours: 0,
      review_deadline_hours: 24,
    };
  }

  // ── NOTIFY conditions ────────────────────────────────────
  if (severity >= 40 || hasHighRisk) {
    if (severity >= 40) reasons.push(`Moderate severity (${severity})`);
    if (hasHighRisk) reasons.push('High risk dimension detected');
    return {
      tier: 'notify',
      severity_score: severity,
      confidence_score: confidence,
      reason: reasons.join('; '),
      auto_publish_delay_hours: 0,
      review_deadline_hours: 48,
    };
  }

  // ── AUTO ─────────────────────────────────────────────────
  const isAutoEligible = input.signal_type && AUTO_ELIGIBLE_TYPES.has(input.signal_type);
  const delayHours = isAutoEligible && confidence >= 85 ? 2 : 4;
  reasons.push(`Low severity (${severity}), high confidence (${confidence}%)`);
  if (isAutoEligible) reasons.push(`Auto-eligible type: ${input.signal_type}`);

  return {
    tier: 'auto',
    severity_score: severity,
    confidence_score: confidence,
    reason: reasons.join('; '),
    auto_publish_delay_hours: delayHours,
    review_deadline_hours: 0,
  };
}

/**
 * Format routing tier as a human-readable label.
 */
export function routingTierLabel(tier: RoutingTier): string {
  switch (tier) {
    case 'auto': return 'Auto-Publish';
    case 'notify': return 'Notify Admin';
    case 'hold': return 'Manual Review';
  }
}

/**
 * Get the color scheme for a routing tier badge.
 */
export function routingTierColor(tier: RoutingTier): { bg: string; text: string } {
  switch (tier) {
    case 'auto': return { bg: '#ECFDF5', text: '#059669' };
    case 'notify': return { bg: '#FFFBEB', text: '#D97706' };
    case 'hold': return { bg: '#FEF2F2', text: '#DC2626' };
  }
}
