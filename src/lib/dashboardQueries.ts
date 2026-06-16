import { supabase } from './supabase';
import {
  locations,
  vendors as demoVendors,
  needsAttentionItems,
  type Location,
  type Vendor,
  type NeedsAttentionItem,
} from '../data/demoData';

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────

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
  locations: Location[];
  progress: ProgressData;
  activity: ActivityItem[];
  vendors: Vendor[];
  needsAttention: NeedsAttentionItem[];
  timezone: string | null;
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
      .eq('organization_id', organizationId)
      .limit(100);

    if (!data || data.length === 0) return [];

    return data.map((loc) => ({
      id: loc.id,
      name: loc.name,
      urlId: loc.name.toLowerCase().replace(/\s+/g, '-'),
      address: loc.address || '',
      lat: 0,
      lng: 0,
      actionItems: 0,
    }));
  } catch {
    return [];
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
      .from('temperature_logs')
      .select('id, temperature_equipment!inner(organization_id)', { count: 'exact', head: true })
      .eq('temperature_equipment.organization_id', organizationId)
      .gte('reading_time', todayStart.toISOString());

    const { count: checkCount } = await supabase
      .from('checklist_completions')
      .select('id', { count: 'exact', head: true })
      .gte('completed_at', todayStart.toISOString());

    // If no real data, return empty
    if ((!tempCount || tempCount === 0) && (!checkCount || checkCount === 0)) {
      return {};
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
    return {};
  }
}

// ────────────────────────────────────────────────────────
// Fetch recent activity
// ────────────────────────────────────────────────────────

const DEMO_ACTIVITY: ActivityItem[] = [
  { initials: 'MJ', name: 'Marcus J.', action: 'logged Walk-in Cooler: 38\u00b0F \u2713', time: '15 min ago', url: '/temp-logs?id=walk-in-cooler-downtown', borderColor: '#22c55e' },
  { initials: 'SC', name: 'Sarah C.', action: 'completed Opening Checklist', time: '45 min ago', url: '/checklists?id=opening-checklist', borderColor: '#22c55e' },
  { initials: 'DP', name: 'David P.', action: 'logged Freezer: 15\u00b0F \u2713', time: '1h ago', url: '/temp-logs?id=freezer-downtown', borderColor: '#22c55e' },
  { initials: 'ER', name: 'Emma R.', action: 'uploaded Food Handler Cert', time: '2h ago', url: '/documents?id=food-handler-cert', borderColor: '#1E2D4D' },
  { initials: 'AT', name: 'Alex T.', action: 'logged Hot Hold: 127\u00b0F \u2717', time: '3h ago', url: '/temp-logs?id=hot-hold-airport', borderColor: '#ef4444' },
];

export async function fetchRecentActivity(organizationId?: string): Promise<ActivityItem[]> {
  if (!organizationId) return DEMO_ACTIVITY;

  try {
    const { data: tempLogs } = await supabase
      .from('temperature_logs')
      .select('id, equipment_id, temperature, temp_pass, reading_time, logged_by, temperature_equipment!inner(organization_id)')
      .eq('temperature_equipment.organization_id', organizationId)
      .order('reading_time', { ascending: false })
      .limit(5);

    if (!tempLogs || tempLogs.length === 0) return [];

    // Convert real temp logs into activity items
    return tempLogs.map((log) => {
      const isOk = log.temp_pass === true;
      const initials = 'U'; // Could look up profile — kept simple for now
      const timeAgo = getRelativeTime(new Date(log.reading_time));
      return {
        initials,
        name: 'Staff',
        action: `logged temperature: ${log.temperature}\u00b0F ${isOk ? '\u2713' : '\u2717'}`,
        time: timeAgo,
        url: '/temp-logs',
        borderColor: isOk ? '#22c55e' : '#ef4444',
      };
    });
  } catch {
    return [];
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
      .eq('organization_id', organizationId)
      .limit(50);

    if (!relationships || relationships.length === 0) return [];

    const vendorIds = relationships.map((r) => r.vendor_id);

    const { data: vendorRows } = await supabase
      .from('vendors')
      .select('*')
      .in('id', vendorIds)
      .limit(50);

    if (!vendorRows || vendorRows.length === 0) return [];

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
    return [];
  }
}

// ────────────────────────────────────────────────────────
// Fetch needs-attention items
// ────────────────────────────────────────────────────────

export async function fetchNeedsAttention(organizationId?: string): Promise<NeedsAttentionItem[]> {
  if (!organizationId) return needsAttentionItems;
  // Live mode: return empty — in production, derive from real compliance gaps
  return [];
}

// ────────────────────────────────────────────────────────
// Fetch organization metadata — timezone for canonical hook consumers
// ────────────────────────────────────────────────────────
export async function fetchOrganizationMeta(
  organizationId?: string,
): Promise<{ timezone: string | null }> {
  if (!organizationId) return { timezone: null };
  const { data, error } = await supabase
    .from('organizations')
    .select('timezone')
    .eq('id', organizationId)
    .single();
  if (error || !data) return { timezone: null };
  return { timezone: data.timezone };
}

// ────────────────────────────────────────────────────────
// Master loader — runs all queries in parallel
// ────────────────────────────────────────────────────────

export async function loadDashboardData(organizationId?: string): Promise<DashboardData> {
  const [locs, progress, activity, vendorData, needsAttention, orgMeta] = await Promise.all([
    fetchLocations(organizationId),
    fetchTodaysProgress(organizationId),
    fetchRecentActivity(organizationId),
    fetchVendorServices(organizationId),
    fetchNeedsAttention(organizationId),
    fetchOrganizationMeta(organizationId),
  ]);

  return {
    locations: locs,
    progress,
    activity,
    vendors: vendorData,
    needsAttention,
    timezone: orgMeta.timezone,
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
