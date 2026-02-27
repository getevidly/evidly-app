import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle, ArrowRight, Info, Clock, ChevronDown, UserPlus, X, CheckCircle2, ShieldAlert, Eye, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { scoreImpactData, locations } from '../data/demoData';
import { useRole } from '../contexts/RoleContext';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────
type AlertSeverity = 'high' | 'medium' | 'low';
type AlertType = 'document_expiring' | 'hood_cleaning_overdue' | 'temp_trending' | 'checklist_drop' | 'cert_expiring' | 'vendor_nonresponsive' | 'inspection_due' | 'service_overdue';
type AlertStatus = 'active' | 'snoozed' | 'resolved' | 'dismissed';

interface PredictiveAlert {
  id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  recommended_action: string;
  data_points: string[];
  location: string;
  status: AlertStatus;
  assigned_to?: string;
  snoozed_until?: string;
  resolved_at?: string;
  created_at: string;
  action_label: string;
  action_href: string;
}

// ── Font ───────────────────────────────────────────────────────────
const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

// ── Team members for assign dropdown ───────────────────────────────
const TEAM_MEMBERS = ['Maria Garcia', 'John Smith', 'Sarah Lee', 'Michael Torres', 'Emma Davis', 'James Chen'];

// ── Demo alerts ────────────────────────────────────────────────────
const DEMO_ALERTS: PredictiveAlert[] = [
  {
    id: 'pa-1',
    alert_type: 'hood_cleaning_overdue',
    severity: 'high',
    title: 'Hood Cleaning Overdue — Airport Cafe',
    description: '95 days since last hood cleaning service. 90-day cleaning cycle exceeded by 5 days. Continued operation increases fire risk and may result in health code violation.',
    recommended_action: 'Contact CleanVent Services immediately to schedule emergency hood cleaning. Document the delay and corrective action taken.',
    data_points: ['Last cleaning: 95 days ago', '90-day cycle exceeded', 'Fire code violation risk'],
    location: 'Airport Cafe',
    status: 'active',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    action_label: 'Schedule Cleaning',
    action_href: '/vendors',
  },
  {
    id: 'pa-2',
    alert_type: 'temp_trending',
    severity: 'high',
    title: 'Walk-in Cooler Temp Trending Up — University Dining',
    description: '3 temperature readings above 38°F recorded this week. Walk-in Cooler #1 showing consistent upward trend over the past 7 days.',
    recommended_action: 'Inspect door seals, condenser coils, and thermostat. Schedule maintenance if readings continue to climb. Consider moving perishables to backup unit.',
    data_points: ['3 readings above 38°F this week', 'Avg temp up 3°F over 7 days', 'Door seal inspection recommended'],
    location: 'University Dining',
    status: 'active',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    action_label: 'View Temp Logs',
    action_href: '/temp-logs',
  },
  {
    id: 'pa-3',
    alert_type: 'document_expiring',
    severity: 'high',
    title: 'Health Permit Expires in 14 Days — Downtown Kitchen',
    description: 'Health department operating permit expires on Feb 23. Renewal application has not been started. Operating without a valid permit may result in closure.',
    recommended_action: 'Submit renewal application and payment to Fresno County Health Department immediately. Allow 5-7 business days for processing.',
    data_points: ['Expires: Feb 23, 2026', 'Renewal not started', 'Processing time: 5-7 business days'],
    location: 'Downtown Kitchen',
    status: 'active',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    action_label: 'View Documents',
    action_href: '/documents',
  },
  {
    id: 'pa-4',
    alert_type: 'inspection_due',
    severity: 'high',
    title: 'Fire Suppression Inspection Overdue — University Dining',
    description: 'Fire suppression system inspection is 4 months overdue. This is a critical safety and insurance compliance requirement.',
    recommended_action: 'Schedule fire suppression inspection with a certified vendor immediately. Update vendor service records once completed.',
    data_points: ['4 months overdue', 'Insurance compliance at risk', 'Required: semi-annual inspection'],
    location: 'University Dining',
    status: 'active',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    action_label: 'Schedule Inspection',
    action_href: '/vendors',
  },
  {
    id: 'pa-5',
    alert_type: 'inspection_due',
    severity: 'medium',
    title: 'Fire Extinguisher Inspection Due in 21 Days — Airport Cafe',
    description: 'Annual fire extinguisher inspection is due in 21 days. All units across the location need to be inspected and tagged.',
    recommended_action: 'Schedule fire extinguisher inspection with certified vendor. Ensure all units are accessible and not blocked by equipment.',
    data_points: ['Due date: Mar 2, 2026', '6 extinguishers to inspect', 'Annual requirement'],
    location: 'Airport Cafe',
    status: 'active',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    action_label: 'Schedule Inspection',
    action_href: '/vendors',
  },
  {
    id: 'pa-6',
    alert_type: 'cert_expiring',
    severity: 'medium',
    title: 'Food Handler Cert Expiring — Emma Davis (30 Days)',
    description: 'Emma Davis food handler certification expires on March 11. She works the morning shift at Airport Cafe.',
    recommended_action: 'Notify Emma Davis to complete food handler renewal course. Register for the next available testing date.',
    data_points: ['Expires: Mar 11, 2026', 'Role: Line Cook, Morning Shift', 'Renewal course: 8 hours'],
    location: 'Airport Cafe',
    status: 'active',
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    action_label: 'View Team Certs',
    action_href: '/team',
  },
  {
    id: 'pa-7',
    alert_type: 'checklist_drop',
    severity: 'medium',
    title: 'Checklist Completion Dropped 12% — University Dining',
    description: 'Weekly checklist completion rate dropped from 89% (4-week average) to 78% this week. Opening and closing checklists are the most affected.',
    recommended_action: 'Review staffing coverage for opening and closing shifts. Consider one-on-one check-ins with responsible staff to identify barriers.',
    data_points: ['This week: 78% completion', '4-week average: 89%', 'Biggest gap: Opening checklist (65%)'],
    location: 'University Dining',
    status: 'active',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    action_label: 'View Checklists',
    action_href: '/checklists',
  },
  {
    id: 'pa-8',
    alert_type: 'service_overdue',
    severity: 'medium',
    title: 'Grease Trap Service 5 Days Overdue — Downtown Kitchen',
    description: 'Quarterly grease trap pumping and cleaning is 5 days past due. Continued delay may cause drainage issues and health code violations.',
    recommended_action: 'Contact GreaseMaster Services to schedule emergency grease trap pumping. Document the overdue period.',
    data_points: ['Last service: 95 days ago', 'Quarterly cycle (90 days)', '5 days overdue'],
    location: 'Downtown Kitchen',
    status: 'active',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    action_label: 'Contact Vendor',
    action_href: '/vendors',
  },
  {
    id: 'pa-9',
    alert_type: 'vendor_nonresponsive',
    severity: 'medium',
    title: 'Vendor Certificate Expired — Valley Fire Protection',
    description: 'Valley Fire Protection liability insurance certificate expired 3 days ago. They are currently non-compliant as a service provider.',
    recommended_action: 'Contact Valley Fire Protection to request updated certificate of insurance. Consider suspending services until documentation is current.',
    data_points: ['Insurance expired: Feb 6, 2026', 'No response to 2 renewal requests', 'Affects: Airport Cafe fire suppression'],
    location: 'Airport Cafe',
    status: 'active',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    action_label: 'View Vendor',
    action_href: '/vendors',
  },
  {
    id: 'pa-10',
    alert_type: 'service_overdue',
    severity: 'low',
    title: 'HVAC Filter Replacement Due in 45 Days — Airport Cafe',
    description: 'HVAC filter replacement is scheduled in 45 days. Plan ahead to avoid disruption during peak hours.',
    recommended_action: 'Order replacement filters and schedule installation during off-peak hours. Coordinate with facilities team.',
    data_points: ['Due: Mar 26, 2026', 'Quarterly replacement', 'Last replaced: Dec 26, 2025'],
    location: 'Airport Cafe',
    status: 'active',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    action_label: 'View Schedule',
    action_href: '/calendar',
  },
  {
    id: 'pa-11',
    alert_type: 'document_expiring',
    severity: 'low',
    title: 'Business License Renewal Due in 60 Days — Downtown Kitchen',
    description: 'Annual business license renewal is due in 60 days. Early renewal avoids late fees and processing delays.',
    recommended_action: 'Begin renewal application through city business portal. Gather required documentation (financials, insurance, permits).',
    data_points: ['Due: Apr 10, 2026', 'Early renewal discount available', 'Last year processing: 12 days'],
    location: 'Downtown Kitchen',
    status: 'active',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    action_label: 'View Documents',
    action_href: '/documents',
  },
  {
    id: 'pa-12',
    alert_type: 'temp_trending',
    severity: 'low',
    title: 'Freezer Temp Variance Increasing — Downtown Kitchen',
    description: 'Walk-in freezer temperature variance has increased from ±1°F to ±2.5°F over the past 2 weeks. Not yet out of range but trending in wrong direction.',
    recommended_action: 'Monitor daily and inspect door gaskets, defrost timer, and evaporator fan. Schedule preventive maintenance if variance continues.',
    data_points: ['Current variance: ±2.5°F', 'Baseline: ±1°F', 'Trend: increasing over 2 weeks'],
    location: 'Downtown Kitchen',
    status: 'active',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    action_label: 'View Temp Logs',
    action_href: '/temp-logs',
  },
  {
    id: 'pa-13',
    alert_type: 'checklist_drop',
    severity: 'low',
    title: 'Opening Checklist Slowdown — Airport Cafe',
    description: 'Average opening checklist completion time has increased from 18 minutes (baseline) to 25 minutes over the past 2 weeks.',
    recommended_action: 'Review checklist items for unnecessary steps. Talk with morning staff about bottlenecks. Consider splitting tasks across team members.',
    data_points: ['Current avg: 25 min', 'Baseline avg: 18 min', 'Increase: 39% slower'],
    location: 'Airport Cafe',
    status: 'active',
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    action_label: 'View Checklists',
    action_href: '/checklists',
  },
  {
    id: 'pa-14',
    alert_type: 'temp_trending',
    severity: 'high',
    title: 'Walk-in Door Seal Replaced — Downtown Kitchen',
    description: 'Walk-in cooler door seal was worn and replaced. Temperature readings have returned to normal range.',
    recommended_action: 'Continue monitoring for 48 hours to confirm stable temperatures.',
    data_points: ['Issue identified: Feb 5', 'Seal replaced: Feb 7', 'Temps normalized within 4 hours'],
    location: 'Downtown Kitchen',
    status: 'resolved',
    resolved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    action_label: 'View Temp Logs',
    action_href: '/temp-logs',
  },
  {
    id: 'pa-15',
    alert_type: 'service_overdue',
    severity: 'medium',
    title: 'Thermometer #3 Replaced — Airport Cafe',
    description: 'Faulty digital thermometer was identified and replaced. All temp readings from this unit in the past week have been re-verified.',
    recommended_action: 'No further action needed. Replacement thermometer has been calibrated.',
    data_points: ['Faulty unit identified: Feb 2', 'Replaced: Feb 4', 'Readings re-verified: 42 logs'],
    location: 'Airport Cafe',
    status: 'resolved',
    resolved_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    action_label: 'View Temp Logs',
    action_href: '/temp-logs',
  },
];

// ── Alert type labels ──────────────────────────────────────────────
const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  document_expiring: 'Document Expiring',
  hood_cleaning_overdue: 'Service Overdue',
  temp_trending: 'Temp Trending',
  checklist_drop: 'Checklist Drop',
  cert_expiring: 'Cert Expiring',
  vendor_nonresponsive: 'Vendor Issue',
  inspection_due: 'Inspection Due',
  service_overdue: 'Service Overdue',
};

// ── Snooze options ─────────────────────────────────────────────────
const SNOOZE_OPTIONS = [
  { label: '1 day', days: 1 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
];

export function Analysis() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const { getAccessibleLocations, showAllLocationsOption } = useRole();
  const analysisAccessibleLocs = getAccessibleLocations();
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [actionLocationFilter, setActionLocationFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState<PredictiveAlert[]>([]);

  // Alert state
  const [alerts, setAlerts] = useState<PredictiveAlert[]>(DEMO_ALERTS);
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<'all' | AlertSeverity>('all');
  const [alertTypeFilter, setAlertTypeFilter] = useState<'all' | string>('all');
  const [alertStatusFilter, setAlertStatusFilter] = useState<'all' | AlertStatus>('active');
  const [alertLocationFilter, setAlertLocationFilter] = useState<'all' | string>('all');
  const [openSnoozeId, setOpenSnoozeId] = useState<string | null>(null);
  const [openAssignId, setOpenAssignId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  // ── Toast helper ──────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── Live mode: fetch from ai_insights ────────────────────────
  const fetchAlerts = useCallback(async () => {
    if (isDemoMode || !profile?.organization_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_insights')
        .select('*, locations(name)')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const sevMap: Record<string, AlertSeverity> = { urgent: 'high', advisory: 'medium', info: 'low' };
      const statusMap: Record<string, AlertStatus> = { new: 'active', read: 'active', actioned: 'resolved', dismissed: 'dismissed', snoozed: 'snoozed' };
      const typeMap: Record<string, AlertType> = { prediction: 'inspection_due', pattern: 'checklist_drop', seasonal: 'temp_trending', auto_draft: 'service_overdue', digest: 'document_expiring' };

      const mapped: PredictiveAlert[] = (data || []).map((row: any) => {
        const refs = row.data_references || {};
        const actions = Array.isArray(row.suggested_actions) ? row.suggested_actions : [];
        const firstAction = actions[0] || {};
        return {
          id: row.id,
          alert_type: (refs.alert_type as AlertType) || typeMap[row.insight_type] || 'inspection_due',
          severity: sevMap[row.severity] || 'medium',
          title: row.title,
          description: row.body || '',
          recommended_action: firstAction.description || (actions.length > 0 ? actions.map((a: any) => a.label || a).join('; ') : 'Review and take appropriate action'),
          data_points: Array.isArray(refs.data_points) ? refs.data_points : [],
          location: row.locations?.name || refs.location_name || 'Unknown',
          status: statusMap[row.status] || 'active',
          assigned_to: refs.assigned_to,
          snoozed_until: row.snoozed_until,
          resolved_at: row.status === 'actioned' ? row.created_at : undefined,
          created_at: row.created_at,
          action_label: firstAction.label || 'View Details',
          action_href: firstAction.href || '/dashboard',
        };
      });

      setLiveAlerts(mapped);
    } catch (err) {
      console.error('Failed to fetch ai_insights:', err);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, profile?.organization_id]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // Sync live data into alerts state
  useEffect(() => {
    if (!isDemoMode && liveAlerts.length > 0) {
      setAlerts(liveAlerts);
    }
  }, [isDemoMode, liveAlerts]);

  // ── Alert actions ─────────────────────────────────────────────
  const resolveAlert = async (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' as AlertStatus, resolved_at: new Date().toISOString() } : a));
    showToast('Alert resolved successfully');
    if (!isDemoMode && profile?.organization_id) {
      await supabase.from('ai_insights').update({ status: 'actioned' }).eq('id', id).eq('organization_id', profile.organization_id);
    }
  };

  const snoozeAlert = async (id: string, days: number) => {
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'snoozed' as AlertStatus, snoozed_until: until } : a));
    setOpenSnoozeId(null);
    showToast(`Alert snoozed for ${days} day${days > 1 ? 's' : ''}`);
    if (!isDemoMode && profile?.organization_id) {
      await supabase.from('ai_insights').update({ status: 'snoozed', snoozed_until: until }).eq('id', id).eq('organization_id', profile.organization_id);
    }
  };

  const dismissAlert = async (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'dismissed' as AlertStatus } : a));
    showToast('Alert dismissed');
    if (!isDemoMode && profile?.organization_id) {
      await supabase.from('ai_insights').update({ status: 'dismissed' }).eq('id', id).eq('organization_id', profile.organization_id);
    }
  };

  const assignAlert = (id: string, person: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, assigned_to: person } : a));
    setOpenAssignId(null);
    showToast(`Alert assigned to ${person}`);
  };

  const createActionItem = (alert: PredictiveAlert) => {
    showToast(`Action item created in Action Center: "${alert.title}"`);
  };

  // ── Filtered alerts ───────────────────────────────────────────
  const filteredAlerts = alerts.filter(a => {
    if (alertSeverityFilter !== 'all' && a.severity !== alertSeverityFilter) return false;
    if (alertTypeFilter !== 'all' && a.alert_type !== alertTypeFilter) return false;
    if (alertStatusFilter !== 'all' && a.status !== alertStatusFilter) return false;
    if (alertLocationFilter !== 'all' && a.location !== alertLocationFilter) return false;
    return true;
  }).sort((a, b) => {
    const sevOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3);
  });

  // ── KPI counts ────────────────────────────────────────────────
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const highCount = activeAlerts.filter(a => a.severity === 'high').length;
  const mediumCount = activeAlerts.filter(a => a.severity === 'medium').length;
  const lowCount = activeAlerts.filter(a => a.severity === 'low').length;
  const resolvedThisWeek = alerts.filter(a => a.status === 'resolved' && a.resolved_at && (Date.now() - new Date(a.resolved_at).getTime()) < 7 * 24 * 60 * 60 * 1000).length;

  // ── Sidebar data ──────────────────────────────────────────────
  const alertTrends = [
    { week: '4 weeks ago', generated: 8, resolved: 6 },
    { week: '3 weeks ago', generated: 11, resolved: 9 },
    { week: '2 weeks ago', generated: 7, resolved: 5 },
    { week: 'This week', generated: filteredAlerts.length, resolved: resolvedThisWeek },
  ];

  const locationAlertCounts = activeAlerts.reduce((acc, a) => {
    acc[a.location] = (acc[a.location] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topRiskAreas = Object.entries(locationAlertCounts).sort((a, b) => b[1] - a[1]);

  const alertTypeCountsData = activeAlerts.reduce((acc, a) => {
    const label = ALERT_TYPE_LABELS[a.alert_type];
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topAlertTypes = Object.entries(alertTypeCountsData).sort((a, b) => b[1] - a[1]);

  // ── Unique locations for filter ───────────────────────────────
  const alertLocations = [...new Set(alerts.map(a => a.location))];

  // ── Existing chart data ───────────────────────────────────────
  const scoreProjectionData = [
    { week: '12w ago', actual: 65, noAction: null, recommended: null },
    { week: '11w ago', actual: 68, noAction: null, recommended: null },
    { week: '10w ago', actual: 70, noAction: null, recommended: null },
    { week: '9w ago', actual: 69, noAction: null, recommended: null },
    { week: '8w ago', actual: 71, noAction: null, recommended: null },
    { week: '7w ago', actual: 72, noAction: null, recommended: null },
    { week: '6w ago', actual: 73, noAction: null, recommended: null },
    { week: '5w ago', actual: 74, noAction: null, recommended: null },
    { week: '4w ago', actual: 74, noAction: null, recommended: null },
    { week: '3w ago', actual: 75, noAction: null, recommended: null },
    { week: '2w ago', actual: 74, noAction: null, recommended: null },
    { week: '1w ago', actual: 74, noAction: null, recommended: null },
    { week: 'Now', actual: 74, noAction: 74, recommended: 74 },
    { week: '+1w', actual: null, noAction: 72, recommended: 76 },
    { week: '+2w', actual: null, noAction: 70, recommended: 78 },
    { week: '+3w', actual: null, noAction: 67, recommended: 80 },
    { week: '+4w', actual: null, noAction: 65, recommended: 82 },
  ];

  const foodSafetyTrend = [
    { week: '12w', score: 72 }, { week: '11w', score: 74 }, { week: '10w', score: 76 },
    { week: '9w', score: 75 }, { week: '8w', score: 77 }, { week: '7w', score: 78 },
    { week: '6w', score: 79 }, { week: '5w', score: 80 }, { week: '4w', score: 81 },
    { week: '3w', score: 82 }, { week: '2w', score: 83 }, { week: 'Now', score: 84 },
  ];
  const facilitySafetyTrend = [
    { week: '12w', score: 68 }, { week: '11w', score: 70 }, { week: '10w', score: 71 },
    { week: '9w', score: 70 }, { week: '8w', score: 72 }, { week: '7w', score: 73 },
    { week: '6w', score: 74 }, { week: '5w', score: 75 }, { week: '4w', score: 76 },
    { week: '3w', score: 77 }, { week: '2w', score: 78 }, { week: 'Now', score: 79 },
  ];
  const downtownTrends = {
    foodSafety: foodSafetyTrend.map((d) => ({ ...d, score: Math.min(100, d.score + 10) })),
    facilitySafety: facilitySafetyTrend.map((d) => ({ ...d, score: Math.min(100, d.score + 12) })),
  };
  const airportTrends = {
    foodSafety: foodSafetyTrend.map((d) => ({ ...d, score: Math.max(0, d.score - 4) })),
    facilitySafety: facilitySafetyTrend.map((d) => ({ ...d, score: Math.max(0, d.score - 8) })),
  };
  const universityTrends = {
    foodSafety: foodSafetyTrend.map((d) => ({ ...d, score: Math.max(0, d.score - 18) })),
    facilitySafety: facilitySafetyTrend.map((d) => ({ ...d, score: Math.max(0, d.score - 22) })),
  };
  const allTrends = {
    foodSafety: foodSafetyTrend.map((d, i) => ({ ...d, score: Math.round((downtownTrends.foodSafety[i].score + airportTrends.foodSafety[i].score + universityTrends.foodSafety[i].score) / 3) })),
    facilitySafety: facilitySafetyTrend.map((d, i) => ({ ...d, score: Math.round((downtownTrends.facilitySafety[i].score + airportTrends.facilitySafety[i].score + universityTrends.facilitySafety[i].score) / 3) })),
  };
  const locationTrends = {
    'all': allTrends, 'downtown': downtownTrends, 'airport': airportTrends, 'university': universityTrends,
  } as Record<string, { foodSafety: typeof foodSafetyTrend; facilitySafety: typeof facilitySafetyTrend }>;

  const currentTrends = locationTrends[selectedLocation] || locationTrends['all'];
  const opStart = currentTrends.foodSafety[0].score;
  const opEnd = currentTrends.foodSafety[currentTrends.foodSafety.length - 1].score;
  const eqStart = currentTrends.facilitySafety[0].score;
  const eqEnd = currentTrends.facilitySafety[currentTrends.facilitySafety.length - 1].score;

  // ── Actions to improve score (existing table) ─────────────────
  const getRecoverablePoints = (impact: string): number => {
    const match = impact.match(/(\d+)\s*of\s*(\d+)/);
    if (match) return parseInt(match[2]) - parseInt(match[1]);
    const neg = impact.match(/^-(\d+)$/);
    if (neg) return parseInt(neg[1]);
    return 0;
  };

  const allActionsToImproveScore = scoreImpactData
    .filter(item => item.status !== 'current')
    .map(item => ({
      priority: item.status === 'overdue' || item.status === 'expired' || item.status === 'missing' ? 'HIGH' : item.status === 'due_soon' ? 'MEDIUM' : 'LOW',
      action: item.label,
      pillar: item.pillar,
      pointImpact: getRecoverablePoints(item.impact),
      location: locations.find(loc => loc.id === item.locationId)?.name || '',
      locationId: locations.find(loc => loc.id === item.locationId)?.urlId || '',
      link: item.actionLink || '/dashboard',
      actionLabel: item.action || 'View'
    }))
    .sort((a, b) => {
      const prioOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      const prioDiff = (prioOrder[a.priority] ?? 3) - (prioOrder[b.priority] ?? 3);
      if (prioDiff !== 0) return prioDiff;
      return b.pointImpact - a.pointImpact;
    });

  const actionsToImproveScore = allActionsToImproveScore.filter(a => {
    if (actionLocationFilter !== 'all' && a.locationId !== actionLocationFilter) return false;
    if (severityFilter !== 'all' && a.priority !== severityFilter) return false;
    return true;
  });

  // ── Style helpers ─────────────────────────────────────────────
  const getSeverityStyles = (severity: AlertSeverity) => {
    switch (severity) {
      case 'high': return { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', iconColor: '#dc2626', badge: '#fee2e2', badgeText: '#991b1b' };
      case 'medium': return { bg: '#fffbeb', border: '#f59e0b', text: '#92400e', iconColor: '#d97706', badge: '#fef3c7', badgeText: '#92400e' };
      case 'low': return { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', iconColor: '#2563eb', badge: '#dbeafe', badgeText: '#1e40af' };
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-5 w-5" style={{ color: '#dc2626' }} />;
      case 'medium': return <AlertTriangle className="h-5 w-5" style={{ color: '#d97706' }} />;
      case 'low': return <Info className="h-5 w-5" style={{ color: '#2563eb' }} />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      HIGH: { bg: '#fee2e2', text: '#991b1b' },
      MEDIUM: { bg: '#fef9c3', text: '#854d0e' },
      LOW: { bg: '#dcfce7', text: '#166534' },
    };
    const s = styles[priority] || { bg: '#f3f4f6', text: '#374151' };
    return (
      <span style={{ backgroundColor: s.bg, color: s.text, padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, ...F }}>
        {priority}
      </span>
    );
  };

  const selectStyle: React.CSSProperties = { padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', backgroundColor: 'white', cursor: 'pointer', ...F };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Analytics' }]} />

      {/* Toast */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '24px', left: '16px', right: '16px', zIndex: 9999, backgroundColor: '#065f46', color: 'white', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '400px', marginLeft: 'auto', ...F }}>
          <CheckCircle2 className="h-4 w-4" />
          {toastMessage}
        </div>
      )}

      <div style={{ ...F }}>
        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0, ...F }}>Predictive Compliance Analysis</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px', ...F }}>AI-driven early warnings before compliance issues become violations</p>
          </div>
          <select data-demo-allow value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} style={selectStyle}>
            {showAllLocationsOption() && <option value="all">All Locations (Org Average)</option>}
            {analysisAccessibleLocs.map(loc => (
              <option key={loc.locationUrlId} value={loc.locationUrlId}>{loc.locationName}</option>
            ))}
          </select>
        </div>

        {/* Filter Bar */}
        <div data-demo-allow style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', padding: '12px 16px', backgroundColor: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
          <select value={alertSeverityFilter} onChange={e => setAlertSeverityFilter(e.target.value as any)} style={selectStyle}>
            <option value="all">All Severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={alertTypeFilter} onChange={e => setAlertTypeFilter(e.target.value)} style={selectStyle}>
            <option value="all">All Types</option>
            <option value="document_expiring">Document Expiring</option>
            <option value="hood_cleaning_overdue">Service Overdue</option>
            <option value="service_overdue">Service Overdue</option>
            <option value="temp_trending">Temp Trending</option>
            <option value="checklist_drop">Checklist Drop</option>
            <option value="cert_expiring">Cert Expiring</option>
            <option value="vendor_nonresponsive">Vendor Issue</option>
            <option value="inspection_due">Inspection Due</option>
          </select>
          <select value={alertLocationFilter} onChange={e => setAlertLocationFilter(e.target.value)} style={selectStyle}>
            <option value="all">All Locations</option>
            {alertLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
          <select value={alertStatusFilter} onChange={e => setAlertStatusFilter(e.target.value as any)} style={selectStyle}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="snoozed">Snoozed</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>

        {/* Loading spinner */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0' }}>
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#1e4d6b' }} />
            <span style={{ marginLeft: '12px', color: '#6b7280', fontSize: '14px', ...F }}>Loading alerts...</span>
          </div>
        )}

        {/* KPI Summary Row */}
        {!loading && <><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Critical', count: highCount, bg: '#fef2f2', border: '#fecaca', color: '#991b1b', icon: <ShieldAlert className="h-5 w-5" style={{ color: '#dc2626' }} /> },
            { label: 'Warning', count: mediumCount, bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: <AlertTriangle className="h-5 w-5" style={{ color: '#d97706' }} /> },
            { label: 'Watch', count: lowCount, bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', icon: <Eye className="h-5 w-5" style={{ color: '#2563eb' }} /> },
            { label: 'Resolved This Week', count: resolvedThisWeek, bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', icon: <CheckCircle className="h-5 w-5" style={{ color: '#16a34a' }} /> },
          ].map((kpi) => (
            <div key={kpi.label} style={{ backgroundColor: kpi.bg, border: `1px solid ${kpi.border}`, borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {kpi.icon}
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: kpi.color, ...F }}>{kpi.count}</div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: kpi.color, opacity: 0.8, ...F }}>{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main content + Sidebar */}
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Risk Forecast Cards */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0, ...F }}>Risk Forecast (Next 30 Days)</h2>
                <span style={{ fontSize: '13px', color: '#6b7280', ...F }}>{filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredAlerts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af', fontSize: '14px', ...F }}>
                    No alerts match the selected filters.
                  </div>
                ) : filteredAlerts.map(alert => {
                  const s = getSeverityStyles(alert.severity);
                  const isResolved = alert.status === 'resolved';
                  const isSnoozed = alert.status === 'snoozed';

                  return (
                    <div key={alert.id} style={{ backgroundColor: isResolved ? '#f9fafb' : s.bg, border: `2px solid ${isResolved ? '#d1d5db' : s.border}`, borderRadius: '12px', padding: '16px', opacity: isResolved ? 0.75 : 1, position: 'relative' }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                          {isResolved ? <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#16a34a' }} /> : getSeverityIcon(alert.severity)}
                          <h3 style={{ fontWeight: 600, fontSize: '14px', color: isResolved ? '#6b7280' : s.text, margin: 0, ...F }}>{alert.title}</h3>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <span style={{ backgroundColor: s.badge, color: s.badgeText, padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', ...F }}>{alert.severity}</span>
                          <span style={{ backgroundColor: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 500, ...F }}>{ALERT_TYPE_LABELS[alert.alert_type]}</span>
                        </div>
                      </div>

                      {/* Description */}
                      <p style={{ fontSize: '13px', color: isResolved ? '#9ca3af' : s.text, opacity: 0.85, marginBottom: '10px', lineHeight: '1.5', ...F }}>{alert.description}</p>

                      {/* Location + timestamp */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '12px', color: '#6b7280', flexWrap: 'wrap', ...F }}>
                        <span>📍 {alert.location}</span>
                        <span>⏱ {formatDate(alert.created_at)}</span>
                        {alert.assigned_to && <span>👤 {alert.assigned_to}</span>}
                        {isSnoozed && alert.snoozed_until && (
                          <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '6px', fontWeight: 500 }}>
                            Snoozed until {new Date(alert.snoozed_until).toLocaleDateString()}
                          </span>
                        )}
                        {isResolved && alert.resolved_at && (
                          <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '6px', fontWeight: 500 }}>
                            Resolved {formatDate(alert.resolved_at)}
                          </span>
                        )}
                      </div>

                      {/* Recommended Action */}
                      {!isResolved && (
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px', border: '1px solid rgba(0,0,0,0.05)' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', ...F }}>Recommended Action</div>
                          <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.4', ...F }}>{alert.recommended_action}</div>
                        </div>
                      )}

                      {/* Data Points */}
                      {!isResolved && alert.data_points.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                          {alert.data_points.map((dp, i) => (
                            <span key={i} style={{ backgroundColor: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', color: '#374151', ...F }}>{dp}</span>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      {!isResolved && alert.status !== 'dismissed' && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                          {/* Primary action */}
                          <button
                            onClick={() => navigate(alert.action_href)}
                            style={{ backgroundColor: s.border, color: 'white', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', minHeight: '44px', ...F }}
                          >
                            {alert.action_label}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>

                          {/* Resolve */}
                          <button onClick={() => resolveAlert(alert.id)} style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, border: '1px solid #bbf7d0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', ...F }}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                          </button>

                          {/* Snooze dropdown */}
                          <div style={{ position: 'relative' }}>
                            <button onClick={() => setOpenSnoozeId(openSnoozeId === alert.id ? null : alert.id)} style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, border: '1px solid #fde68a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', ...F }}>
                              <Clock className="h-3.5 w-3.5" /> Snooze <ChevronDown className="h-3 w-3" />
                            </button>
                            {openSnoozeId === alert.id && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb', zIndex: 50, minWidth: '120px' }}>
                                {SNOOZE_OPTIONS.map(opt => (
                                  <button key={opt.days} onClick={() => snoozeAlert(alert.id, opt.days)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '13px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', ...F }}>
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Assign dropdown */}
                          <div style={{ position: 'relative' }}>
                            <button onClick={() => setOpenAssignId(openAssignId === alert.id ? null : alert.id)} style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, border: '1px solid #c7d2fe', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', ...F }}>
                              <UserPlus className="h-3.5 w-3.5" /> Assign <ChevronDown className="h-3 w-3" />
                            </button>
                            {openAssignId === alert.id && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb', zIndex: 50, minWidth: '160px' }}>
                                {TEAM_MEMBERS.map(name => (
                                  <button key={name} onClick={() => assignAlert(alert.id, name)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '13px', border: 'none', backgroundColor: alert.assigned_to === name ? '#eef4f8' : 'transparent', cursor: 'pointer', ...F }}>
                                    {name} {alert.assigned_to === name && '✓'}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Dismiss */}
                          <button onClick={() => dismissAlert(alert.id)} style={{ backgroundColor: '#f3f4f6', color: '#6b7280', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, border: '1px solid #e5e7eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', ...F }}>
                            <X className="h-3.5 w-3.5" /> Dismiss
                          </button>

                          {/* Create Action Item */}
                          <button onClick={() => createActionItem(alert)} style={{ backgroundColor: '#1e4d6b', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer', ...F }}>
                            Create Action Item
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Score Projection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6" style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '16px', ...F }}>Score Projection</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={scoreProjectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis domain={[50, 100]} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Inspection Ready', position: 'right', fill: '#22c55e', fontSize: 11 }} />
                  <ReferenceLine y={70} stroke="#eab308" strokeDasharray="3 3" label={{ value: 'Needs Attention', position: 'right', fill: '#eab308', fontSize: 11 }} />
                  <Line type="monotone" dataKey="actual" stroke="#1e4d6b" strokeWidth={2} dot={{ r: 3 }} name="Actual Score" connectNulls={false} />
                  <Line type="monotone" dataKey="noAction" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} name="No Action" connectNulls={false} />
                  <Line type="monotone" dataKey="recommended" stroke="#22c55e" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} name="Recommended Actions" connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '13px', flexWrap: 'wrap', ...F }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingDown className="h-4 w-4" style={{ color: '#ef4444' }} />
                  <span style={{ color: '#991b1b' }}>No action: score drops to ~65 in 4 weeks</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp className="h-4 w-4" style={{ color: '#22c55e' }} />
                  <span style={{ color: '#166534' }}>Complete actions: score reaches ~82 in 4 weeks</span>
                </div>
              </div>
            </div>

            {/* Actions to Improve Score */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" style={{ marginBottom: '24px' }}>
              <div className="p-4 sm:p-6 pb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', ...F }}>Actions to Improve Score</h2>
                    <p style={{ fontSize: '13px', color: '#6b7280', ...F }}>Complete these actions to increase your compliance score — sorted by priority then point impact</p>
                  </div>
                  <div data-demo-allow className="flex items-center gap-3">
                    <select value={actionLocationFilter} onChange={(e) => setActionLocationFilter(e.target.value)} style={selectStyle}>
                      {showAllLocationsOption() && <option value="all">All Locations</option>}
                      {analysisAccessibleLocs.map(loc => (
                        <option key={loc.locationUrlId} value={loc.locationUrlId}>{loc.locationName}</option>
                      ))}
                    </select>
                    <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={selectStyle}>
                      <option value="all">All Severities</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pillar</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Point Impact</th>
                      <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {actionsToImproveScore.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 sm:px-6 py-8 text-center text-sm text-gray-500">
                          No actions match the selected filters. Try adjusting the location or severity filter.
                        </td>
                      </tr>
                    ) : actionsToImproveScore.map((action, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">{getPriorityBadge(action.priority)}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">{action.action}</td>
                        <td className="hidden sm:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                          <span style={{ padding: '2px 10px', fontSize: '12px', fontWeight: 500, borderRadius: '9999px', backgroundColor: action.pillar === 'Food Safety' ? '#dbeafe' : action.pillar === 'Facility Safety' ? '#dcfce7' : '#fef3c7', color: action.pillar === 'Food Safety' ? '#1e4d6b' : action.pillar === 'Facility Safety' ? '#166534' : '#92400e' }}>
                            {action.pillar}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold" style={{ color: '#1e4d6b' }}>+{action.pointImpact} pts</td>
                        <td className="hidden sm:table-cell px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">{action.location}</td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <button onClick={() => navigate(action.link)} className="bg-[#1e4d6b] text-white text-xs font-medium px-3 py-1 rounded-lg hover:bg-[#163a52] transition-colors duration-150 flex items-center gap-1 min-h-[44px]">
                            Take Action <ArrowRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Compliance Trends */}
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '16px', ...F }}>Compliance Trends</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Food Safety</h3>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={currentTrends.foodSafety}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#1e4d6b" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className={`text-xs mt-2 flex items-center ${opEnd >= opStart ? 'text-green-600' : 'text-red-600'}`}>
                    {opEnd >= opStart ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {opEnd >= opStart ? '+' : ''}{opEnd - opStart} points over 12 weeks
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Facility Safety</h3>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={currentTrends.facilitySafety}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#1e4d6b" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className={`text-xs mt-2 flex items-center ${eqEnd >= eqStart ? 'text-green-600' : 'text-red-600'}`}>
                    {eqEnd >= eqStart ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {eqEnd >= eqStart ? '+' : ''}{eqEnd - eqStart} points over 12 weeks
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-[280px] flex-shrink-0" style={{ display: showSidebar ? 'block' : 'none' }}>

            {/* Alert Trends */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '16px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px', ...F }}>Alert Trends (4 Weeks)</h3>
              {alertTrends.map((week, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < alertTrends.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280', ...F }}>{week.week}</span>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', ...F }}>
                    <span style={{ color: '#dc2626', fontWeight: 500 }}>+{week.generated}</span>
                    <span style={{ color: '#16a34a', fontWeight: 500 }}>-{week.resolved}</span>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#9ca3af', ...F }}>
                <span>🔴 Generated</span>
                <span>🟢 Resolved</span>
              </div>
            </div>

            {/* Top Risk Areas */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '16px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px', ...F }}>Top Risk Areas</h3>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', ...F }}>By Location</div>
              {topRiskAreas.map(([loc, count], i) => (
                <div key={loc} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ fontSize: '13px', color: '#374151', ...F }}>📍 {loc}</span>
                  <span style={{ backgroundColor: i === 0 ? '#fee2e2' : '#f3f4f6', color: i === 0 ? '#991b1b' : '#374151', padding: '2px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, ...F }}>{count}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #f3f4f6', marginTop: '12px', paddingTop: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', ...F }}>By Type</div>
                {topAlertTypes.map(([type, count]) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ fontSize: '12px', color: '#374151', ...F }}>{type}</span>
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, ...F }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Prevention Score */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px', ...F }}>Prevention Score</h3>
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto' }}>
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#16a34a" strokeWidth="8" strokeDasharray={`${78 * 2.64} ${100 * 2.64}`} strokeDashoffset="0" transform="rotate(-90 50 50)" strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '24px', fontWeight: 700, color: '#166534', ...F }}>78%</div>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', lineHeight: '1.4', ...F }}>
                  Alerts resolved before becoming actual violations
                </p>
              </div>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', ...F }}>
                  <span style={{ color: '#6b7280' }}>Prevented</span>
                  <span style={{ color: '#166534', fontWeight: 600 }}>32 violations</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px', ...F }}>
                  <span style={{ color: '#6b7280' }}>Missed</span>
                  <span style={{ color: '#991b1b', fontWeight: 600 }}>9 violations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </>}
      </div>
    </>
  );
}
