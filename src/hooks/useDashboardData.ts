import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { pushComplianceUpdate } from '../lib/intelligenceBridge';
import {
  loadDashboardData,
  type ActivityItem,
} from '../lib/dashboardQueries';
import {
  LOCATIONS_WITH_SCORES,
  DEMO_ORG_SCORES,
  DEMO_TREND_DATA,
  locationScoresThirtyDaysAgo,
} from '../data/demoData';
import { DEMO_INTELLIGENCE_INSIGHTS } from '../data/demoIntelligenceData';

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
  facilitySafety: { ops: number; docs: number };
  trend: number;
  status: 'good' | 'attention' | 'critical';
  foodScore: number;
  fireScore: number;
  score: number | null;
}

export interface TrendDataPoint {
  date: string;
  overall: number;
  foodSafety: number;
  facilitySafety: number;
}

export interface DashboardWeights {
  ops: number;
  docs: number;
}

export interface DashboardPayload {
  orgScores: { overall: number | null; foodSafety: number; facilitySafety: number };
  locations: LocationWithScores[];
  locationScoresPrev: Record<string, { foodSafety: number; facilitySafety: number }>;
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

/**
 * Dynamically compute missed temperature logs for demo mode.
 *
 * A temp log is "missed" when ALL of these are true:
 *   1. The equipment has an active monitoring schedule (all demo equipment does)
 *   2. The required check interval (4 h) has passed since the LAST logged entry
 *   3. The current time is within operating hours (6 AM – 10 PM)
 *
 * Overnight gaps are NOT counted — if the last check was before yesterday's
 * close, the clock starts at today's operating-hours start (6 AM).
 *
 * Ice machines are excluded (tracked under Equipment cleaning/maintenance).
 */
const OPERATING_START = 6;   // 6 AM
const OPERATING_END   = 22;  // 10 PM
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

function computeMissedTempLogs(): { total: number; byLocation: Record<string, number> } {
  const now = new Date();
  const currentHour = now.getHours();

  // Outside operating hours → no checks expected → zero missed
  if (currentHour < OPERATING_START || currentHour >= OPERATING_END) {
    return { total: 0, byLocation: {} };
  }

  const todayAt = (h: number, m: number) => {
    const d = new Date(now); d.setHours(h, m, 0, 0); return d;
  };
  const operatingStartToday = todayAt(OPERATING_START, 0);

  // Demo equipment (mirrors TempLogs demo data, Ice Machine excluded)
  const demoEquipment = [
    { name: 'Walk-in Cooler #1', location: 'Downtown Kitchen', lastCheck: todayAt(6, 0) },
    { name: 'Walk-in Cooler #2', location: 'Downtown Kitchen', lastCheck: todayAt(6, 15) },
    { name: 'Walk-in Freezer',   location: 'Downtown Kitchen', lastCheck: todayAt(6, 30) },
    { name: 'Prep Table Cooler', location: 'Airport Cafe',     lastCheck: todayAt(6, 45) },
    { name: 'Hot Holding Unit',  location: 'University Dining', lastCheck: new Date(now.getTime() - 18 * 60 * 60 * 1000) },
    { name: 'Salad Bar',         location: 'Airport Cafe',      lastCheck: new Date(now.getTime() - 16 * 60 * 60 * 1000) },
    { name: 'Blast Chiller',     location: 'University Dining', lastCheck: new Date(now.getTime() - 14 * 60 * 60 * 1000) },
  ];

  const byLocation: Record<string, number> = {};
  let total = 0;

  for (const eq of demoEquipment) {
    // If last check was before today's opening, treat operating start as the
    // effective "last check" so overnight gaps are never penalised.
    const effective = eq.lastCheck < operatingStartToday ? operatingStartToday : eq.lastCheck;
    if (now.getTime() - effective.getTime() > CHECK_INTERVAL_MS) {
      total++;
      byLocation[eq.location] = (byLocation[eq.location] || 0) + 1;
    }
  }

  return { total, byLocation };
}

const LOC_ROUTE: Record<string, string> = {
  'University Dining': '/temp-logs?location=university',
  'Airport Cafe':      '/temp-logs?location=airport',
  'Downtown Kitchen':  '/temp-logs?location=downtown',
};

function buildDemoImpact(): ImpactItem[] {
  const { total, byLocation } = computeMissedTempLogs();
  const items: ImpactItem[] = [];

  // Only add a missed-temp-log impact item when there are actual misses
  if (total > 0) {
    // Pick the location with the most missed logs for the top alert
    const topLoc = Object.entries(byLocation).sort((a, b) => b[1] - a[1])[0];
    items.push({
      id: 'i1',
      action: `Complete ${total} missed temperature log${total === 1 ? '' : 's'}`,
      points: Math.min(total, 10),
      location: topLoc[0],
      pillar: 'Food Safety',
      severity: total >= 4 ? 'critical' : 'warning',
      route: LOC_ROUTE[topLoc[0]] || '/temp-logs',
    });
  }

  // Other (non-temp) impact items — always included
  items.push(
    { id: 'i2', action: 'Schedule overdue hood cleaning', points: 5, location: 'Airport Cafe', pillar: 'Facility Safety', severity: 'critical', route: '/vendors' },
    { id: 'i3', action: 'Upload fire suppression certificate', points: 4, location: 'University Dining', pillar: 'Facility Safety', severity: 'critical', route: '/documents' },
    { id: 'i4', action: 'Complete opening checklists (3 missed)', points: 3, location: 'University Dining', pillar: 'Food Safety', severity: 'warning', route: '/checklists?location=university' },
    { id: 'i5', action: 'Log prep cooler temperature', points: 2, location: 'Downtown Kitchen', pillar: 'Food Safety', severity: 'warning', route: '/temp-logs' },
  );

  return items;
}

const DEMO_ALERTS: AlertItem[] = [
  { id: 'a1', severity: 'critical', message: 'University Dining score dropped below 70 — would fail inspection', location: 'University Dining', pillar: 'Overall', actionLabel: 'View Details', route: '/dashboard?location=university' },
  { id: 'a2', severity: 'warning', message: '3 out-of-range temperature readings this week', location: 'Airport Cafe', pillar: 'Food Safety', actionLabel: 'View Temp Log', route: '/temp-logs?location=airport' },
  { id: 'a3', severity: 'warning', message: 'Walk-in cooler trending warm — schedule service', location: 'Airport Cafe', pillar: 'Facility Safety', actionLabel: 'Schedule', route: '/equipment' },
  // Intelligence-sourced alerts (critical/high insights)
  ...DEMO_INTELLIGENCE_INSIGHTS
    .filter(i => i.impact_level === 'critical' || i.impact_level === 'high')
    .slice(0, 3)
    .map((i, idx) => ({
      id: `intel-${idx}`,
      severity: (i.impact_level === 'critical' ? 'critical' : 'warning') as 'critical' | 'warning',
      message: `[Intel] ${i.headline}`,
      location: i.affected_counties[0] || 'All Locations',
      pillar: i.affected_pillars[0] || 'Intelligence',
      actionLabel: 'View Intel',
      route: '/intelligence',
    })),
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
  { id: 'mod-temp', label: 'Temp Logs', metric: '14/35 logged', status: 'warning', route: '/temp-logs' },
  { id: 'mod-equipment', label: 'Equipment', metric: '2 overdue', status: 'critical', route: '/equipment' },
  { id: 'mod-haccp', label: 'HACCP', metric: '6 plans active', status: 'good', route: '/haccp' },
  { id: 'mod-training', label: 'Training', metric: '89% compliant', status: 'good', route: '/training' },
  { id: 'mod-fire', label: 'Facility Safety', metric: '3 alerts', status: 'critical', route: '/facility-safety' },
];

function buildDemoPayload(): DashboardPayload {
  // Build 30-day-ago per-location scores for trend comparisons
  const locationScoresPrev: Record<string, { foodSafety: number; facilitySafety: number }> = {};
  for (const [locId, prev] of Object.entries(locationScoresThirtyDaysAgo)) {
    locationScoresPrev[locId] = { foodSafety: prev.foodSafety, facilitySafety: prev.facilitySafety };
  }

  return {
    orgScores: DEMO_ORG_SCORES,
    locations: LOCATIONS_WITH_SCORES,
    locationScoresPrev,
    tasks: DEMO_TASKS,
    deadlines: DEMO_DEADLINES,
    alerts: DEMO_ALERTS,
    impact: buildDemoImpact(),
    activity: DEMO_ACTIVITY,
    moduleStatuses: DEMO_MODULE_STATUSES,
    trendData: DEMO_TREND_DATA,
    weights: {
      ops: 50,
      docs: 50,
    },
  };
}

/** Empty payload for live mode — no hardcoded demo data */
function buildEmptyPayload(): DashboardPayload {
  return {
    orgScores: { overall: null, foodSafety: 0, facilitySafety: 0 },
    locations: [],
    locationScoresPrev: {},
    tasks: [],
    deadlines: [],
    alerts: [],
    impact: [],
    activity: [],
    moduleStatuses: [],
    trendData: [],
    weights: { ops: 50, docs: 50 },
  };
}

// ── Intelligence bridge: compliance push throttle ──────

const BRIDGE_THROTTLE_KEY = 'evidly_intelligence_last_push';
const BRIDGE_THROTTLE_MS = 60 * 60 * 1000; // 1 hour
const BRIDGE_DELTA_THRESHOLD = 5; // only push when score delta > 5 points

function shouldPushToIntelligence(
  current: { foodSafety: number; facilitySafety: number },
  lastPushed: { foodSafety: number; facilitySafety: number } | null,
): boolean {
  if (!lastPushed) return true;
  return (
    Math.abs(current.foodSafety - lastPushed.foodSafety) > BRIDGE_DELTA_THRESHOLD ||
    Math.abs(current.facilitySafety - lastPushed.facilitySafety) > BRIDGE_DELTA_THRESHOLD
  );
}

function isThrottled(): boolean {
  try {
    const last = localStorage.getItem(BRIDGE_THROTTLE_KEY);
    if (!last) return false;
    return Date.now() - Number(last) < BRIDGE_THROTTLE_MS;
  } catch {
    return false;
  }
}

function markPushTimestamp(): void {
  try {
    localStorage.setItem(BRIDGE_THROTTLE_KEY, String(Date.now()));
  } catch { /* ignore */ }
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

  const [data, setData] = useState<DashboardPayload>(() => isDemo ? buildDemoPayload() : buildEmptyPayload());
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
      const locations: LocationWithScores[] = result.locations.map(loc => ({
        id: loc.id || loc.urlId,
        name: loc.name,
        foodSafety: { ops: 0, docs: 0 },
        facilitySafety: { ops: 0, docs: 0 },
        trend: 0,
        status: 'good' as const,
        foodScore: 0,
        fireScore: 0,
        score: null,
      }));

      setData({
        orgScores: {
          overall: null,
          foodSafety: result.complianceData.scores.foodSafety,
          facilitySafety: result.complianceData.scores.facilitySafety,
        },
        locations,
        locationScoresPrev: Object.fromEntries(
          Object.entries(result.complianceData.locationScoresThirtyDaysAgo).map(
            ([id, s]) => [id, { foodSafety: s.foodSafety, facilitySafety: s.facilitySafety }],
          ),
        ),
        tasks: [],
        deadlines: [],
        alerts: [],
        impact: [],
        activity: result.activity,
        moduleStatuses: [],
        trendData: [],
        weights: {
          ops: 50,
          docs: 50,
        },
      });
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      // Fall back to empty data on error — never show demo data in live mode
      setData(buildEmptyPayload());
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [isDemo, orgId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  // ── Intelligence bridge: push compliance when scores change significantly ──
  const lastPushedScoresRef = useRef<{ foodSafety: number; facilitySafety: number } | null>(null);

  useEffect(() => {
    if (isDemo || !orgId || loading) return;

    const current = {
      foodSafety: data.orgScores.foodSafety,
      facilitySafety: data.orgScores.facilitySafety,
    };

    if (!shouldPushToIntelligence(current, lastPushedScoresRef.current)) return;
    if (isThrottled()) return;

    lastPushedScoresRef.current = current;
    markPushTimestamp();

    pushComplianceUpdate(orgId, {
      foodSafety: current.foodSafety,
      facilitySafety: current.facilitySafety,
      openItems: data.impact.length,
    }).catch(() => {}); // fire and forget
  }, [isDemo, orgId, loading, data.orgScores.foodSafety, data.orgScores.facilitySafety, data.impact.length]);

  return { data, loading, error, refresh: fetchData };
}
