import { locationScores, locationScoresThirtyDaysAgo } from './demoData';

// ── Types ──────────────────────────────────────────────────────

export type HierarchyLevel = 'corporate' | 'division' | 'region' | 'district' | 'location';

export interface HierarchyLevelConfig {
  key: HierarchyLevel;
  label: string;
  canAttachLocations: boolean;
}

export interface HierarchyConfig {
  tenantName: string;
  levels: HierarchyLevelConfig[];
  rollupMethod: 'weighted' | 'equal';
}

export interface HierarchyNode {
  id: string;
  level: HierarchyLevel;
  name: string;
  code: string;
  complianceScore: number;
  operational: number;
  equipment: number;
  documentation: number;
  locationCount: number;
  children?: HierarchyNode[];
}

// ── Demo Config ────────────────────────────────────────────────

export const demoHierarchyConfig: HierarchyConfig = {
  tenantName: 'Pacific Coast Dining',
  levels: [
    { key: 'corporate', label: 'Corporate', canAttachLocations: false },
    { key: 'region', label: 'Region', canAttachLocations: false },
    { key: 'district', label: 'District', canAttachLocations: true },
    { key: 'location', label: 'Location', canAttachLocations: true },
  ],
  rollupMethod: 'weighted',
};

// ── Rollup Helper ──────────────────────────────────────────────

export function computeRollup(
  children: HierarchyNode[],
  method: 'weighted' | 'equal'
): { overall: number; operational: number; equipment: number; documentation: number } {
  if (children.length === 0) return { overall: 0, operational: 0, equipment: 0, documentation: 0 };

  if (method === 'equal') {
    const n = children.length;
    return {
      overall: Math.round(children.reduce((s, c) => s + c.complianceScore, 0) / n),
      operational: Math.round(children.reduce((s, c) => s + c.operational, 0) / n),
      equipment: Math.round(children.reduce((s, c) => s + c.equipment, 0) / n),
      documentation: Math.round(children.reduce((s, c) => s + c.documentation, 0) / n),
    };
  }

  // Weighted by location count
  const totalLocs = children.reduce((s, c) => s + c.locationCount, 0);
  if (totalLocs === 0) return computeRollup(children, 'equal');
  return {
    overall: Math.round(children.reduce((s, c) => s + c.complianceScore * c.locationCount, 0) / totalLocs),
    operational: Math.round(children.reduce((s, c) => s + c.operational * c.locationCount, 0) / totalLocs),
    equipment: Math.round(children.reduce((s, c) => s + c.equipment * c.locationCount, 0) / totalLocs),
    documentation: Math.round(children.reduce((s, c) => s + c.documentation * c.locationCount, 0) / totalLocs),
  };
}

// ── Build Demo Tree ────────────────────────────────────────────

function buildTree(scores: Record<string, { overall: number; operational: number; equipment: number; documentation: number }>): HierarchyNode {
  const downtown: HierarchyNode = {
    id: 'pcd-downtown', level: 'location', name: 'Downtown Kitchen', code: 'PCD-DWN',
    complianceScore: scores.downtown.overall, operational: scores.downtown.operational,
    equipment: scores.downtown.equipment, documentation: scores.downtown.documentation,
    locationCount: 1,
  };
  const airport: HierarchyNode = {
    id: 'pcd-airport', level: 'location', name: 'Airport Cafe', code: 'PCD-AIR',
    complianceScore: scores.airport.overall, operational: scores.airport.operational,
    equipment: scores.airport.equipment, documentation: scores.airport.documentation,
    locationCount: 1,
  };
  const university: HierarchyNode = {
    id: 'pcd-university', level: 'location', name: 'University Dining', code: 'PCD-UNI',
    complianceScore: scores.university.overall, operational: scores.university.operational,
    equipment: scores.university.equipment, documentation: scores.university.documentation,
    locationCount: 1,
  };

  const fresnoRollup = computeRollup([downtown, airport], 'weighted');
  const fresnoMetro: HierarchyNode = {
    id: 'pcd-fresno', level: 'district', name: 'Fresno Metro', code: 'PCD-FRS',
    complianceScore: fresnoRollup.overall, operational: fresnoRollup.operational,
    equipment: fresnoRollup.equipment, documentation: fresnoRollup.documentation,
    locationCount: 2,
    children: [downtown, airport],
  };

  const mercedRollup = computeRollup([university], 'weighted');
  const mercedCounty: HierarchyNode = {
    id: 'pcd-merced', level: 'district', name: 'Merced County', code: 'PCD-MRC',
    complianceScore: mercedRollup.overall, operational: mercedRollup.operational,
    equipment: mercedRollup.equipment, documentation: mercedRollup.documentation,
    locationCount: 1,
    children: [university],
  };

  const cvRollup = computeRollup([fresnoMetro, mercedCounty], 'weighted');
  const centralValley: HierarchyNode = {
    id: 'pcd-cv', level: 'region', name: 'Central Valley', code: 'PCD-CV',
    complianceScore: cvRollup.overall, operational: cvRollup.operational,
    equipment: cvRollup.equipment, documentation: cvRollup.documentation,
    locationCount: 3,
    children: [fresnoMetro, mercedCounty],
  };

  const corpRollup = computeRollup([centralValley], 'weighted');
  return {
    id: 'pcd-corp', level: 'corporate', name: 'Pacific Coast Dining', code: 'PCD',
    complianceScore: corpRollup.overall, operational: corpRollup.operational,
    equipment: corpRollup.equipment, documentation: corpRollup.documentation,
    locationCount: 3,
    children: [centralValley],
  };
}

export const demoHierarchyTree = buildTree(locationScores);
export const demoHierarchyTreeThirtyDaysAgo = buildTree(locationScoresThirtyDaysAgo);

// ── Tree Helpers ───────────────────────────────────────────────

export function findNode(tree: HierarchyNode, id: string): HierarchyNode | null {
  if (tree.id === id) return tree;
  if (tree.children) {
    for (const child of tree.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function getAncestors(tree: HierarchyNode, targetId: string): HierarchyNode[] {
  if (tree.id === targetId) return [tree];
  if (tree.children) {
    for (const child of tree.children) {
      const path = getAncestors(child, targetId);
      if (path.length > 0) return [tree, ...path];
    }
  }
  return [];
}

// ── 12-Week Historical Data ────────────────────────────────────

const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12'];

function generateWeeklyHistory(currentScore: number, thirtyDaysAgoScore: number) {
  const diff = currentScore - thirtyDaysAgoScore;
  return WEEKS.map((week, i) => {
    const progress = i / (WEEKS.length - 1);
    const noise = Math.round((Math.random() - 0.5) * 4);
    const base = thirtyDaysAgoScore + diff * progress + noise;
    return {
      week,
      score: Math.min(100, Math.max(0, Math.round(i === WEEKS.length - 1 ? currentScore : base))),
    };
  });
}

export interface WeeklyHistoryPoint {
  week: string;
  overall: number;
  operational: number;
  equipment: number;
  documentation: number;
}

function buildNodeHistory(
  current: { overall: number; operational: number; equipment: number; documentation: number },
  prev: { overall: number; operational: number; equipment: number; documentation: number }
): WeeklyHistoryPoint[] {
  const overallHist = generateWeeklyHistory(current.overall, prev.overall);
  const opHist = generateWeeklyHistory(current.operational, prev.operational);
  const eqHist = generateWeeklyHistory(current.equipment, prev.equipment);
  const docHist = generateWeeklyHistory(current.documentation, prev.documentation);
  return WEEKS.map((week, i) => ({
    week,
    overall: overallHist[i].score,
    operational: opHist[i].score,
    equipment: eqHist[i].score,
    documentation: docHist[i].score,
  }));
}

function collectAllNodeIds(tree: HierarchyNode): string[] {
  const ids = [tree.id];
  if (tree.children) tree.children.forEach(c => ids.push(...collectAllNodeIds(c)));
  return ids;
}

function buildAllHistory(current: HierarchyNode, prev: HierarchyNode): Record<string, WeeklyHistoryPoint[]> {
  const result: Record<string, WeeklyHistoryPoint[]> = {};
  result[current.id] = buildNodeHistory(
    { overall: current.complianceScore, operational: current.operational, equipment: current.equipment, documentation: current.documentation },
    { overall: prev.complianceScore, operational: prev.operational, equipment: prev.equipment, documentation: prev.documentation }
  );
  if (current.children && prev.children) {
    current.children.forEach((child, i) => {
      const prevChild = prev.children![i];
      if (prevChild) Object.assign(result, buildAllHistory(child, prevChild));
    });
  }
  return result;
}

export const HIERARCHY_WEEKLY_HISTORY = buildAllHistory(demoHierarchyTree, demoHierarchyTreeThirtyDaysAgo);

// ── Common Issues by Level ─────────────────────────────────────

export interface HierarchyIssue {
  icon: 'thermometer' | 'clipboard' | 'wrench' | 'file-warning';
  label: string;
  pct: number;
}

export const HIERARCHY_COMMON_ISSUES: Record<string, HierarchyIssue[]> = {
  corporate: [
    { icon: 'thermometer', label: 'Temperature logs incomplete at peak hours', pct: 42 },
    { icon: 'wrench', label: 'Hood cleaning overdue at 2+ locations', pct: 33 },
    { icon: 'file-warning', label: 'Vendor COI renewal pending', pct: 28 },
    { icon: 'clipboard', label: 'Opening checklist skip rate above 10%', pct: 25 },
  ],
  region: [
    { icon: 'thermometer', label: 'Walk-in cooler temp trending above 38°F', pct: 38 },
    { icon: 'wrench', label: 'Fire suppression service overdue', pct: 30 },
    { icon: 'clipboard', label: 'Weekend checklist completion under 80%', pct: 35 },
    { icon: 'file-warning', label: 'Food handler certs expiring within 30 days', pct: 22 },
  ],
  district: [
    { icon: 'thermometer', label: 'Temperature excursions in past 7 days', pct: 45 },
    { icon: 'clipboard', label: 'Closing checklist skip rate above 15%', pct: 40 },
    { icon: 'wrench', label: 'Equipment maintenance backlog', pct: 33 },
    { icon: 'file-warning', label: 'Health permit renewal due this month', pct: 20 },
  ],
  location: [
    { icon: 'thermometer', label: 'Missed temperature logs today', pct: 50 },
    { icon: 'clipboard', label: 'Opening checklist not started', pct: 33 },
    { icon: 'wrench', label: 'Equipment condition below threshold', pct: 25 },
    { icon: 'file-warning', label: 'Missing documentation items', pct: 20 },
  ],
};

// ── Level Colors ───────────────────────────────────────────────

export const LEVEL_COLORS: Record<string, string> = {
  corporate: '#6b21a8',
  division: '#1e4d6b',
  region: '#0e7490',
  district: '#d4af37',
  location: '#22c55e',
};
