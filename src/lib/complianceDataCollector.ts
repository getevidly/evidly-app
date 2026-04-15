// ============================================================
// Compliance Data Collector — Aggregates operational data
// ============================================================
// Collects temp logs, checklists, corrective actions, vendor
// services, documents, and fire safety data into a single
// ComplianceDataSnapshot for the engine to score.
//
// Demo mode: reads from existing demo data files
// Live mode: reads from Supabase tables
// ============================================================

import type { FacilitySafetyInputs } from './complianceScoring';

// ── Snapshot Sub-Interfaces ──────────────────────────────────

export interface TempComplianceData {
  totalLogs: number;
  inRangeLogs: number;
  complianceRate: number;           // 0-100
  criticalViolations: number;       // hot hold <135 or cold >41
  iotCoverage: number;              // 0-1 fraction
}

export interface ChecklistComplianceData {
  totalChecklists: number;
  completedChecklists: number;
  completionRate: number;           // 0-100
  averageScore: number;             // 0-100
}

export interface IncidentComplianceData {
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  avgResolutionHours: number;       // -1 if any critical unresolved
  criticalOpen: number;
}

export interface HACCPComplianceData {
  totalCCPs: number;
  monitoredCCPs: number;
  monitoringRate: number;           // 0-100
  deviationCount: number;
}

export interface VendorComplianceData {
  totalVendors: number;
  currentVendors: number;
  overdueVendors: number;
  documentsCurrent: number;
  documentsTotal: number;
}

export interface DocumentComplianceData {
  healthPermitDaysUntilDue: number;
  foodHandlerCertsExpired: number;
  foodHandlerCertsTotal: number;
  overallDocCurrencyRate: number;   // 0-100
}

export interface FacilityDocComplianceData {
  overallDocCurrencyRate: number;   // 0-100
}

// ── Main Snapshot Interface ──────────────────────────────────

export interface ComplianceDataSnapshot {
  locationId: string;               // 'downtown' | 'airport' | 'university'
  countySlug: string;               // 'fresno' | 'merced' | 'stanislaus'
  collectedAt: string;              // ISO timestamp
  temp: TempComplianceData;
  checklists: ChecklistComplianceData;
  incidents: IncidentComplianceData;
  haccp: HACCPComplianceData;
  vendors: VendorComplianceData;
  documents: DocumentComplianceData;
  facilityDocs: FacilityDocComplianceData;
  facilitySafety: FacilitySafetyInputs;
}

// ── Location Mapping ─────────────────────────────────────────

const LOCATION_COUNTY_MAP: Record<string, string> = {
  downtown: 'fresno',
  airport: 'merced',
  university: 'stanislaus',
};

// ── Demo Data Snapshots (calibrated to match target scores) ──
//
// Target pillar scores (from existing demo data):
//   Downtown:   foodSafety=96,  facilitySafety=92
//   Airport:    foodSafety=84,  facilitySafety=79
//   University: foodSafety=72,  facilitySafety=64
//
// Pillar = round((ops + docs) / 2)
//
// Food Safety Ops = f(temp, checklists, haccp, incidents) with
//   renormalized weights: temp=0.333, check=0.278, haccp=0.222, incident=0.167
// Food Safety Docs = documents.overallDocCurrencyRate
// Fire Safety Ops = calculateFacilitySafetyScore(facilitySafety inputs)
// Fire Safety Docs = facilityDocs.overallDocCurrencyRate

const DEMO_SNAPSHOTS: Record<string, Omit<ComplianceDataSnapshot, 'collectedAt'>> = {
  // ── Downtown (Location 1, Fresno County) ──
  // Target: food ops=97, docs=94 → pillar=96; facility ops=88, docs=95 → pillar=92
  downtown: {
    locationId: 'downtown',
    countySlug: 'fresno',
    temp: {
      totalLogs: 540,         // 30 days × 6 readings × 3 equipment
      inRangeLogs: 524,       // 97.0% compliance
      complianceRate: 97,
      criticalViolations: 2,
      iotCoverage: 0.3,
    },
    checklists: {
      totalChecklists: 90,    // 30 days × 3 per day
      completedChecklists: 86,
      completionRate: 96,
      averageScore: 95,
    },
    incidents: {
      totalIncidents: 3,
      openIncidents: 0,
      resolvedIncidents: 3,
      avgResolutionHours: 1.5,
      criticalOpen: 0,
    },
    haccp: {
      totalCCPs: 6,
      monitoredCCPs: 6,
      monitoringRate: 98,
      deviationCount: 1,
    },
    vendors: {
      totalVendors: 6,
      currentVendors: 6,
      overdueVendors: 0,
      documentsCurrent: 6,
      documentsTotal: 6,
    },
    documents: {
      healthPermitDaysUntilDue: 60,
      foodHandlerCertsExpired: 0,
      foodHandlerCertsTotal: 5,
      overallDocCurrencyRate: 94,
    },
    facilityDocs: {
      overallDocCurrencyRate: 95,
    },
    facilitySafety: {
      hoodCleaningDaysUntilDue: 45,
      ansulServiceDaysUntilDue: 32,
      extinguisherDaysUntilDue: 60,
      dailyCheckCompletionRate: 82,
      weeklyMonthlyCompletionRate: 58,
      greaseTrapDaysUntilDue: 20,
    },
  },

  // ── Airport (Location 2, Merced County) ──
  // Target: food ops=88, docs=80 → pillar=84; facility ops=75, docs=82 → pillar=79
  airport: {
    locationId: 'airport',
    countySlug: 'merced',
    temp: {
      totalLogs: 540,
      inRangeLogs: 454,       // 84% compliance
      complianceRate: 84,
      criticalViolations: 8,
      iotCoverage: 0.15,
    },
    checklists: {
      totalChecklists: 90,
      completedChecklists: 77,
      completionRate: 86,
      averageScore: 85,
    },
    incidents: {
      totalIncidents: 5,
      openIncidents: 1,
      resolvedIncidents: 4,
      avgResolutionHours: 4,
      criticalOpen: 1,
    },
    haccp: {
      totalCCPs: 6,
      monitoredCCPs: 6,
      monitoringRate: 92,
      deviationCount: 3,
    },
    vendors: {
      totalVendors: 6,
      currentVendors: 4,
      overdueVendors: 1,
      documentsCurrent: 4,
      documentsTotal: 6,
    },
    documents: {
      healthPermitDaysUntilDue: 30,
      foodHandlerCertsExpired: 1,
      foodHandlerCertsTotal: 5,
      overallDocCurrencyRate: 80,
    },
    facilityDocs: {
      overallDocCurrencyRate: 82,
    },
    facilitySafety: {
      hoodCleaningDaysUntilDue: 12,
      ansulServiceDaysUntilDue: 22,
      extinguisherDaysUntilDue: 45,
      dailyCheckCompletionRate: 78,
      weeklyMonthlyCompletionRate: 62,
      greaseTrapDaysUntilDue: 8,
    },
  },

  // ── University (Location 3, Stanislaus County) ──
  // Target: food ops=74, docs=69 → pillar=72; facility ops=60, docs=67 → pillar=64
  university: {
    locationId: 'university',
    countySlug: 'stanislaus',
    temp: {
      totalLogs: 540,
      inRangeLogs: 351,       // 65% compliance
      complianceRate: 65,
      criticalViolations: 18,
      iotCoverage: 0.0,
    },
    checklists: {
      totalChecklists: 90,
      completedChecklists: 65,
      completionRate: 72,
      averageScore: 70,
    },
    incidents: {
      totalIncidents: 8,
      openIncidents: 3,
      resolvedIncidents: 5,
      avgResolutionHours: 12,
      criticalOpen: 1,
    },
    haccp: {
      totalCCPs: 6,
      monitoredCCPs: 5,
      monitoringRate: 85,
      deviationCount: 6,
    },
    vendors: {
      totalVendors: 6,
      currentVendors: 3,
      overdueVendors: 2,
      documentsCurrent: 3,
      documentsTotal: 6,
    },
    documents: {
      healthPermitDaysUntilDue: 10,
      foodHandlerCertsExpired: 2,
      foodHandlerCertsTotal: 4,
      overallDocCurrencyRate: 69,
    },
    facilityDocs: {
      overallDocCurrencyRate: 67,
    },
    facilitySafety: {
      hoodCleaningDaysUntilDue: 5,
      ansulServiceDaysUntilDue: 12,
      extinguisherDaysUntilDue: 25,
      dailyCheckCompletionRate: 55,
      weeklyMonthlyCompletionRate: 40,
      greaseTrapDaysUntilDue: -3,
    },
  },
};

// ── Public API ───────────────────────────────────────────────

/**
 * Collect compliance data for a single location.
 * In demo mode, returns calibrated static data.
 * In live mode, queries Supabase tables (TODO: implement).
 */
export function collectComplianceData(
  locationId: string,
  options?: { isDemoMode?: boolean },
): ComplianceDataSnapshot {
  const isDemoMode = options?.isDemoMode ?? true;

  if (isDemoMode) {
    return collectDemoData(locationId);
  }

  // Live mode placeholder — returns empty snapshot
  // TODO: query Supabase tables for real operational data
  return buildEmptySnapshot(locationId);
}

/**
 * Collect compliance data for all demo locations.
 */
export function collectAllDemoData(): Record<string, ComplianceDataSnapshot> {
  const result: Record<string, ComplianceDataSnapshot> = {};
  for (const locId of Object.keys(DEMO_SNAPSHOTS)) {
    result[locId] = collectDemoData(locId);
  }
  return result;
}

/**
 * Get the county slug for a location.
 */
export function getCountyForLocation(locationId: string): string {
  return LOCATION_COUNTY_MAP[locationId] ?? 'generic';
}

// ── Internal Helpers ─────────────────────────────────────────

function collectDemoData(locationId: string): ComplianceDataSnapshot {
  const snapshot = DEMO_SNAPSHOTS[locationId];
  if (!snapshot) {
    return buildEmptySnapshot(locationId);
  }
  return {
    ...snapshot,
    collectedAt: new Date().toISOString(),
  };
}

function buildEmptySnapshot(locationId: string): ComplianceDataSnapshot {
  return {
    locationId,
    countySlug: LOCATION_COUNTY_MAP[locationId] ?? 'generic',
    collectedAt: new Date().toISOString(),
    temp: { totalLogs: 0, inRangeLogs: 0, complianceRate: 0, criticalViolations: 0, iotCoverage: 0 },
    checklists: { totalChecklists: 0, completedChecklists: 0, completionRate: 0, averageScore: 0 },
    incidents: { totalIncidents: 0, openIncidents: 0, resolvedIncidents: 0, avgResolutionHours: -1, criticalOpen: 0 },
    haccp: { totalCCPs: 0, monitoredCCPs: 0, monitoringRate: 0, deviationCount: 0 },
    vendors: { totalVendors: 0, currentVendors: 0, overdueVendors: 0, documentsCurrent: 0, documentsTotal: 0 },
    documents: { healthPermitDaysUntilDue: 0, foodHandlerCertsExpired: 0, foodHandlerCertsTotal: 0, overallDocCurrencyRate: 0 },
    facilityDocs: { overallDocCurrencyRate: 0 },
    facilitySafety: {
      hoodCleaningDaysUntilDue: 0,
      ansulServiceDaysUntilDue: 0,
      extinguisherDaysUntilDue: 0,
      dailyCheckCompletionRate: 0,
      weeklyMonthlyCompletionRate: 0,
      greaseTrapDaysUntilDue: 0,
    },
  };
}
