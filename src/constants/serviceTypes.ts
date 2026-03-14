/**
 * serviceTypes.ts — HOODOPS-SERVICES-01
 *
 * Canonical service type definitions for HoodOps-managed vendor services.
 * KEC is the parent service; FPM, GFX, RGC are child sub-services.
 * FS (Fire Suppression) is a standalone service.
 */

// ── Types ──────────────────────────────────────────────────
export type ServiceTypeCode = 'KEC' | 'FPM' | 'GFX' | 'RGC' | 'FS';

export type ServiceFrequency =
  | 'monthly'
  | 'quarterly'
  | 'semi_annual'
  | 'annual';

export type ServiceStatus = 'current' | 'due_soon' | 'overdue' | 'not_tracked';

export interface ServiceTypeDefinition {
  code: ServiceTypeCode;
  name: string;
  shortName: string;
  description: string;
  /** KEC is parent; FPM/GFX/RGC are children of KEC; FS is standalone */
  parentCode: ServiceTypeCode | null;
  icon: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  basePrice: number;
  complianceCodes: string[];
  defaultFrequency: ServiceFrequency;
  nfpaCitation: string;
  /** Maps to serviceCatalog.ts CPP_SERVICES id */
  catalogId: string | null;
}

// ── Service Type Definitions ───────────────────────────────
export const SERVICE_TYPES: Record<ServiceTypeCode, ServiceTypeDefinition> = {
  KEC: {
    code: 'KEC',
    name: 'Kitchen Exhaust Cleaning',
    shortName: 'Exhaust Cleaning',
    description: 'NFPA 96 Table 12.4 compliant hood & duct cleaning with IKECA-certified documentation',
    parentCode: null,
    icon: 'Flame',
    color: '#C2410C',
    badgeBg: '#FFF7ED',
    badgeText: '#C2410C',
    basePrice: 450,
    complianceCodes: ['NFPA96-T12.4', 'CFC-904.12'],
    defaultFrequency: 'quarterly',
    nfpaCitation: 'NFPA 96-2024 Table 12.4',
    catalogId: 'hood_cleaning',
  },
  FPM: {
    code: 'FPM',
    name: 'Fan Performance Management',
    shortName: 'Fan Performance',
    description: 'Exhaust fan inspection, belt service, bearing lubrication, and airflow verification',
    parentCode: 'KEC',
    icon: 'Fan',
    color: '#1E2D4D',
    badgeBg: '#EFF6FF',
    badgeText: '#1E2D4D',
    basePrice: 150,
    complianceCodes: ['NFPA96-CH11'],
    defaultFrequency: 'quarterly',
    nfpaCitation: 'NFPA 96 Chapter 11',
    catalogId: 'fan_performance',
  },
  GFX: {
    code: 'GFX',
    name: 'Grease Filter Exchange',
    shortName: 'Filter Exchange',
    description: 'Scheduled replacement of hood baffle filters with professionally cleaned certified units',
    parentCode: 'KEC',
    icon: 'Filter',
    color: '#166534',
    badgeBg: '#F0FDF4',
    badgeText: '#166534',
    basePrice: 75,
    complianceCodes: ['NFPA96-CH9', 'CWA-402'],
    defaultFrequency: 'monthly',
    nfpaCitation: 'NFPA 96 Chapter 9',
    catalogId: 'filter_exchange',
  },
  RGC: {
    code: 'RGC',
    name: 'Rooftop Grease Containment',
    shortName: 'Rooftop Containment',
    description: 'Containment system service for exhaust fan rooftop discharge — protects roof membrane',
    parentCode: 'KEC',
    icon: 'Shield',
    color: '#6B21A8',
    badgeBg: '#FAF5FF',
    badgeText: '#6B21A8',
    basePrice: 125,
    complianceCodes: ['NFPA96-CH11', 'CWA-402'],
    defaultFrequency: 'quarterly',
    nfpaCitation: 'NFPA 96 Chapter 11',
    catalogId: 'rooftop_grease',
  },
  FS: {
    code: 'FS',
    name: 'Fire Suppression System',
    shortName: 'Fire Suppression',
    description: 'Semi-annual inspection and certification of UL-300 wet chemical fire suppression system',
    parentCode: null,
    icon: 'ShieldAlert',
    color: '#991B1B',
    badgeBg: '#FEF2F2',
    badgeText: '#991B1B',
    basePrice: 350,
    complianceCodes: ['NFPA96-CH10', 'NFPA17A', 'UL-300'],
    defaultFrequency: 'semi_annual',
    nfpaCitation: 'NFPA 96 Chapter 10 / NFPA 17A',
    catalogId: null,
  },
};

/**
 * Maps HoodOps service_type_code to EvidLY PSE safeguard_type.
 * KEC → hood_cleaning, FS → fire_suppression.
 * FPM/GFX/RGC are KEC children — not standalone PSE safeguards.
 */
export const SERVICE_CODE_TO_SAFEGUARD: Record<ServiceTypeCode, string | null> = {
  KEC: 'hood_cleaning',
  FS:  'fire_suppression',
  FPM: null,
  GFX: null,
  RGC: null,
};

/** PSE safeguard configuration with NFPA references and linked service codes */
export const PSE_SAFEGUARD_CONFIG = [
  { key: 'hood_cleaning',    label: 'Hood Cleaning',           code: 'NFPA 96-2024 Table 12.4', service_codes: ['KEC'] as ServiceTypeCode[] },
  { key: 'fire_suppression', label: 'Fire Suppression System', code: 'NFPA 96',                 service_codes: ['FS']  as ServiceTypeCode[] },
  { key: 'fire_alarm',       label: 'Fire Alarm System',       code: 'NFPA 72',                 service_codes: []      as ServiceTypeCode[] },
  { key: 'sprinklers',       label: 'Sprinkler System',        code: 'NFPA 25',                 service_codes: []      as ServiceTypeCode[] },
] as const;

/** All service type codes in display order */
export const SERVICE_TYPE_CODES: ServiceTypeCode[] = ['KEC', 'FPM', 'GFX', 'RGC', 'FS'];

/** KEC child service codes */
export const KEC_CHILDREN: ServiceTypeCode[] = ['FPM', 'GFX', 'RGC'];

// ── Helpers ────────────────────────────────────────────────

const FREQUENCY_LABELS: Record<ServiceFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
};

const FREQUENCY_PER_YEAR: Record<ServiceFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  semi_annual: 2,
  annual: 1,
};

/** Format a frequency enum into a display label */
export function formatFrequency(freq: ServiceFrequency): string {
  return FREQUENCY_LABELS[freq] || freq;
}

/** Get the number of services per year for a given frequency */
export function servicesPerYear(freq: ServiceFrequency): number {
  return FREQUENCY_PER_YEAR[freq] || 1;
}

/** Project annual cost from a per-visit price and frequency */
export function projectAnnualCost(pricePerVisit: number, freq: ServiceFrequency): number {
  return pricePerVisit * servicesPerYear(freq);
}

/**
 * Calculate cost for a specific reporting period.
 * Period is expressed as months (1=monthly, 3=quarterly, 6=semi-annual, 12=annual).
 */
export function calculatePeriodCost(
  pricePerVisit: number,
  freq: ServiceFrequency,
  periodMonths: number,
): number {
  const annual = projectAnnualCost(pricePerVisit, freq);
  return Math.round((annual * periodMonths) / 12);
}

/**
 * Determine service status based on next due date.
 * - current: > 30 days until due
 * - due_soon: 1-30 days until due
 * - overdue: past due
 * - not_tracked: no due date
 */
export function getServiceStatus(nextDueDate: string | null | undefined): ServiceStatus {
  if (!nextDueDate) return 'not_tracked';
  const now = new Date();
  const due = new Date(nextDueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 30) return 'due_soon';
  return 'current';
}

/** Status label for display */
export const STATUS_LABELS: Record<ServiceStatus, string> = {
  current: 'Current',
  due_soon: 'Due Soon',
  overdue: 'Overdue',
  not_tracked: 'Not Tracked',
};

/** Status colors for badges */
export const STATUS_COLORS: Record<ServiceStatus, { bg: string; text: string; dot: string }> = {
  current: { bg: '#F0FDF4', text: '#166534', dot: '#22C55E' },
  due_soon: { bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B' },
  overdue: { bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444' },
  not_tracked: { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
};
