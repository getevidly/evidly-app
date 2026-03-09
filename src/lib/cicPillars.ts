/**
 * CIC Five-Pillar Architecture — Single Source of Truth
 *
 * The Compliance Intelligence & Correlation (CIC) engine runs on exactly
 * five dollar-denominated risk pillars. Each maps to specific insurance
 * coverage lines. This is a CARRIER-FACING instrument — never expose
 * pillar scores to operators.
 *
 * P5 (Workforce Risk) is ALWAYS separate from P4 (Operational Risk).
 */

export interface CICPillar {
  id: string;
  number: number;
  label: string;
  shortLabel: string;
  insuranceLines: string[];
  color: string;
  bgColor: string;
  border: string;
}

export const CIC_PILLARS: CICPillar[] = [
  {
    id: 'revenue_risk',
    number: 1,
    label: 'Revenue Risk',
    shortLabel: 'P1 Revenue',
    insuranceLines: ['BII', 'License/Permit'],
    color: '#C2410C',
    bgColor: '#FFF7ED',
    border: '#FDBA74',
  },
  {
    id: 'liability_risk',
    number: 2,
    label: 'Liability Risk',
    shortLabel: 'P2 Liability',
    insuranceLines: ['GL', 'Product Liability', 'Fire Legal Liability'],
    color: '#991B1B',
    bgColor: '#FEF2F2',
    border: '#FECACA',
  },
  {
    id: 'cost_risk',
    number: 3,
    label: 'Cost Risk',
    shortLabel: 'P3 Cost',
    insuranceLines: ['Equipment Breakdown', 'Property', 'WC influence'],
    color: '#1E40AF',
    bgColor: '#EFF6FF',
    border: '#BFDBFE',
  },
  {
    id: 'operational_risk',
    number: 4,
    label: 'Operational Risk',
    shortLabel: 'P4 Operational',
    insuranceLines: ['BII', 'Claim Defense', 'Renewal Confidence'],
    color: '#166534',
    bgColor: '#F0FDF4',
    border: '#BBF7D0',
  },
  {
    id: 'workforce_risk',
    number: 5,
    label: 'Workforce Risk',
    shortLabel: 'P5 Workforce',
    insuranceLines: ['GL', 'Product Liability', 'WC', 'Training Liability'],
    color: '#6B21A8',
    bgColor: '#FAF5FF',
    border: '#E9D5FF',
  },
];

/** PSE (Protective Safeguards Endorsement) signal types — all map to P2 Liability Risk */
export const PSE_SIGNAL_TYPES = [
  'pse_hood_cleaning_overdue',
  'pse_suppression_service_overdue',
  'pse_alarm_inspection_overdue',
  'pse_sprinkler_inspection_overdue',
  'pse_compliance_gap',
] as const;

/** P5 Workforce Risk signal types — NEVER merge into P4 Operational */
export const WORKFORCE_SIGNAL_TYPES = [
  'food_handler_cert_expired',
  'food_handler_cert_expiring_soon',
  'cfpm_cert_expired',
  'cfpm_cert_expiring_soon',
  'training_incomplete',
  'role_cert_gap',
  'fire_safety_training_missing',
  'fire_extinguisher_training_missing',
  'high_turnover_flag',
] as const;

/**
 * Map signal_type → cic_pillar id.
 * Signals not listed here default to their risk_* dimension or null.
 */
export const SIGNAL_PILLAR_MAP: Record<string, string> = {
  // P1 Revenue Risk
  permit_change: 'revenue_risk',
  enforcement_action: 'revenue_risk',

  // P2 Liability Risk
  recall: 'liability_risk',
  outbreak: 'liability_risk',
  allergen_alert: 'liability_risk',
  health_alert: 'liability_risk',
  // PSE signals → P2
  pse_hood_cleaning_overdue: 'liability_risk',
  pse_suppression_service_overdue: 'liability_risk',
  pse_alarm_inspection_overdue: 'liability_risk',
  pse_sprinkler_inspection_overdue: 'liability_risk',
  pse_compliance_gap: 'liability_risk',

  // P3 Cost Risk
  nfpa_update: 'cost_risk',
  fire_inspection_change: 'cost_risk',
  osfm_update: 'cost_risk',
  calfire_update: 'cost_risk',

  // P4 Operational Risk
  regulatory_change: 'operational_risk',
  inspection_methodology: 'operational_risk',
  legislation: 'operational_risk',
  competitor_activity: 'operational_risk',
  industry_trend: 'operational_risk',

  // P5 Workforce Risk
  food_handler_cert_expired: 'workforce_risk',
  food_handler_cert_expiring_soon: 'workforce_risk',
  cfpm_cert_expired: 'workforce_risk',
  cfpm_cert_expiring_soon: 'workforce_risk',
  training_incomplete: 'workforce_risk',
  role_cert_gap: 'workforce_risk',
  fire_safety_training_missing: 'workforce_risk',
  fire_extinguisher_training_missing: 'workforce_risk',
  high_turnover_flag: 'workforce_risk',
};

/** Get a pillar definition by its id (e.g. 'revenue_risk') */
export function getPillarById(id: string): CICPillar | undefined {
  return CIC_PILLARS.find(p => p.id === id);
}

/** Get a pillar definition by its number (1-5) */
export function getPillarByNumber(n: number): CICPillar | undefined {
  return CIC_PILLARS.find(p => p.number === n);
}

/**
 * Get the CIC pillar for a given signal_type.
 * Returns the pillar from the explicit map, or undefined if unmapped.
 */
export function getPillarForSignalType(signalType: string): CICPillar | undefined {
  const pillarId = SIGNAL_PILLAR_MAP[signalType];
  if (!pillarId) return undefined;
  return getPillarById(pillarId);
}

/** Check if a signal_type is PSE-related */
export function isPseSignalType(signalType: string): boolean {
  return signalType.startsWith('pse_');
}

/**
 * BI_DIMENSIONS — dimension config shaped for Business Intelligence format components.
 * Maps CIC_PILLARS → { key, riskKey, impactKey, label, color, border, bg }.
 * This is the canonical source — BI types.ts re-exports it as DIMENSIONS.
 */
export const BI_DIMENSIONS = CIC_PILLARS.map(p => {
  const key = p.id.replace('_risk', '');
  return {
    key,
    riskKey: key === 'workforce' ? 'workforce_risk_level' : `risk_${key}`,
    impactKey: `client_impact_${key}`,
    label: p.label.replace(' Risk', ''),
    color: p.color,
    border: p.border,
    bg: p.bgColor,
  };
}) as readonly { key: string; riskKey: string; impactKey: string; label: string; color: string; border: string; bg: string }[];
