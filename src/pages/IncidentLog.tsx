import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus, AlertTriangle, Clock, CheckCircle2, XCircle, User, MapPin,
  ChevronDown, ChevronRight, ArrowLeft, Filter, Download, MessageSquare,
  Thermometer, ClipboardList, Bug, Wrench, ShieldAlert, Users as UsersIcon,
  AlertCircle, FileText, Camera, Sparkles, Loader2, CheckCircle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Breadcrumb } from '../components/Breadcrumb';
import { useRole } from '../contexts/RoleContext';
import { useTranslation } from '../contexts/LanguageContext';
import { PhotoEvidence, PhotoButton, type PhotoRecord } from '../components/PhotoEvidence';
import { PhotoGallery } from '../components/PhotoGallery';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { EmptyState } from '../components/EmptyState';

// ── Types ──────────────────────────────────────────────────────────

type IncidentType =
  | 'temperature_violation'
  | 'checklist_failure'
  | 'health_citation'
  | 'equipment_failure'
  | 'pest_sighting'
  | 'customer_complaint'
  | 'staff_safety'
  | 'other';

type Severity = 'critical' | 'major' | 'minor';

type IncidentStatus = 'reported' | 'assigned' | 'in_progress' | 'resolved' | 'verified';

type RootCause = 'equipment' | 'training' | 'process' | 'vendor' | 'external' | 'unknown';

interface TimelineEntry {
  id: string;
  action: string;
  status: IncidentStatus;
  user: string;
  timestamp: string;
  notes?: string;
  photos?: PhotoRecord[];
}

interface Comment {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

interface Incident {
  id: string;
  type: IncidentType;
  severity: Severity;
  title: string;
  description: string;
  location: string;
  status: IncidentStatus;
  assignedTo: string;
  reportedBy: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  correctiveAction?: string;
  actionChips?: string[];
  resolutionSummary?: string;
  rootCause?: RootCause;
  sourceType?: 'temp_log' | 'checklist';
  sourceId?: string;
  sourceLabel?: string;
  photos: PhotoRecord[];
  resolutionPhotos: PhotoRecord[];
  timeline: TimelineEntry[];
  comments: Comment[];
}

// ── Constants ──────────────────────────────────────────────────────

const INCIDENT_TYPES: { value: IncidentType; label: string; icon: typeof AlertTriangle }[] = [
  { value: 'temperature_violation', label: 'Temperature Violation', icon: Thermometer },
  { value: 'checklist_failure', label: 'Checklist Failure', icon: ClipboardList },
  { value: 'health_citation', label: 'Health Inspection Citation', icon: ShieldAlert },
  { value: 'equipment_failure', label: 'Equipment Failure', icon: Wrench },
  { value: 'pest_sighting', label: 'Pest Sighting', icon: Bug },
  { value: 'customer_complaint', label: 'Customer Complaint', icon: MessageSquare },
  { value: 'staff_safety', label: 'Staff Safety', icon: UsersIcon },
  { value: 'other', label: 'Other', icon: AlertCircle },
];

const SEVERITIES: { value: Severity; label: string; color: string; bg: string }[] = [
  { value: 'critical', label: 'Critical', color: '#dc2626', bg: '#fef2f2' },
  { value: 'major', label: 'Major', color: '#d97706', bg: '#fffbeb' },
  { value: 'minor', label: 'Minor', color: '#2563eb', bg: '#eff6ff' },
];

const STATUS_CONFIG: Record<IncidentStatus, { label: string; color: string; bg: string }> = {
  reported: { label: 'Reported', color: '#dc2626', bg: '#fef2f2' },
  assigned: { label: 'Assigned', color: '#d97706', bg: '#fffbeb' },
  in_progress: { label: 'In Progress', color: '#2563eb', bg: '#eff6ff' },
  resolved: { label: 'Resolved', color: '#16a34a', bg: '#f0fdf4' },
  verified: { label: 'Verified', color: '#059669', bg: '#ecfdf5' },
};

const ACTION_CHIPS = [
  'Adjusted equipment', 'Discarded product', 'Re-cleaned area',
  'Called vendor', 'Retrained staff', 'Replaced item', 'Other',
];

const ROOT_CAUSES: { value: RootCause; label: string }[] = [
  { value: 'equipment', label: 'Equipment' },
  { value: 'training', label: 'Training' },
  { value: 'process', label: 'Process' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'external', label: 'External' },
  { value: 'unknown', label: 'Unknown' },
];

const LOCATIONS = ['Downtown Kitchen', 'Airport Cafe', 'University Dining']; // demo

const TEAM_MEMBERS = [
  'Sarah Chen', 'Maria Garcia', 'John Smith', 'Emily Rogers', 'David Kim', 'Michael Torres',
];

const now = Date.now();
const h = (hours: number) => new Date(now - hours * 3600000).toISOString();
const d = (days: number) => new Date(now - days * 86400000).toISOString();

// ── Demo Data ──────────────────────────────────────────────────────

const DEMO_INCIDENTS: Incident[] = [
  {
    id: 'INC-001',
    type: 'temperature_violation',
    severity: 'critical',
    title: 'Walk-in Cooler temperature at 47°F',
    description: 'Walk-in cooler #1 recorded at 47°F during routine check, exceeding the 41°F maximum. All perishable items at risk.',
    location: 'Downtown Kitchen', // demo
    status: 'in_progress',
    assignedTo: 'Maria Garcia',
    reportedBy: 'John Smith',
    createdAt: h(3),
    updatedAt: h(1),
    sourceType: 'temp_log',
    sourceId: 'TL-4521',
    sourceLabel: 'Temp Log #4521 — Walk-in Cooler',
    photos: [],
    resolutionPhotos: [],
    correctiveAction: 'Called refrigeration repair tech. Moved high-risk items to backup cooler.',
    actionChips: ['Called vendor', 'Adjusted equipment'],
    timeline: [
      { id: 't1', action: 'Incident reported from temperature log', status: 'reported', user: 'John Smith', timestamp: h(3) },
      { id: 't2', action: 'Auto-assigned to location manager', status: 'assigned', user: 'System', timestamp: h(3) },
      { id: 't3', action: 'Taking corrective action — vendor called, items relocated', status: 'in_progress', user: 'Maria Garcia', timestamp: h(1) },
    ],
    comments: [
      { id: 'c1', user: 'Maria Garcia', text: 'Repair tech ETA 45 minutes. All TCS items moved to backup unit.', timestamp: h(2) },
      { id: 'c2', user: 'Sarah Chen', text: 'Good response time. Make sure to document all discarded items.', timestamp: h(1.5) },
    ],
  },
  {
    id: 'INC-002',
    type: 'checklist_failure',
    severity: 'major',
    title: 'Closing checklist — floor drains not cleaned',
    description: 'Closing checklist item "Check floor drains" marked as No. Drains visibly clogged with debris.',
    location: 'Airport Cafe', // demo
    status: 'resolved',
    assignedTo: 'Emily Rogers',
    reportedBy: 'David Kim',
    createdAt: d(1),
    updatedAt: h(18),
    resolvedAt: h(18),
    sourceType: 'checklist',
    sourceId: 'CL-892',
    sourceLabel: 'Closing Checklist #892',
    photos: [],
    resolutionPhotos: [],
    resolutionSummary: 'Drains fully cleaned and sanitized. Added drain cleaning to mid-day checklist to prevent recurrence.',
    rootCause: 'process',
    correctiveAction: 'Re-cleaned all floor drains. Sanitized surrounding area.',
    actionChips: ['Re-cleaned area'],
    timeline: [
      { id: 't1', action: 'Incident reported from checklist failure', status: 'reported', user: 'David Kim', timestamp: d(1) },
      { id: 't2', action: 'Assigned to Emily Rogers', status: 'assigned', user: 'System', timestamp: d(1) },
      { id: 't3', action: 'Cleaning in progress', status: 'in_progress', user: 'Emily Rogers', timestamp: h(22) },
      { id: 't4', action: 'Drains cleaned and sanitized', status: 'resolved', user: 'Emily Rogers', timestamp: h(18) },
    ],
    comments: [
      { id: 'c1', user: 'Emily Rogers', text: 'Drains are clear now. Suggesting we add this to the mid-day check too.', timestamp: h(18) },
    ],
  },
  {
    id: 'INC-003',
    type: 'health_citation',
    severity: 'critical',
    title: 'Health inspector citation — improper food storage',
    description: 'Inspector noted raw chicken stored above ready-to-eat items in prep cooler. Citation #HD-2026-0041 issued.',
    location: 'Downtown Kitchen', // demo
    status: 'verified',
    assignedTo: 'Maria Garcia',
    reportedBy: 'Sarah Chen',
    createdAt: d(5),
    updatedAt: d(3),
    resolvedAt: d(4),
    verifiedAt: d(3),
    verifiedBy: 'Sarah Chen',
    photos: [],
    resolutionPhotos: [],
    resolutionSummary: 'All coolers reorganized per FIFO and cross-contamination guidelines. Staff retrained on proper storage protocol.',
    rootCause: 'training',
    correctiveAction: 'Reorganized all cooler shelving. Conducted refresher training for all kitchen staff.',
    actionChips: ['Retrained staff', 'Adjusted equipment'],
    timeline: [
      { id: 't1', action: 'Citation reported by management', status: 'reported', user: 'Sarah Chen', timestamp: d(5) },
      { id: 't2', action: 'Assigned to Maria Garcia', status: 'assigned', user: 'Sarah Chen', timestamp: d(5) },
      { id: 't3', action: 'Corrective action started — reorganizing coolers', status: 'in_progress', user: 'Maria Garcia', timestamp: d(5) },
      { id: 't4', action: 'Coolers reorganized, staff retrained', status: 'resolved', user: 'Maria Garcia', timestamp: d(4) },
      { id: 't5', action: 'Resolution verified — inspected all coolers personally', status: 'verified', user: 'Sarah Chen', timestamp: d(3) },
    ],
    comments: [
      { id: 'c1', user: 'Maria Garcia', text: 'All shelving labeled. Conducted 30-min training session with morning crew.', timestamp: d(4) },
      { id: 'c2', user: 'Sarah Chen', text: 'Verified all coolers. Great work. Re-inspection scheduled for next week.', timestamp: d(3) },
    ],
  },
  {
    id: 'INC-004',
    type: 'equipment_failure',
    severity: 'major',
    title: 'Hot holding unit not reaching 135°F',
    description: 'Hot holding unit #2 stuck at 128°F. Cannot maintain safe hot holding temperature for buffet line.',
    location: 'University Dining', // demo
    status: 'assigned',
    assignedTo: 'Michael Torres',
    reportedBy: 'Emily Rogers',
    createdAt: h(5),
    updatedAt: h(4),
    photos: [],
    resolutionPhotos: [],
    timeline: [
      { id: 't1', action: 'Equipment failure reported', status: 'reported', user: 'Emily Rogers', timestamp: h(5) },
      { id: 't2', action: 'Assigned to Michael Torres', status: 'assigned', user: 'System', timestamp: h(4) },
    ],
    comments: [],
  },
  {
    id: 'INC-005',
    type: 'pest_sighting',
    severity: 'critical',
    title: 'Rodent droppings found in dry storage',
    description: 'Staff found rodent droppings near flour storage in dry goods area. Immediate pest control needed.',
    location: 'Airport Cafe', // demo
    status: 'in_progress',
    assignedTo: 'David Kim',
    reportedBy: 'Maria Garcia',
    createdAt: h(8),
    updatedAt: h(6),
    photos: [],
    resolutionPhotos: [],
    correctiveAction: 'Called pest control. Discarded all open dry goods within 3 feet of droppings. Deep cleaning in progress.',
    actionChips: ['Called vendor', 'Discarded product', 'Re-cleaned area'],
    timeline: [
      { id: 't1', action: 'Pest sighting reported', status: 'reported', user: 'Maria Garcia', timestamp: h(8) },
      { id: 't2', action: 'Assigned to David Kim', status: 'assigned', user: 'System', timestamp: h(8) },
      { id: 't3', action: 'Pest control called, cleanup started', status: 'in_progress', user: 'David Kim', timestamp: h(6) },
    ],
    comments: [
      { id: 'c1', user: 'David Kim', text: 'Pest control arriving at 2pm. All affected product quarantined and logged.', timestamp: h(7) },
    ],
  },
  {
    id: 'INC-006',
    type: 'customer_complaint',
    severity: 'minor',
    title: 'Customer reported lukewarm soup',
    description: 'Customer at table 12 complained soup was not hot enough. Server confirmed soup ladle left out, not returned to warmer.',
    location: 'Downtown Kitchen', // demo
    status: 'resolved',
    assignedTo: 'John Smith',
    reportedBy: 'Emily Rogers',
    createdAt: d(2),
    updatedAt: d(2),
    resolvedAt: d(2),
    resolutionSummary: 'Re-heated soup to 165°F, served replacement. Reminded staff on ladle protocol.',
    rootCause: 'training',
    correctiveAction: 'Re-heated soup, replaced customer order. Briefed staff on hot-hold ladle return SOP.',
    actionChips: ['Retrained staff'],
    photos: [],
    resolutionPhotos: [],
    timeline: [
      { id: 't1', action: 'Customer complaint reported', status: 'reported', user: 'Emily Rogers', timestamp: d(2) },
      { id: 't2', action: 'Assigned to John Smith', status: 'assigned', user: 'System', timestamp: d(2) },
      { id: 't3', action: 'Handling complaint', status: 'in_progress', user: 'John Smith', timestamp: d(2) },
      { id: 't4', action: 'Customer served replacement, staff briefed', status: 'resolved', user: 'John Smith', timestamp: d(2) },
    ],
    comments: [],
  },
  {
    id: 'INC-007',
    type: 'staff_safety',
    severity: 'minor',
    title: 'Wet floor near dishwash station — no sign posted',
    description: 'Wet floor observed near dishwash area without caution signage. Near-miss slip reported by prep cook.',
    location: 'University Dining', // demo
    status: 'verified',
    assignedTo: 'Michael Torres',
    reportedBy: 'David Kim',
    createdAt: d(3),
    updatedAt: d(2),
    resolvedAt: d(3),
    verifiedAt: d(2),
    verifiedBy: 'Sarah Chen',
    resolutionSummary: 'Wet floor signs placed. Added "check wet floor signs" to opening and mid-day checklists.',
    rootCause: 'process',
    photos: [],
    resolutionPhotos: [],
    correctiveAction: 'Placed signs immediately. Updated checklist templates.',
    actionChips: ['Other'],
    timeline: [
      { id: 't1', action: 'Safety concern reported', status: 'reported', user: 'David Kim', timestamp: d(3) },
      { id: 't2', action: 'Assigned to Michael Torres', status: 'assigned', user: 'System', timestamp: d(3) },
      { id: 't3', action: 'Signs placed and checklists updated', status: 'in_progress', user: 'Michael Torres', timestamp: d(3) },
      { id: 't4', action: 'Resolution complete', status: 'resolved', user: 'Michael Torres', timestamp: d(3) },
      { id: 't5', action: 'Verified — signs in place, checklist updated', status: 'verified', user: 'Sarah Chen', timestamp: d(2) },
    ],
    comments: [],
  },
  {
    id: 'INC-008',
    type: 'temperature_violation',
    severity: 'major',
    title: 'Prep cooler temp at 44°F during morning check',
    description: 'Prep cooler read 44°F during opening check. Door seal appears worn. Items still safe but at threshold.',
    location: 'Airport Cafe', // demo
    status: 'reported',
    assignedTo: 'Emily Rogers',
    reportedBy: 'John Smith',
    createdAt: h(1),
    updatedAt: h(1),
    sourceType: 'temp_log',
    sourceId: 'TL-4530',
    sourceLabel: 'Temp Log #4530 — Prep Cooler',
    photos: [],
    resolutionPhotos: [],
    timeline: [
      { id: 't1', action: 'Incident auto-created from out-of-range temperature reading', status: 'reported', user: 'System', timestamp: h(1) },
    ],
    comments: [],
  },
];

// ── Helpers ────────────────────────────────────────────────────────

function getResolutionTime(incident: Incident): string | null {
  if (!incident.resolvedAt) return null;
  const created = new Date(incident.createdAt).getTime();
  const resolved = new Date(incident.resolvedAt).getTime();
  const diffMs = resolved - created;
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return `${days}d ${remainHours}h ${mins}m`;
  }
  return `${hours}h ${mins}m`;
}

function isOverdue(incident: Incident): boolean {
  if (incident.status === 'resolved' || incident.status === 'verified') return false;
  const created = new Date(incident.createdAt).getTime();
  return now - created > 24 * 3600000;
}

// TODO: Compliance score integration — wire into src/lib/complianceScoring.ts
// Incident resolution time feeds into the Operational Safety pillar.
// Scoring thresholds (per incident):
//   - Resolved under 2 hours:  100 pts (full credit)
//   - Resolved 2–12 hours:      80 pts
//   - Resolved 12–24 hours:     60 pts
//   - Resolved 24–48 hours:     40 pts
//   - Resolved over 48 hours:   20 pts
//   - Unresolved:                 0 pts
// Average across all incidents → feeds into calculateOperationalScore() as "incidents" sub-component (20% weight).
// Also factor in: verified by manager = +5 bonus, rejected resolution = −10 penalty.

// ── Component ──────────────────────────────────────────────────────

export function IncidentLog() {
  const { userRole } = useRole();
  const { t } = useTranslation();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const canVerify = userRole === 'executive' || userRole === 'owner_operator';

  // ── Lookup maps for module-level data arrays ──────────────────
  const typeLabels: Record<string, string> = {
    'Temperature Violation': t('incidents.temperatureViolation'),
    'Checklist Failure': t('incidents.checklistFailure'),
    'Health Inspection Citation': t('incidents.healthInspectionCitation'),
    'Equipment Failure': t('incidents.equipmentFailure'),
    'Pest Sighting': t('incidents.pestSighting'),
    'Customer Complaint': t('incidents.customerComplaint'),
    'Staff Safety': t('incidents.staffSafety'),
    'Other': t('incidents.other'),
  };

  const severityLabels: Record<string, string> = {
    'Critical': t('incidents.critical'),
    'Major': t('incidents.major'),
    'Minor': t('incidents.minor'),
  };

  const statusLabels: Record<string, string> = {
    'Reported': t('incidents.reported'),
    'Assigned': t('incidents.assigned'),
    'In Progress': t('common.inProgress'),
    'Resolved': t('common.resolved'),
    'Verified': t('incidents.verified'),
  };

  const rootCauseLabels: Record<string, string> = {
    'Equipment': t('incidents.rcEquipment'),
    'Training': t('incidents.rcTraining'),
    'Process': t('incidents.rcProcess'),
    'Vendor': t('incidents.rcVendor'),
    'External': t('incidents.rcExternal'),
    'Unknown': t('incidents.rcUnknown'),
  };

  const actionChipLabels: Record<string, string> = {
    'Adjusted equipment': t('incidents.adjustedEquipment'),
    'Discarded product': t('incidents.discardedProduct'),
    'Re-cleaned area': t('incidents.reCleanedArea'),
    'Called vendor': t('incidents.calledVendor'),
    'Retrained staff': t('incidents.retrainedStaff'),
    'Replaced item': t('incidents.replacedItem'),
    'Other': t('incidents.other'),
  };

  // Auth & demo mode
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // State
  const [incidents, setIncidents] = useState<Incident[]>(isDemoMode ? DEMO_INCIDENTS : []);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [showResolveForm, setShowResolveForm] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'severity' | 'resolution'>('newest');

  // Create form
  const [newType, setNewType] = useState<IncidentType>('temperature_violation');
  const [newSeverity, setNewSeverity] = useState<Severity>('major');
  const [newLocation, setNewLocation] = useState(LOCATIONS[0]);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPhotos, setNewPhotos] = useState<PhotoRecord[]>([]);
  const [aiDraftApplied, setAiDraftApplied] = useState(false);

  // Action form
  const [actionText, setActionText] = useState('');
  const [actionChips, setActionChips] = useState<string[]>([]);
  const [actionPhotos, setActionPhotos] = useState<PhotoRecord[]>([]);
  const [estimatedCompletion, setEstimatedCompletion] = useState<string>('');

  // Resolve form
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [rootCause, setRootCause] = useState<RootCause>('unknown');
  const [resolutionPhotos, setResolutionPhotos] = useState<PhotoRecord[]>([]);
  const [managerPhotoOverride, setManagerPhotoOverride] = useState(false);

  // Comment
  const [commentText, setCommentText] = useState('');

  // Fetch incidents from Supabase in live mode
  useEffect(() => {
    if (isDemoMode || !profile?.organization_id) return;

    async function fetchIncidents() {
      setLoading(true);
      const orgId = profile!.organization_id;

      const { data, error } = await supabase
        .from('incidents')
        .select('*, incident_timeline(*), incident_comments(*)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching incidents:', error);
        setLoading(false);
        return;
      }

      // Map location IDs to names
      const { data: locData } = await supabase
        .from('locations')
        .select('id, name')
        .eq('organization_id', orgId);
      const locMap: Record<string, string> = {};
      (locData || []).forEach((l: any) => { locMap[l.id] = l.name; });

      const mapped: Incident[] = (data || []).map((row: any) => ({
        id: row.incident_number || row.id,
        type: row.type as IncidentType,
        severity: row.severity as Severity,
        title: row.title,
        description: row.description,
        location: row.location_name || locMap[row.location_id] || 'Unknown',
        status: row.status as IncidentStatus,
        assignedTo: row.assigned_to || '',
        reportedBy: row.reported_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        resolvedAt: row.resolved_at || undefined,
        verifiedAt: row.verified_at || undefined,
        verifiedBy: row.verified_by || undefined,
        correctiveAction: row.corrective_action || undefined,
        actionChips: row.action_chips || undefined,
        resolutionSummary: row.resolution_summary || undefined,
        rootCause: (row.root_cause || undefined) as RootCause | undefined,
        sourceType: row.source_type || undefined,
        sourceId: row.source_id || undefined,
        sourceLabel: row.source_label || undefined,
        photos: row.photos || [],
        resolutionPhotos: row.resolution_photos || [],
        timeline: (row.incident_timeline || [])
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((t: any) => ({
            id: t.id,
            action: t.action,
            status: t.status as IncidentStatus,
            user: t.performed_by,
            timestamp: t.created_at,
            notes: t.notes || undefined,
            photos: t.photos || undefined,
          })),
        comments: (row.incident_comments || [])
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((c: any) => ({
            id: c.id,
            user: c.user_name,
            text: c.comment_text,
            timestamp: c.created_at,
          })),
      }));

      if (mapped.length > 0) {
        setIncidents(mapped);
      }
      setLoading(false);
    }

    fetchIncidents();
  }, [isDemoMode, profile?.organization_id]);

  // ── KPI calculations ───────────────────────────────────────────
  const openIncidents = incidents.filter(i => !['resolved', 'verified'].includes(i.status)).length;
  const resolvedThisWeek = incidents.filter(i => {
    if (!i.resolvedAt) return false;
    return now - new Date(i.resolvedAt).getTime() < 7 * 86400000;
  }).length;
  const overdueCount = incidents.filter(i => isOverdue(i)).length;

  const avgResolutionMs = useMemo(() => {
    const resolved = incidents.filter(i => i.resolvedAt);
    if (resolved.length === 0) return 0;
    const total = resolved.reduce((sum, i) => {
      return sum + (new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime());
    }, 0);
    return total / resolved.length;
  }, [incidents]);

  const avgResolutionHours = Math.round(avgResolutionMs / 3600000);

  // ── Filtered & sorted incidents ────────────────────────────────
  const filteredIncidents = useMemo(() => {
    let list = [...incidents];
    if (statusFilter !== 'all') list = list.filter(i => i.status === statusFilter);
    if (severityFilter !== 'all') list = list.filter(i => i.severity === severityFilter);
    if (typeFilter !== 'all') list = list.filter(i => i.type === typeFilter);
    if (locationFilter !== 'all') list = list.filter(i => i.location === locationFilter);
    if (assigneeFilter !== 'all') list = list.filter(i => i.assignedTo === assigneeFilter);
    if (dateRange !== 'all') {
      const cutoff = dateRange === '24h' ? 86400000 : dateRange === '7d' ? 7 * 86400000 : 30 * 86400000;
      list = list.filter(i => now - new Date(i.createdAt).getTime() < cutoff);
    }

    switch (sortBy) {
      case 'newest': list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case 'oldest': list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      case 'severity': {
        const order: Record<Severity, number> = { critical: 0, major: 1, minor: 2 };
        list.sort((a, b) => order[a.severity] - order[b.severity]);
        break;
      }
      case 'resolution': list.sort((a, b) => {
        const aTime = a.resolvedAt ? new Date(a.resolvedAt).getTime() - new Date(a.createdAt).getTime() : Infinity;
        const bTime = b.resolvedAt ? new Date(b.resolvedAt).getTime() - new Date(b.createdAt).getTime() : Infinity;
        return aTime - bTime;
      }); break;
    }
    return list;
  }, [incidents, statusFilter, severityFilter, typeFilter, locationFilter, assigneeFilter, dateRange, sortBy]);

  // ── AI Draft auto-fill ──────────────────────────────────────────
  const AI_DRAFT_DATA: Record<IncidentType, { title: string; description: string; severity: Severity }> = {
    temperature_violation: {
      title: 'Walk-in cooler temperature above safe threshold',
      description: 'During routine monitoring, the walk-in cooler was recorded at 44°F, exceeding the 41°F FDA safe holding threshold. Perishable items including dairy, prepped vegetables, and raw proteins may be affected. Door seal appears worn and compressor is cycling frequently.',
      severity: 'critical',
    },
    checklist_failure: {
      title: 'Closing checklist incomplete — sanitization steps skipped',
      description: 'Closing crew did not complete sanitization of food-contact surfaces and floor drain cleaning. Checklist shows 4 of 9 items marked incomplete. Closing shift was short-staffed with only 2 team members instead of the usual 3.',
      severity: 'major',
    },
    health_citation: {
      title: 'Health inspector citation — improper food labeling',
      description: 'During routine health inspection, inspector noted multiple containers in walk-in cooler without date labels or product identification. Citation issued for non-compliance with food labeling requirements. Affects prep station items and pre-portioned ingredients.',
      severity: 'critical',
    },
    equipment_failure: {
      title: 'Commercial dishwasher not reaching sanitizing temperature',
      description: 'High-temperature commercial dishwasher failing to reach 180°F minimum final rinse temperature. Current readings show 155-160°F. Heating element may need replacement. Switched to chemical sanitizing (3-sink method) as interim solution.',
      severity: 'major',
    },
    pest_sighting: {
      title: 'Cockroach sighting near dry storage area',
      description: 'Staff member observed a cockroach near the dry storage shelving unit adjacent to the back door. Area inspected and no additional activity found, but proximity to food storage warrants immediate pest control response. Back door weather stripping appears damaged.',
      severity: 'critical',
    },
    customer_complaint: {
      title: 'Customer reported undercooked chicken in entrée',
      description: 'Customer at table 8 returned a grilled chicken entrée reporting pink/raw interior. Kitchen confirmed the item did not reach 165°F internal temperature. Replacement meal prepared and comped. Need to review grill station procedures and calibrate thermometers.',
      severity: 'major',
    },
    staff_safety: {
      title: 'Staff slip incident near dish pit — no wet floor signs',
      description: 'Line cook slipped on wet floor near the dish pit area during lunch rush. No wet floor signage was posted. Employee reports minor knee discomfort but declined medical attention. Floor drainage appears adequate but high-traffic splashing from dishwashing created hazard.',
      severity: 'minor',
    },
    other: {
      title: 'Power outage affected cold storage for 45 minutes',
      description: 'Unexpected power outage lasted approximately 45 minutes. Walk-in cooler and freezer temperatures rose by 3-4°F during the outage. All units returned to safe range within 30 minutes of power restoration. Need to assess food safety for items at threshold temperatures.',
      severity: 'major',
    },
  };

  const handleAiDraft = () => {
    const draft = AI_DRAFT_DATA[newType];
    setNewTitle(draft.title);
    setNewDescription(draft.description);
    setNewSeverity(draft.severity);
    setAiDraftApplied(true);
  };

  // ── Handlers ───────────────────────────────────────────────────
  const handleCreateIncident = async () => {
    if (!newTitle.trim() || !newDescription.trim()) {
      showToast('Title and description are required.');
      return;
    }
    const assignee = TEAM_MEMBERS[Math.floor(Math.random() * TEAM_MEMBERS.length)];
    const incNumber = `INC-${String(incidents.length + 1).padStart(3, '0')}`;
    const nowIso = new Date().toISOString();

    // Live mode: insert to Supabase
    if (!isDemoMode && profile?.organization_id) {
      const { data: inserted, error } = await supabase.from('incidents').insert({
        organization_id: profile.organization_id,
        incident_number: incNumber,
        type: newType,
        severity: newSeverity,
        title: newTitle,
        description: newDescription,
        location_name: newLocation,
        status: 'assigned',
        assigned_to: assignee,
        reported_by: 'Current User',
        photos: newPhotos,
        resolution_photos: [],
      }).select().single();

      if (error) {
        console.error('Error creating incident:', error);
        showToast('Failed to create incident.');
        return;
      }

      // Insert timeline entries
      if (inserted) {
        await supabase.from('incident_timeline').insert([
          { incident_id: inserted.id, action: 'Incident reported', status: 'reported', performed_by: 'Current User' },
          { incident_id: inserted.id, action: 'Auto-assigned to location manager', status: 'assigned', performed_by: 'System' },
        ]);
      }
    }

    const newIncident: Incident = {
      id: incNumber,
      type: newType,
      severity: newSeverity,
      title: newTitle,
      description: newDescription,
      location: newLocation,
      status: 'assigned',
      assignedTo: assignee,
      reportedBy: 'Current User',
      createdAt: nowIso,
      updatedAt: nowIso,
      photos: newPhotos,
      resolutionPhotos: [],
      timeline: [
        { id: `t-${Date.now()}`, action: 'Incident reported', status: 'reported', user: 'Current User', timestamp: nowIso },
        { id: `t-${Date.now() + 1}`, action: 'Auto-assigned to location manager', status: 'assigned', user: 'System', timestamp: nowIso },
      ],
      comments: [],
    };
    setIncidents(prev => [newIncident, ...prev]);
    setShowCreateForm(false);
    setNewTitle(''); setNewDescription(''); setNewPhotos([]); setAiDraftApplied(false);
    setSelectedIncident(newIncident);
    showToast('Incident reported successfully.');
  };

  const handleTakeAction = async () => {
    if (!selectedIncident || !actionText.trim()) return;
    const updated = { ...selectedIncident };
    updated.status = 'in_progress';
    updated.correctiveAction = actionText;
    updated.actionChips = actionChips;
    updated.updatedAt = new Date().toISOString();
    const estLabel = estimatedCompletion ? ` (est. completion: ${estimatedCompletion})` : '';
    updated.timeline = [...updated.timeline, {
      id: `t-${Date.now()}`,
      action: `Corrective action: ${actionText}${estLabel}`,
      status: 'in_progress',
      user: 'Current User',
      timestamp: new Date().toISOString(),
      photos: actionPhotos.length > 0 ? actionPhotos : undefined,
    }];

    if (!isDemoMode && profile?.organization_id) {
      await supabase.from('incidents').update({
        status: 'in_progress',
        corrective_action: actionText,
        action_chips: actionChips,
        updated_at: new Date().toISOString(),
      }).eq('incident_number', selectedIncident.id).eq('organization_id', profile.organization_id);

      await supabase.from('incident_timeline').insert({
        incident_id: selectedIncident.id,
        action: `Corrective action: ${actionText}${estLabel}`,
        status: 'in_progress',
        performed_by: 'Current User',
        photos: actionPhotos.length > 0 ? actionPhotos : [],
      });
    }

    setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
    setSelectedIncident(updated);
    setShowActionForm(false);
    setActionText(''); setActionChips([]); setActionPhotos([]); setEstimatedCompletion('');
    showToast('Corrective action recorded.');
  };

  const handleResolve = async () => {
    if (!selectedIncident || !resolutionSummary.trim()) return;
    const nowIso = new Date().toISOString();
    const updated = { ...selectedIncident };
    updated.status = 'resolved';
    updated.resolvedAt = nowIso;
    updated.updatedAt = nowIso;
    updated.resolutionSummary = resolutionSummary;
    updated.rootCause = rootCause;
    updated.resolutionPhotos = resolutionPhotos;
    updated.timeline = [...updated.timeline, {
      id: `t-${Date.now()}`,
      action: `Resolved: ${resolutionSummary}`,
      status: 'resolved',
      user: 'Current User',
      timestamp: nowIso,
      photos: resolutionPhotos.length > 0 ? resolutionPhotos : undefined,
    }];

    if (!isDemoMode && profile?.organization_id) {
      await supabase.from('incidents').update({
        status: 'resolved',
        resolved_at: nowIso,
        resolution_summary: resolutionSummary,
        root_cause: rootCause,
        resolution_photos: resolutionPhotos,
        updated_at: nowIso,
      }).eq('incident_number', selectedIncident.id).eq('organization_id', profile.organization_id);

      await supabase.from('incident_timeline').insert({
        incident_id: selectedIncident.id,
        action: `Resolved: ${resolutionSummary}`,
        status: 'resolved',
        performed_by: 'Current User',
        photos: resolutionPhotos.length > 0 ? resolutionPhotos : [],
      });
    }

    setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
    setSelectedIncident(updated);
    setShowResolveForm(false);
    setResolutionSummary(''); setRootCause('unknown'); setResolutionPhotos([]);
    showToast('Incident resolved.');
  };

  const handleVerify = async (approved: boolean) => {
    if (!selectedIncident) return;
    const nowIso = new Date().toISOString();
    const updated = { ...selectedIncident };
    if (approved) {
      updated.status = 'verified';
      updated.verifiedAt = nowIso;
      updated.verifiedBy = 'Current User';
      updated.updatedAt = nowIso;
      updated.timeline = [...updated.timeline, {
        id: `t-${Date.now()}`,
        action: 'Resolution verified and approved',
        status: 'verified',
        user: 'Current User',
        timestamp: new Date().toISOString(),
      }];
    } else {
      updated.status = 'in_progress';
      updated.resolvedAt = undefined;
      updated.updatedAt = new Date().toISOString();
      updated.timeline = [...updated.timeline, {
        id: `t-${Date.now()}`,
        action: 'Resolution rejected — sent back for additional action',
        status: 'in_progress',
        user: 'Current User',
        timestamp: new Date().toISOString(),
      }];
    }

    if (!isDemoMode && profile?.organization_id) {
      if (approved) {
        await supabase.from('incidents').update({
          status: 'verified',
          verified_at: nowIso,
          verified_by: 'Current User',
          updated_at: nowIso,
        }).eq('incident_number', selectedIncident.id).eq('organization_id', profile.organization_id);

        await supabase.from('incident_timeline').insert({
          incident_id: selectedIncident.id,
          action: 'Resolution verified and approved',
          status: 'verified',
          performed_by: 'Current User',
        });
      } else {
        await supabase.from('incidents').update({
          status: 'in_progress',
          resolved_at: null,
          updated_at: nowIso,
        }).eq('incident_number', selectedIncident.id).eq('organization_id', profile.organization_id);

        await supabase.from('incident_timeline').insert({
          incident_id: selectedIncident.id,
          action: 'Resolution rejected — sent back for additional action',
          status: 'in_progress',
          performed_by: 'Current User',
        });
      }
    }

    setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
    setSelectedIncident(updated);
    showToast(approved ? 'Incident verified.' : 'Incident sent back for additional action.');
  };

  const handleAddComment = async () => {
    if (!selectedIncident || !commentText.trim()) return;
    const updated = { ...selectedIncident };
    updated.comments = [...updated.comments, {
      id: `c-${Date.now()}`,
      user: 'Current User',
      text: commentText,
      timestamp: new Date().toISOString(),
    }];

    if (!isDemoMode && profile?.organization_id) {
      await supabase.from('incident_comments').insert({
        incident_id: selectedIncident.id,
        user_name: 'Current User',
        comment_text: commentText,
      });
    }

    setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
    setSelectedIncident(updated);
    setCommentText('');
  };

  // ── Severity badge ─────────────────────────────────────────────
  const SeverityBadge = ({ severity }: { severity: Severity }) => {
    const config = SEVERITIES.find(s => s.value === severity)!;
    return (
      <span style={{
        fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
        color: config.color, backgroundColor: config.bg, textTransform: 'uppercase',
      }}>
        {severityLabels[config.label] || config.label}
      </span>
    );
  };

  const StatusBadge = ({ status }: { status: IncidentStatus }) => {
    const config = STATUS_CONFIG[status];
    return (
      <span style={{
        fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px',
        color: config.color, backgroundColor: config.bg,
      }}>
        {statusLabels[config.label] || config.label}
      </span>
    );
  };

  // ── Detail View ────────────────────────────────────────────────
  if (selectedIncident) {
    const inc = selectedIncident;
    const resTime = getResolutionTime(inc);
    const overdue = isOverdue(inc);

    return (
      <>
        <Breadcrumb items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: t('incidents.title'), href: '/incidents' },
          { label: inc.id },
        ]} />
        <div className="space-y-6">
          {/* Header */}
          <div>
            <button
              onClick={() => setSelectedIncident(null)}
              className="flex items-center gap-1 text-sm text-[#1e4d6b] hover:underline mb-3 min-h-[44px]"
            >
              <ArrowLeft className="h-4 w-4" /> {t('incidents.backToIncidentLog')}
            </button>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">{inc.id}</h1>
                  <SeverityBadge severity={inc.severity} />
                  <StatusBadge status={inc.status} />
                  {overdue && (
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', color: '#dc2626', backgroundColor: '#fef2f2' }}>
                      {t('common.overdue')}
                    </span>
                  )}
                </div>
                <h2 className="text-lg text-gray-700">{inc.title}</h2>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(inc.status === 'assigned' || inc.status === 'reported') && (
                  <button
                    onClick={() => setShowActionForm(true)}
                    className="px-4 py-2 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] text-sm font-medium"
                  >
                    {t('incidents.takeAction')}
                  </button>
                )}
                {inc.status === 'in_progress' && (
                  <button
                    onClick={() => setShowResolveForm(true)}
                    className="px-4 py-2 min-h-[44px] bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                  >
                    {t('incidents.resolve')}
                  </button>
                )}
                {inc.status === 'resolved' && canVerify && (
                  <>
                    <button
                      onClick={() => handleVerify(true)}
                      className="px-4 py-2 min-h-[44px] bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                    >
                      <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> {t('incidents.verify')}</span>
                    </button>
                    <button
                      onClick={() => handleVerify(false)}
                      className="px-4 py-2 min-h-[44px] bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                    >
                      <span className="flex items-center gap-1"><XCircle className="h-4 w-4" /> {t('incidents.reject')}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left column — details & timeline */}
            <div className="lg:col-span-2 space-y-6">
              {/* Info card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 block">{t('common.type')}</span>
                    <span className="font-medium text-gray-900">{typeLabels[INCIDENT_TYPES.find(tp => tp.value === inc.type)?.label || ''] || INCIDENT_TYPES.find(tp => tp.value === inc.type)?.label}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">{t('common.location')}</span>
                    <span className="font-medium text-gray-900 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{inc.location}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">{t('common.assignedTo')}</span>
                    <span className="font-medium text-gray-900 flex items-center gap-1"><User className="h-3.5 w-3.5" />{inc.assignedTo}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">{t('incidents.reported')}</span>
                    <span className="font-medium text-gray-900">{formatDistanceToNow(new Date(inc.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 text-sm block mb-1">{t('common.description')}</span>
                  <p className="text-gray-800">{inc.description}</p>
                </div>
                {inc.sourceLabel && (
                  <div className="flex items-center gap-2 text-sm bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-800">{t('incidents.linked')} {inc.sourceLabel}</span>
                  </div>
                )}
                {inc.correctiveAction && (
                  <div>
                    <span className="text-gray-500 text-sm block mb-1">{t('common.correctiveAction')}</span>
                    <p className="text-gray-800">{inc.correctiveAction}</p>
                    {inc.actionChips && inc.actionChips.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {inc.actionChips.map(chip => (
                          <span key={chip} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#f3f4f6', color: '#374151', fontWeight: 500 }}>
                            {actionChipLabels[chip] || chip}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {inc.resolutionSummary && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <span className="text-green-800 text-sm font-semibold block mb-1">{t('incidents.resolution')}</span>
                    <p className="text-green-900 text-sm">{inc.resolutionSummary}</p>
                    {inc.rootCause && (
                      <p className="text-green-700 text-xs mt-1">{t('incidents.rootCause')}: <span className="font-medium capitalize">{rootCauseLabels[inc.rootCause.charAt(0).toUpperCase() + inc.rootCause.slice(1)] || inc.rootCause}</span></p>
                    )}
                  </div>
                )}
                {resTime && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4 text-[#d4af37]" />
                    {t('incidents.resolvedIn')} <span className="font-semibold text-gray-900">{resTime}</span>
                  </div>
                )}
                {inc.verifiedBy && (
                  <div className="flex items-center gap-2 text-sm bg-green-50 border border-green-200 rounded-lg p-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-green-800">
                      {t('incidents.verifiedBy')} <span className="font-semibold">{inc.verifiedBy}</span> {t('incidents.on')} {format(new Date(inc.verifiedAt!), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('incidents.timeline')}</h3>
                <div className="relative pl-6">
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />
                  {inc.timeline.map((entry, idx) => {
                    const statusConf = STATUS_CONFIG[entry.status];
                    return (
                      <div key={entry.id} className="relative mb-6 last:mb-0">
                        <div
                          className="absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                          style={{ borderColor: statusConf.color, backgroundColor: idx === inc.timeline.length - 1 ? statusConf.color : 'white' }}
                        >
                          {idx === inc.timeline.length - 1 && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <div className="ml-2">
                          <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1"><User className="h-3 w-3" />{entry.user}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(entry.timestamp), 'MMM d, h:mm a')}</span>
                          </div>
                          {entry.photos && entry.photos.length > 0 && (
                            <div className="mt-2 flex gap-2">
                              {entry.photos.map(p => (
                                <img key={p.id} src={p.dataUrl} alt="" className="w-12 h-12 rounded object-cover border" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comments */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('incidents.comments')}</h3>
                {inc.comments.length === 0 && (
                  <p className="text-sm text-gray-400">{t('incidents.noComments')}</p>
                )}
                <div className="space-y-3 mb-4">
                  {inc.comments.map(c => (
                    <div key={c.id} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <span className="font-semibold text-gray-700">{c.user}</span>
                        <span>{formatDistanceToNow(new Date(c.timestamp), { addSuffix: true })}</span>
                      </div>
                      <p className="text-sm text-gray-800">{c.text}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                    placeholder={t('incidents.addComment')}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!commentText.trim()}
                    className="px-4 py-2 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] text-sm font-medium disabled:opacity-40"
                  >
                    {t('common.post')}
                  </button>
                </div>
              </div>
            </div>

            {/* Right column — photos & meta */}
            <div className="space-y-6">
              {/* Before / After Photo Evidence — side by side */}
              {(inc.photos.length > 0 || inc.resolutionPhotos.length > 0) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{t('common.photoEvidence')}</h3>
                  <div className={`grid gap-4 ${inc.photos.length > 0 && inc.resolutionPhotos.length > 0 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
                    {inc.photos.length > 0 && (
                      <div className={inc.resolutionPhotos.length > 0 ? 'sm:border-r sm:border-gray-200 sm:pr-3' : ''}>
                        <span className="text-xs font-semibold uppercase mb-2 block" style={{ color: '#ef4444' }}>{t('incidents.beforeIncident')}</span>
                        <PhotoGallery photos={inc.photos} title="Incident Photos" />
                      </div>
                    )}
                    {inc.resolutionPhotos.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold uppercase mb-2 block" style={{ color: '#22c55e' }}>{t('incidents.afterResolution')}</span>
                        <PhotoGallery photos={inc.resolutionPhotos} title="Resolution Photos" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                <h3 className="font-semibold text-gray-900 mb-3">{t('incidents.details')}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('incidents.incidentId')}</span>
                    <span className="font-mono font-medium text-gray-900">{inc.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('common.reportedBy')}</span>
                    <span className="font-medium text-gray-900">{inc.reportedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('incidents.created')}</span>
                    <span className="font-medium text-gray-900">{format(new Date(inc.createdAt), 'MMM d, h:mm a')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('common.lastUpdated')}</span>
                    <span className="font-medium text-gray-900">{format(new Date(inc.updatedAt), 'MMM d, h:mm a')}</span>
                  </div>
                  {inc.rootCause && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('incidents.rootCause')}</span>
                      <span className="font-medium text-gray-900 capitalize">{rootCauseLabels[inc.rootCause.charAt(0).toUpperCase() + inc.rootCause.slice(1)] || inc.rootCause}</span>
                    </div>
                  )}
                  {resTime && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('incidents.resolutionTime')}</span>
                      <span className="font-semibold text-[#1e4d6b]">{resTime}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Export */}
              <button
                onClick={() => guardAction('export', 'incident reports', () => showToast('PDF export generated for incident ' + inc.id))} // demo
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                {t('incidents.exportToPdf')}
              </button>
            </div>
          </div>
        </div>

        {/* Take Action Modal */}
        {showActionForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-4 sm:p-6 w-[95vw] sm:w-auto max-w-lg sm:w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-900 mb-4">{t('incidents.takeCorrectiveAction')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('incidents.quickActions')}</label>
                  <div className="flex flex-wrap gap-2">
                    {ACTION_CHIPS.map(chip => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setActionChips(prev =>
                          prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
                        )}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          actionChips.includes(chip)
                            ? 'bg-[#1e4d6b] text-white border-[#1e4d6b]'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-[#1e4d6b]'
                        }`}
                      >
                        {actionChipLabels[chip] || chip}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('incidents.whatActionTaken')}
                  </label>
                  <textarea
                    value={actionText}
                    onChange={e => setActionText(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                    placeholder="Describe the corrective action taken..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('incidents.estimatedCompletion')}</label>
                  <select
                    value={estimatedCompletion}
                    onChange={e => setEstimatedCompletion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  >
                    <option value="">Select estimate...</option>
                    <option value="30 minutes">{t('incidents.time30min')}</option>
                    <option value="1 hour">{t('incidents.time1hr')}</option>
                    <option value="2 hours">{t('incidents.time2hr')}</option>
                    <option value="4 hours">{t('incidents.time4hr')}</option>
                    <option value="Same day">{t('incidents.timeSameDay')}</option>
                    <option value="Next day">{t('incidents.timeNextDay')}</option>
                    <option value="2-3 days">{t('incidents.time2to3days')}</option>
                    <option value="1 week">{t('incidents.time1week')}</option>
                  </select>
                </div>
                <PhotoEvidence
                  photos={actionPhotos}
                  onChange={setActionPhotos}
                  label={t('incidents.photoProof')}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowActionForm(false); setActionText(''); setActionChips([]); setActionPhotos([]); setEstimatedCompletion(''); }}
                    className="flex-1 px-4 py-2.5 min-h-[44px] border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleTakeAction}
                    disabled={!actionText.trim()}
                    className="flex-1 px-4 py-2.5 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg text-sm font-bold hover:bg-[#163a52] disabled:opacity-40"
                  >
                    {t('incidents.submitAction')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resolve Modal */}
        {showResolveForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-4 sm:p-6 w-[95vw] sm:w-auto max-w-lg sm:w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-900 mb-4">{t('incidents.resolveIncident')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('incidents.resolutionSummary')}
                  </label>
                  <textarea
                    value={resolutionSummary}
                    onChange={e => setResolutionSummary(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                    placeholder="Summarize how the incident was resolved..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('incidents.rootCause')}</label>
                  <select
                    value={rootCause}
                    onChange={e => setRootCause(e.target.value as RootCause)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  >
                    {ROOT_CAUSES.map(rc => (
                      <option key={rc.value} value={rc.value}>{rootCauseLabels[rc.label] || rc.label}</option>
                    ))}
                  </select>
                </div>
                <PhotoEvidence
                  photos={resolutionPhotos}
                  onChange={setResolutionPhotos}
                  label={t('incidents.afterPhotoRequired')}
                  required
                  highlight
                  highlightText={t('incidents.showTheFix')}
                />
                {resolutionPhotos.length === 0 && (
                  <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={managerPhotoOverride}
                      onChange={(e) => setManagerPhotoOverride(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-[#d4af37] focus:ring-[#d4af37]"
                    />
                    {t('incidents.managerOverride')}
                  </label>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowResolveForm(false); setResolutionSummary(''); setRootCause('unknown'); setResolutionPhotos([]); setManagerPhotoOverride(false); }}
                    className="flex-1 px-4 py-2.5 min-h-[44px] border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleResolve}
                    disabled={!resolutionSummary.trim() || (resolutionPhotos.length === 0 && !managerPhotoOverride)}
                    className="flex-1 px-4 py-2.5 min-h-[44px] bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-40"
                  >
                    {t('incidents.markResolved')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast notification */}
        {toastMessage && (
          <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl shadow-sm text-sm font-medium">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            {toastMessage}
          </div>
        )}
      </>
    );
  }

  // ── Create Incident Modal ──────────────────────────────────────
  const CreateModal = showCreateForm ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-4 sm:p-6 w-[95vw] sm:w-auto max-w-lg sm:w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h3 className="text-xl font-bold text-gray-900">{t('incidents.reportNewIncident')}</h3>
          <button
            onClick={handleAiDraft}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: '#fdf8e8', color: '#b8962f', border: '1px solid #d4af37' }}
          >
            <Sparkles className="h-4 w-4" />
            AI Draft
          </button>
        </div>
        {aiDraftApplied && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-sm" style={{ backgroundColor: '#fdf8e8', border: '1px solid #fde68a', color: '#92400e' }}>
            <Sparkles className="h-4 w-4 flex-shrink-0" style={{ color: '#d4af37' }} />
            <span>AI-generated draft — review and edit before saving</span>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('incidents.incidentType')}</label>
            <select
              value={newType}
              onChange={e => setNewType(e.target.value as IncidentType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            >
              {INCIDENT_TYPES.map(tp => (
                <option key={tp.value} value={tp.value}>{typeLabels[tp.label] || tp.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('incidents.severity')}</label>
            <div className="flex gap-2">
              {SEVERITIES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setNewSeverity(s.value)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all"
                  style={{
                    borderColor: newSeverity === s.value ? s.color : '#e5e7eb',
                    backgroundColor: newSeverity === s.value ? s.bg : 'white',
                    color: newSeverity === s.value ? s.color : '#6b7280',
                  }}
                >
                  {severityLabels[s.label] || s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.location')}</label>
            <select
              value={newLocation}
              onChange={e => setNewLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            >
              {LOCATIONS.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('incidents.titleField')} <span className="text-red-600">*</span>
            </label>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
              placeholder={t('incidents.titlePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('incidents.descriptionField')} <span className="text-red-600">*</span>
            </label>
            <textarea
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
              placeholder={t('incidents.descriptionPlaceholder')}
            />
          </div>
          <PhotoEvidence
            photos={newPhotos}
            onChange={setNewPhotos}
            label={t('incidents.photoOfIncident')}
          />
          <div className="flex gap-3">
            <button
              onClick={() => { setShowCreateForm(false); setNewTitle(''); setNewDescription(''); setNewPhotos([]); setAiDraftApplied(false); }}
              className="flex-1 px-4 py-2.5 min-h-[44px] border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleCreateIncident}
              disabled={!newTitle.trim() || !newDescription.trim()}
              className="flex-1 px-4 py-2.5 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg text-sm font-bold hover:bg-[#163a52] disabled:opacity-40"
            >
              {t('incidents.reportIncident')}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // ── List View ──────────────────────────────────────────────────
  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: t('incidents.title') }]} />
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('incidents.title')}</h1>
            <p className="text-sm text-gray-600 mt-1">{t('incidents.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => guardAction('export', 'incident reports', () => showToast('PDF export of all incidents generated.'))} // demo
              className="flex items-center gap-2 px-4 py-2 min-h-[44px] border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              {t('common.export')}
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] text-sm font-medium shadow-sm"
            >
              <Plus className="h-4 w-4" />
              {t('incidents.reportIncident')}
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5" style={{ borderLeft: '4px solid #dc2626' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-gray-500 font-medium">{t('incidents.openIncidents')}</span>
            </div>
            <div className="text-xl sm:text-3xl font-bold text-red-600 text-center">{openIncidents}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5" style={{ borderLeft: '4px solid #d4af37' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-[#d4af37]" />
              <span className="text-sm text-gray-500 font-medium">{t('incidents.avgResolution')}</span>
            </div>
            <div className="text-xl sm:text-3xl font-bold text-[#d4af37] text-center">{avgResolutionHours}h</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5" style={{ borderLeft: '4px solid #16a34a' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-500 font-medium">{t('incidents.resolvedThisWeek')}</span>
            </div>
            <div className="text-xl sm:text-3xl font-bold text-green-600 text-center">{resolvedThisWeek}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5" style={{ borderLeft: `4px solid ${overdueCount > 0 ? '#dc2626' : '#6b7280'}` }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <XCircle className={`h-4 w-4 ${overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-500 font-medium">{t('incidents.overdueMore24h')}</span>
            </div>
            <div className={`text-xl sm:text-3xl font-bold text-center ${overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{overdueCount}</div>
          </div>
        </div>

        {/* Filters */}
        <div data-demo-allow className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="h-4 w-4 text-gray-400" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
              <option value="all">{t('incidents.allStatus')}</option>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{statusLabels[val.label] || val.label}</option>
              ))}
            </select>
            <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
              <option value="all">{t('incidents.allSeverity')}</option>
              {SEVERITIES.map(s => <option key={s.value} value={s.value}>{severityLabels[s.label] || s.label}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
              <option value="all">{t('incidents.allTypes')}</option>
              {INCIDENT_TYPES.map(tp => <option key={tp.value} value={tp.value}>{typeLabels[tp.label] || tp.label}</option>)}
            </select>
            <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
              <option value="all">{t('common.allLocations')}</option>
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
              <option value="all">{t('incidents.allAssignees')}</option>
              {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={dateRange} onChange={e => setDateRange(e.target.value as any)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
              <option value="all">{t('incidents.allTime')}</option>
              <option value="24h">{t('incidents.last24Hours')}</option>
              <option value="7d">{t('incidents.last7Days')}</option>
              <option value="30d">{t('incidents.last30Days')}</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
              <option value="newest">{t('incidents.newestFirst')}</option>
              <option value="oldest">{t('incidents.oldestFirst')}</option>
              <option value="severity">{t('incidents.bySeverity')}</option>
              <option value="resolution">{t('incidents.byResolutionTime')}</option>
            </select>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#1e4d6b]" />
          </div>
        )}

        {/* Incident Cards */}
        {!loading && <div className="space-y-3">
          {filteredIncidents.map(inc => {
            const typeInfo = INCIDENT_TYPES.find(tp => tp.value === inc.type);
            const TypeIcon = typeInfo?.icon || AlertCircle;
            const overdue = isOverdue(inc);
            const resTime = getResolutionTime(inc);
            return (
              <div
                key={inc.id}
                onClick={() => setSelectedIncident(inc)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer"
                style={overdue ? { borderLeft: '4px solid #dc2626' } : { borderLeft: '4px solid transparent' }}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: SEVERITIES.find(s => s.value === inc.severity)?.bg }}>
                      <TypeIcon className="h-5 w-5" style={{ color: SEVERITIES.find(s => s.value === inc.severity)?.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-gray-400">{inc.id}</span>
                        <SeverityBadge severity={inc.severity} />
                        <StatusBadge status={inc.status} />
                        {overdue && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', color: '#dc2626', backgroundColor: '#fef2f2' }}>
                            {t('common.overdue')}
                          </span>
                        )}
                        {inc.photos.length > 0 && (
                          <span className="flex items-center gap-0.5 text-gray-400">
                            <Camera className="h-3 w-3" />
                            <span style={{ fontSize: '10px' }}>{inc.photos.length}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 mt-1 truncate">{inc.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{inc.location}</span>
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{inc.assignedTo}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(inc.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {resTime && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">{t('incidents.resolvedIn')} {resTime}</span>
                    )}
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </div>
                </div>
              </div>
            );
          })}
          {filteredIncidents.length === 0 && (
            <EmptyState
              icon={AlertTriangle}
              title="No incidents reported"
              description="Your kitchen is running clean. No incidents match your current filters."
            />
          )}
        </div>}
      </div>
      {CreateModal}

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl shadow-sm text-sm font-medium">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {toastMessage}
        </div>
      )}

      {showUpgrade && (
        <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />
      )}
    </>
  );
}
