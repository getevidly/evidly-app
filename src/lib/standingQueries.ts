/**
 * standingQueries.ts — Supabase query layer for dashboard standing data
 *
 * Each function has dual path: demo mode returns static data, live mode queries Supabase.
 * Standing is derived from operational data only — no scores, no grades.
 */

import { supabase } from './supabase';
import {
  DEMO_LOCATIONS,
  DEMO_ATTENTION_ITEMS,
  LOCATION_JURISDICTION_STATUS,
  locations as demoLocations,
} from '../data/demoData';
import type { JurisdictionScoringType } from '../data/demoData';

// ── Types ──────────────────────────────────────────────────

export type StandingLevel = 'ok' | 'action' | 'pending' | 'unknown';

export interface LocationStanding {
  locationId: string;
  locationName: string;
  foodSafety: StandingLevel;
  facilitySafety: StandingLevel;
  foodSafetyReason: string | null;
  facilitySafetyReason: string | null;
  openItemCount: number;
  criticalItemCount: number;
  // Jurisdiction-specific display data (populated when jurisdiction config is available)
  foodGradeDisplay?: string;
  foodScoringType?: JurisdictionScoringType;
  foodAuthority?: string;
  foodDetail?: string;
  foodStatus?: 'passing' | 'at_risk' | 'failing' | 'unknown';
  facilityGradeDisplay?: string;
  facilityAuthority?: string;
  facilityStatus?: 'passing' | 'failing';
}

export interface AttentionItem {
  id: string;
  locationId: string;
  locationName: string;
  severity: 'critical' | 'warning';
  description: string;
  route: string;
}

export interface TaskItem {
  id: string;
  label: string;
  status: 'done' | 'in_progress' | 'pending' | 'overdue';
  time: string;
  route: string;
}

export interface UpcomingEvent {
  id: string;
  label: string;
  location: string;
  dueDate: string;
  daysLeft: number;
  severity: 'critical' | 'warning' | 'normal';
  route: string;
}

export interface ReadinessSignal {
  label: string;
  status: 'current' | 'overdue' | 'missing';
  detail: string;
}

export interface VendorSummaryData {
  totalVendors: number;
  overdue: number;
  dueSoon: number;
  totalAnnualSpend: number;
}

// ── Demo Data Builders ─────────────────────────────────────

function buildDemoStandings(): LocationStanding[] {
  return DEMO_LOCATIONS.map(loc => {
    const jurisdictionStatus = LOCATION_JURISDICTION_STATUS[loc.id];
    const demoLoc = demoLocations.find(l => l.urlId === loc.id);

    // Derive food safety standing from jurisdiction status
    let foodSafety: StandingLevel = 'unknown';
    let foodReason: string | null = null;
    if (jurisdictionStatus) {
      if (jurisdictionStatus.foodSafety.status === 'passing') {
        foodSafety = 'ok';
      } else if (jurisdictionStatus.foodSafety.status === 'at_risk') {
        foodSafety = 'action';
        foodReason = 'Approaching threshold — needs review';
      } else if (jurisdictionStatus.foodSafety.status === 'failing') {
        foodSafety = 'action';
        foodReason = 'Open food safety violations';
      }
    }

    // Derive facility safety standing
    let facilitySafety: StandingLevel = 'unknown';
    let facilityReason: string | null = null;
    if (jurisdictionStatus) {
      if (jurisdictionStatus.facilitySafety.status === 'passing') {
        facilitySafety = 'ok';
      } else {
        facilitySafety = 'action';
        facilityReason = 'Facility safety non-compliant';
      }
    }

    const openItems = demoLoc?.actionItems ?? 0;
    const criticalItems = loc.status === 'critical' ? Math.min(openItems, 3) : 0;

    return {
      locationId: loc.id,
      locationName: loc.name,
      foodSafety,
      facilitySafety,
      foodSafetyReason: foodReason,
      facilitySafetyReason: facilityReason,
      openItemCount: openItems,
      criticalItemCount: criticalItems,
      // Jurisdiction-specific display data
      foodGradeDisplay: jurisdictionStatus?.foodSafety.gradeDisplay,
      foodScoringType: jurisdictionStatus?.foodSafety.scoring_type,
      foodAuthority: jurisdictionStatus?.foodSafety.authority,
      foodDetail: jurisdictionStatus?.foodSafety.detail,
      foodStatus: jurisdictionStatus?.foodSafety.status,
      facilityGradeDisplay: jurisdictionStatus?.facilitySafety.gradeDisplay,
      facilityAuthority: jurisdictionStatus?.facilitySafety.authority,
      facilityStatus: jurisdictionStatus?.facilitySafety.status,
    };
  });
}

function buildDemoTasks(): TaskItem[] {
  return [
    { id: 't1', label: 'Opening checklist — Location 1', status: 'done', time: '6:15 AM', route: '/checklists' },
    { id: 't2', label: 'Cooler #1 temperature log', status: 'done', time: '7:02 AM', route: '/temp-logs' },
    { id: 't3', label: 'Midday checklist — Location 1', status: 'in_progress', time: '4/8 items', route: '/checklists' },
    { id: 't4', label: 'Prep cooler manual temp log', status: 'overdue', time: 'Due by 10 AM', route: '/temp-logs' },
    { id: 't5', label: 'Review incident report #247', status: 'pending', time: 'Due today', route: '/incidents' },
    { id: 't6', label: 'Closing checklist — Location 1', status: 'pending', time: 'Due by 10 PM', route: '/checklists' },
  ];
}

function buildDemoEvents(): UpcomingEvent[] {
  return [
    { id: 'e1', label: 'Fire suppression certificate', location: 'Location 3', dueDate: 'In 10 days', daysLeft: 10, severity: 'critical', route: '/documents' },
    { id: 'e2', label: 'Hood cleaning service', location: 'Location 2', dueDate: 'In 3 days', daysLeft: 3, severity: 'critical', route: '/vendors' },
    { id: 'e3', label: 'Food handler cert renewal', location: 'Location 2', dueDate: 'In 12 days', daysLeft: 12, severity: 'warning', route: '/team' },
    { id: 'e4', label: 'Pest control report upload', location: 'Location 2', dueDate: 'In 13 days', daysLeft: 13, severity: 'warning', route: '/documents' },
    { id: 'e5', label: 'Health permit renewal', location: 'Location 1', dueDate: 'In 53 days', daysLeft: 53, severity: 'normal', route: '/documents' },
  ];
}

function buildDemoAttention(): AttentionItem[] {
  return DEMO_ATTENTION_ITEMS.map((item, i) => ({
    id: `att-${i}`,
    locationId: item.locationId,
    locationName: item.locationName,
    severity: item.status === 'critical' ? 'critical' as const : 'warning' as const,
    description: item.summary,
    route: item.route,
  }));
}

function buildDemoReadiness(): ReadinessSignal[] {
  return [
    { label: 'Temperature logs', status: 'current', detail: 'All readings within range today' },
    { label: 'Daily checklists', status: 'current', detail: 'Opening checklist complete' },
    { label: 'HACCP plan', status: 'current', detail: 'Plan on file, last reviewed 14 days ago' },
    { label: 'Food safety plan', status: 'current', detail: 'Active, reviewed this quarter' },
    { label: 'Pest control records', status: 'overdue', detail: 'Last report uploaded 45 days ago' },
    { label: 'Food handler certifications', status: 'current', detail: '11/12 staff current' },
  ];
}

function buildDemoVendorSummary(): VendorSummaryData {
  return {
    totalVendors: 8,
    overdue: 1,
    dueSoon: 2,
    totalAnnualSpend: 47_200,
  };
}

// ── Live Supabase Queries ──────────────────────────────────

const OPERATING_START = 6;
const OPERATING_END = 22;
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

async function fetchLiveStandings(orgId: string): Promise<LocationStanding[]> {
  // Fetch locations
  const { data: locs } = await supabase
    .from('locations')
    .select('id, name')
    .eq('organization_id', orgId)
    .eq('status', 'active');

  if (!locs || locs.length === 0) return [];

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const fourHoursAgo = new Date(now.getTime() - CHECK_INTERVAL_MS);
  const isOperatingHours = now.getHours() >= OPERATING_START && now.getHours() < OPERATING_END;

  // Parallel queries for all standing data
  const [
    { data: recentTemps },
    { data: todayChecklists },
    { data: openFoodIncidents },
    { data: openFacilityIncidents },
    { data: facilityEquipment },
    { data: activeAlerts },
    { data: overdueTasks },
  ] = await Promise.all([
    // Recent temp logs (last 4 hours, per location)
    supabase
      .from('temperature_logs')
      .select('facility_id, temp_pass')
      .gte('reading_time', fourHoursAgo.toISOString()),
    // Today's checklist completions
    supabase
      .from('checklist_completions')
      .select('location_id')
      .gte('completed_at', todayStart.toISOString()),
    // Open food safety incidents
    supabase
      .from('incidents')
      .select('location_id, severity')
      .in('type', ['temperature_violation', 'checklist_failure', 'health_citation', 'customer_complaint'])
      .in('status', ['reported', 'assigned', 'in_progress']),
    // Open facility safety incidents
    supabase
      .from('incidents')
      .select('location_id, severity')
      .in('type', ['equipment_failure'])
      .in('status', ['reported', 'assigned', 'in_progress']),
    // Facility equipment with overdue maintenance
    supabase
      .from('equipment')
      .select('location_id, equipment_type, next_maintenance_due')
      .in('equipment_type', ['hood', 'suppression', 'extinguisher', 'ansul', 'fire_alarm', 'sprinkler_system'])
      .eq('is_active', true),
    // Active predictive alerts
    supabase
      .from('predictive_alerts')
      .select('location_id, severity')
      .eq('status', 'active'),
    // Overdue tasks
    supabase
      .from('tasks')
      .select('location_id')
      .eq('status', 'pending')
      .lt('due_date', now.toISOString().slice(0, 10)),
  ]);

  return locs.map(loc => {
    // Food Safety standing
    const locTemps = (recentTemps || []).filter(t => t.facility_id === loc.id);
    const locChecklists = (todayChecklists || []).filter(c => c.location_id === loc.id);
    const locFoodIncidents = (openFoodIncidents || []).filter(i => i.location_id === loc.id);
    const hasAnyTempData = locTemps.length > 0;
    const hasAnyChecklistData = locChecklists.length > 0;

    let foodSafety: StandingLevel = 'unknown';
    let foodReason: string | null = null;

    if (!hasAnyTempData && !hasAnyChecklistData && locFoodIncidents.length === 0) {
      foodSafety = 'pending';
    } else if (locFoodIncidents.length > 0) {
      foodSafety = 'action';
      foodReason = `${locFoodIncidents.length} open food safety incident${locFoodIncidents.length > 1 ? 's' : ''}`;
    } else if (isOperatingHours && locTemps.length === 0 && hasAnyChecklistData) {
      foodSafety = 'action';
      foodReason = 'No temperature readings in last 4 hours';
    } else {
      const failedTemps = locTemps.filter(t => !t.temp_pass);
      if (failedTemps.length > 0) {
        foodSafety = 'action';
        foodReason = `${failedTemps.length} out-of-range temperature reading${failedTemps.length > 1 ? 's' : ''}`;
      } else {
        foodSafety = 'ok';
      }
    }

    // Facility Safety standing
    const locFacilityEquip = (facilityEquipment || []).filter(e => e.location_id === loc.id);
    const locFacilityIncidents = (openFacilityIncidents || []).filter(i => i.location_id === loc.id);

    let facilitySafety: StandingLevel = 'unknown';
    let facilityReason: string | null = null;

    if (locFacilityEquip.length === 0 && locFacilityIncidents.length === 0) {
      facilitySafety = 'pending';
    } else if (locFacilityIncidents.length > 0) {
      facilitySafety = 'action';
      facilityReason = `${locFacilityIncidents.length} open facility incident${locFacilityIncidents.length > 1 ? 's' : ''}`;
    } else {
      const today = now.toISOString().slice(0, 10);
      const overdueEquip = locFacilityEquip.filter(e => e.next_maintenance_due && e.next_maintenance_due < today);
      if (overdueEquip.length > 0) {
        facilitySafety = 'action';
        facilityReason = `${overdueEquip.length} overdue equipment maintenance`;
      } else {
        facilitySafety = 'ok';
      }
    }

    // Open items
    const locAlerts = (activeAlerts || []).filter(a => a.location_id === loc.id);
    const locOverdueTasks = (overdueTasks || []).filter(t => t.location_id === loc.id);
    const openItemCount = locFoodIncidents.length + locFacilityIncidents.length + locAlerts.length + locOverdueTasks.length;
    const criticalAlerts = locAlerts.filter(a => a.severity === 'high');
    const criticalIncidents = [...locFoodIncidents, ...locFacilityIncidents].filter(i => i.severity === 'critical');
    const criticalItemCount = criticalAlerts.length + criticalIncidents.length;

    return {
      locationId: loc.id,
      locationName: loc.name,
      foodSafety,
      facilitySafety,
      foodSafetyReason: foodReason,
      facilitySafetyReason: facilityReason,
      openItemCount,
      criticalItemCount,
    };
  });
}

async function fetchLiveTasks(orgId: string, role?: string, userId?: string): Promise<TaskItem[]> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const tasks: TaskItem[] = [];

  // Fetch today's tasks from tasks table
  let query = supabase
    .from('tasks')
    .select('id, title, status, due_date, assigned_to')
    .lte('due_date', todayEnd.toISOString().slice(0, 10))
    .in('status', ['pending', 'in_progress', 'completed']);

  // Kitchen staff: only own tasks
  if (role === 'kitchen_staff' && userId) {
    query = query.eq('assigned_to', userId);
  }

  const { data: dbTasks } = await query.order('due_date', { ascending: true }).limit(20);

  for (const t of (dbTasks || [])) {
    const isOverdue = t.status === 'pending' && t.due_date < now.toISOString().slice(0, 10);
    tasks.push({
      id: t.id,
      label: t.title,
      status: t.status === 'completed' ? 'done' : isOverdue ? 'overdue' : t.status as 'pending' | 'in_progress',
      time: isOverdue ? 'Overdue' : t.due_date === now.toISOString().slice(0, 10) ? 'Due today' : t.due_date,
      route: '/checklists',
    });
  }

  return tasks;
}

async function fetchLiveEvents(orgId: string): Promise<UpcomingEvent[]> {
  const now = new Date();
  const sevenDaysOut = new Date(now);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 60); // Look ahead 60 days for events

  const events: UpcomingEvent[] = [];

  // Expiring documents
  const { data: expiringDocs } = await supabase
    .from('documents')
    .select('id, title, location_id, expiration_date')
    .gte('expiration_date', now.toISOString().slice(0, 10))
    .lte('expiration_date', sevenDaysOut.toISOString().slice(0, 10))
    .eq('status', 'active')
    .order('expiration_date', { ascending: true })
    .limit(10);

  for (const doc of (expiringDocs || [])) {
    const daysLeft = Math.ceil((new Date(doc.expiration_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    events.push({
      id: `doc-${doc.id}`,
      label: doc.title,
      location: doc.location_id || 'All locations',
      dueDate: `In ${daysLeft} days`,
      daysLeft,
      severity: daysLeft <= 7 ? 'critical' : daysLeft <= 30 ? 'warning' : 'normal',
      route: '/documents',
    });
  }

  // Equipment maintenance due
  const { data: dueMaint } = await supabase
    .from('equipment')
    .select('id, name, location_id, next_maintenance_due')
    .gte('next_maintenance_due', now.toISOString().slice(0, 10))
    .lte('next_maintenance_due', sevenDaysOut.toISOString().slice(0, 10))
    .eq('is_active', true)
    .order('next_maintenance_due', { ascending: true })
    .limit(10);

  for (const eq of (dueMaint || [])) {
    const daysLeft = Math.ceil((new Date(eq.next_maintenance_due).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    events.push({
      id: `equip-${eq.id}`,
      label: eq.name,
      location: eq.location_id || '',
      dueDate: `In ${daysLeft} days`,
      daysLeft,
      severity: daysLeft <= 7 ? 'critical' : 'warning',
      route: '/equipment',
    });
  }

  return events.sort((a, b) => a.daysLeft - b.daysLeft);
}

async function fetchLiveAttention(orgId: string): Promise<AttentionItem[]> {
  const items: AttentionItem[] = [];

  // Open critical/major incidents
  const { data: openIncidents } = await supabase
    .from('incidents')
    .select('id, title, location_id, severity')
    .in('status', ['reported', 'assigned', 'in_progress'])
    .in('severity', ['critical', 'major'])
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch location names for incidents
  const locIds = [...new Set((openIncidents || []).map(i => i.location_id).filter(Boolean))];
  let locNameMap: Record<string, string> = {};
  if (locIds.length > 0) {
    const { data: locs } = await supabase
      .from('locations')
      .select('id, name')
      .in('id', locIds);
    locNameMap = Object.fromEntries((locs || []).map(l => [l.id, l.name]));
  }

  for (const inc of (openIncidents || [])) {
    items.push({
      id: `inc-${inc.id}`,
      locationId: inc.location_id || '',
      locationName: locNameMap[inc.location_id] || 'Unknown',
      severity: inc.severity === 'critical' ? 'critical' : 'warning',
      description: inc.title || 'Open incident',
      route: `/incidents`,
    });
  }

  // Active high-severity alerts
  const { data: alerts } = await supabase
    .from('predictive_alerts')
    .select('id, title, location_id, severity')
    .eq('status', 'active')
    .in('severity', ['high', 'medium'])
    .order('created_at', { ascending: false })
    .limit(5);

  for (const alert of (alerts || [])) {
    items.push({
      id: `alert-${alert.id}`,
      locationId: alert.location_id || '',
      locationName: locNameMap[alert.location_id] || '',
      severity: alert.severity === 'high' ? 'critical' : 'warning',
      description: alert.title || 'Active alert',
      route: '/alerts',
    });
  }

  return items;
}

async function fetchLiveReadiness(orgId: string, locationId?: string): Promise<ReadinessSignal[]> {
  const signals: ReadinessSignal[] = [];
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - CHECK_INTERVAL_MS);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Temp logs: check if any in last 4 hours
  let tempQuery = supabase
    .from('temperature_logs')
    .select('id', { count: 'exact', head: true })
    .gte('reading_time', fourHoursAgo.toISOString());
  if (locationId) tempQuery = tempQuery.eq('facility_id', locationId);
  const { count: tempCount } = await tempQuery;

  signals.push({
    label: 'Temperature logs',
    status: (tempCount ?? 0) > 0 ? 'current' : 'overdue',
    detail: (tempCount ?? 0) > 0 ? `${tempCount} readings in last 4 hours` : 'No readings in last 4 hours',
  });

  // Checklists: check if any completed today
  let checkQuery = supabase
    .from('checklist_completions')
    .select('id', { count: 'exact', head: true })
    .gte('completed_at', todayStart.toISOString());
  if (locationId) checkQuery = checkQuery.eq('location_id', locationId);
  const { count: checkCount } = await checkQuery;

  signals.push({
    label: 'Daily checklists',
    status: (checkCount ?? 0) > 0 ? 'current' : 'missing',
    detail: (checkCount ?? 0) > 0 ? `${checkCount} completed today` : 'No checklists completed today',
  });

  // HACCP plan: check documents table
  let haccpQuery = supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('category', 'haccp')
    .eq('status', 'active');
  const { count: haccpCount } = await haccpQuery;

  signals.push({
    label: 'HACCP plan',
    status: (haccpCount ?? 0) > 0 ? 'current' : 'missing',
    detail: (haccpCount ?? 0) > 0 ? 'Plan on file' : 'No HACCP plan uploaded',
  });

  // Pest control records
  let pestQuery = supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('category', 'pest_control')
    .eq('status', 'active');
  const { count: pestCount } = await pestQuery;

  signals.push({
    label: 'Pest control records',
    status: (pestCount ?? 0) > 0 ? 'current' : 'missing',
    detail: (pestCount ?? 0) > 0 ? 'Records on file' : 'No pest control records',
  });

  return signals;
}

async function fetchLiveVendorSummary(orgId: string): Promise<VendorSummaryData | null> {
  const { data: vendorRecords } = await supabase
    .from('vendor_service_records')
    .select('id, status, service_type')
    .eq('organization_id', orgId);

  if (!vendorRecords || vendorRecords.length === 0) return null;

  const overdue = vendorRecords.filter(v => v.status === 'overdue').length;
  const dueSoon = vendorRecords.filter(v => v.status === 'upcoming').length;

  return {
    totalVendors: vendorRecords.length,
    overdue,
    dueSoon,
    totalAnnualSpend: 0, // Would need cost data; skip for now
  };
}

// ── Public API ─────────────────────────────────────────────

export async function fetchAllStandingData(
  orgId: string | null,
  isDemoMode: boolean,
  role?: string,
  userId?: string,
  locationId?: string,
) {
  if (isDemoMode || !orgId) {
    return {
      standings: buildDemoStandings(),
      tasks: buildDemoTasks(),
      events: buildDemoEvents(),
      attention: buildDemoAttention(),
      readiness: buildDemoReadiness(),
      vendorSummary: buildDemoVendorSummary(),
    };
  }

  // Live mode: parallel fetch
  const [standings, tasks, events, attention, readiness, vendorSummary] = await Promise.all([
    fetchLiveStandings(orgId),
    fetchLiveTasks(orgId, role, userId),
    fetchLiveEvents(orgId),
    fetchLiveAttention(orgId),
    fetchLiveReadiness(orgId, locationId),
    fetchLiveVendorSummary(orgId),
  ]);

  return { standings, tasks, events, attention, readiness, vendorSummary };
}
