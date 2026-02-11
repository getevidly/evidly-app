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
export const aramarkTenant = enterpriseTenants.find(t => t.id === 'ent-aramark')!;

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
  'Yosemite Valley Lodge', 'The Ahwahnee', 'Half Dome Village', 'Wawona Hotel', 'Tuolumne Meadows',
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
    { name: 'Yosemite Valley Lodge', region: 'West', district: 'CA/NV', state: 'CA', vertical: 'Destinations', overall: 97.3, fire: 99, food: 96, docs: 97, trend: 1.2, actionItems: 0 },
    { name: 'The Ahwahnee', region: 'West', district: 'CA/NV', state: 'CA', vertical: 'Destinations', overall: 96.8, fire: 98, food: 95, docs: 97, trend: 0.5, actionItems: 0 },
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
