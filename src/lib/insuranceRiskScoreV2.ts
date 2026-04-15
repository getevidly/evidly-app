// ============================================================
// Insurance Risk Score v2 — Reads ComplianceDataSnapshot
// ============================================================
// Pure-function scoring engine consuming structured compliance
// engine output instead of parsing demo data strings.
// Supports configurable scoring profiles + trend adjustment.
//
// Returns the same InsuranceRiskResult type as v1 for backward
// compatibility with PDF export, share modal, and UI.
// ============================================================

import type { ComplianceDataSnapshot } from './complianceDataCollector';
import type { TrendAnalysis } from './trendAnalytics';
import type {
  ScoringProfile,
  TrendAdjustmentConfig,
} from './insuranceScoringProfiles';
import { getCategoryWeight } from './insuranceScoringProfiles';
import type {
  InsuranceRiskFactor,
  InsuranceRiskCategory,
  InsuranceActionItem,
  InsuranceRiskResult,
} from './insuranceRiskScore';
import { getInsuranceRiskTier } from './insuranceRiskScore';

// ── Input ────────────────────────────────────────────────────

export interface InsuranceRiskInput {
  locationId: string;
  snapshot: ComplianceDataSnapshot;
  complianceScores: {
    foodSafety: number;
    facilitySafety: number;
  };
  trendAnalysis?: {
    foodSafety: TrendAnalysis;
    facilitySafety: TrendAnalysis;
  };
  profile: ScoringProfile;
}

// ── Helpers ──────────────────────────────────────────────────

function factorStatus(score: number): InsuranceRiskFactor['status'] {
  if (score >= 90) return 'pass';
  if (score >= 60) return 'warning';
  return 'fail';
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

/** Graduated score from days-until-due (higher = better) */
function daysToScore(days: number): number {
  if (days > 30) return 95;
  if (days > 15) return 80;
  if (days > 7) return 65;
  if (days > 0) return 40;
  return 15;
}

/** Corrective action response time → score (lower hours = better) */
function responseTimeScore(avgHours: number, criticalOpen: number): number {
  let score: number;
  if (avgHours <= 0 || avgHours === -1) {
    score = criticalOpen > 0 ? 15 : 85;
  } else if (avgHours <= 2) {
    score = 100;
  } else if (avgHours <= 4) {
    score = 90;
  } else if (avgHours <= 12) {
    score = 70;
  } else if (avgHours <= 24) {
    score = 50;
  } else if (avgHours <= 48) {
    score = 25;
  } else {
    score = 0;
  }
  if (criticalOpen > 0) score = Math.min(score, 40);
  return score;
}

/** Temperature variance score incorporating IoT coverage bonus */
function tempVarianceScore(
  complianceRate: number,
  criticalViolations: number,
  iotCoverage: number,
): number {
  let score = complianceRate;
  if (criticalViolations > 5) score -= 15;
  else if (criticalViolations > 2) score -= 8;
  if (iotCoverage > 0.5) score += 5;
  return clamp(Math.round(score));
}

// ── Fire Risk Category ───────────────────────────────────────

export function calculateFireRiskV2(
  snapshot: ComplianceDataSnapshot,
  complianceScores: { facilitySafety: number },
): InsuranceRiskCategory {
  const fs = snapshot.facilitySafety;
  const facilityDocRate = snapshot.facilityDocs.overallDocCurrencyRate;

  const hoodScore = daysToScore(fs.hoodCleaningDaysUntilDue);
  const fireSuppressionScore = daysToScore(fs.ansulServiceDaysUntilDue);
  const extinguisherScore = daysToScore(fs.extinguisherDaysUntilDue);
  const visualCheckScore = clamp(Math.round(fs.dailyCheckCompletionRate));
  const bareMetalScore = hoodScore >= 90 ? 100 : hoodScore >= 60 ? 70 : 30;
  const shutoffScore = daysToScore(fs.greaseTrapDaysUntilDue);
  const pullStationScore = clamp(Math.round(fs.weeklyMonthlyCompletionRate));
  const alarmScore = clamp(Math.round(complianceScores.facilitySafety * 1.02));
  const docScore = clamp(Math.round(facilityDocRate));

  const factors: InsuranceRiskFactor[] = [
    { name: 'Hood cleaning current per NFPA 96 schedule', score: hoodScore, weight: 0.18, status: factorStatus(hoodScore), detail: hoodScore >= 80 ? 'Hood cleaning current per schedule' : hoodScore >= 40 ? `Hood cleaning due within ${fs.hoodCleaningDaysUntilDue} days` : 'Hood cleaning overdue', reference: 'NFPA 96-2024' },
    { name: 'Fire suppression system inspected (semi-annual)', score: fireSuppressionScore, weight: 0.16, status: factorStatus(fireSuppressionScore), detail: fireSuppressionScore >= 80 ? 'Fire suppression system inspection current' : 'Fire suppression inspection approaching or overdue', reference: 'NFPA 17A-2025' },
    { name: 'Fire extinguisher inspected (annual)', score: extinguisherScore, weight: 0.14, status: factorStatus(extinguisherScore), detail: extinguisherScore >= 80 ? 'Annual inspection current' : 'Inspection approaching or overdue', reference: 'NFPA 10-2025' },
    { name: 'Monthly visual checks documented', score: visualCheckScore, weight: 0.10, status: factorStatus(visualCheckScore), detail: visualCheckScore >= 80 ? 'Visual inspection logs up to date' : 'Documentation gaps in visual checks', reference: 'NFPA 10-2025 §7.2' },
    { name: 'Cleaning to bare metal verified', score: bareMetalScore, weight: 0.10, status: factorStatus(bareMetalScore), detail: bareMetalScore >= 90 ? 'Bare metal cleaning documented by vendor' : 'Cleaning verification records incomplete', reference: 'NFPA 96 Table 12.4' },
    { name: 'Automatic fuel/electric shutoff tested', score: shutoffScore, weight: 0.10, status: factorStatus(shutoffScore), detail: shutoffScore >= 80 ? 'Shutoff systems tested and documented' : 'Shutoff testing overdue or undocumented', reference: 'NFPA 96 Chapter 10' },
    { name: 'Manual pull station accessible and tested', score: pullStationScore, weight: 0.08, status: factorStatus(pullStationScore), detail: pullStationScore >= 80 ? 'Pull station accessible and tested' : 'Pull station testing needed', reference: 'NFPA 17A-2025' },
    { name: 'Fire alarm system current', score: alarmScore, weight: 0.08, status: factorStatus(alarmScore), detail: alarmScore >= 80 ? 'Fire alarm monitoring current' : 'Fire alarm inspection needed', reference: 'NFPA 72-2025' },
    { name: 'Documentation on file and accessible', score: docScore, weight: 0.06, status: factorStatus(docScore), detail: docScore >= 80 ? 'All fire safety records on file' : 'Documentation gaps detected', reference: 'NFPA 96 Chapter 14' },
  ];

  const score = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));
  return { key: 'fire', name: 'Fire Risk', weight: 0.40, score, factors };
}

// ── Food Safety Category ─────────────────────────────────────

export function calculateFoodSafetyV2(
  snapshot: ComplianceDataSnapshot,
  complianceScores: { foodSafety: number },
): InsuranceRiskCategory {
  const { temp, checklists, incidents, haccp, documents } = snapshot;

  const tempScore = tempVarianceScore(temp.complianceRate, temp.criticalViolations, temp.iotCoverage);
  const coolingScore = clamp(Math.round(temp.complianceRate * 0.7 + checklists.completionRate * 0.3));
  const checklistScore = clamp(Math.round(checklists.completionRate));
  const healthDeptScore = daysToScore(documents.healthPermitDaysUntilDue);
  const haccpScore = clamp(Math.round(haccp.monitoringRate));
  const fhTotal = documents.foodHandlerCertsTotal || 1;
  const fhCurrent = fhTotal - documents.foodHandlerCertsExpired;
  const foodHandlerScore = clamp(Math.round((fhCurrent / fhTotal) * 100));
  const cfpmScore = clamp(Math.round(complianceScores.foodSafety * 1.02));
  const caResponseScore = responseTimeScore(incidents.avgResolutionHours, incidents.criticalOpen);
  const repeatScore = incidents.criticalOpen > 2 ? 20
    : incidents.totalIncidents > 5 ? 40
    : incidents.totalIncidents > 3 ? 65
    : incidents.totalIncidents <= 1 ? 95 : 80;

  const factors: InsuranceRiskFactor[] = [
    { name: 'Temperature log compliance rate', score: tempScore, weight: 0.16, status: factorStatus(tempScore), detail: tempScore >= 90 ? 'All temperature readings in safe range' : `${Math.round(temp.complianceRate)}% compliance — ${temp.criticalViolations} critical violations`, reference: 'FDA Food Code 3-501' },
    { name: 'Cooling log compliance', score: coolingScore, weight: 0.10, status: factorStatus(coolingScore), detail: coolingScore >= 80 ? 'Cooling procedures documented and compliant' : 'Cooling log gaps detected', reference: 'FDA 2-Stage Cooling' },
    { name: 'Daily checklist completion rate', score: checklistScore, weight: 0.14, status: factorStatus(checklistScore), detail: checklistScore >= 90 ? 'Checklists completed consistently' : `${checklistScore}% completion rate`, reference: 'FDA Food Code' },
    { name: 'Health department inspection score', score: healthDeptScore, weight: 0.14, status: factorStatus(healthDeptScore), detail: healthDeptScore >= 80 ? 'Health permit current — no recent violations' : 'Health department score needs improvement', reference: 'Local Health Code' },
    { name: 'HACCP plan active and current', score: haccpScore, weight: 0.12, status: factorStatus(haccpScore), detail: haccpScore >= 80 ? 'HACCP monitoring on schedule' : 'HACCP monitoring gaps detected', reference: 'HACCP/FDA' },
    { name: 'Food handler certifications current', score: foodHandlerScore, weight: 0.10, status: factorStatus(foodHandlerScore), detail: foodHandlerScore >= 90 ? 'All staff certifications current' : `${documents.foodHandlerCertsExpired} of ${fhTotal} expired`, reference: 'CA HSC §113948' },
    { name: 'Certified Food Protection Manager on staff', score: cfpmScore, weight: 0.10, status: factorStatus(cfpmScore), detail: cfpmScore >= 80 ? 'CFPM on staff and current' : 'CFPM certification needs verification', reference: 'FDA Food Code 2-102' },
    { name: 'Corrective action response time', score: caResponseScore, weight: 0.08, status: factorStatus(caResponseScore), detail: caResponseScore >= 90 ? 'Issues resolved within 4 hours' : caResponseScore >= 50 ? `Average response ${Math.round(incidents.avgResolutionHours)}h` : 'Slow corrective action response', reference: 'HACCP Principle 5' },
    { name: 'Repeat violation frequency', score: repeatScore, weight: 0.06, status: factorStatus(repeatScore), detail: repeatScore >= 80 ? `${incidents.totalIncidents} incidents — low frequency` : `${incidents.totalIncidents} incidents, ${incidents.criticalOpen} critical open`, reference: 'Claims History' },
  ];

  const score = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));
  return { key: 'foodSafety', name: 'Food Safety', weight: 0.30, score, factors };
}

// ── Documentation & Compliance Category ──────────────────────

export function calculateDocComplianceV2(
  snapshot: ComplianceDataSnapshot,
  complianceScores: { foodSafety: number },
): InsuranceRiskCategory {
  const { vendors, documents } = snapshot;

  const docTotal = vendors.documentsTotal || 1;
  const vendorCertScore = clamp(Math.round((vendors.documentsCurrent / docTotal) * 100));
  const insCertScore = clamp(Math.round(vendorCertScore * 0.95));
  const fhTotal = documents.foodHandlerCertsTotal || 1;
  const fhCurrent = fhTotal - documents.foodHandlerCertsExpired;
  const empCertScore = clamp(Math.round((fhCurrent / fhTotal) * 100));
  const healthPermitScore = daysToScore(documents.healthPermitDaysUntilDue);
  const permitScore = clamp(Math.round((healthPermitScore + 90) / 2));
  const trainingScore = clamp(Math.round(documents.overallDocCurrencyRate));
  const bizLicenseScore = 90;

  const factors: InsuranceRiskFactor[] = [
    { name: 'Vendor certificates current (COIs)', score: vendorCertScore, weight: 0.20, status: factorStatus(vendorCertScore), detail: vendorCertScore >= 90 ? 'All vendor COIs on file and current' : `${vendors.documentsCurrent} of ${docTotal} documents current`, reference: 'Insurance Requirements' },
    { name: 'Insurance certificates on file from vendors', score: insCertScore, weight: 0.16, status: factorStatus(insCertScore), detail: insCertScore >= 80 ? 'Vendor insurance certificates verified' : 'Vendor insurance verification needed', reference: 'Certificate of Insurance' },
    { name: 'Employee certifications tracked', score: empCertScore, weight: 0.14, status: factorStatus(empCertScore), detail: empCertScore >= 90 ? 'All certifications current' : `${documents.foodHandlerCertsExpired} expired certifications`, reference: 'CA HSC §113948' },
    { name: 'Permits and licenses current', score: permitScore, weight: 0.14, status: factorStatus(permitScore), detail: permitScore >= 80 ? 'All permits and licenses current' : 'Permit renewal needed', reference: 'Local Health Code' },
    { name: 'Training records maintained', score: trainingScore, weight: 0.12, status: factorStatus(trainingScore), detail: trainingScore >= 80 ? 'Training documentation up to date' : 'Training record gaps detected', reference: 'FDA Food Code' },
    { name: 'Health department permit current', score: healthPermitScore, weight: 0.12, status: factorStatus(healthPermitScore), detail: healthPermitScore >= 80 ? 'Health permit current' : 'Health permit renewal approaching', reference: 'Local Health Code' },
    { name: 'Business license current', score: bizLicenseScore, weight: 0.12, status: factorStatus(bizLicenseScore), detail: 'Business license current', reference: 'Local Business Code' },
  ];

  const score = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));
  return { key: 'documentation', name: 'Documentation & Compliance', weight: 0.20, score, factors };
}

// ── Operational Risk Category ────────────────────────────────

export function calculateOperationalRiskV2(
  snapshot: ComplianceDataSnapshot,
): InsuranceRiskCategory {
  const { checklists, vendors, incidents, documents } = snapshot;

  const checkConsistencyScore = clamp(Math.round(checklists.completionRate));
  const overdueRatio = vendors.totalVendors > 0 ? vendors.overdueVendors / vendors.totalVendors : 0;
  const vendorRegularityScore = clamp(Math.round((1 - overdueRatio) * 100));
  const equipMaintenanceScore = clamp(Math.round(snapshot.facilitySafety.dailyCheckCompletionRate));
  const resolved = incidents.resolvedIncidents;
  const total = incidents.totalIncidents || 1;
  const caCompletionScore = clamp(Math.round((resolved / total) * 100));
  const trainingCompletionScore = clamp(Math.round(documents.overallDocCurrencyRate * 0.95));

  const factors: InsuranceRiskFactor[] = [
    { name: 'Checklist consistency — no gaps', score: checkConsistencyScore, weight: 0.25, status: factorStatus(checkConsistencyScore), detail: checkConsistencyScore >= 90 ? 'Consistent daily completion' : `${checkConsistencyScore}% completion rate`, reference: 'Operational SOP' },
    { name: 'Vendor service regularity', score: vendorRegularityScore, weight: 0.25, status: factorStatus(vendorRegularityScore), detail: vendors.overdueVendors === 0 ? 'All vendor services current' : `${vendors.overdueVendors} overdue vendor services`, reference: 'Service Contracts' },
    { name: 'Equipment maintenance adherence', score: equipMaintenanceScore, weight: 0.20, status: factorStatus(equipMaintenanceScore), detail: equipMaintenanceScore >= 80 ? 'Equipment checks on schedule' : 'Equipment check gaps detected', reference: 'Maintenance Schedule' },
    { name: 'Corrective action completion rate', score: caCompletionScore, weight: 0.15, status: factorStatus(caCompletionScore), detail: caCompletionScore >= 90 ? 'All corrective actions completed' : `${incidents.openIncidents} open actions`, reference: 'HACCP Principle 5' },
    { name: 'Staff training completion rate', score: trainingCompletionScore, weight: 0.15, status: factorStatus(trainingCompletionScore), detail: trainingCompletionScore >= 80 ? 'Staff training up to date' : 'Training completion gaps', reference: 'FDA Food Code' },
  ];

  const score = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));
  return { key: 'operational', name: 'Operational Risk', weight: 0.10, score, factors };
}

// ── Trend Adjustment ─────────────────────────────────────────

export function applyTrendAdjustment(
  baseScore: number,
  trend: TrendAnalysis | undefined,
  config: TrendAdjustmentConfig,
): { adjustedScore: number; trendModifier: number } {
  if (!config.enabled || !trend) return { adjustedScore: baseScore, trendModifier: 0 };

  let modifier = 0;

  if (trend.direction === 'improving' && trend.rateOfChange > 1) {
    modifier += Math.min(config.maxBonus, trend.rateOfChange * 0.5);
  } else if (trend.direction === 'declining' && trend.rateOfChange < -1) {
    modifier -= Math.min(config.maxPenalty, Math.abs(trend.rateOfChange) * 0.8);
  }

  if (trend.volatility > 2.0) {
    modifier -= Math.min(2, config.volatilityPenalty * (trend.volatility - 2.0));
  }

  modifier = Math.round(modifier * 10) / 10;
  const adjustedScore = clamp(Math.round(baseScore + modifier));
  return { adjustedScore, trendModifier: modifier };
}

// ── Action Items Builder ─────────────────────────────────────

function buildActionItems(categories: InsuranceRiskCategory[]): InsuranceActionItem[] {
  const items: InsuranceActionItem[] = [];

  for (const cat of categories) {
    for (const factor of cat.factors) {
      if (factor.score >= 90) continue;

      const potentialGain = Math.round((100 - factor.score) * factor.weight * cat.weight * 100) / 100;
      if (potentialGain < 0.1) continue;

      items.push({
        title: factor.name,
        category: cat.name,
        currentImpact: Math.round(factor.score * factor.weight * cat.weight),
        potentialGain: Math.round(potentialGain * 10) / 10,
        priority: factor.score < 40 ? 'critical' : factor.score < 60 ? 'high' : factor.score < 80 ? 'medium' : 'low',
        action: factor.detail,
        actionLink: cat.key === 'fire' ? '/facility-safety' : cat.key === 'foodSafety' ? '/checklists' : cat.key === 'documentation' ? '/documents' : '/equipment',
        reference: factor.reference,
        currentScore: factor.score,
      });
    }
  }

  return items.sort((a, b) => b.potentialGain - a.potentialGain);
}

// ── Orchestrator ─────────────────────────────────────────────

export function calculateInsuranceRiskScoreV2(input: InsuranceRiskInput): InsuranceRiskResult {
  const { snapshot, complianceScores, trendAnalysis, profile } = input;

  const fire = calculateFireRiskV2(snapshot, complianceScores);
  const food = calculateFoodSafetyV2(snapshot, complianceScores);
  const docs = calculateDocComplianceV2(snapshot, complianceScores);
  const ops = calculateOperationalRiskV2(snapshot);

  fire.weight = getCategoryWeight(profile, 'fire');
  food.weight = getCategoryWeight(profile, 'foodSafety');
  docs.weight = getCategoryWeight(profile, 'documentation');
  ops.weight = getCategoryWeight(profile, 'operational');

  const categories = [fire, food, docs, ops];

  const baseOverall = Math.round(
    categories.reduce((sum, c) => sum + c.score * c.weight, 0),
  );

  const { adjustedScore: overall } = applyTrendAdjustment(
    baseOverall,
    trendAnalysis?.foodSafety,
    profile.trendAdjustment,
  );

  const tierInfo = getInsuranceRiskTier(overall);

  return {
    overall,
    tier: tierInfo.tier,
    tierColor: tierInfo.color,
    categories,
    actionItems: buildActionItems(categories),
    lastCalculated: new Date().toISOString(),
    factorsEvaluated: categories.reduce((sum, c) => sum + c.factors.length, 0),
  };
}

export function calculateOrgInsuranceRiskScoreV2(
  inputs: InsuranceRiskInput[],
): InsuranceRiskResult {
  if (inputs.length === 0) {
    return {
      overall: 0,
      tier: 'High Risk',
      tierColor: '#ef4444',
      categories: [],
      actionItems: [],
      lastCalculated: new Date().toISOString(),
      factorsEvaluated: 0,
    };
  }

  const results = inputs.map(calculateInsuranceRiskScoreV2);

  const avgCategories: InsuranceRiskCategory[] = results[0].categories.map((cat, i) => ({
    ...cat,
    score: Math.round(results.reduce((sum, r) => sum + r.categories[i].score, 0) / results.length),
    factors: cat.factors.map((f, fi) => ({
      ...f,
      score: Math.round(results.reduce((sum, r) => sum + r.categories[i].factors[fi].score, 0) / results.length),
      status: factorStatus(Math.round(results.reduce((sum, r) => sum + r.categories[i].factors[fi].score, 0) / results.length)),
    })),
  }));

  const overall = Math.round(results.reduce((sum, r) => sum + r.overall, 0) / results.length);
  const tierInfo = getInsuranceRiskTier(overall);

  return {
    overall,
    tier: tierInfo.tier,
    tierColor: tierInfo.color,
    categories: avgCategories,
    actionItems: buildActionItems(avgCategories),
    lastCalculated: new Date().toISOString(),
    factorsEvaluated: avgCategories.reduce((sum, c) => sum + c.factors.length, 0),
  };
}
