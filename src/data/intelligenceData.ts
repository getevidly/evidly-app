// Compliance Intelligence Dashboard — Demo Data Layer
// Enterprise-level analytics across all locations

import {
  enterpriseTenants,
  enterpriseHierarchy,
  enterpriseTrendData,
  type EnterpriseHierarchyNode,
  type EnterpriseTrendPoint,
} from './demoData';

export { enterpriseHierarchy, enterpriseTrendData, type EnterpriseHierarchyNode, type EnterpriseTrendPoint };
export const enterpriseTenant = enterpriseTenants.find(t => t.id === 'ent-pcdining')!;

// ── Types ────────────────────────────────────────────────────────

export interface IntelligenceInsight {
  id: string;
  severity: 'critical' | 'advisory' | 'informational';
  text: string;
  scope: string;
  action: string;
  drillDownLabel: string;
}

export interface LocationRow {
  rank: number;
  id: string;
  name: string;
  region: string;
  district: string;
  state: string;
  vertical: string;
  overall: number;
  fire: number;
  food: number;
  docs: number;
  trend: number;
  actionItems: number;
  headcount: number;
  turnover: number;
  trainingPct: number;
  checklistPct: number;
  tempCompliancePct: number;
  monthsOnPlatform: number;
}

export interface RiskPrediction {
  id: string;
  locationName: string;
  region: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  overallRiskScore: number;
  factors: { label: string; probability: number; severity: 'low' | 'medium' | 'high' }[];
  mitigationSteps: { action: string; effort: string; impact: string; assignee: string }[];
}

export interface CohortData {
  cohort: string;
  locations: number;
  avgScore: number;
  avgImprovement: number;
}

export interface SeasonalPoint {
  month: string;
  overall: number;
  fire: number;
  food: number;
  docs: number;
}

export interface QuartileStats {
  quartile: string;
  range: string;
  count: number;
  avgScore: number;
  avgChecklist: number;
  avgTempCompliance: number;
  avgTurnover: number;
  avgTraining: number;
  hasCFPM: number;
  vendorOnTime: number;
}

// ── Constants ────────────────────────────────────────────────────

export const TOTAL_LOCATIONS = 487;
export const TOTAL_ENROLLED = 500;
export const ORG_SCORE = 90.0;
export const FIRE_SCORE = 94.2;
export const FOOD_SCORE = 86.7;
export const DOCS_SCORE = 91.3;
export const FIRE_TREND = 1.1;
export const FOOD_TREND = -0.8;
export const DOCS_TREND = 2.4;
export const DATA_POINTS_THIS_MONTH = 1_284_720;

// ── Command Center KPIs ──────────────────────────────────────────

export const urgentLocations = { belowThreshold: 12, critical: 3, threshold: 70 };
export const expiringThisQuarter = { fireSuppression: 47, foodHandlerCerts: 312, vendorDocs: 23 };
export const incidentVelocity = { current: 75, previous: 87, changePct: -14 };
export const complianceMomentum = { improving: 68, declining: 12, stable: 20 };

// 12-month incident sparkline
export const incidentSparkline = [112, 105, 98, 103, 95, 90, 87, 92, 85, 80, 75, 72];

// ── AI Intelligence Insights ─────────────────────────────────────

export const weeklyInsights: IntelligenceInsight[] = [
  {
    id: 'ins-1',
    severity: 'critical',
    text: '23% of your California locations have fire suppression inspections expiring this quarter. Concentrated in the Southern California region.',
    scope: '41 locations in SoCal region',
    action: 'Schedule bulk fire suppression inspections with preferred vendor',
    drillDownLabel: 'View affected locations',
  },
  {
    id: 'ins-2',
    severity: 'critical',
    text: 'Your Midwest region scores 15% lower in food safety than West Coast. Primary driver: cooling log compliance (62% vs 89%).',
    scope: 'Midwest region — 89 locations',
    action: 'Deploy mandatory cooling log training for Midwest staff',
    drillDownLabel: 'Compare regions',
  },
  {
    id: 'ins-3',
    severity: 'advisory',
    text: 'Incident resolution time at Tampa General is 3.2x slower than your network average of 18 hours.',
    scope: 'Tampa General (Location #47)',
    action: 'Review incident response workflow at Tampa General',
    drillDownLabel: 'View location detail',
  },
  {
    id: 'ins-4',
    severity: 'advisory',
    text: 'Locations with staff turnover >40% annually have compliance scores averaging 12 points lower than locations with <20% turnover.',
    scope: 'Organization-wide — 67 high-turnover locations',
    action: 'Cross-reference HR retention programs with compliance outcomes',
    drillDownLabel: 'Staffing correlation',
  },
  {
    id: 'ins-5',
    severity: 'informational',
    text: 'Since deploying EvidLY, your organization\'s average health department inspection score improved from B+ to A- across 312 inspected locations.',
    scope: 'All inspected locations',
    action: 'Include in Q2 board presentation as compliance ROI metric',
    drillDownLabel: 'Inspection analytics',
  },
  {
    id: 'ins-6',
    severity: 'informational',
    text: 'Insurance Risk Score across your portfolio improved 8.3 points (73.2 → 81.5). Estimated annual premium savings potential: $340,000.',
    scope: 'Enterprise portfolio',
    action: 'Share with insurance broker for renewal negotiation',
    drillDownLabel: 'Insurance analytics',
  },
  {
    id: 'ins-7',
    severity: 'advisory',
    text: 'Food safety scores consistently dip 4-6 points during summer months. Cooling log failures account for 72% of seasonal decline.',
    scope: 'Organization-wide seasonal pattern',
    action: 'Implement summer cooling protocol across all locations',
    drillDownLabel: 'Seasonal analysis',
  },
];

// ── Location Leaderboard ─────────────────────────────────────────

const REGIONS = ['West', 'Midwest', 'Northeast', 'Southeast', 'Southwest'];
const DISTRICTS = ['CA/NV', 'Pacific NW', 'Mountain', 'Great Lakes', 'New England', 'Mid-Atlantic', 'FL', 'TX/OK', 'OH/IN', 'Carolinas'];
const STATES = ['CA', 'WA', 'OR', 'NV', 'AZ', 'TX', 'FL', 'OH', 'IN', 'IL', 'NY', 'PA', 'MA', 'NC', 'GA', 'CO', 'MI', 'MN', 'TN', 'VA'];
const VERTICALS = ['Higher Education', 'Healthcare', 'Destinations', 'Corrections', 'Sports & Entertainment'];
const LOCATION_NAMES = [
  'Oceanview Lodge', 'The Bayshore', 'Harbor Village', 'Coastline Hotel', 'Redwood Meadows',
  'Stanford Dining Hall', 'UCLA Medical Center', 'USC Student Union', 'Portland General Hospital',
  'Seattle Convention Center', 'Denver Arena Complex', 'Phoenix Campus Dining', 'Miami Beach Resort',
  'Orlando Regional Medical', 'Tampa General', 'Jacksonville University', 'Atlanta Corporate Center',
  'Charlotte Convention', 'Nashville Music Hall', 'Chicago Lakefront', 'Detroit Medical Center',
  'Cleveland Clinic East', 'Columbus Campus', 'Indianapolis Arena', 'Minneapolis Convention',
  'Boston University Hall', 'MIT Dining Services', 'Harvard Square Café', 'Yale Medical Center',
  'Princeton Campus', 'Philadelphia Arena', 'Pittsburgh Medical', 'New York Convention',
  'Mall Food Court #12', 'Airport Terminal B', 'Highway Rest Stop #7',
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

function generateLocations(): LocationRow[] {
  const rand = seededRandom(42);
  const locations: LocationRow[] = [];
  // First add named locations with specific scores
  const topLocations: Partial<LocationRow>[] = [
    { name: 'Oceanview Lodge', region: 'West', district: 'CA/NV', state: 'CA', vertical: 'Destinations', overall: 97.3, fire: 99, food: 96, docs: 97, trend: 1.2, actionItems: 0 },
    { name: 'The Bayshore', region: 'West', district: 'CA/NV', state: 'CA', vertical: 'Destinations', overall: 96.8, fire: 98, food: 95, docs: 97, trend: 0.5, actionItems: 0 },
    { name: 'Stanford Dining Hall', region: 'West', district: 'CA/NV', state: 'CA', vertical: 'Higher Education', overall: 96.1, fire: 97, food: 95, docs: 96, trend: 0.8, actionItems: 0 },
    { name: 'Harvard Square Café', region: 'Northeast', district: 'New England', state: 'MA', vertical: 'Higher Education', overall: 95.4, fire: 96, food: 94, docs: 96, trend: 1.0, actionItems: 0 },
    { name: 'Cleveland Clinic East', region: 'Midwest', district: 'OH/IN', state: 'OH', vertical: 'Healthcare', overall: 95.0, fire: 97, food: 93, docs: 95, trend: 0.6, actionItems: 0 },
  ];
  const bottomLocations: Partial<LocationRow>[] = [
    { name: 'Tampa General', region: 'Southeast', district: 'FL', state: 'FL', vertical: 'Healthcare', overall: 58.2, fire: 45, food: 62, docs: 68, trend: -4.1, actionItems: 7 },
    { name: 'Mall Food Court #12', region: 'Midwest', district: 'OH/IN', state: 'OH', vertical: 'Sports & Entertainment', overall: 54.7, fire: 51, food: 55, docs: 58, trend: -6.3, actionItems: 12 },
    { name: 'Highway Rest Stop #7', region: 'Southwest', district: 'TX/OK', state: 'TX', vertical: 'Destinations', overall: 52.1, fire: 48, food: 54, docs: 55, trend: -3.8, actionItems: 9 },
  ];

  let rank = 1;
  // Add top locations
  for (const loc of topLocations) {
    locations.push({
      rank: rank++,
      id: `loc-${rank}`,
      name: loc.name!,
      region: loc.region!,
      district: loc.district!,
      state: loc.state!,
      vertical: loc.vertical!,
      overall: loc.overall!,
      fire: loc.fire!,
      food: loc.food!,
      docs: loc.docs!,
      trend: loc.trend!,
      actionItems: loc.actionItems!,
      headcount: 15 + Math.floor(rand() * 30),
      turnover: 8 + Math.floor(rand() * 15),
      trainingPct: 90 + Math.floor(rand() * 10),
      checklistPct: 92 + Math.floor(rand() * 8),
      tempCompliancePct: 94 + Math.floor(rand() * 6),
      monthsOnPlatform: 6 + Math.floor(rand() * 18),
    });
  }

  // Generate middle locations
  for (let i = 0; i < TOTAL_LOCATIONS - topLocations.length - bottomLocations.length; i++) {
    const overall = 70 + Math.floor(rand() * 25);
    const fire = Math.max(40, Math.min(100, overall + Math.floor((rand() - 0.5) * 16)));
    const food = Math.max(40, Math.min(100, overall + Math.floor((rand() - 0.5) * 16)));
    const docs = Math.max(40, Math.min(100, overall + Math.floor((rand() - 0.5) * 14)));
    const region = REGIONS[Math.floor(rand() * REGIONS.length)];
    const district = DISTRICTS[Math.floor(rand() * DISTRICTS.length)];
    const state = STATES[Math.floor(rand() * STATES.length)];
    const vertical = VERTICALS[Math.floor(rand() * VERTICALS.length)];
    const turnover = 10 + Math.floor(rand() * 50);
    locations.push({
      rank: rank++,
      id: `loc-${rank}`,
      name: `Location #${100 + i}`,
      region,
      district,
      state,
      vertical,
      overall,
      fire,
      food,
      docs,
      trend: +((rand() - 0.4) * 6).toFixed(1),
      actionItems: overall < 70 ? Math.floor(rand() * 8) + 1 : overall < 80 ? Math.floor(rand() * 3) : 0,
      headcount: 8 + Math.floor(rand() * 40),
      turnover,
      trainingPct: Math.max(50, Math.min(100, 95 - turnover * 0.5 + Math.floor(rand() * 10))),
      checklistPct: Math.max(55, Math.min(100, overall - 2 + Math.floor(rand() * 8))),
      tempCompliancePct: Math.max(50, Math.min(100, overall - 4 + Math.floor(rand() * 10))),
      monthsOnPlatform: Math.floor(rand() * 24),
    });
  }

  // Add bottom locations
  for (const loc of bottomLocations) {
    locations.push({
      rank: rank++,
      id: `loc-${rank}`,
      name: loc.name!,
      region: loc.region!,
      district: loc.district!,
      state: loc.state!,
      vertical: loc.vertical!,
      overall: loc.overall!,
      fire: loc.fire!,
      food: loc.food!,
      docs: loc.docs!,
      trend: loc.trend!,
      actionItems: loc.actionItems!,
      headcount: 10 + Math.floor(rand() * 20),
      turnover: 35 + Math.floor(rand() * 25),
      trainingPct: 55 + Math.floor(rand() * 20),
      checklistPct: 50 + Math.floor(rand() * 20),
      tempCompliancePct: 45 + Math.floor(rand() * 25),
      monthsOnPlatform: Math.floor(rand() * 6),
    });
  }

  // Sort by overall descending and re-rank
  locations.sort((a, b) => b.overall - a.overall);
  locations.forEach((loc, i) => { loc.rank = i + 1; });
  return locations;
}

export const locationLeaderboard: LocationRow[] = generateLocations();

// ── Quartile Analysis ────────────────────────────────────────────

export const quartileStats: QuartileStats[] = (() => {
  const sorted = [...locationLeaderboard].sort((a, b) => b.overall - a.overall);
  const q = Math.ceil(sorted.length / 4);
  const quartiles = [
    { label: 'Top Quartile (Q1)', start: 0, end: q },
    { label: 'Second Quartile (Q2)', start: q, end: q * 2 },
    { label: 'Third Quartile (Q3)', start: q * 2, end: q * 3 },
    { label: 'Bottom Quartile (Q4)', start: q * 3, end: sorted.length },
  ];
  return quartiles.map(({ label, start, end }) => {
    const slice = sorted.slice(start, end);
    const avg = (arr: number[]) => +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1);
    return {
      quartile: label,
      range: `${Math.min(...slice.map(l => l.overall))}–${Math.max(...slice.map(l => l.overall))}`,
      count: slice.length,
      avgScore: avg(slice.map(l => l.overall)),
      avgChecklist: avg(slice.map(l => l.checklistPct)),
      avgTempCompliance: avg(slice.map(l => l.tempCompliancePct)),
      avgTurnover: avg(slice.map(l => l.turnover)),
      avgTraining: avg(slice.map(l => l.trainingPct)),
      hasCFPM: Math.round(slice.length * (start === 0 ? 0.97 : start === q ? 0.88 : start === q * 2 ? 0.72 : 0.51)),
      vendorOnTime: Math.round(start === 0 ? 96 : start === q ? 89 : start === q * 2 ? 78 : 61),
    };
  });
})();

// ── Cohort Analysis ──────────────────────────────────────────────

export const platformAgeCohorts: CohortData[] = [
  { cohort: '0–3 months', locations: 67, avgScore: 78.4, avgImprovement: 14.2 },
  { cohort: '3–6 months', locations: 89, avgScore: 84.1, avgImprovement: 9.8 },
  { cohort: '6–12 months', locations: 142, avgScore: 88.7, avgImprovement: 6.3 },
  { cohort: '12+ months', locations: 189, avgScore: 93.1, avgImprovement: 2.1 },
];

export const verticalCohorts: CohortData[] = [
  { cohort: 'Higher Education', locations: 198, avgScore: 91.2, avgImprovement: 5.4 },
  { cohort: 'Healthcare', locations: 112, avgScore: 94.7, avgImprovement: 3.2 },
  { cohort: 'Destinations', locations: 67, avgScore: 88.4, avgImprovement: 7.1 },
  { cohort: 'Corrections', locations: 54, avgScore: 86.1, avgImprovement: 8.9 },
  { cohort: 'Sports & Entertainment', locations: 56, avgScore: 88.0, avgImprovement: 6.5 },
];

export const sizeCohorts: CohortData[] = [
  { cohort: 'Small (<15 staff)', locations: 143, avgScore: 85.2, avgImprovement: 7.8 },
  { cohort: 'Medium (15–30 staff)', locations: 201, avgScore: 90.4, avgImprovement: 5.1 },
  { cohort: 'Large (30+ staff)', locations: 143, avgScore: 92.8, avgImprovement: 3.6 },
];

// ── Seasonal Pattern Data ────────────────────────────────────────

export const seasonalPatternThisYear: SeasonalPoint[] = [
  { month: 'Jan', overall: 89.5, fire: 93.8, food: 85.9, docs: 90.2 },
  { month: 'Feb', overall: 90.0, fire: 94.2, food: 86.7, docs: 91.3 },
  { month: 'Mar', overall: 90.2, fire: 94.0, food: 87.1, docs: 91.0 },
  { month: 'Apr', overall: 89.8, fire: 93.5, food: 86.5, docs: 90.8 },
  { month: 'May', overall: 88.9, fire: 93.1, food: 84.8, docs: 90.5 },
  { month: 'Jun', overall: 87.4, fire: 92.8, food: 82.1, docs: 89.8 },
  { month: 'Jul', overall: 86.1, fire: 92.5, food: 80.3, docs: 88.9 },
  { month: 'Aug', overall: 86.8, fire: 92.6, food: 81.2, docs: 89.2 },
  { month: 'Sep', overall: 88.4, fire: 93.0, food: 84.5, docs: 90.0 },
  { month: 'Oct', overall: 89.6, fire: 93.5, food: 86.2, docs: 90.8 },
  { month: 'Nov', overall: 88.8, fire: 91.8, food: 86.0, docs: 90.4 },
  { month: 'Dec', overall: 87.9, fire: 90.5, food: 85.8, docs: 89.6 },
];

export const seasonalPatternLastYear: SeasonalPoint[] = [
  { month: 'Jan', overall: 84.2, fire: 90.1, food: 80.5, docs: 84.8 },
  { month: 'Feb', overall: 84.8, fire: 90.5, food: 81.2, docs: 85.3 },
  { month: 'Mar', overall: 85.1, fire: 90.3, food: 81.8, docs: 85.5 },
  { month: 'Apr', overall: 84.6, fire: 89.8, food: 81.0, docs: 85.0 },
  { month: 'May', overall: 83.5, fire: 89.2, food: 79.2, docs: 84.5 },
  { month: 'Jun', overall: 82.0, fire: 88.8, food: 76.5, docs: 83.8 },
  { month: 'Jul', overall: 80.8, fire: 88.5, food: 74.8, docs: 82.9 },
  { month: 'Aug', overall: 81.5, fire: 88.6, food: 75.6, docs: 83.2 },
  { month: 'Sep', overall: 83.1, fire: 89.0, food: 78.9, docs: 84.0 },
  { month: 'Oct', overall: 84.4, fire: 89.5, food: 80.8, docs: 84.8 },
  { month: 'Nov', overall: 83.5, fire: 87.8, food: 80.4, docs: 84.4 },
  { month: 'Dec', overall: 82.6, fire: 86.5, food: 80.0, docs: 83.6 },
];

// ── Regulatory Impact Events ─────────────────────────────────────

export const regulatoryEvents = [
  { id: 'reg-1', date: 'Jul 2025', label: 'AB 660 (CA)', description: 'California hood cleaning frequency update', beforeScore: 85.2, afterScore: 88.8, adaptedPct: 78, pendingLocations: 41, affectedLocations: 187 },
  { id: 'reg-2', date: 'Nov 2025', label: 'FDA Food Code', description: 'FDA Food Code revision effective', beforeScore: 83.1, afterScore: 86.4, adaptedPct: 84, pendingLocations: 28, affectedLocations: 487 },
  { id: 'reg-3', date: 'Jan 2026', label: 'OSHA Rule', description: 'OSHA fire suppression certification change', beforeScore: 91.2, afterScore: 93.5, adaptedPct: 91, pendingLocations: 15, affectedLocations: 487 },
];

// ── Rate of Change Leaders ───────────────────────────────────────

export const fastestImproving = locationLeaderboard
  .filter(l => l.trend > 0)
  .sort((a, b) => b.trend - a.trend)
  .slice(0, 10);

export const fastestDeclining = locationLeaderboard
  .filter(l => l.trend < 0)
  .sort((a, b) => a.trend - b.trend)
  .slice(0, 10);

// ── Predictive Risk Data ─────────────────────────────────────────

export const riskPredictions: RiskPrediction[] = [
  {
    id: 'risk-1',
    locationName: 'Tampa General',
    region: 'Southeast',
    riskLevel: 'critical',
    overallRiskScore: 92,
    factors: [
      { label: 'Fire suppression expired 14 days ago', probability: 100, severity: 'high' },
      { label: 'No backup CFPM on staff', probability: 85, severity: 'high' },
      { label: 'Vendor has missed 2 of last 4 services', probability: 78, severity: 'medium' },
      { label: 'Health inspection predicted B or lower', probability: 72, severity: 'high' },
    ],
    mitigationSteps: [
      { action: 'Emergency fire suppression inspection', effort: '3 days', impact: 'Critical', assignee: 'Regional Director — SE' },
      { action: 'Hire/promote second CFPM', effort: '30 days', impact: 'High', assignee: 'HR + Site Manager' },
      { action: 'Switch to backup vendor for missed services', effort: '7 days', impact: 'Medium', assignee: 'Vendor Manager' },
      { action: 'Weekly cooling log audit', effort: 'Immediate', impact: 'Medium', assignee: 'Site Manager' },
    ],
  },
  {
    id: 'risk-2',
    locationName: 'Mall Food Court #12',
    region: 'Midwest',
    riskLevel: 'critical',
    overallRiskScore: 88,
    factors: [
      { label: 'Score declining 6.3 pts/month for 3 months', probability: 95, severity: 'high' },
      { label: '58% turnover rate — 2x network average', probability: 90, severity: 'high' },
      { label: 'Checklist completion at 52%', probability: 88, severity: 'medium' },
      { label: 'Temperature excursions 4x this month', probability: 80, severity: 'medium' },
    ],
    mitigationSteps: [
      { action: 'Deploy interim compliance lead from regional team', effort: '1 week', impact: 'Critical', assignee: 'Regional Director — MW' },
      { action: 'Mandatory retraining for all staff', effort: '2 weeks', impact: 'High', assignee: 'Training Coordinator' },
      { action: 'Daily checklist audit by district manager', effort: 'Immediate', impact: 'Medium', assignee: 'District Manager' },
      { action: 'Replace malfunctioning walk-in cooler sensor', effort: '3 days', impact: 'Medium', assignee: 'Facilities' },
    ],
  },
  {
    id: 'risk-3',
    locationName: 'Highway Rest Stop #7',
    region: 'Southwest',
    riskLevel: 'high',
    overallRiskScore: 76,
    factors: [
      { label: 'Fire suppression cert expires in 18 days', probability: 85, severity: 'high' },
      { label: 'No CFPM on staff', probability: 100, severity: 'medium' },
      { label: 'Cooling log compliance at 54%', probability: 75, severity: 'medium' },
    ],
    mitigationSteps: [
      { action: 'Expedite fire suppression renewal', effort: '2 weeks', impact: 'Critical', assignee: 'Vendor Manager' },
      { action: 'Enroll site manager in CFPM certification', effort: '6 weeks', impact: 'High', assignee: 'Training Coordinator' },
      { action: 'Install automated temp monitoring', effort: '1 week', impact: 'Medium', assignee: 'Facilities' },
    ],
  },
  {
    id: 'risk-4',
    locationName: 'Detroit Medical Center',
    region: 'Midwest',
    riskLevel: 'high',
    overallRiskScore: 71,
    factors: [
      { label: 'Walk-in cooler required 4 service calls in 6 months', probability: 82, severity: 'high' },
      { label: 'CFPM on extended leave — no backup', probability: 78, severity: 'medium' },
      { label: 'Handwashing compliance at 64%', probability: 70, severity: 'medium' },
    ],
    mitigationSteps: [
      { action: 'Replace walk-in cooler compressor — failure imminent', effort: '1 week', impact: 'Critical', assignee: 'Facilities Director' },
      { action: 'Assign interim CFPM from nearby location', effort: '3 days', impact: 'High', assignee: 'District Manager' },
      { action: 'Handwashing training refresher', effort: '1 day', impact: 'Medium', assignee: 'Site Manager' },
    ],
  },
  {
    id: 'risk-5',
    locationName: 'Phoenix Campus Dining',
    region: 'Southwest',
    riskLevel: 'moderate',
    overallRiskScore: 55,
    factors: [
      { label: 'Vendor doc renewal overdue by 12 days', probability: 68, severity: 'low' },
      { label: 'Score flat for 4 months (no improvement)', probability: 60, severity: 'low' },
    ],
    mitigationSteps: [
      { action: 'Follow up with vendor on documentation', effort: '2 days', impact: 'Medium', assignee: 'Vendor Manager' },
      { action: 'Compliance improvement plan review', effort: '1 week', impact: 'Medium', assignee: 'District Manager' },
    ],
  },
  {
    id: 'risk-6',
    locationName: 'Orlando Regional Medical',
    region: 'Southeast',
    riskLevel: 'moderate',
    overallRiskScore: 52,
    factors: [
      { label: '3 food handler certs expiring next month', probability: 65, severity: 'medium' },
      { label: 'Fire suppression service overdue by 8 days', probability: 58, severity: 'low' },
    ],
    mitigationSteps: [
      { action: 'Schedule food handler cert renewals', effort: '2 weeks', impact: 'High', assignee: 'Site Manager' },
      { action: 'Escalate fire suppression service request', effort: '3 days', impact: 'Medium', assignee: 'Vendor Manager' },
    ],
  },
];

// Risk summary counts
export const riskSummary = {
  low: locationLeaderboard.filter(l => l.overall >= 85).length,
  moderate: locationLeaderboard.filter(l => l.overall >= 75 && l.overall < 85).length,
  high: locationLeaderboard.filter(l => l.overall >= 65 && l.overall < 75).length,
  critical: locationLeaderboard.filter(l => l.overall < 65).length,
};

// ── Single-CFPM risk locations ───────────────────────────────────
export const singleCFPMLocations = 47;
export const equipmentReplacementDue = 23;
export const predictedInspectionFailures = 8;
export const foodborneRiskLocations = 3;

// ── Helpers ──────────────────────────────────────────────────────

export function scoreColor(s: number) {
  if (s >= 90) return '#22c55e';
  if (s >= 80) return '#d4af37';
  if (s >= 70) return '#f59e0b';
  return '#ef4444';
}

export function riskColor(level: string) {
  if (level === 'low') return '#22c55e';
  if (level === 'moderate') return '#d4af37';
  if (level === 'high') return '#f59e0b';
  return '#ef4444';
}

export function riskBg(level: string) {
  if (level === 'low') return '#f0fdf4';
  if (level === 'moderate') return '#fefce8';
  if (level === 'high') return '#fff7ed';
  return '#fef2f2';
}

export function riskBorder(level: string) {
  if (level === 'low') return '#bbf7d0';
  if (level === 'moderate') return '#fde68a';
  if (level === 'high') return '#fdba74';
  return '#fca5a5';
}

// ══════════════════════════════════════════════════════════════════
// STAFFING CORRELATION ANALYSIS DATA
// ══════════════════════════════════════════════════════════════════

export interface StaffingRiskIndicator {
  locationName: string;
  region: string;
  district: string;
  riskType: 'high-turnover' | 'cfpm-departure' | 'new-hires-untrained' | 'manager-vacancy';
  description: string;
  severity: 'critical' | 'high' | 'moderate';
  detectedDate: string;
}

export const staffingCorrelationInsight = 'Each 10% increase in turnover correlates with a 4.2-point decrease in compliance score across your organization.';
export const trainingInsight = 'Locations with 95%+ training completion score 18 points higher on average.';
export const staffingChecklistInsight = 'Locations operating below 80% staffing complete 34% fewer daily checklists.';
export const managerTenureInsight = 'Locations where the manager has been in role 12+ months score 11 points higher than locations with managers <6 months in role.';
export const cfpmInsight = 'Locations with 2+ CFPMs average 91.4 food safety vs 79.2 for single-CFPM locations.';

// CFPM comparison — simulate box plot data
export const cfpmComparison = {
  singleCfpm: { count: 143, avgFoodScore: 79.2, median: 78.5, q1: 72.1, q3: 85.8 },
  multiCfpm: { count: 344, avgFoodScore: 91.4, median: 92.0, q1: 87.3, q3: 95.6 },
};

// Scatter data helper — 100 sampled points for performance
export function getScatterData(xKey: keyof LocationRow, yKey: keyof LocationRow): { x: number; y: number; name: string }[] {
  const step = Math.max(1, Math.floor(locationLeaderboard.length / 100));
  return locationLeaderboard.filter((_, i) => i % step === 0).map(l => ({
    x: l[xKey] as number,
    y: l[yKey] as number,
    name: l.name,
  }));
}

export const staffingRiskIndicators: StaffingRiskIndicator[] = [
  { locationName: 'Mall Food Court #12', region: 'Midwest', district: 'OH/IN', riskType: 'high-turnover', description: '58% turnover in last 90 days + score declining 6.3 pts/month', severity: 'critical', detectedDate: 'Feb 4, 2026' },
  { locationName: 'Tampa General', region: 'Southeast', district: 'FL', riskType: 'cfpm-departure', description: 'Only CFPM departed Jan 15 — no replacement in pipeline', severity: 'critical', detectedDate: 'Jan 16, 2026' },
  { locationName: 'Highway Rest Stop #7', region: 'Southwest', district: 'TX/OK', riskType: 'manager-vacancy', description: 'No assigned location manager since Jan 3', severity: 'critical', detectedDate: 'Jan 4, 2026' },
  { locationName: 'Detroit Medical Center', region: 'Midwest', district: 'OH/IN', riskType: 'cfpm-departure', description: 'CFPM on extended leave since Dec 12 — interim from nearby location', severity: 'high', detectedDate: 'Dec 13, 2025' },
  { locationName: 'Location #247', region: 'Southeast', district: 'FL', riskType: 'new-hires-untrained', description: '8 new hires in last 30 days, only 2 have completed food handler training', severity: 'high', detectedDate: 'Jan 28, 2026' },
  { locationName: 'Location #389', region: 'West', district: 'Pacific NW', riskType: 'high-turnover', description: '45% turnover with score dropping from 82 to 74 in 60 days', severity: 'high', detectedDate: 'Feb 1, 2026' },
  { locationName: 'Location #112', region: 'Northeast', district: 'New England', riskType: 'new-hires-untrained', description: '5 new hires awaiting onboarding — current training completion at 68%', severity: 'moderate', detectedDate: 'Feb 6, 2026' },
  { locationName: 'Location #455', region: 'Southwest', district: 'TX/OK', riskType: 'manager-vacancy', description: 'Previous manager transferred — acting manager covering 2 sites', severity: 'moderate', detectedDate: 'Jan 20, 2026' },
];

// ══════════════════════════════════════════════════════════════════
// FINANCIAL IMPACT ANALYSIS DATA
// ══════════════════════════════════════════════════════════════════

export interface FinancialCategory {
  id: string;
  category: string;
  icon: string;
  lowEstimate: number;
  highEstimate: number;
  description: string;
  details: string[];
  color: 'red' | 'amber' | 'green';
}

export interface ROISummary {
  annualInvestment: number;
  riskReductionLow: number;
  riskReductionHigh: number;
  insuranceSavings: number;
  revenueProtected: number;
  roiLow: number;
  roiHigh: number;
}

export interface HistoricalIncident {
  type: string;
  location: string;
  date: string;
  cost: number;
  resolution: string;
}

export const financialCategories: FinancialCategory[] = [
  {
    id: 'fin-1',
    category: 'Health Department Penalties',
    icon: 'gavel',
    lowEstimate: 18400,
    highEstimate: 47200,
    description: 'Current compliance gaps across 12 locations could result in estimated fines if inspected today.',
    details: [
      'Average fine per critical violation: $250–$1,000 depending on jurisdiction',
      '12 locations currently have at least one critical gap',
      'Repeat violations carry 2x-5x multipliers in most jurisdictions',
      'Source: county health department penalty schedules in jurisdiction engine',
    ],
    color: 'red',
  },
  {
    id: 'fin-2',
    category: 'Insurance Premium Impact',
    icon: 'shield',
    lowEstimate: 180000,
    highEstimate: 420000,
    description: 'Improving 23 high-risk locations to target risk scores could reduce annual insurance premiums.',
    details: [
      'Aggregate portfolio Insurance Risk Score: 81.5 (improved from 73.2)',
      '23 locations still above target risk threshold',
      'Industry average premium reduction for A-rated portfolios: 15-25%',
      'Disclaimer: estimates based on industry averages; actual impact determined by your carrier',
    ],
    color: 'amber',
  },
  {
    id: 'fin-3',
    category: 'Incident Cost Projection',
    icon: 'alert',
    lowEstimate: 340000,
    highEstimate: 890000,
    description: 'At current incident velocity, projected annual incident-related costs based on industry benchmarks.',
    details: [
      'Foodborne illness outbreak: $75,000–$500,000 (CDC estimates)',
      'Kitchen fire: $30,000–$150,000 (NFPA data)',
      'Workers comp claim: $20,000–$40,000 (BLS data)',
      'Slip-and-fall lawsuit: $15,000–$50,000 (industry benchmark)',
    ],
    color: 'red',
  },
  {
    id: 'fin-4',
    category: 'Revenue Protection',
    icon: 'revenue',
    lowEstimate: 85000,
    highEstimate: 210000,
    description: 'Without intervention at 5 at-risk locations, projected closure risk this year.',
    details: [
      '3 temporary closures last year resulted in ~$127,000 in lost revenue',
      'Average daily revenue per location: $8,500–$23,000',
      '5 locations currently at risk of health department closure order',
      'Average closure duration: 2-5 business days',
    ],
    color: 'amber',
  },
  {
    id: 'fin-5',
    category: 'Compliance Investment ROI',
    icon: 'trending-up',
    lowEstimate: 540000,
    highEstimate: 1300000,
    description: 'Total estimated risk reduction from EvidLY deployment across your portfolio.',
    details: [
      'EvidLY investment: $210,000/year (487 locations)',
      'Estimated risk reduction: $540,000–$1.3M/year',
      'ROI: 2.6x–6.2x',
      'Average health department inspection score improved B+ → A- since deployment',
    ],
    color: 'green',
  },
];

export const roiSummary: ROISummary = {
  annualInvestment: 210000,
  riskReductionLow: 540000,
  riskReductionHigh: 1300000,
  insuranceSavings: 340000,
  revenueProtected: 127000,
  roiLow: 2.6,
  roiHigh: 6.2,
};

export const historicalIncidents: HistoricalIncident[] = [
  { type: 'Temporary Closure', location: 'Location #312 (FL)', date: 'Mar 2025', cost: 47000, resolution: 'Re-inspection passed after 3 days, staff retrained' },
  { type: 'Foodborne Illness Complaint', location: 'Location #187 (TX)', date: 'Jun 2025', cost: 52000, resolution: 'Investigation cleared after 2 weeks, cooling logs upgraded' },
  { type: 'Kitchen Fire', location: 'Location #441 (CA)', date: 'Oct 2025', cost: 28000, resolution: 'Suppression system activated, 1 day closure, equipment replaced' },
];

export const industryBenchmarks = {
  foodborneOutbreak: { low: 75000, high: 500000, source: 'CDC' },
  kitchenFire: { low: 30000, high: 150000, source: 'NFPA' },
  workersComp: { low: 20000, high: 40000, source: 'BLS' },
  slipAndFall: { low: 15000, high: 50000, source: 'Industry' },
};

// ══════════════════════════════════════════════════════════════════
// EXECUTIVE REPORT GENERATOR DATA
// ══════════════════════════════════════════════════════════════════

export interface ReportTemplate {
  id: string;
  title: string;
  type: 'monthly' | 'quarterly' | 'ad-hoc';
  lastGenerated: string;
  pages: number;
  sections: string[];
  status: 'ready' | 'generating' | 'scheduled';
}

export interface DistributionRecipient {
  name: string;
  role: string;
  email: string;
  deliveryMethod: 'email' | 'teams' | 'sharepoint';
}

export const reportTemplates: ReportTemplate[] = [
  { id: 'rpt-1', title: 'Monthly Executive Summary', type: 'monthly', lastGenerated: 'Jan 31, 2026', pages: 4, sections: ['Dashboard Snapshot', 'Regional Performance', 'Risk & Exposure', 'Recommendations'], status: 'ready' },
  { id: 'rpt-2', title: 'Monthly Operations Digest', type: 'monthly', lastGenerated: 'Jan 31, 2026', pages: 6, sections: ['KPI Summary', 'Checklist Completion', 'Temperature Compliance', 'Vendor Performance', 'Incidents', 'Action Items'], status: 'ready' },
  { id: 'rpt-3', title: 'Quarterly Board Report', type: 'quarterly', lastGenerated: 'Dec 31, 2025', pages: 8, sections: ['Executive Summary', 'Operational Performance', 'Risk & Compliance', 'Financial Impact', 'Strategic Recommendations'], status: 'ready' },
  { id: 'rpt-4', title: 'Quarterly Insurance Summary', type: 'quarterly', lastGenerated: 'Dec 31, 2025', pages: 5, sections: ['Portfolio Risk Score', 'Risk Reduction Progress', 'Premium Impact Estimate', 'High-Risk Locations', 'Recommendations'], status: 'scheduled' },
  { id: 'rpt-5', title: 'Custom Regional Analysis', type: 'ad-hoc', lastGenerated: 'Feb 3, 2026', pages: 3, sections: ['Regional Scorecard', 'Location Comparison', 'Action Plan'], status: 'ready' },
  { id: 'rpt-6', title: 'Staffing Impact Report', type: 'ad-hoc', lastGenerated: 'Jan 22, 2026', pages: 4, sections: ['Staffing Correlation Summary', 'High-Risk Staffing', 'Training Gaps', 'Recommendations'], status: 'ready' },
];

export const reportSections = [
  'Executive Summary', 'Organization Scorecard', 'Regional Performance', 'Location Leaderboard',
  'Risk & Exposure', 'Financial Impact', 'Staffing Correlation', 'Trend Analysis',
  'Regulatory Landscape', 'Vendor Performance', 'Training Compliance', 'Recommendations',
];

export const distributionList: DistributionRecipient[] = [
  { name: 'Jennifer Martinez', role: 'VP Operations', email: 'j.martinez@pacificcoastdining.com', deliveryMethod: 'email' },
  { name: 'Michael Chen', role: 'CFO', email: 'm.chen@pacificcoastdining.com', deliveryMethod: 'email' },
  { name: 'Sarah Williams', role: 'VP Risk Management', email: 's.williams@pacificcoastdining.com', deliveryMethod: 'teams' },
  { name: 'David Thompson', role: 'CHRO', email: 'd.thompson@pacificcoastdining.com', deliveryMethod: 'sharepoint' },
  { name: 'Lisa Rodriguez', role: 'Regional Director — West', email: 'l.rodriguez@pacificcoastdining.com', deliveryMethod: 'email' },
];

// ══════════════════════════════════════════════════════════════════
// ANOMALY DETECTION ENGINE DATA
// ══════════════════════════════════════════════════════════════════

export interface AnomalyAlert {
  id: string;
  type: 'score' | 'behavioral' | 'volume';
  confidence: 'low' | 'medium' | 'high';
  severity: 'info' | 'warning' | 'critical';
  location: string;
  description: string;
  detectedAt: string;
  context: string;
  suggestedAction: string;
  status: 'new' | 'investigating' | 'resolved' | 'dismissed';
}

export interface AntiGamingFlag {
  id: string;
  location: string;
  pattern: string;
  description: string;
  confidence: 'medium' | 'high';
  detectedAt: string;
}

export const anomalyAlerts: AnomalyAlert[] = [
  { id: 'anom-1', type: 'score', confidence: 'high', severity: 'critical', location: 'Mall Food Court #12', description: 'Score dropped 8.1 points in a single week — 3x the maximum normal weekly variance.', detectedAt: 'Feb 8, 2026', context: 'Normal weekly variance for this location: ±2.1 pts. Current: -8.1 pts.', suggestedAction: 'Immediate site visit by district manager to investigate root cause.', status: 'new' },
  { id: 'anom-2', type: 'behavioral', confidence: 'high', severity: 'critical', location: 'Tampa General', description: 'Daily checklist completion stopped entirely 5 days ago after consistent 95%+ completion for 8 months.', detectedAt: 'Feb 6, 2026', context: 'Pattern suggests manager departure or system access issue rather than gradual decline.', suggestedAction: 'Contact site to verify manager status and system access. Check for personnel changes.', status: 'investigating' },
  { id: 'anom-3', type: 'score', confidence: 'high', severity: 'warning', location: 'Location #178', description: 'Score is 2.4 standard deviations below its West region peer group average.', detectedAt: 'Feb 7, 2026', context: 'West region average: 91.3, this location: 72.8. Percentile rank: 2nd among 134 West locations.', suggestedAction: 'Schedule compliance improvement plan review with regional director.', status: 'new' },
  { id: 'anom-4', type: 'behavioral', confidence: 'medium', severity: 'warning', location: 'Location #302', description: 'Temperature logs show identical readings (38.0°F) entered at exactly 2:00 PM daily for 14 consecutive days.', detectedAt: 'Feb 5, 2026', context: 'Probability of identical readings 14 days in a row: <0.001%. Suggests manual entry pattern.', suggestedAction: 'Verify temperature monitoring equipment is functioning. Review with site manager.', status: 'new' },
  { id: 'anom-5', type: 'volume', confidence: 'high', severity: 'warning', location: 'Southeast Region (all)', description: 'Daily data entry volume dropped 34% across 89 SE locations over 3 days.', detectedAt: 'Feb 4, 2026', context: 'No system outage detected. Possible regional training issue or process change.', suggestedAction: 'Contact Southeast regional team to verify system adoption. Check for IT issues.', status: 'investigating' },
  { id: 'anom-6', type: 'behavioral', confidence: 'medium', severity: 'warning', location: 'Location #421', description: 'Corrective actions marked "complete" in average 8 minutes — physically impossible for 3 of 5 action types.', detectedAt: 'Feb 3, 2026', context: 'Equipment repair, deep cleaning, and vendor scheduling typically require >1 hour. All marked complete in <10 min.', suggestedAction: 'Audit corrective action completion quality. May need photo evidence requirement.', status: 'new' },
  { id: 'anom-7', type: 'volume', confidence: 'medium', severity: 'info', location: 'Location #156', description: 'Spike in incident reports — 7 incidents in 3 days vs normal rate of 2/month.', detectedAt: 'Feb 2, 2026', context: 'Could indicate systemic issue emerging, or new manager being more diligent in reporting.', suggestedAction: 'Review incident types. If equipment-related, schedule maintenance assessment.', status: 'new' },
  { id: 'anom-8', type: 'score', confidence: 'low', severity: 'info', location: 'Location #234', description: 'Northeast region average suddenly diverged from 6-month historical trendline by 3.1 points.', detectedAt: 'Feb 1, 2026', context: 'Trendline predicted 90.2, actual 87.1. Within 2σ but worth monitoring.', suggestedAction: 'Monitor for next 2 weeks. If divergence persists, investigate contributing locations.', status: 'dismissed' },
  { id: 'anom-9', type: 'behavioral', confidence: 'high', severity: 'info', location: 'Location #88', description: 'Vendor documentation uploaded in batch at 11:47 PM — 47 documents in 3 minutes.', detectedAt: 'Jan 30, 2026', context: 'Normal pattern: 2-3 documents per week during business hours. Bulk upload suggests backlog.', suggestedAction: 'Verify document authenticity and dates. May indicate catching up on deferred uploads.', status: 'resolved' },
  { id: 'anom-10', type: 'volume', confidence: 'low', severity: 'info', location: 'API Integration', description: 'Unusual API call pattern from HRIS integration — 3x normal volume at 3 AM.', detectedAt: 'Jan 29, 2026', context: 'Likely triggered by HRIS system update or batch sync job. No errors detected.', suggestedAction: 'Monitor integration logs. Contact IT if pattern repeats.', status: 'resolved' },
];

export const antiGamingFlags: AntiGamingFlag[] = [
  { id: 'ag-1', location: 'Location #302', pattern: 'Identical temperature readings', description: 'Temperature readings entered in bulk — identical 38.0°F logged at exactly 2:00 PM for 14 consecutive days. Patterns suggest retrospective manual entry rather than real-time measurement.', confidence: 'high', detectedAt: 'Feb 5, 2026' },
  { id: 'ag-2', location: 'Location #421', pattern: 'Uniform checklist responses', description: 'All checklist items marked "pass" without variation for 6 consecutive weeks (252 items). Statistical probability of zero deviations: <0.01%.', confidence: 'high', detectedAt: 'Feb 3, 2026' },
  { id: 'ag-3', location: 'Location #189', pattern: 'Pre-audit score spike', description: 'Compliance score spiked 12 points in the 5 days before scheduled health department inspection, then dropped 9 points in the following week. Pattern observed in 2 of last 3 inspection cycles.', confidence: 'medium', detectedAt: 'Jan 25, 2026' },
];

export const anomalySummary = {
  score: { total: anomalyAlerts.filter(a => a.type === 'score').length, critical: anomalyAlerts.filter(a => a.type === 'score' && a.severity === 'critical').length },
  behavioral: { total: anomalyAlerts.filter(a => a.type === 'behavioral').length, critical: anomalyAlerts.filter(a => a.type === 'behavioral' && a.severity === 'critical').length },
  volume: { total: anomalyAlerts.filter(a => a.type === 'volume').length, critical: anomalyAlerts.filter(a => a.type === 'volume' && a.severity === 'critical').length },
};

// ══════════════════════════════════════════════════════════════════
// DATA AGGREGATION ENGINE
// ══════════════════════════════════════════════════════════════════

export interface AggregationStats {
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
}

export interface PeriodChange {
  value: number;
  direction: 'up' | 'down' | 'flat';
  label: string;
}

export interface AggregationLevel {
  level: string;
  entityName: string;
  overall: AggregationStats;
  foodSafety: AggregationStats;
  workplace: AggregationStats;
  regulatory: AggregationStats;
  periodChanges: {
    wow: PeriodChange;
    mom: PeriodChange;
    qoq: PeriodChange;
    yoy: PeriodChange;
  };
}

function computeStats(values: number[]): AggregationStats {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const pct = (p: number) => sorted[Math.min(Math.floor(p * n), n - 1)];
  return {
    count: n,
    mean: Math.round(mean * 10) / 10,
    median: pct(0.5),
    stdDev: Math.round(Math.sqrt(variance) * 10) / 10,
    min: sorted[0],
    max: sorted[n - 1],
    p25: pct(0.25),
    p50: pct(0.5),
    p75: pct(0.75),
    p90: pct(0.9),
    p95: pct(0.95),
  };
}

// Compute real aggregation stats from the 487-location leaderboard
const allOverall = locationLeaderboard.map(l => l.overall);
const allFood = locationLeaderboard.map(l => l.foodSafety);
const allWorkplace = locationLeaderboard.map(l => l.workplace);
const allRegulatory = locationLeaderboard.map(l => l.regulatory);

export const enterpriseAggregation: AggregationLevel = {
  level: 'enterprise',
  entityName: 'Pacific Coast Dining — All Locations',
  overall: computeStats(allOverall),
  foodSafety: computeStats(allFood),
  workplace: computeStats(allWorkplace),
  regulatory: computeStats(allRegulatory),
  periodChanges: {
    wow: { value: 0.3, direction: 'up', label: 'Week-over-Week' },
    mom: { value: 1.2, direction: 'up', label: 'Month-over-Month' },
    qoq: { value: 2.8, direction: 'up', label: 'Quarter-over-Quarter' },
    yoy: { value: 4.1, direction: 'up', label: 'Year-over-Year' },
  },
};

// Region-level aggregations
const regionNames = [...new Set(locationLeaderboard.map(l => l.region))];
export const regionAggregations: AggregationLevel[] = regionNames.map(region => {
  const locs = locationLeaderboard.filter(l => l.region === region);
  return {
    level: 'region',
    entityName: region,
    overall: computeStats(locs.map(l => l.overall)),
    foodSafety: computeStats(locs.map(l => l.foodSafety)),
    workplace: computeStats(locs.map(l => l.workplace)),
    regulatory: computeStats(locs.map(l => l.regulatory)),
    periodChanges: {
      wow: { value: +(seededRandom() * 1.5 - 0.3).toFixed(1), direction: seededRandom() > 0.3 ? 'up' : 'down', label: 'Week-over-Week' },
      mom: { value: +(seededRandom() * 3).toFixed(1), direction: seededRandom() > 0.25 ? 'up' : 'down', label: 'Month-over-Month' },
      qoq: { value: +(seededRandom() * 5).toFixed(1), direction: seededRandom() > 0.2 ? 'up' : 'down', label: 'Quarter-over-Quarter' },
      yoy: { value: +(seededRandom() * 7).toFixed(1), direction: 'up', label: 'Year-over-Year' },
    },
  };
});

// ══════════════════════════════════════════════════════════════════
// DATA FRESHNESS
// ══════════════════════════════════════════════════════════════════

export interface DataFreshnessIndicator {
  metric: string;
  interval: string;
  lastUpdated: string;
  nextUpdate: string;
  status: 'live' | 'recent' | 'stale';
}

export const dataFreshness: DataFreshnessIndicator[] = [
  { metric: 'Dashboard Scores', interval: 'Every 15 min', lastUpdated: 'Feb 10, 2026 08:45 AM', nextUpdate: 'Feb 10, 2026 09:00 AM', status: 'live' },
  { metric: 'Aggregation Statistics', interval: 'Daily (5 AM) + hourly incremental', lastUpdated: 'Feb 10, 2026 08:00 AM', nextUpdate: 'Feb 10, 2026 09:00 AM', status: 'live' },
  { metric: 'Risk Predictions', interval: 'Weekly (Monday)', lastUpdated: 'Feb 9, 2026', nextUpdate: 'Feb 16, 2026', status: 'recent' },
  { metric: 'Predictive Models', interval: 'Weekly retrain', lastUpdated: 'Feb 9, 2026', nextUpdate: 'Feb 16, 2026', status: 'recent' },
  { metric: 'Anomaly Detection', interval: 'Hourly scan', lastUpdated: 'Feb 10, 2026 08:00 AM', nextUpdate: 'Feb 10, 2026 09:00 AM', status: 'live' },
  { metric: 'Financial Projections', interval: 'Monthly (1st)', lastUpdated: 'Feb 1, 2026', nextUpdate: 'Mar 1, 2026', status: 'recent' },
  { metric: 'Staffing Correlations', interval: 'Daily', lastUpdated: 'Feb 10, 2026 05:00 AM', nextUpdate: 'Feb 11, 2026 05:00 AM', status: 'live' },
  { metric: 'Executive Reports', interval: 'On schedule', lastUpdated: 'Feb 7, 2026', nextUpdate: 'Feb 14, 2026', status: 'recent' },
];

// ══════════════════════════════════════════════════════════════════
// DATABASE SCHEMA REFERENCE (9 Tables)
// ══════════════════════════════════════════════════════════════════

export interface DbTableSchema {
  name: string;
  description: string;
  rowEstimate: string;
  columns: { name: string; type: string; description: string }[];
  indexes: string[];
  refreshSchedule: string;
}

export const databaseTables: DbTableSchema[] = [
  {
    name: 'intelligence_aggregates',
    description: 'Pre-computed statistical aggregates at every hierarchy level',
    rowEstimate: '~2,400 rows (487 locations × 4 levels + time-series)',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'entity_type', type: 'enum', description: 'location | district | region | enterprise' },
      { name: 'entity_id', type: 'uuid', description: 'FK to locations/districts/regions' },
      { name: 'metric_type', type: 'enum', description: 'overall | food_safety | workplace | regulatory' },
      { name: 'period', type: 'date', description: 'Aggregation period date' },
      { name: 'count', type: 'int', description: 'Number of data points' },
      { name: 'mean', type: 'numeric(5,2)', description: 'Arithmetic mean' },
      { name: 'median', type: 'numeric(5,2)', description: 'Median (p50)' },
      { name: 'std_dev', type: 'numeric(5,2)', description: 'Standard deviation' },
      { name: 'min_val', type: 'numeric(5,2)', description: 'Minimum value' },
      { name: 'max_val', type: 'numeric(5,2)', description: 'Maximum value' },
      { name: 'p25', type: 'numeric(5,2)', description: '25th percentile' },
      { name: 'p75', type: 'numeric(5,2)', description: '75th percentile' },
      { name: 'p90', type: 'numeric(5,2)', description: '90th percentile' },
      { name: 'p95', type: 'numeric(5,2)', description: '95th percentile' },
      { name: 'wow_change', type: 'numeric(5,2)', description: 'Week-over-week change' },
      { name: 'mom_change', type: 'numeric(5,2)', description: 'Month-over-month change' },
      { name: 'qoq_change', type: 'numeric(5,2)', description: 'Quarter-over-quarter change' },
      { name: 'yoy_change', type: 'numeric(5,2)', description: 'Year-over-year change' },
      { name: 'computed_at', type: 'timestamptz', description: 'When this aggregate was computed' },
    ],
    indexes: ['entity_type, entity_id, period', 'metric_type, period', 'computed_at'],
    refreshSchedule: 'Daily full recalc at 5 AM UTC + hourly incremental',
  },
  {
    name: 'intelligence_insights',
    description: 'AI-generated insights and recommendations',
    rowEstimate: '~5,000 rows',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'entity_type', type: 'enum', description: 'Scope of insight' },
      { name: 'entity_id', type: 'uuid', description: 'Related entity' },
      { name: 'insight_type', type: 'enum', description: 'trend | anomaly | recommendation | alert' },
      { name: 'severity', type: 'enum', description: 'info | warning | critical' },
      { name: 'title', type: 'text', description: 'Short insight title' },
      { name: 'body', type: 'text', description: 'Full insight description' },
      { name: 'action_items', type: 'jsonb', description: 'Suggested actions array' },
      { name: 'expires_at', type: 'timestamptz', description: 'When insight becomes stale' },
      { name: 'created_at', type: 'timestamptz', description: 'Generation timestamp' },
    ],
    indexes: ['entity_type, entity_id', 'insight_type, severity', 'expires_at'],
    refreshSchedule: 'Generated on each aggregation cycle',
  },
  {
    name: 'intelligence_risk_predictions',
    description: 'ML-based risk scores and failure probability predictions',
    rowEstimate: '~2,000 rows (487 locations × 4 risk types)',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'location_id', type: 'uuid', description: 'FK to locations' },
      { name: 'risk_type', type: 'enum', description: 'health_dept_failure | incident | equipment_failure | staffing' },
      { name: 'probability', type: 'numeric(5,4)', description: 'Risk probability (0-1)' },
      { name: 'confidence', type: 'numeric(5,4)', description: 'Model confidence (0-1)' },
      { name: 'contributing_factors', type: 'jsonb', description: 'Feature importance breakdown' },
      { name: 'prediction_window', type: 'interval', description: 'Time horizon for prediction' },
      { name: 'model_version', type: 'text', description: 'Model version identifier' },
      { name: 'computed_at', type: 'timestamptz', description: 'Prediction timestamp' },
    ],
    indexes: ['location_id, risk_type', 'probability DESC', 'computed_at'],
    refreshSchedule: 'Weekly full retrain, daily inference',
  },
  {
    name: 'intelligence_anomalies',
    description: 'Detected anomalies across all data streams',
    rowEstimate: '~500 rows (rolling 90-day window)',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'anomaly_type', type: 'enum', description: 'score | behavioral | volume' },
      { name: 'entity_id', type: 'uuid', description: 'Affected entity' },
      { name: 'severity', type: 'enum', description: 'info | warning | critical' },
      { name: 'confidence', type: 'numeric(5,4)', description: 'Detection confidence' },
      { name: 'description', type: 'text', description: 'Human-readable description' },
      { name: 'context', type: 'jsonb', description: 'Statistical context and baselines' },
      { name: 'suggested_action', type: 'text', description: 'Recommended response' },
      { name: 'status', type: 'enum', description: 'new | investigating | resolved | dismissed' },
      { name: 'resolved_by', type: 'uuid', description: 'User who resolved' },
      { name: 'detected_at', type: 'timestamptz', description: 'Detection timestamp' },
    ],
    indexes: ['anomaly_type, severity', 'entity_id', 'status', 'detected_at'],
    refreshSchedule: 'Hourly scan',
  },
  {
    name: 'intelligence_staffing_correlations',
    description: 'Computed staffing-to-compliance correlations by period',
    rowEstimate: '~6,000 rows',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'location_id', type: 'uuid', description: 'FK to locations' },
      { name: 'period', type: 'date', description: 'Correlation period' },
      { name: 'turnover_rate', type: 'numeric(5,2)', description: 'Staff turnover rate (%)' },
      { name: 'training_completion', type: 'numeric(5,2)', description: 'Training completion (%)' },
      { name: 'staffing_ratio', type: 'numeric(5,2)', description: 'Actual vs required staffing' },
      { name: 'cfpm_count', type: 'int', description: 'Number of certified food protection managers' },
      { name: 'manager_tenure_months', type: 'int', description: 'Current manager tenure' },
      { name: 'compliance_score', type: 'numeric(5,2)', description: 'Overall compliance score' },
      { name: 'correlation_coefficient', type: 'numeric(5,4)', description: 'Pearson correlation r' },
      { name: 'computed_at', type: 'timestamptz', description: 'Computation timestamp' },
    ],
    indexes: ['location_id, period', 'turnover_rate', 'computed_at'],
    refreshSchedule: 'Daily',
  },
  {
    name: 'intelligence_financial_impact',
    description: 'Financial risk projections and actual incident costs',
    rowEstimate: '~1,200 rows',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'entity_type', type: 'enum', description: 'location | district | region | enterprise' },
      { name: 'entity_id', type: 'uuid', description: 'Related entity' },
      { name: 'category', type: 'enum', description: 'penalties | insurance | incidents | revenue | roi' },
      { name: 'period', type: 'date', description: 'Projection period' },
      { name: 'low_estimate', type: 'numeric(12,2)', description: 'Low-end estimate ($)' },
      { name: 'high_estimate', type: 'numeric(12,2)', description: 'High-end estimate ($)' },
      { name: 'actual', type: 'numeric(12,2)', description: 'Actual cost (if realized)' },
      { name: 'computed_at', type: 'timestamptz', description: 'Computation timestamp' },
    ],
    indexes: ['entity_type, entity_id', 'category, period', 'computed_at'],
    refreshSchedule: 'Monthly full, weekly incremental',
  },
  {
    name: 'intelligence_executive_reports',
    description: 'Generated executive report metadata and storage',
    rowEstimate: '~200 rows',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'template_id', type: 'text', description: 'Report template identifier' },
      { name: 'title', type: 'text', description: 'Report title' },
      { name: 'report_type', type: 'enum', description: 'monthly | quarterly | ad_hoc' },
      { name: 'scope_entity_type', type: 'enum', description: 'Scope level' },
      { name: 'scope_entity_id', type: 'uuid', description: 'Scope entity' },
      { name: 'generated_by', type: 'uuid', description: 'Requesting user' },
      { name: 'storage_path', type: 'text', description: 'S3/storage path for PDF' },
      { name: 'page_count', type: 'int', description: 'Number of pages' },
      { name: 'sections', type: 'jsonb', description: 'Included sections' },
      { name: 'status', type: 'enum', description: 'generating | ready | failed' },
      { name: 'generated_at', type: 'timestamptz', description: 'Generation timestamp' },
    ],
    indexes: ['template_id', 'report_type, generated_at', 'generated_by'],
    refreshSchedule: 'On demand + scheduled (per template)',
  },
  {
    name: 'intelligence_report_views',
    description: 'Audit trail for report access and distribution',
    rowEstimate: '~1,500 rows',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'report_id', type: 'uuid', description: 'FK to executive_reports' },
      { name: 'viewed_by', type: 'uuid', description: 'User who viewed' },
      { name: 'delivery_method', type: 'enum', description: 'web | email | api' },
      { name: 'viewed_at', type: 'timestamptz', description: 'View timestamp' },
    ],
    indexes: ['report_id', 'viewed_by', 'viewed_at'],
    refreshSchedule: 'Real-time insert',
  },
  {
    name: 'intelligence_baselines',
    description: 'Rolling baselines for anomaly detection thresholds',
    rowEstimate: '~4,000 rows',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'entity_id', type: 'uuid', description: 'Monitored entity' },
      { name: 'metric', type: 'text', description: 'Metric being baselined' },
      { name: 'baseline_mean', type: 'numeric(8,2)', description: '90-day rolling mean' },
      { name: 'baseline_std_dev', type: 'numeric(8,2)', description: '90-day rolling std dev' },
      { name: 'upper_threshold', type: 'numeric(8,2)', description: 'Mean + 2σ (warning)' },
      { name: 'critical_threshold', type: 'numeric(8,2)', description: 'Mean + 3σ (critical)' },
      { name: 'data_points', type: 'int', description: 'Number of observations in window' },
      { name: 'computed_at', type: 'timestamptz', description: 'Last recomputation' },
    ],
    indexes: ['entity_id, metric', 'computed_at'],
    refreshSchedule: 'Daily at 5 AM UTC',
  },
];

// ══════════════════════════════════════════════════════════════════
// EDGE FUNCTIONS (9 Functions)
// ══════════════════════════════════════════════════════════════════

export interface EdgeFunction {
  name: string;
  description: string;
  schedule: string;
  avgRuntime: string;
  lastRun: string;
  status: 'healthy' | 'warning' | 'error';
  dependencies: string[];
}

export const edgeFunctions: EdgeFunction[] = [
  { name: 'compute-aggregates', description: 'Full statistical aggregation across all hierarchy levels', schedule: 'Daily 5:00 AM UTC', avgRuntime: '~4 min', lastRun: 'Feb 10, 2026 05:00 AM', status: 'healthy', dependencies: ['intelligence_aggregates'] },
  { name: 'incremental-aggregates', description: 'Hourly incremental update for changed locations only', schedule: 'Hourly (xx:00)', avgRuntime: '~45 sec', lastRun: 'Feb 10, 2026 08:00 AM', status: 'healthy', dependencies: ['intelligence_aggregates'] },
  { name: 'generate-insights', description: 'AI-powered insight generation from latest aggregates', schedule: 'After compute-aggregates', avgRuntime: '~2 min', lastRun: 'Feb 10, 2026 05:04 AM', status: 'healthy', dependencies: ['intelligence_insights', 'intelligence_aggregates'] },
  { name: 'risk-prediction', description: 'ML model inference for risk scoring all locations', schedule: 'Daily 6:00 AM UTC', avgRuntime: '~8 min', lastRun: 'Feb 10, 2026 06:00 AM', status: 'healthy', dependencies: ['intelligence_risk_predictions'] },
  { name: 'risk-model-retrain', description: 'Weekly ML model retraining with latest 90-day data window', schedule: 'Monday 3:00 AM UTC', avgRuntime: '~25 min', lastRun: 'Feb 9, 2026 03:00 AM', status: 'healthy', dependencies: ['intelligence_risk_predictions'] },
  { name: 'anomaly-scan', description: 'Hourly scan for statistical anomalies across all data streams', schedule: 'Hourly (xx:15)', avgRuntime: '~90 sec', lastRun: 'Feb 10, 2026 08:15 AM', status: 'healthy', dependencies: ['intelligence_anomalies', 'intelligence_baselines'] },
  { name: 'staffing-correlations', description: 'Daily staffing-to-compliance correlation computation', schedule: 'Daily 5:30 AM UTC', avgRuntime: '~3 min', lastRun: 'Feb 10, 2026 05:30 AM', status: 'healthy', dependencies: ['intelligence_staffing_correlations'] },
  { name: 'financial-projections', description: 'Monthly financial impact recalculation with actuals reconciliation', schedule: '1st of month 4:00 AM UTC', avgRuntime: '~6 min', lastRun: 'Feb 1, 2026 04:00 AM', status: 'healthy', dependencies: ['intelligence_financial_impact'] },
  { name: 'report-scheduler', description: 'Scheduled report generation and distribution', schedule: 'Per template schedule', avgRuntime: '~2 min per report', lastRun: 'Feb 7, 2026 06:00 AM', status: 'healthy', dependencies: ['intelligence_executive_reports', 'intelligence_report_views'] },
];

// ══════════════════════════════════════════════════════════════════
// PRICING TIERS
// ══════════════════════════════════════════════════════════════════

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  priceLabel: string;
  description: string;
  locationLimit: string;
  features: string[];
  highlighted: boolean;
}

export const pricingTiers: PricingTier[] = [
  {
    id: 'standard',
    name: 'Standard',
    price: 500,
    priceLabel: '$500/mo',
    description: 'Core intelligence for growing organizations',
    locationLimit: 'Up to 50 locations',
    features: [
      'Command Center dashboard',
      'Location comparison (up to 10)',
      'Trend analysis (90-day window)',
      'Basic risk scoring',
      'Monthly executive summary',
      'Email alerts for critical anomalies',
      'Standard data refresh (daily)',
    ],
    highlighted: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 1000,
    priceLabel: '$1,000/mo',
    description: 'Advanced analytics for enterprise operators',
    locationLimit: 'Up to 250 locations',
    features: [
      'Everything in Standard',
      'Staffing correlation analysis',
      'Financial impact projections',
      'Anomaly detection engine',
      'Custom report builder',
      'Quarterly board reports',
      'API access for BI integration',
      '15-minute data refresh',
      'Dedicated success manager',
    ],
    highlighted: true,
  },
  {
    id: 'platinum',
    name: 'Platinum',
    price: 2000,
    priceLabel: '$2,000/mo',
    description: 'Full intelligence suite for enterprise leaders',
    locationLimit: 'Unlimited locations',
    features: [
      'Everything in Premium',
      'Predictive ML models (weekly retrain)',
      'Anti-gaming detection',
      'Insurance carrier integration',
      'White-label executive reports',
      'Real-time anomaly alerts (SMS + Slack)',
      'Custom ML model training',
      'SLA: 99.9% uptime guarantee',
      'Dedicated analytics engineer',
      'On-site quarterly business review',
    ],
    highlighted: false,
  },
];

// Bundled enterprise tiers
export const enterpriseBundles = [
  { name: 'Compliance Intelligence + EvidLY Pro', saving: '15%', description: 'Bundle Intelligence dashboard with full EvidLY platform' },
  { name: 'Full Enterprise Suite', saving: '25%', description: 'Intelligence + EvidLY Pro + Insurance Risk + Vendor Marketplace' },
];

// C-Suite pitch
export const cSuitePitch = {
  headline: 'Turn Compliance Data into Competitive Advantage',
  subheadline: 'The only platform that transforms food safety operations into executive-grade business intelligence — across every location, every day.',
  valueProps: [
    'Predict health department failures 30 days before they happen',
    'Quantify the financial impact of every compliance decision',
    'Detect data gaming and anomalies before they become incidents',
    'Generate board-ready reports in one click',
    'Benchmark against 2,000+ peer locations nationwide',
  ],
  closingLine: 'Your competitors are still using spreadsheets. Your board wants predictive intelligence.',
};
