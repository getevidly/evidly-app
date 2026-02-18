import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import {
  loadDashboardData,
  type ActivityItem,
} from '../lib/dashboardQueries';
import {
  DEMO_LOCATIONS,
  LOCATIONS_WITH_SCORES,
  DEMO_ORG_SCORES,
  DEMO_TREND_DATA,
  DEMO_ATTENTION_ITEMS,
  DEFAULT_WEIGHTS,
  locationScoresThirtyDaysAgo,
  calcPillar,
  calcReadiness,
} from '../data/demoData';

// ── Types ──────────────────────────────────────────────

export interface TaskItem {
  id: string;
  label: string;
  status: 'done' | 'in_progress' | 'pending' | 'overdue';
  time: string;
  route: string;
  reading?: string;
}

export interface DeadlineItem {
  id: string;
  label: string;
  location: string;
  dueDate: string;
  daysLeft: number;
  severity: 'critical' | 'warning' | 'normal';
  route: string;
}

export interface ImpactItem {
  id: string;
  action: string;
  points: number;
  location: string;
  pillar: string;
  severity: 'critical' | 'warning';
  route: string;
}

export interface AlertItem {
  id: string;
  severity: 'critical' | 'warning';
  message: string;
  location: string;
  pillar: string;
  actionLabel: string;
  route: string;
}

export interface ModuleStatus {
  id: string;
  label: string;
  metric: string;
  status: 'good' | 'warning' | 'critical';
  route: string;
}

export interface LocationWithScores {
  id: string;
  name: string;
  foodSafety: { ops: number; docs: number };
  fireSafety: { ops: number; docs: number };
  trend: number;
  status: 'good' | 'attention' | 'critical';
  foodScore: number;
  fireScore: number;
  score: number;
}

export interface TrendDataPoint {
  date: string;
  overall: number;
  foodSafety: number;
  fireSafety: number;
}

export interface DashboardWeights {
  foodSafety: number;
  fireSafety: number;
  ops: number;
  docs: number;
}

export interface DashboardPayload {
  orgScores: { overall: number; foodSafety: number; fireSafety: number };
  locations: LocationWithScores[];
  locationScoresPrev: Record<string, { foodSafety: number; fireSafety: number }>;
  tasks: TaskItem[];
  deadlines: DeadlineItem[];
  alerts: AlertItem[];
  impact: ImpactItem[];
  activity: ActivityItem[];
  moduleStatuses: ModuleStatus[];
  trendData: TrendDataPoint[];
  weights: DashboardWeights;
}

// ── Demo Data ──────────────────────────────────────────

const DEMO_TASKS: TaskItem[] = [
  { id: 't1', label: 'Opening checklist — Downtown Kitchen', status: 'done', time: '6:15 AM', route: '/checklists', reading: '12/12 items' },
  { id: 't2', label: 'Cooler #1 temperature log', status: 'done', time: '7:02 AM', route: '/temp-logs', reading: '37.8°F' },
  { id: 't3', label: 'Midday checklist — Downtown Kitchen', status: 'in_progress', time: '4/8 items', route: '/checklists' },
  { id: 't4', label: 'Prep cooler manual temp log', status: 'overdue', time: 'Due by 10 AM', route: '/temp-logs' },
  { id: 't5', label: 'Review incident report #247', status: 'pending', time: 'Due today', route: '/incidents' },
  { id: 't6', label: 'Closing checklist — Downtown Kitchen', status: 'pending', time: 'Due by 10 PM', route: '/checklists' },
];

const DEMO_DEADLINES: DeadlineItem[] = [
  { id: 'd1', label: 'Fire suppression certificate', location: 'University Dining', dueDate: 'Feb 26', daysLeft: 10, severity: 'critical', route: '/documents' },
  { id: 'd2', label: 'Hood cleaning service', location: 'Airport Cafe', dueDate: 'Feb 19', daysLeft: 3, severity: 'critical', route: '/vendors' },
  { id: 'd3', label: 'Food handler cert renewal', location: 'Airport Cafe', dueDate: 'Feb 28', daysLeft: 12, severity: 'warning', route: '/team' },
  { id: 'd4', label: 'Pest control report upload', location: 'Airport Cafe', dueDate: 'Mar 1', daysLeft: 13, severity: 'warning', route: '/documents' },
  { id: 'd5', label: 'Health permit renewal', location: 'Downtown Kitchen', dueDate: 'Apr 10', daysLeft: 53, severity: 'normal', route: '/documents' },
];

const DEMO_IMPACT: ImpactItem[] = [
  { id: 'i1', action: 'Complete 8 missed temperature logs', points: 7, location: 'University Dining', pillar: 'Food Safety', severity: 'critical', route: '/temp-logs?location=university' },
  { id: 'i2', action: 'Schedule overdue hood cleaning', points: 5, location: 'Airport Cafe', pillar: 'Fire Safety', severity: 'critical', route: '/vendors' },
  { id: 'i3', action: 'Upload fire suppression certificate', points: 4, location: 'University Dining', pillar: 'Fire Safety', severity: 'critical', route: '/documents' },
  { id: 'i4', action: 'Complete opening checklists (3 missed)', points: 3, location: 'University Dining', pillar: 'Food Safety', severity: 'warning', route: '/checklists?location=university' },
  { id: 'i5', action: 'Log prep cooler temperature', points: 2, location: 'Downtown Kitchen', pillar: 'Food Safety', severity: 'warning', route: '/temp-logs' },
];

const DEMO_ALERTS: AlertItem[] = [
  { id: 'a1', severity: 'critical', message: 'University Dining score dropped below 70 — would fail inspection', location: 'University Dining', pillar: 'Overall', actionLabel: 'View Details', route: '/dashboard?location=university' },
  { id: 'a2', severity: 'warning', message: '3 out-of-range temperature readings this week', location: 'Airport Cafe', pillar: 'Food Safety', actionLabel: 'View Temp Log', route: '/temp-logs?location=airport' },
  { id: 'a3', severity: 'warning', message: 'Walk-in cooler trending warm — schedule service', location: 'Airport Cafe', pillar: 'Fire Safety', actionLabel: 'Schedule', route: '/equipment' },
];

const DEMO_ACTIVITY: ActivityItem[] = [
  { initials: 'MJ', name: 'Marcus J.', action: 'logged Walk-in Cooler: 38°F ✓', time: '15 min ago', url: '/temp-logs', borderColor: '#22c55e' },
  { initials: 'SC', name: 'Sarah C.', action: 'completed Opening Checklist', time: '45 min ago', url: '/checklists', borderColor: '#22c55e' },
  { initials: 'DP', name: 'David P.', action: 'logged Freezer: 15°F ✓', time: '1h ago', url: '/temp-logs', borderColor: '#22c55e' },
  { initials: 'ER', name: 'Emma R.', action: 'uploaded Food Handler Cert', time: '2h ago', url: '/documents', borderColor: '#1e4d6b' },
  { initials: 'AT', name: 'Alex T.', action: 'logged Hot Hold: 127°F ✗', time: '3h ago', url: '/temp-logs', borderColor: '#ef4444' },
];

const DEMO_MODULE_STATUSES: ModuleStatus[] = [
  { id: 'mod-checklists', label: 'Checklists', metric: '2/3 complete', status: 'warning', route: '/checklists' },
  { id: 'mod-temp', label: 'Temp Logs', metric: '14/36 logged', status: 'warning', route: '/temp-logs' },
  { id: 'mod-equipment', label: 'Equipment', metric: '2 overdue', status: 'critical', route: '/equipment' },
  { id: 'mod-haccp', label: 'HACCP', metric: '6 plans active', status: 'good', route: '/haccp' },
  { id: 'mod-training', label: 'Training', metric: '89% compliant', status: 'good', route: '/training' },
  { id: 'mod-fire', label: 'Fire Safety', metric: '3 alerts', status: 'critical', route: '/fire-safety' },
];

function buildDemoPayload(): DashboardPayload {
  // Build 30-day-ago per-location scores for trend comparisons
  const locationScoresPrev: Record<string, { foodSafety: number; fireSafety: number }> = {};
  for (const [locId, prev] of Object.entries(locationScoresThirtyDaysAgo)) {
    locationScoresPrev[locId] = { foodSafety: prev.foodSafety, fireSafety: prev.fireSafety };
  }

  return {
    orgScores: DEMO_ORG_SCORES,
    locations: LOCATIONS_WITH_SCORES,
    locationScoresPrev,
    tasks: DEMO_TASKS,
    deadlines: DEMO_DEADLINES,
    alerts: DEMO_ALERTS,
    impact: DEMO_IMPACT,
    activity: DEMO_ACTIVITY,
    moduleStatuses: DEMO_MODULE_STATUSES,
    trendData: DEMO_TREND_DATA,
    weights: {
      foodSafety: DEFAULT_WEIGHTS.foodSafetyWeight * 100,
      fireSafety: DEFAULT_WEIGHTS.fireSafetyWeight * 100,
      ops: DEFAULT_WEIGHTS.opsWeight * 100,
      docs: DEFAULT_WEIGHTS.docsWeight * 100,
    },
  };
}

// ── Hook ───────────────────────────────────────────────

export function useDashboardData(): {
  data: DashboardPayload;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();

  const orgId = profile?.organization_id;
  const isDemo = isDemoMode || !orgId;

  const [data, setData] = useState<DashboardPayload>(buildDemoPayload);
  const [loading, setLoading] = useState(!isDemo);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (isDemo) {
      setData(buildDemoPayload());
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await loadDashboardData(orgId);

      if (!mountedRef.current) return;

      // Map Supabase results into DashboardPayload
      // Locations come with scores from the query layer
      const locations: LocationWithScores[] = DEMO_LOCATIONS.map(loc => ({
        ...loc,
        foodScore: calcPillar(loc.foodSafety),
        fireScore: calcPillar(loc.fireSafety),
        score: calcReadiness(loc.foodSafety, loc.fireSafety),
      }));

      setData({
        orgScores: {
          overall: result.complianceData.scores.overall,
          foodSafety: result.complianceData.scores.foodSafety,
          fireSafety: result.complianceData.scores.fireSafety,
        },
        locations,
        locationScoresPrev: Object.fromEntries(
          Object.entries(result.complianceData.locationScoresThirtyDaysAgo).map(
            ([id, s]) => [id, { foodSafety: s.foodSafety, fireSafety: s.fireSafety }],
          ),
        ),
        tasks: DEMO_TASKS, // Real task wiring deferred to production
        deadlines: DEMO_DEADLINES,
        alerts: DEMO_ALERTS,
        impact: DEMO_IMPACT,
        activity: result.activity,
        moduleStatuses: DEMO_MODULE_STATUSES,
        trendData: DEMO_TREND_DATA,
        weights: {
          foodSafety: DEFAULT_WEIGHTS.foodSafetyWeight * 100,
          fireSafety: DEFAULT_WEIGHTS.fireSafetyWeight * 100,
          ops: DEFAULT_WEIGHTS.opsWeight * 100,
          docs: DEFAULT_WEIGHTS.docsWeight * 100,
        },
      });
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      // Fall back to demo data on error
      setData(buildDemoPayload());
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [isDemo, orgId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
