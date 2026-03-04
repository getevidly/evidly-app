// ============================================================
// Compliance Score Calculation Engine (GAP-02)
// ============================================================
// Continuous scoring engine that reads operational data and
// computes compliance scores using jurisdiction-native methodology.
//
// Data flow:
//   ComplianceDataSnapshot → Engine → ComplianceEngineResult
//     ├─ EvidLY Internal Scores (Food Safety + Facility Safety)
//     ├─ Jurisdiction Overlay (county-specific grade)
//     └─ Dynamic ScoreImpactItems (replaces static demoData)
// ============================================================

import type { ScoreImpactItem } from '../data/demoData';
import type { ComplianceDataSnapshot } from './complianceDataCollector';
import {
  calculateFoodSafetyScore,
  calculateFacilitySafetyScore,
  buildFacilitySafetyItems,
  incidentResolutionScore,
  type FoodSafetyData,
} from './complianceScoring';
import {
  calculateJurisdictionScore,
  type JurisdictionScoreResult,
} from './jurisdictionScoring';

// ── Result Interface ─────────────────────────────────────────

export interface ComplianceEngineResult {
  locationId: string;
  countySlug: string;
  engineVersion: string;              // '2.0'
  calculatedAt: string;               // ISO timestamp

  // EvidLY Internal Scores (0-100)
  foodSafetyScore: number;            // round((ops + docs) / 2)
  facilitySafetyScore: number;        // round((ops + docs) / 2)

  // Sub-scores for drill-down
  foodSafetyOps: number;
  foodSafetyDocs: number;
  facilitySafetyOps: number;
  facilitySafetyDocs: number;

  // Jurisdiction Overlay
  jurisdictionResult: JurisdictionScoreResult;

  // Dynamically derived impact items
  scoreImpactItems: ScoreImpactItem[];

  // Input snapshot (for audit trail)
  dataSnapshot: ComplianceDataSnapshot;
}

// ── Food Safety Ops Weights (renormalized without docs) ──────

const FS_OPS_WEIGHTS = {
  temp: 0.333,
  checklists: 0.278,
  haccp: 0.222,
  incidents: 0.167,
};

// ── Main Engine Function ─────────────────────────────────────

/**
 * Compute a full compliance snapshot for a single location.
 *
 * 1. Compute Food Safety Ops from temp + checklists + HACCP + incidents
 * 2. Compute Food Safety Docs from document currency rate
 * 3. Compute Facility Safety Ops from calculateFacilitySafetyScore()
 * 4. Compute Facility Safety Docs from facility doc currency
 * 5. Blend ops + docs into pillar scores (simple average)
 * 6. Derive ScoreImpactItems for jurisdiction scoring
 * 7. Feed through calculateJurisdictionScore() for jurisdiction overlay
 */
export function computeComplianceSnapshot(
  locationId: string,
  snapshot: ComplianceDataSnapshot,
  countySlug: string,
): ComplianceEngineResult {
  // ── 1. Food Safety Ops Score ──
  const fsOps = computeFoodSafetyOps(snapshot);

  // ── 2. Food Safety Docs Score ──
  const fsDocs = snapshot.documents.overallDocCurrencyRate;

  // ── 3. Facility Safety Ops Score ──
  const facilityItems = buildFacilitySafetyItems(snapshot.facilitySafety);
  const facOps = calculateFacilitySafetyScore(facilityItems);

  // ── 4. Facility Safety Docs Score ──
  const facDocs = snapshot.facilityDocs.overallDocCurrencyRate;

  // ── 5. Pillar Scores (simple average of ops + docs) ──
  const foodSafetyScore = Math.round((fsOps + fsDocs) / 2);
  const facilitySafetyScore = Math.round((facOps + facDocs) / 2);

  // ── 6. Derive ScoreImpactItems ──
  const scoreImpactItems = deriveScoreImpactItems(snapshot, locationId);

  // ── 7. Jurisdiction Overlay ──
  const jurisdictionResult = calculateJurisdictionScore(scoreImpactItems, countySlug);

  return {
    locationId,
    countySlug,
    engineVersion: '2.0',
    calculatedAt: new Date().toISOString(),
    foodSafetyScore,
    facilitySafetyScore,
    foodSafetyOps: fsOps,
    foodSafetyDocs: fsDocs,
    facilitySafetyOps: facOps,
    facilitySafetyDocs: facDocs,
    jurisdictionResult,
    scoreImpactItems,
    dataSnapshot: snapshot,
  };
}

/**
 * Compute all location results at once and derive org-level scores.
 */
export function computeAllSnapshots(
  snapshots: Record<string, ComplianceDataSnapshot>,
): Record<string, ComplianceEngineResult> {
  const results: Record<string, ComplianceEngineResult> = {};
  for (const [locId, snapshot] of Object.entries(snapshots)) {
    results[locId] = computeComplianceSnapshot(locId, snapshot, snapshot.countySlug);
  }
  return results;
}

/**
 * Compute org-level scores by averaging location scores.
 */
export function computeOrgScores(
  results: Record<string, ComplianceEngineResult>,
): { overall: number | null; foodSafety: number; facilitySafety: number } {
  const entries = Object.values(results);
  if (entries.length === 0) {
    return { overall: null, foodSafety: 0, facilitySafety: 0 };
  }

  const foodSafety = Math.round(
    entries.reduce((sum, r) => sum + r.foodSafetyScore, 0) / entries.length,
  );
  const facilitySafety = Math.round(
    entries.reduce((sum, r) => sum + r.facilitySafetyScore, 0) / entries.length,
  );
  const overall = Math.round((foodSafety + facilitySafety) / 2);

  return { overall, foodSafety, facilitySafety };
}

// ── Food Safety Ops Calculation ──────────────────────────────

function computeFoodSafetyOps(snapshot: ComplianceDataSnapshot): number {
  const incScore = incidentResolutionScore(snapshot.incidents.avgResolutionHours);

  const score =
    snapshot.temp.complianceRate * FS_OPS_WEIGHTS.temp +
    snapshot.checklists.completionRate * FS_OPS_WEIGHTS.checklists +
    snapshot.haccp.monitoringRate * FS_OPS_WEIGHTS.haccp +
    incScore * FS_OPS_WEIGHTS.incidents;

  return Math.round(Math.max(0, Math.min(100, score)));
}

// ── ScoreImpactItem Derivation ───────────────────────────────
//
// Maps operational data into ScoreImpactItem[] with labels that
// match LABEL_PATTERNS in violationMapping.ts for jurisdiction scoring.

// Location ID mapping: demoData uses numeric '1','2','3' for scoreImpactData
const LOCATION_NUMERIC_MAP: Record<string, string> = {
  downtown: '1',
  airport: '2',
  university: '3',
};

type ImpactStatus = 'current' | 'due_soon' | 'overdue' | 'expired' | 'missing';

function toStatus(rate: number, thresholds: { good: number; warn: number }): ImpactStatus {
  if (rate >= thresholds.good) return 'current';
  if (rate >= thresholds.warn) return 'due_soon';
  return 'overdue';
}

function daysToStatus(days: number): ImpactStatus {
  if (days <= 0) return 'expired';
  if (days <= 7) return 'overdue';
  if (days <= 30) return 'due_soon';
  return 'current';
}

/**
 * Derive ScoreImpactItem[] from a ComplianceDataSnapshot.
 *
 * Labels must contain substrings matching violationMapping.ts LABEL_PATTERNS:
 *   'temperature' → temperature mapping
 *   'checklist' → checklist mapping
 *   'haccp' → haccp mapping
 *   'hood cleaning' → hood_cleaning mapping
 *   'fire suppression' → fire_suppression mapping
 *   'health permit' → health_permit mapping
 *   'food handler' → food_handler mapping
 *   'vendor c' → vendor_cert mapping
 *   'grease trap' → grease_trap mapping
 *   'equipment maintenance' → equipment_maintenance mapping
 */
export function deriveScoreImpactItems(
  snapshot: ComplianceDataSnapshot,
  locationId: string,
): ScoreImpactItem[] {
  const numericLocId = LOCATION_NUMERIC_MAP[locationId] ?? locationId;
  const items: ScoreImpactItem[] = [];

  // ── Food Safety Operational Items ──

  // Temperature Logs
  const tempStatus = toStatus(snapshot.temp.complianceRate, { good: 90, warn: 75 });
  const tempMissed = snapshot.temp.totalLogs - snapshot.temp.inRangeLogs;
  items.push({
    status: tempStatus,
    label: tempStatus === 'current'
      ? 'Temperature Logs On Schedule'
      : `Temperature Logs (${tempMissed} out-of-range this period)`,
    impact: `+${snapshot.temp.inRangeLogs} of ${snapshot.temp.totalLogs}`,
    action: tempStatus !== 'current' ? 'Log Now' : null,
    actionLink: tempStatus !== 'current' ? '/temp-logs' : null,
    pillar: 'Food Safety',
    locationId: numericLocId,
  });

  // Checklists Complete
  const checkStatus = toStatus(snapshot.checklists.completionRate, { good: 90, warn: 75 });
  const checkMissed = snapshot.checklists.totalChecklists - snapshot.checklists.completedChecklists;
  items.push({
    status: checkStatus,
    label: checkStatus === 'current'
      ? 'Checklists Complete'
      : `Checklists (${checkMissed} missed this period)`,
    impact: `+${snapshot.checklists.completedChecklists} of ${snapshot.checklists.totalChecklists}`,
    action: checkStatus !== 'current' ? 'Complete Now' : null,
    actionLink: checkStatus !== 'current' ? '/checklists' : null,
    pillar: 'Food Safety',
    locationId: numericLocId,
  });

  // HACCP Monitoring
  const haccpStatus = toStatus(snapshot.haccp.monitoringRate, { good: 90, warn: 75 });
  items.push({
    status: haccpStatus,
    label: haccpStatus === 'current'
      ? 'HACCP Monitoring Active'
      : `HACCP Monitoring (${snapshot.haccp.deviationCount} deviations)`,
    impact: `+${snapshot.haccp.monitoredCCPs} of ${snapshot.haccp.totalCCPs}`,
    action: haccpStatus !== 'current' ? 'Review CCPs' : null,
    actionLink: haccpStatus !== 'current' ? '/haccp' : null,
    pillar: 'Food Safety',
    locationId: numericLocId,
  });

  // Incident Resolution
  const incStatus: ImpactStatus = snapshot.incidents.criticalOpen > 0
    ? 'overdue'
    : snapshot.incidents.openIncidents > 0
    ? 'due_soon'
    : 'current';
  items.push({
    status: incStatus,
    label: incStatus === 'current'
      ? 'Incident Resolution'
      : `Incident Resolution (${snapshot.incidents.openIncidents} open)`,
    impact: `${snapshot.incidents.resolvedIncidents} of ${snapshot.incidents.totalIncidents} resolved`,
    action: incStatus !== 'current' ? 'Review Incidents' : null,
    actionLink: incStatus !== 'current' ? '/corrective-actions' : null,
    pillar: 'Food Safety',
    locationId: numericLocId,
  });

  // ── Food Safety Documentation Items ──

  // Health Permit
  const hpStatus = daysToStatus(snapshot.documents.healthPermitDaysUntilDue);
  items.push({
    status: hpStatus,
    label: 'Health Permit',
    impact: hpStatus === 'current' ? 'Current' : `${snapshot.documents.healthPermitDaysUntilDue}d until due`,
    action: hpStatus !== 'current' ? 'Renew Now' : null,
    actionLink: hpStatus !== 'current' ? '/documents' : null,
    pillar: 'Food Safety',
    locationId: numericLocId,
  });

  // Food Handler Certs
  const fhExpired = snapshot.documents.foodHandlerCertsExpired;
  const fhStatus: ImpactStatus = fhExpired > 0 ? 'overdue' : 'current';
  items.push({
    status: fhStatus,
    label: fhStatus === 'current'
      ? 'Food Handler Certs (All Current)'
      : `Food Handler Certs (${fhExpired} expired)`,
    impact: `${snapshot.documents.foodHandlerCertsTotal - fhExpired} of ${snapshot.documents.foodHandlerCertsTotal} current`,
    action: fhStatus !== 'current' ? 'Renew Certs' : null,
    actionLink: fhStatus !== 'current' ? '/team' : null,
    pillar: 'Food Safety',
    locationId: numericLocId,
  });

  // Vendor Certificates
  const vendorStatus: ImpactStatus = snapshot.vendors.overdueVendors > 0
    ? 'overdue'
    : snapshot.vendors.currentVendors < snapshot.vendors.totalVendors
    ? 'due_soon'
    : 'current';
  items.push({
    status: vendorStatus,
    label: vendorStatus === 'current'
      ? 'Vendor Certificates (All Current)'
      : `Vendor Certificates (${snapshot.vendors.overdueVendors} overdue)`,
    impact: `${snapshot.vendors.documentsCurrent} of ${snapshot.vendors.documentsTotal} current`,
    action: vendorStatus !== 'current' ? 'Request from Vendor' : null,
    actionLink: vendorStatus !== 'current' ? '/vendors' : null,
    pillar: 'Food Safety',
    locationId: numericLocId,
  });

  // ── Facility Safety Items ──

  // Hood Cleaning
  const hoodStatus = daysToStatus(snapshot.facilitySafety.hoodCleaningDaysUntilDue);
  items.push({
    status: hoodStatus,
    label: hoodStatus === 'current'
      ? 'Hood Cleaning'
      : `Hood Cleaning (${Math.abs(snapshot.facilitySafety.hoodCleaningDaysUntilDue)}d ${snapshot.facilitySafety.hoodCleaningDaysUntilDue < 0 ? 'overdue' : 'until due'})`,
    impact: hoodStatus === 'current' ? 'On Schedule' : 'Action Required',
    action: hoodStatus !== 'current' ? 'Schedule Service' : null,
    actionLink: hoodStatus !== 'current' ? '/vendors' : null,
    pillar: 'Facility Safety',
    locationId: numericLocId,
  });

  // Fire Suppression (Ansul)
  const ansulStatus = daysToStatus(snapshot.facilitySafety.ansulServiceDaysUntilDue);
  items.push({
    status: ansulStatus,
    label: ansulStatus === 'current'
      ? 'Fire Suppression'
      : `Fire Suppression (${Math.abs(snapshot.facilitySafety.ansulServiceDaysUntilDue)}d ${snapshot.facilitySafety.ansulServiceDaysUntilDue < 0 ? 'overdue' : 'until due'})`,
    impact: ansulStatus === 'current' ? 'On Schedule' : 'Action Required',
    action: ansulStatus !== 'current' ? 'Schedule Inspection' : null,
    actionLink: ansulStatus !== 'current' ? '/vendors' : null,
    pillar: 'Facility Safety',
    locationId: numericLocId,
  });

  // Equipment Maintenance
  const equipStatus = toStatus(
    snapshot.facilitySafety.dailyCheckCompletionRate,
    { good: 80, warn: 60 },
  );
  items.push({
    status: equipStatus,
    label: equipStatus === 'current'
      ? 'Equipment Maintenance'
      : 'Equipment Maintenance (checks behind)',
    impact: `${Math.round(snapshot.facilitySafety.dailyCheckCompletionRate)}% daily completion`,
    action: equipStatus !== 'current' ? 'Review Schedule' : null,
    actionLink: equipStatus !== 'current' ? '/equipment' : null,
    pillar: 'Facility Safety',
    locationId: numericLocId,
  });

  // Grease Trap
  const gtStatus = daysToStatus(snapshot.facilitySafety.greaseTrapDaysUntilDue);
  items.push({
    status: gtStatus,
    label: gtStatus === 'current'
      ? 'Grease Trap Service'
      : `Grease Trap Service (${Math.abs(snapshot.facilitySafety.greaseTrapDaysUntilDue)}d ${snapshot.facilitySafety.greaseTrapDaysUntilDue < 0 ? 'overdue' : 'until due'})`,
    impact: gtStatus === 'current' ? 'On Schedule' : 'Action Required',
    action: gtStatus !== 'current' ? 'Schedule Service' : null,
    actionLink: gtStatus !== 'current' ? '/vendors' : null,
    pillar: 'Facility Safety',
    locationId: numericLocId,
  });

  return items;
}

// ── Utility: Compute food safety score via the 5-weight function ──
// Exposed for consumers that want the blended score (not ops/docs split)

export function computeFoodSafetyBlended(snapshot: ComplianceDataSnapshot): number {
  const data: FoodSafetyData = {
    tempCheckCompletionRate: snapshot.temp.complianceRate,
    checklistCompletionRate: snapshot.checklists.completionRate,
    incidentResolutionAvgHours: snapshot.incidents.avgResolutionHours,
    haccpMonitoringRate: snapshot.haccp.monitoringRate,
  };
  return calculateFoodSafetyScore(data, snapshot.documents.overallDocCurrencyRate);
}
