import { supabase } from './supabase';
import {
  complianceScores,
  complianceScoresThirtyDaysAgo,
  locationScores,
  locationScoresThirtyDaysAgo,
  locations,
  vendors as demoVendors,
  needsAttentionItems,
  scoreImpactData,
  type Location,
  type Vendor,
  type NeedsAttentionItem,
  type ScoreImpactItem,
} from '../data/demoData';

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────

export interface ComplianceScoresResult {
  scores: { overall: number; operational: number; equipment: number; documentation: number };
  locationScores: Record<string, { overall: number; operational: number; equipment: number; documentation: number }>;
  scoresThirtyDaysAgo: { overall: number; operational: number; equipment: number; documentation: number };
  locationScoresThirtyDaysAgo: Record<string, { overall: number; operational: number; equipment: number; documentation: number }>;
}

export interface ProgressData {
  [locationId: string]: { tempDone: number; tempTotal: number; checkDone: number; checkTotal: number };
}

export interface ActivityItem {
  initials: string;
  name: string;
  action: string;
  time: string;
  url: string;
  borderColor: string;
}

export interface DashboardData {
  complianceData: ComplianceScoresResult;
  locations: Location[];
  progress: ProgressData;
  activity: ActivityItem[];
  vendors: Vendor[];
  needsAttention: NeedsAttentionItem[];
  scoreImpact: ScoreImpactItem[];
}

// ────────────────────────────────────────────────────────
// Fetch compliance scores — real DB or demo fallback
// ────────────────────────────────────────────────────────

export async function fetchComplianceScores(organizationId?: string): Promise<ComplianceScoresResult> {
  if (!organizationId) {
    return { scores: complianceScores, locationScores, scoresThirtyDaysAgo: complianceScoresThirtyDaysAgo, locationScoresThirtyDaysAgo };
  }

  try {
    // Check if there is any real temp_log data for this org
    const { count: tempCount } = await supabase
      .from('temp_logs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    // If no real data exists, fall back to demo
    if (!tempCount || tempCount === 0) {
      return { scores: complianceScores, locationScores, scoresThirtyDaysAgo: complianceScoresThirtyDaysAgo, locationScoresThirtyDaysAgo };
    }

    // In a production build we would compute pillar scores from real data here.
    // For now return demo scores — this path activates once the org has real temp logs.
    return { scores: complianceScores, locationScores, scoresThirtyDaysAgo: complianceScoresThirtyDaysAgo, locationScoresThirtyDaysAgo };
  } catch {
    return { scores: complianceScores, locationScores, scoresThirtyDaysAgo: complianceScoresThirtyDaysAgo, locationScoresThirtyDaysAgo };
  }
}

// ────────────────────────────────────────────────────────
// Fetch locations for an org
// ────────────────────────────────────────────────────────

export async function fetchLocations(organizationId?: string): Promise<Location[]> {
  if (!organizationId) return locations;

  try {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .eq('organization_id', organizationId);

    if (!data || data.length === 0) return locations;

    return data.map((loc) => ({
      id: loc.id,
      name: loc.name,
      urlId: loc.name.toLowerCase().replace(/\s+/g, '-'),
      address: loc.address || '',
      lat: 0,
      lng: 0,
      score: 0,
      status: loc.status || 'active',
      actionItems: 0,
    }));
  } catch {
    return locations;
  }
}

// ────────────────────────────────────────────────────────
// Fetch today's progress (temp logs + checklist completions)
// ────────────────────────────────────────────────────────

const DEMO_PROGRESS: ProgressData = {
  downtown:   { tempDone: 10, tempTotal: 12, checkDone: 2, checkTotal: 3 },
  airport:    { tempDone: 4,  tempTotal: 12, checkDone: 1, checkTotal: 3 },
  university: { tempDone: 0,  tempTotal: 12, checkDone: 0, checkTotal: 3 },
};

export async function fetchTodaysProgress(organizationId?: string): Promise<ProgressData> {
  if (!organizationId) return DEMO_PROGRESS;

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: tempCount } = await supabase
      .from('temp_logs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('recorded_at', todayStart.toISOString());

    const { count: checkCount } = await supabase
      .from('checklist_completions')
      .select('id', { count: 'exact', head: true })
      .gte('completed_at', todayStart.toISOString());

    // If no real data, return demo
    if ((!tempCount || tempCount === 0) && (!checkCount || checkCount === 0)) {
      return DEMO_PROGRESS;
    }

    // Minimal real-data mapping (single bucket for now)
    return {
      all: {
        tempDone: tempCount || 0,
        tempTotal: Math.max(tempCount || 0, 12),
        checkDone: checkCount || 0,
        checkTotal: Math.max(checkCount || 0, 3),
      },
    };
  } catch {
    return DEMO_PROGRESS;
  }
}

// ────────────────────────────────────────────────────────
// Fetch recent activity
// ────────────────────────────────────────────────────────

const DEMO_ACTIVITY: ActivityItem[] = [
  { initials: 'MJ', name: 'Marcus J.', action: 'logged Walk-in Cooler: 38\u00b0F \u2713', time: '15 min ago', url: '/temp-logs?id=walk-in-cooler-downtown', borderColor: '#22c55e' },
  { initials: 'SC', name: 'Sarah C.', action: 'completed Opening Checklist', time: '45 min ago', url: '/checklists?id=opening-checklist', borderColor: '#22c55e' },
  { initials: 'DP', name: 'David P.', action: 'logged Freezer: 15\u00b0F \u2713', time: '1h ago', url: '/temp-logs?id=freezer-downtown', borderColor: '#22c55e' },
  { initials: 'ER', name: 'Emma R.', action: 'uploaded Food Handler Cert', time: '2h ago', url: '/documents?id=food-handler-cert', borderColor: '#1e4d6b' },
  { initials: 'AT', name: 'Alex T.', action: 'logged Hot Hold: 127\u00b0F \u2717', time: '3h ago', url: '/temp-logs?id=hot-hold-airport', borderColor: '#ef4444' },
];

export async function fetchRecentActivity(organizationId?: string): Promise<ActivityItem[]> {
  if (!organizationId) return DEMO_ACTIVITY;

  try {
    const { data: tempLogs } = await supabase
      .from('temp_logs')
      .select('id, equipment_name, temperature, unit, status, recorded_at, recorded_by')
      .eq('organization_id', organizationId)
      .order('recorded_at', { ascending: false })
      .limit(5);

    if (!tempLogs || tempLogs.length === 0) return DEMO_ACTIVITY;

    // Convert real temp logs into activity items
    return tempLogs.map((log) => {
      const isOk = log.status === 'normal';
      const initials = 'U'; // Could look up profile — kept simple for now
      const timeAgo = getRelativeTime(new Date(log.recorded_at));
      return {
        initials,
        name: 'Staff',
        action: `logged ${log.equipment_name}: ${log.temperature}\u00b0${log.unit || 'F'} ${isOk ? '\u2713' : '\u2717'}`,
        time: timeAgo,
        url: '/temp-logs',
        borderColor: isOk ? '#22c55e' : '#ef4444',
      };
    });
  } catch {
    return DEMO_ACTIVITY;
  }
}

// ────────────────────────────────────────────────────────
// Fetch vendor services
// ────────────────────────────────────────────────────────

export async function fetchVendorServices(organizationId?: string): Promise<Vendor[]> {
  if (!organizationId) return demoVendors;

  try {
    const { data: relationships } = await supabase
      .from('vendor_client_relationships')
      .select('vendor_id')
      .eq('organization_id', organizationId);

    if (!relationships || relationships.length === 0) return demoVendors;

    const vendorIds = relationships.map((r) => r.vendor_id);

    const { data: vendorRows } = await supabase
      .from('vendors')
      .select('*')
      .in('id', vendorIds);

    if (!vendorRows || vendorRows.length === 0) return demoVendors;

    return vendorRows.map((v) => ({
      id: v.id,
      companyName: v.company_name,
      contactName: v.contact_name || '',
      email: v.email || '',
      phone: v.phone || '',
      serviceType: v.service_type || '',
      lastService: '',
      nextDue: '',
      documentsCount: 0,
      status: 'current' as const,
      locationId: '',
    }));
  } catch {
    return demoVendors;
  }
}

// ────────────────────────────────────────────────────────
// Fetch needs-attention items
// ────────────────────────────────────────────────────────

export async function fetchNeedsAttention(organizationId?: string): Promise<NeedsAttentionItem[]> {
  // For now always return demo — in production, derive from real compliance gaps
  return needsAttentionItems;
}

// ────────────────────────────────────────────────────────
// Fetch score impact data
// ────────────────────────────────────────────────────────

export async function fetchScoreImpact(organizationId?: string): Promise<ScoreImpactItem[]> {
  // For now always return demo — in production, derive from real compliance data
  return scoreImpactData;
}

// ────────────────────────────────────────────────────────
// Master loader — runs all queries in parallel
// ────────────────────────────────────────────────────────

export async function loadDashboardData(organizationId?: string): Promise<DashboardData> {
  const [complianceData, locs, progress, activity, vendorData, needsAttention, scoreImpact] = await Promise.all([
    fetchComplianceScores(organizationId),
    fetchLocations(organizationId),
    fetchTodaysProgress(organizationId),
    fetchRecentActivity(organizationId),
    fetchVendorServices(organizationId),
    fetchNeedsAttention(organizationId),
    fetchScoreImpact(organizationId),
  ]);

  return {
    complianceData,
    locations: locs,
    progress,
    activity,
    vendors: vendorData,
    needsAttention,
    scoreImpact,
  };
}

// ────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
