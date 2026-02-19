// Enterprise Executive Dashboard — Data Layer
// White-labeled enterprise view data, types, and helpers

import {
  enterpriseTenants,
  enterpriseHierarchy,
  enterpriseTrendData,
  enterpriseAlerts,
  type EnterpriseHierarchyNode,
  type EnterpriseTrendPoint,
  type EnterpriseAlert,
} from './demoData';

// ── Re-exports ───────────────────────────────────────────────────
export {
  enterpriseHierarchy,
  enterpriseTrendData,
  enterpriseAlerts,
  type EnterpriseHierarchyNode,
  type EnterpriseTrendPoint,
  type EnterpriseAlert,
};

// ── Types ────────────────────────────────────────────────────────

export interface BusinessUnitScorecard {
  id: string;
  name: string;
  locationCount: number;
  avgScore: number;
  trend: number;
  worstLocation: { name: string; score: number } | null;
  criticalItems: number;
  foodSafety: number;
  fireSafety: number;
}

export interface RegulatoryOverlay {
  month: string;
  label: string;
  color: string;
  description: string;
}

export interface PredictedScore {
  businessUnit: string;
  currentScore: number;
  predictedNextQuarter: number;
  confidence: 'high' | 'medium' | 'low';
}

export type ComplianceCategory = 'overall' | 'foodSafety' | 'fireSafety';

// ── Enterprise tenant ────────────────────────────────────────────
export const enterpriseTenant = enterpriseTenants.find(t => t.id === 'ent-pcdining')!;

// ── Data Points Counter ──────────────────────────────────────────
export const dataPointsThisMonth = 847_291;

// ── Business Unit Scorecard ──────────────────────────────────────
export const businessUnitScorecard: BusinessUnitScorecard[] = [
  {
    id: 'h-higher-ed',
    name: 'Higher Education',
    locationCount: 847,
    avgScore: 91.2,
    trend: 2.1,
    worstLocation: { name: 'Temple University', score: 68 },
    criticalItems: 3,
    foodSafety: 93.1,
    fireSafety: 89.4,
  },
  {
    id: 'h-healthcare',
    name: 'Healthcare',
    locationCount: 312,
    avgScore: 94.7,
    trend: 0.8,
    worstLocation: null,
    criticalItems: 0,
    foodSafety: 96.2,
    fireSafety: 93.0,
  },
  {
    id: 'h-destinations',
    name: 'Destinations',
    locationCount: 89,
    avgScore: 88.4,
    trend: -1.2,
    worstLocation: { name: 'Badger Pass', score: 74 },
    criticalItems: 1,
    foodSafety: 90.1,
    fireSafety: 86.2,
  },
  {
    id: 'h-corrections',
    name: 'Corrections',
    locationCount: 156,
    avgScore: 86.1,
    trend: 3.4,
    worstLocation: null,
    criticalItems: 0,
    foodSafety: 88.3,
    fireSafety: 83.7,
  },
  {
    id: 'h-sports',
    name: 'Sports & Entertainment',
    locationCount: 443,
    avgScore: 88.0,
    trend: 1.5,
    worstLocation: { name: 'SoCal District', score: 85 },
    criticalItems: 2,
    foodSafety: 90.2,
    fireSafety: 85.8,
  },
];

// ── 12-Month BU Trend Data ───────────────────────────────────────
export const businessUnitTrends: { month: string; overall: number; higherEd: number; healthcare: number; destinations: number; corrections: number; sports: number }[] = [
  { month: 'Mar 25', overall: 82.1, higherEd: 85.2, healthcare: 92.1, destinations: 84.8, corrections: 80.2, sports: 83.5 },
  { month: 'Apr 25', overall: 83.4, higherEd: 86.0, healthcare: 92.5, destinations: 85.1, corrections: 81.0, sports: 84.2 },
  { month: 'May 25', overall: 84.2, higherEd: 86.8, healthcare: 93.0, destinations: 85.6, corrections: 81.8, sports: 84.9 },
  { month: 'Jun 25', overall: 85.0, higherEd: 87.5, healthcare: 93.2, destinations: 86.2, corrections: 82.4, sports: 85.4 },
  { month: 'Jul 25', overall: 85.8, higherEd: 88.1, healthcare: 93.5, destinations: 86.8, corrections: 82.9, sports: 85.8 },
  { month: 'Aug 25', overall: 86.5, higherEd: 88.8, healthcare: 93.8, destinations: 87.2, corrections: 83.5, sports: 86.3 },
  { month: 'Sep 25', overall: 87.2, higherEd: 89.4, healthcare: 94.0, destinations: 87.6, corrections: 84.0, sports: 86.8 },
  { month: 'Oct 25', overall: 87.8, higherEd: 89.9, healthcare: 94.2, destinations: 88.0, corrections: 84.6, sports: 87.2 },
  { month: 'Nov 25', overall: 88.4, higherEd: 90.3, healthcare: 94.4, destinations: 88.4, corrections: 85.1, sports: 87.5 },
  { month: 'Dec 25', overall: 89.0, higherEd: 90.7, healthcare: 94.5, destinations: 88.2, corrections: 85.6, sports: 87.8 },
  { month: 'Jan 26', overall: 89.5, higherEd: 91.0, healthcare: 94.6, destinations: 88.6, corrections: 85.9, sports: 87.9 },
  { month: 'Feb 26', overall: 90.0, higherEd: 91.2, healthcare: 94.7, destinations: 88.4, corrections: 86.1, sports: 88.0 },
];

// ── Regulatory Overlays ──────────────────────────────────────────
export const regulatoryOverlays: RegulatoryOverlay[] = [
  { month: 'Jul 25', label: 'AB 660 (CA)', color: '#d4af37', description: 'California hood cleaning frequency update' },
  { month: 'Nov 25', label: 'FDA Update', color: '#6b21a8', description: 'FDA Food Code revision effective' },
  { month: 'Jan 26', label: 'OSHA Rule', color: '#ef4444', description: 'OSHA fire suppression certification change' },
];

// ── Predicted Scores ─────────────────────────────────────────────
export const predictedScores: PredictedScore[] = [
  { businessUnit: 'Higher Education', currentScore: 91.2, predictedNextQuarter: 92.8, confidence: 'high' },
  { businessUnit: 'Healthcare', currentScore: 94.7, predictedNextQuarter: 95.1, confidence: 'high' },
  { businessUnit: 'Destinations', currentScore: 88.4, predictedNextQuarter: 89.6, confidence: 'medium' },
  { businessUnit: 'Corrections', currentScore: 86.1, predictedNextQuarter: 88.5, confidence: 'medium' },
  { businessUnit: 'Sports & Entertainment', currentScore: 88.0, predictedNextQuarter: 89.2, confidence: 'medium' },
];

// ── BU Line Colors ───────────────────────────────────────────────
export const BU_LINE_COLORS: Record<string, string> = {
  overall: '#1e4d6b',
  higherEd: '#22c55e',
  healthcare: '#6b21a8',
  destinations: '#d4af37',
  corrections: '#0e7490',
  sports: '#ef4444',
};

export const BU_LINE_LABELS: Record<string, string> = {
  overall: 'Overall',
  higherEd: 'Higher Education',
  healthcare: 'Healthcare',
  destinations: 'Destinations',
  corrections: 'Corrections',
  sports: 'Sports & Ent.',
};

// ── Helpers ──────────────────────────────────────────────────────

export function getEnterpriseAlerts(): EnterpriseAlert[] {
  const sevOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  return enterpriseAlerts
    .filter(a => a.tenantId === 'ent-pcdining')
    .sort((a, b) => (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3));
}

export function findNodeById(node: EnterpriseHierarchyNode, id: string): EnterpriseHierarchyNode | null {
  if (node.id === id) return node;
  if (!node.children) return null;
  for (const child of node.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

export function getNodeChildren(nodeId: string | null): EnterpriseHierarchyNode[] {
  if (!nodeId) return enterpriseHierarchy.children || [];
  const node = findNodeById(enterpriseHierarchy, nodeId);
  return node?.children || [];
}

export function getAncestorPath(targetId: string): EnterpriseHierarchyNode[] {
  const path: EnterpriseHierarchyNode[] = [];
  function walk(node: EnterpriseHierarchyNode): boolean {
    if (node.id === targetId) {
      path.push(node);
      return true;
    }
    if (node.children) {
      for (const child of node.children) {
        if (walk(child)) {
          path.unshift(node);
          return true;
        }
      }
    }
    return false;
  }
  walk(enterpriseHierarchy);
  return path;
}

export function getScoreByCategory(node: EnterpriseHierarchyNode, category: ComplianceCategory): number {
  if (category === 'overall') return node.complianceScore;
  return node[category];
}

// Count all locations in a subtree
export function countLocationsInSubtree(node: EnterpriseHierarchyNode): number {
  if (node.level === 'location') return 1;
  if (!node.children) return node.locationCount;
  return node.children.reduce((sum, c) => sum + countLocationsInSubtree(c), 0);
}

// Collect all node codes in subtree for alert filtering
export function collectNodeCodes(node: EnterpriseHierarchyNode): Set<string> {
  const codes = new Set<string>();
  codes.add(node.code);
  if (node.children) {
    for (const child of node.children) {
      for (const code of collectNodeCodes(child)) codes.add(code);
    }
  }
  return codes;
}
