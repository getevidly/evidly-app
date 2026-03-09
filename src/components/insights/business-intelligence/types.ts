// Types and constants for the Business Intelligence page

export interface BISignal {
  id: string;
  title: string;
  summary: string;
  category: string;       // 'food_safety' | 'facility_safety' | 'regulatory' | 'health_alert' | 'recall' | 'certification'
  signal_type: string;
  source_name: string | null;
  priority: string;       // 'critical' | 'high' | 'normal' | 'low'
  county: string;         // e.g., 'Merced County' or 'Statewide'
  published_at: string;
  // 5 risk dimensions (P1-P5) — maps to DB columns risk_revenue, risk_liability, etc.
  risk_revenue: string | null;
  risk_liability: string | null;
  risk_cost: string | null;
  risk_operational: string | null;
  workforce_risk_level: string | null;
  // Client impact
  client_impact_revenue: string | null;
  client_impact_liability: string | null;
  client_impact_cost: string | null;
  client_impact_operational: string | null;
  client_impact_workforce: string | null;
  // Action
  recommended_action: string | null;
  action_deadline: string | null;
  relevance_reason: string | null;
  feed_type: string;
}

export interface RiskPlan {
  id: string;
  signal_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'accepted';
  owner_name: string;
  due_date: string;
  mitigation_steps: string;
  accepted_reason: string;
  notes: string;
}

export type FormatTab = 'executive' | 'formal' | 'print' | 'register';

// 5-pillar dimension config
export const DIMENSIONS = [
  { key: 'revenue',     riskKey: 'risk_revenue',     impactKey: 'client_impact_revenue',     label: 'Revenue',     color: '#C2410C', border: '#FDBA74', bg: '#FFF7ED' },
  { key: 'liability',   riskKey: 'risk_liability',   impactKey: 'client_impact_liability',   label: 'Liability',   color: '#991B1B', border: '#FECACA', bg: '#FEF2F2' },
  { key: 'cost',        riskKey: 'risk_cost',        impactKey: 'client_impact_cost',        label: 'Cost',        color: '#1E40AF', border: '#BFDBFE', bg: '#EFF6FF' },
  { key: 'operational', riskKey: 'risk_operational', impactKey: 'client_impact_operational', label: 'Operational', color: '#166534', border: '#BBF7D0', bg: '#F0FDF4' },
  { key: 'workforce',   riskKey: 'workforce_risk_level', impactKey: 'client_impact_workforce', label: 'Workforce',   color: '#6B21A8', border: '#E9D5FF', bg: '#FAF5FF' },
] as const;

export const LEVEL_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: '#FEF2F2', text: '#DC2626', label: 'CRITICAL' },
  high:     { bg: '#FFFBEB', text: '#D97706', label: 'HIGH' },
  moderate: { bg: '#EFF6FF', text: '#2563EB', label: 'MODERATE' },
  medium:   { bg: '#EFF6FF', text: '#2563EB', label: 'MEDIUM' },
  low:      { bg: '#F9FAFB', text: '#6B7280', label: 'LOW' },
};

export const SEV_ORDER: Record<string, number> = { critical: 4, high: 3, moderate: 2, medium: 2, low: 1 };

// Get the highest severity across a signal's 5 dimensions
export function getHighestSeverity(signal: BISignal): string {
  const levels = [signal.risk_revenue, signal.risk_liability, signal.risk_cost, signal.risk_operational, signal.workforce_risk_level]
    .filter((l): l is string => !!l && l !== 'none');
  if (levels.length === 0) return 'low';
  return levels.sort((a, b) => (SEV_ORDER[b] || 0) - (SEV_ORDER[a] || 0))[0];
}
