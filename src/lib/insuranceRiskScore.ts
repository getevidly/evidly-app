// ============================================================
// Insurance Risk Score — Kitchen risk assessment for carrier conversations
// ============================================================
// Composite score 0-100 (higher = lower risk). Weighted by actual underwriting priority:
//   Fire Risk 40% | Food Safety 30% | Documentation 20% | Operational 10%
//
// IMPORTANT: This score is designed to support insurance conversations.
// It does NOT guarantee premium reductions or carrier acceptance.
// ============================================================

import {
  locationScores,
  scoreImpactData,
  vendors,
  needsAttentionItems,
  locations,
  type ScoreImpactItem,
  type Vendor,
} from '../data/demoData';

// --------------- Types ---------------

export type InsuranceRiskTier = 'Preferred Risk' | 'Standard Risk' | 'Elevated Risk' | 'High Risk';

export interface InsuranceRiskFactor {
  name: string;
  score: number;        // 0-100
  weight: number;       // fraction within category (sums to 1.0)
  status: 'pass' | 'warning' | 'fail' | 'unknown';
  detail: string;
  reference: string;    // standard/regulation reference (e.g. "NFPA 96")
}

export interface InsuranceRiskCategory {
  key: string;
  name: string;
  weight: number;       // 0.40, 0.30, 0.20, 0.10
  score: number;        // 0-100 weighted from factors
  factors: InsuranceRiskFactor[];
}

export interface InsuranceActionItem {
  title: string;
  category: string;
  currentImpact: number;
  potentialGain: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  actionLink: string;
}

export interface InsuranceRiskResult {
  overall: number;
  tier: InsuranceRiskTier;
  tierColor: string;
  categories: InsuranceRiskCategory[];
  actionItems: InsuranceActionItem[];
  lastCalculated: string;
  factorsEvaluated: number;
}

// --------------- Tier Mapping ---------------

export function getInsuranceRiskTier(score: number): { tier: InsuranceRiskTier; color: string; bg: string } {
  if (score >= 90) return { tier: 'Preferred Risk', color: '#22c55e', bg: '#f0fdf4' };
  if (score >= 75) return { tier: 'Standard Risk', color: '#eab308', bg: '#fefce8' };
  if (score >= 60) return { tier: 'Elevated Risk', color: '#f59e0b', bg: '#fffbeb' };
  return { tier: 'High Risk', color: '#ef4444', bg: '#fef2f2' };
}

// --------------- Helpers ---------------

/** Map location urlId to vendor locationId (1=downtown, 2=airport, 3=university) */
function getVendorLocationId(urlId: string): string {
  const loc = locations.find(l => l.urlId === urlId);
  return loc?.id || '1';
}

/** Extract score from impact string like "+21 of 25" → { earned: 21, max: 25, pct: 84 } */
function parseImpact(impact: string): { earned: number; max: number; pct: number } {
  const match = impact.match(/\+?(\d+)\s+of\s+(\d+)/);
  if (!match) return { earned: 0, max: 100, pct: 0 };
  const earned = parseInt(match[1], 10);
  const max = parseInt(match[2], 10);
  return { earned, max, pct: max > 0 ? Math.round((earned / max) * 100) : 0 };
}

/** Get scoreImpactData items for a location + pillar */
function getImpactItems(locationId: string, pillar: ScoreImpactItem['pillar']): ScoreImpactItem[] {
  const vendorLocId = getVendorLocationId(locationId);
  return scoreImpactData.filter(i => i.locationId === vendorLocId && i.pillar === pillar);
}

/** Get vendors for a location by service type */
function getVendor(locationId: string, serviceType: string): Vendor | undefined {
  const vendorLocId = getVendorLocationId(locationId);
  return vendors.find(v => v.locationId === vendorLocId && v.serviceType === serviceType);
}

/** Determine factor status from score */
function factorStatus(score: number): InsuranceRiskFactor['status'] {
  if (score >= 90) return 'pass';
  if (score >= 60) return 'warning';
  return 'fail';
}

// --------------- Fire Risk (40%) ---------------
// Maps to: hood cleaning, fire suppression, fire extinguisher from Equipment pillar
// Plus derived factors for visual checks, bare metal, shutoff, pull station, alarm, docs

export function calculateFireRiskScore(locationId: string): InsuranceRiskCategory {
  const equipItems = getImpactItems(locationId, 'Equipment');
  const hoodVendor = getVendor(locationId, 'Hood Cleaning');
  const fireVendor = getVendor(locationId, 'Fire Suppression');

  // Factor 1: Hood cleaning per NFPA 96
  const hoodItem = equipItems.find(i => i.label.toLowerCase().includes('hood'));
  const hoodImpact = hoodItem ? parseImpact(hoodItem.impact) : { pct: 50 };
  const hoodScore = hoodImpact.pct;
  const hoodDetail = hoodVendor?.status === 'overdue'
    ? `Hood cleaning overdue — last service ${hoodVendor.lastService}`
    : hoodVendor?.status === 'upcoming'
    ? `Hood cleaning due ${hoodVendor.nextDue}`
    : 'Hood cleaning current per schedule';

  // Factor 2: Fire suppression system inspected within 6 months
  const fireItem = equipItems.find(i => i.label.toLowerCase().includes('fire suppression'));
  const fireImpact = fireItem ? parseImpact(fireItem.impact) : { pct: 50 };
  const fireScore = fireImpact.pct;
  const fireDetail = fireVendor?.status === 'overdue'
    ? `Fire suppression inspection overdue — last inspected ${fireVendor.lastService}`
    : 'Fire suppression system inspection current';

  // Factor 3: Fire extinguisher inspected within 12 months
  const extItem = equipItems.find(i => i.label.toLowerCase().includes('extinguisher'));
  const extImpact = extItem ? parseImpact(extItem.impact) : { pct: 75 };
  const extScore = extImpact.pct;

  // Factor 4: Monthly visual checks documented
  // Derive from overall equipment condition and operational consistency
  const locScores = locationScores[locationId];
  const visualCheckScore = locScores ? Math.min(100, Math.round(locScores.equipment * 1.05)) : 50;

  // Factor 5: Cleaning to bare metal verified
  const bareMetalScore = hoodScore >= 90 ? 100 : hoodScore >= 50 ? 70 : 30;

  // Factor 6: Automatic fuel/electric shutoff tested
  const greaseVendor = getVendor(locationId, 'Grease Trap');
  const shutoffScore = greaseVendor?.status === 'overdue' ? 20 :
    greaseVendor?.status === 'upcoming' ? 75 : 95;

  // Factor 7: Manual pull station accessible and tested
  const pullStationScore = locScores ? Math.min(100, Math.round(locScores.equipment * 1.02)) : 50;

  // Factor 8: Fire alarm system current
  const alarmScore = locScores ? Math.min(100, Math.round((locScores.equipment + locScores.documentation) / 2 * 1.05)) : 50;

  // Factor 9: Documentation of all above on file
  const docScore = locScores ? Math.round(locScores.documentation * 0.95) : 50;

  const factors: InsuranceRiskFactor[] = [
    { name: 'Hood cleaning current per NFPA 96 schedule', score: hoodScore, weight: 0.18, status: factorStatus(hoodScore), detail: hoodDetail, reference: 'NFPA 96' },
    { name: 'Fire suppression system inspected (semi-annual)', score: fireScore, weight: 0.16, status: factorStatus(fireScore), detail: fireDetail, reference: 'NFPA 17A' },
    { name: 'Fire extinguisher inspected (annual)', score: extScore, weight: 0.14, status: factorStatus(extScore), detail: extScore >= 90 ? 'Annual inspection current' : 'Inspection approaching or overdue', reference: 'NFPA 10' },
    { name: 'Monthly visual checks documented', score: visualCheckScore, weight: 0.10, status: factorStatus(visualCheckScore), detail: visualCheckScore >= 80 ? 'Visual inspection logs up to date' : 'Documentation gaps in visual checks', reference: 'NFPA 10 §7.2' },
    { name: 'Cleaning to bare metal verified', score: bareMetalScore, weight: 0.10, status: factorStatus(bareMetalScore), detail: bareMetalScore >= 90 ? 'Bare metal cleaning documented by vendor' : 'Cleaning verification records incomplete', reference: 'NFPA 96 §11.4' },
    { name: 'Automatic fuel/electric shutoff tested', score: shutoffScore, weight: 0.10, status: factorStatus(shutoffScore), detail: shutoffScore >= 80 ? 'Shutoff systems tested and documented' : 'Shutoff testing overdue or undocumented', reference: 'NFPA 96 §10.1' },
    { name: 'Manual pull station accessible and tested', score: pullStationScore, weight: 0.08, status: factorStatus(pullStationScore), detail: pullStationScore >= 80 ? 'Pull station accessible and tested' : 'Pull station testing needed', reference: 'NFPA 17A' },
    { name: 'Fire alarm system current', score: alarmScore, weight: 0.08, status: factorStatus(alarmScore), detail: alarmScore >= 80 ? 'Fire alarm monitoring current' : 'Fire alarm inspection needed', reference: 'NFPA 72' },
    { name: 'Documentation on file and accessible', score: docScore, weight: 0.06, status: factorStatus(docScore), detail: docScore >= 80 ? 'All fire safety records on file' : 'Documentation gaps detected', reference: 'NFPA 96 §14.2' },
  ];

  const score = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));
  return { key: 'fire', name: 'Fire Risk', weight: 0.40, score, factors };
}

// --------------- Food Safety (30%) ---------------

export function calculateFoodSafetyScore(locationId: string): InsuranceRiskCategory {
  const opItems = getImpactItems(locationId, 'Operational');
  const docItems = getImpactItems(locationId, 'Documentation');
  const locScores = locationScores[locationId];

  // Factor 1: Temperature log compliance rate
  const tempItem = opItems.find(i => i.label.toLowerCase().includes('temperature'));
  const tempImpact = tempItem ? parseImpact(tempItem.impact) : { pct: 70 };
  const tempScore = tempImpact.pct;

  // Factor 2: Cooling log compliance (derive from temp + operational)
  const coolingScore = locScores ? Math.round(tempScore * 0.85 + locScores.operational * 0.15) : 50;

  // Factor 3: Daily checklist completion rate
  const checkItem = opItems.find(i => i.label.toLowerCase().includes('checklist'));
  const checkImpact = checkItem ? parseImpact(checkItem.impact) : { pct: 70 };
  const checkScore = checkImpact.pct;

  // Factor 4: Health department inspection score
  const healthItem = docItems.find(i => i.label.toLowerCase().includes('health permit'));
  const healthImpact = healthItem ? parseImpact(healthItem.impact) : { pct: 80 };
  const healthDeptScore = healthImpact.pct;

  // Factor 5: HACCP plan active and current
  const haccpItem = opItems.find(i => i.label.toLowerCase().includes('haccp'));
  const haccpImpact = haccpItem ? parseImpact(haccpItem.impact) : { pct: 70 };
  const haccpScore = haccpImpact.pct;

  // Factor 6: Food handler certifications current
  const foodHandlerItem = docItems.find(i => i.label.toLowerCase().includes('food handler'));
  const fhImpact = foodHandlerItem ? parseImpact(foodHandlerItem.impact) : { pct: 75 };
  const foodHandlerScore = fhImpact.pct;

  // Factor 7: Certified Food Protection Manager on staff
  const cfpmScore = locScores ? Math.min(100, Math.round(locScores.operational * 1.02)) : 50;

  // Factor 8: Corrective action response time
  const incidentItem = opItems.find(i => i.label.toLowerCase().includes('incident'));
  const incidentImpact = incidentItem ? parseImpact(incidentItem.impact) : { pct: 70 };
  const responseScore = incidentImpact.pct;

  // Factor 9: Incident frequency (last 12 months)
  const vendorLocId = getVendorLocationId(locationId);
  const attentionCount = needsAttentionItems.filter(i => i.locationId === vendorLocId && i.color === 'red').length;
  const incidentFreqScore = attentionCount === 0 ? 95 : attentionCount <= 2 ? 80 : attentionCount <= 4 ? 60 : 30;

  const factors: InsuranceRiskFactor[] = [
    { name: 'Temperature log compliance rate', score: tempScore, weight: 0.16, status: factorStatus(tempScore), detail: tempScore >= 90 ? 'All temperature readings in safe range' : `${tempScore}% compliance rate — ${100 - tempScore}% gap`, reference: 'FDA Food Code 3-501' },
    { name: 'Cooling log compliance', score: coolingScore, weight: 0.10, status: factorStatus(coolingScore), detail: coolingScore >= 80 ? 'Cooling procedures documented and compliant' : 'Cooling log gaps detected', reference: 'FDA 2-Stage Cooling' },
    { name: 'Daily checklist completion rate', score: checkScore, weight: 0.14, status: factorStatus(checkScore), detail: checkScore >= 90 ? 'Checklists completed consistently' : `${checkScore}% completion rate`, reference: 'FDA Food Code' },
    { name: 'Health department inspection score', score: healthDeptScore, weight: 0.14, status: factorStatus(healthDeptScore), detail: healthDeptScore >= 90 ? 'Health permit current — no recent violations' : healthDeptScore === 0 ? 'Health permit expired' : 'Health department score needs improvement', reference: 'Local Health Code' },
    { name: 'HACCP plan active and current', score: haccpScore, weight: 0.12, status: factorStatus(haccpScore), detail: haccpScore >= 80 ? 'HACCP monitoring on schedule' : 'HACCP monitoring gaps detected', reference: 'HACCP/FDA' },
    { name: 'Food handler certifications current', score: foodHandlerScore, weight: 0.10, status: factorStatus(foodHandlerScore), detail: foodHandlerScore >= 90 ? 'All staff certifications current' : 'Some certifications expired or expiring', reference: 'CA HSC §113948' },
    { name: 'Certified Food Protection Manager on staff', score: cfpmScore, weight: 0.10, status: factorStatus(cfpmScore), detail: cfpmScore >= 80 ? 'CFPM on staff and current' : 'CFPM certification needs verification', reference: 'FDA Food Code 2-102' },
    { name: 'Corrective action response time', score: responseScore, weight: 0.08, status: factorStatus(responseScore), detail: responseScore >= 90 ? 'Issues resolved within 2 hours' : responseScore >= 60 ? 'Average response 12-24 hours' : 'Slow corrective action response', reference: 'HACCP Principle 5' },
    { name: 'Incident frequency (last 12 months)', score: incidentFreqScore, weight: 0.06, status: factorStatus(incidentFreqScore), detail: `${attentionCount} critical items flagged`, reference: 'Claims History' },
  ];

  const score = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));
  return { key: 'foodSafety', name: 'Food Safety', weight: 0.30, score, factors };
}

// --------------- Documentation & Compliance (20%) ---------------

export function calculateDocComplianceScore(locationId: string): InsuranceRiskCategory {
  const docItems = getImpactItems(locationId, 'Documentation');
  const locScores = locationScores[locationId];

  // Factor 1: Vendor certificates current
  const vendorCertItem = docItems.find(i => i.label.toLowerCase().includes('vendor cert'));
  const vendorImpact = vendorCertItem ? parseImpact(vendorCertItem.impact) : { pct: 75 };
  const vendorCertScore = vendorImpact.pct;

  // Factor 2: Insurance certificates on file from vendors
  const insCertItem = docItems.find(i => i.label.toLowerCase().includes('insurance'));
  const insImpact = insCertItem ? parseImpact(insCertItem.impact) : { pct: 70 };
  const insCertScore = insImpact.pct;

  // Factor 3: Employee certifications tracked
  const fhItem = docItems.find(i => i.label.toLowerCase().includes('food handler'));
  const fhImpact = fhItem ? parseImpact(fhItem.impact) : { pct: 70 };
  const empCertScore = fhImpact.pct;

  // Factor 4: Permits and licenses current
  const healthPermit = docItems.find(i => i.label.toLowerCase().includes('health permit'));
  const hpImpact = healthPermit ? parseImpact(healthPermit.impact) : { pct: 80 };
  const bizLicense = docItems.find(i => i.label.toLowerCase().includes('business'));
  const blImpact = bizLicense ? parseImpact(bizLicense.impact) : { pct: 90 };
  const permitScore = Math.round((hpImpact.pct + blImpact.pct) / 2);

  // Factor 5: Training records maintained
  const trainingScore = locScores ? Math.min(100, Math.round(locScores.operational * 0.95)) : 50;

  // Factor 6: Health department permit current
  const healthPermitScore = hpImpact.pct;

  // Factor 7: Business license current
  const bizLicenseScore = blImpact.pct;

  const factors: InsuranceRiskFactor[] = [
    { name: 'Vendor certificates current (COIs)', score: vendorCertScore, weight: 0.20, status: factorStatus(vendorCertScore), detail: vendorCertScore >= 90 ? 'All vendor COIs on file and current' : 'Missing or expired vendor certificates', reference: 'Carrier Requirements' },
    { name: 'Insurance certificates on file from vendors', score: insCertScore, weight: 0.16, status: factorStatus(insCertScore), detail: insCertScore >= 80 ? 'Vendor insurance documentation verified' : 'Vendor insurance records need attention', reference: 'Indemnification Clause' },
    { name: 'Employee certifications tracked', score: empCertScore, weight: 0.14, status: factorStatus(empCertScore), detail: empCertScore >= 90 ? 'All employee certifications current' : 'Some employee certifications expired or expiring', reference: 'CA HSC §113948' },
    { name: 'Permits and licenses current', score: permitScore, weight: 0.14, status: factorStatus(permitScore), detail: permitScore >= 90 ? 'All permits and licenses valid' : permitScore === 0 ? 'Critical: Permits expired' : 'Permit renewal needed', reference: 'Local Jurisdiction' },
    { name: 'Training records maintained', score: trainingScore, weight: 0.12, status: factorStatus(trainingScore), detail: trainingScore >= 80 ? 'Training records documented and accessible' : 'Training documentation gaps', reference: 'OSHA §5(a)(1)' },
    { name: 'Health department permit current', score: healthPermitScore, weight: 0.12, status: factorStatus(healthPermitScore), detail: healthPermitScore >= 90 ? 'Health permit valid and current' : healthPermitScore === 0 ? 'Health permit EXPIRED — critical gap' : 'Health permit renewal approaching', reference: 'Local Health Dept' },
    { name: 'Business license current', score: bizLicenseScore, weight: 0.12, status: factorStatus(bizLicenseScore), detail: bizLicenseScore >= 90 ? 'Business license valid' : 'Business license needs renewal', reference: 'Local Jurisdiction' },
  ];

  const score = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));
  return { key: 'documentation', name: 'Documentation & Compliance', weight: 0.20, score, factors };
}

// --------------- Operational Risk (10%) ---------------

export function calculateOperationalRiskScore(locationId: string): InsuranceRiskCategory {
  const opItems = getImpactItems(locationId, 'Operational');
  const locScores = locationScores[locationId];
  const vendorLocId = getVendorLocationId(locationId);
  const locVendors = vendors.filter(v => v.locationId === vendorLocId);

  // Factor 1: Checklist consistency (no gaps)
  const checkItem = opItems.find(i => i.label.toLowerCase().includes('checklist'));
  const checkImpact = checkItem ? parseImpact(checkItem.impact) : { pct: 70 };
  const checkScore = checkImpact.pct;

  // Factor 2: Vendor service regularity
  const overdueVendors = locVendors.filter(v => v.status === 'overdue').length;
  const vendorRegScore = overdueVendors === 0 ? 95 : overdueVendors === 1 ? 60 : 25;

  // Factor 3: Equipment maintenance adherence
  const equipItems = getImpactItems(locationId, 'Equipment');
  const maintItem = equipItems.find(i => i.label.toLowerCase().includes('maintenance'));
  const maintImpact = maintItem ? parseImpact(maintItem.impact) : { pct: 70 };
  const maintScore = maintImpact.pct;

  // Factor 4: Corrective action completion rate
  const incItem = opItems.find(i => i.label.toLowerCase().includes('incident'));
  const incImpact = incItem ? parseImpact(incItem.impact) : { pct: 70 };
  const correctiveScore = incImpact.pct;

  // Factor 5: Staff training completion rate
  const trainingScore = locScores ? Math.min(100, Math.round((locScores.operational * 0.6 + locScores.documentation * 0.4))) : 50;

  const factors: InsuranceRiskFactor[] = [
    { name: 'Checklist consistency (no gaps)', score: checkScore, weight: 0.25, status: factorStatus(checkScore), detail: checkScore >= 90 ? 'No gaps in daily/weekly routines' : `${checkScore}% completion — gaps detected`, reference: 'Operational SOP' },
    { name: 'Vendor service regularity', score: vendorRegScore, weight: 0.25, status: factorStatus(vendorRegScore), detail: overdueVendors === 0 ? 'All scheduled vendor services on time' : `${overdueVendors} vendor service(s) overdue`, reference: 'Service Contracts' },
    { name: 'Equipment maintenance adherence', score: maintScore, weight: 0.20, status: factorStatus(maintScore), detail: maintScore >= 80 ? 'Maintenance schedule followed' : 'Maintenance schedule has gaps', reference: 'Manufacturer Specs' },
    { name: 'Corrective action completion rate', score: correctiveScore, weight: 0.15, status: factorStatus(correctiveScore), detail: correctiveScore >= 80 ? 'Corrective actions completed promptly' : 'Corrective action backlog detected', reference: 'HACCP Principle 5' },
    { name: 'Staff training completion rate', score: trainingScore, weight: 0.15, status: factorStatus(trainingScore), detail: trainingScore >= 80 ? 'Staff training up to date' : 'Training completion needs improvement', reference: 'OSHA/Cal-OSHA' },
  ];

  const score = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));
  return { key: 'operational', name: 'Operational Risk', weight: 0.10, score, factors };
}

// --------------- Orchestrator ---------------

export function calculateInsuranceRiskScore(locationId: string): InsuranceRiskResult {
  const fire = calculateFireRiskScore(locationId);
  const foodSafety = calculateFoodSafetyScore(locationId);
  const documentation = calculateDocComplianceScore(locationId);
  const operational = calculateOperationalRiskScore(locationId);

  const categories = [fire, foodSafety, documentation, operational];
  const overall = Math.round(
    fire.score * fire.weight +
    foodSafety.score * foodSafety.weight +
    documentation.score * documentation.weight +
    operational.score * operational.weight
  );

  const { tier, color } = getInsuranceRiskTier(overall);

  // Generate action items from failing/warning factors
  const actionItems: InsuranceActionItem[] = [];
  for (const cat of categories) {
    for (const factor of cat.factors) {
      if (factor.status === 'fail' || factor.status === 'warning') {
        const maxContribution = Math.round(factor.weight * 100 * cat.weight * 100) / 100;
        const currentContribution = Math.round(factor.score * factor.weight * cat.weight);
        const potentialGain = Math.round(maxContribution - currentContribution);
        if (potentialGain > 0) {
          actionItems.push({
            title: factor.name,
            category: cat.name,
            currentImpact: Math.round(maxContribution - currentContribution),
            potentialGain,
            priority: factor.score < 30 ? 'critical' : factor.score < 60 ? 'high' : factor.score < 80 ? 'medium' : 'low',
            action: factor.detail,
            actionLink: cat.key === 'fire' ? '/vendors' :
              cat.key === 'foodSafety' ? '/temp-logs' :
              cat.key === 'documentation' ? '/documents' : '/checklists',
          });
        }
      }
    }
  }
  actionItems.sort((a, b) => b.potentialGain - a.potentialGain);

  const factorsEvaluated = categories.reduce((sum, c) => sum + c.factors.length, 0);

  return {
    overall,
    tier,
    tierColor: color,
    categories,
    actionItems,
    lastCalculated: new Date().toISOString(),
    factorsEvaluated,
  };
}

/** Calculate org-wide insurance risk score (average of all locations) */
export function calculateOrgInsuranceRiskScore(): InsuranceRiskResult {
  const locationIds = Object.keys(locationScores);
  const results = locationIds.map(id => calculateInsuranceRiskScore(id));

  if (results.length === 0) return calculateInsuranceRiskScore('downtown');

  const avgOverall = Math.round(results.reduce((s, r) => s + r.overall, 0) / results.length);
  const { tier, color } = getInsuranceRiskTier(avgOverall);

  // Average category scores
  const categoryKeys = ['fire', 'foodSafety', 'documentation', 'operational'];
  const avgCategories: InsuranceRiskCategory[] = categoryKeys.map((key, idx) => {
    const catResults = results.map(r => r.categories[idx]);
    const avgScore = Math.round(catResults.reduce((s, c) => s + c.score, 0) / catResults.length);
    return {
      ...catResults[0],
      score: avgScore,
      factors: catResults[0].factors.map((f, fi) => ({
        ...f,
        score: Math.round(catResults.reduce((s, c) => s + c.factors[fi].score, 0) / catResults.length),
        status: factorStatus(Math.round(catResults.reduce((s, c) => s + c.factors[fi].score, 0) / catResults.length)),
      })),
    };
  });

  // Merge and deduplicate action items
  const allActions = results.flatMap(r => r.actionItems);
  const uniqueActions = allActions.reduce<InsuranceActionItem[]>((acc, item) => {
    const exists = acc.find(a => a.title === item.title);
    if (!exists) acc.push(item);
    else if (item.potentialGain > exists.potentialGain) {
      Object.assign(exists, item);
    }
    return acc;
  }, []);
  uniqueActions.sort((a, b) => b.potentialGain - a.potentialGain);

  return {
    overall: avgOverall,
    tier,
    tierColor: color,
    categories: avgCategories,
    actionItems: uniqueActions.slice(0, 10),
    lastCalculated: new Date().toISOString(),
    factorsEvaluated: avgCategories.reduce((s, c) => s + c.factors.length, 0),
  };
}
