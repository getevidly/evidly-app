import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, AlertTriangle, Clock, CheckCircle2, XCircle, User, MapPin,
  ChevronDown, ChevronRight, ArrowLeft, Filter, Download, MessageSquare,
  Thermometer, ClipboardList, Bug, Wrench, ShieldAlert, Users as UsersIcon,
  AlertCircle, FileText, Camera, Sparkles, Loader2, CheckCircle,
  BookOpen, PenLine, Shield, X,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Breadcrumb } from '../components/Breadcrumb';
import { Modal } from '../components/ui/Modal';
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
import { AIAssistButton, AIGeneratedIndicator } from '../components/ui/AIAssistButton';
import { GhostInput } from '../components/ai/GhostInput';
import { usePageTitle } from '../hooks/usePageTitle';
import { useRecurringPatterns } from '../hooks/incidents/useRecurringPatterns';
import { useIncidentsPRPStats } from '../hooks/incidents/useIncidentsPRPStats';
import { IncidentsPRPBand } from '../components/incidents/IncidentsPRPBand';
import { IncidentsRecurringBar } from '../components/incidents/IncidentsRecurringBar';
import type { IncidentTemplate, IncidentStatus, IncidentCategory } from '../types/incidents';
import { prp } from '../lib/designSystem';

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
  dbId?: string; // Actual Supabase incidents.id uuid — used for FK writes. id holds the human-readable incident_number.
  category: IncidentCategory;
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
  regulatoryReportRequired?: boolean;
  regulatoryReportFiledAt?: string;
  linkedCorrectiveActionId?: string;
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

// Type → category auto-inference. Types not listed require manual selection.
const TYPE_CATEGORY_MAP: Partial<Record<IncidentType, IncidentCategory>> = {
  temperature_violation: 'food_safety',
  checklist_failure: 'food_safety',
  health_citation: 'food_safety',
  pest_sighting: 'food_safety',
  staff_safety: 'facility_services',
};

const CATEGORY_OPTIONS: { value: IncidentCategory; label: string }[] = [
  { value: 'food_safety', label: 'Food Safety' },
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'facility_services', label: 'Facility Services' },
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

const LOCATIONS = ['Location 1', 'Location 2', 'Location 3']; // demo

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
    category: 'food_safety',
    type: 'temperature_violation',
    severity: 'critical',
    title: 'Walk-in Cooler temperature at 47°F',
    description: 'Walk-in cooler #1 recorded at 47°F during routine check, exceeding the 41°F maximum. All perishable items at risk.',
    location: 'Location 1', // demo
    status: 'in_progress',
    assignedTo: 'Maria Garcia',
    reportedBy: 'John Smith',
    createdAt: h(3),
    updatedAt: h(1),
    sourceType: 'temp_log',
    sourceId: 'TL-4521',
    sourceLabel: 'Temperature Reading #4521 — Walk-in Cooler',
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
    category: 'food_safety',
    type: 'checklist_failure',
    severity: 'major',
    title: 'Closing checklist — floor drains not cleaned',
    description: 'Closing checklist item "Check floor drains" marked as No. Drains visibly clogged with debris.',
    location: 'Location 2', // demo
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
    category: 'food_safety',
    type: 'health_citation',
    severity: 'critical',
    title: 'Health inspector citation — improper food storage',
    description: 'Inspector noted raw chicken stored above ready-to-eat items in prep cooler. Citation #HD-2026-0041 issued.',
    location: 'Location 1', // demo
    status: 'verified',
    assignedTo: 'Maria Garcia',
    reportedBy: 'Sarah Chen',
    createdAt: d(5),
    updatedAt: d(3),
    resolvedAt: d(4),
    verifiedAt: d(3),
    verifiedBy: 'Sarah Chen',
    regulatoryReportRequired: true,
    regulatoryReportFiledAt: d(4),
    linkedCorrectiveActionId: 'CA-003',
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
    category: 'food_safety',
    type: 'equipment_failure',
    severity: 'major',
    title: 'Hot holding unit not reaching 135°F',
    description: 'Hot holding unit #2 stuck at 128°F. Cannot maintain safe hot holding temperature for buffet line.',
    location: 'Location 3', // demo
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
    category: 'food_safety',
    type: 'pest_sighting',
    severity: 'critical',
    title: 'Rodent droppings found in dry storage',
    description: 'Staff found rodent droppings near flour storage in dry goods area. Immediate pest control needed.',
    location: 'Location 2', // demo
    status: 'in_progress',
    assignedTo: 'David Kim',
    reportedBy: 'Maria Garcia',
    createdAt: h(8),
    updatedAt: h(6),
    regulatoryReportRequired: true,
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
    category: 'food_safety',
    type: 'customer_complaint',
    severity: 'minor',
    title: 'Customer reported lukewarm soup',
    description: 'Customer at table 12 complained soup was not hot enough. Server confirmed soup ladle left out, not returned to warmer.',
    location: 'Location 1', // demo
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
    category: 'facility_services',
    type: 'staff_safety',
    severity: 'minor',
    title: 'Wet floor near dishwash station — no sign posted',
    description: 'Wet floor observed near dishwash area without caution signage. Near-miss slip reported by prep cook.',
    location: 'Location 3', // demo
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
    category: 'food_safety',
    type: 'temperature_violation',
    severity: 'major',
    title: 'Prep cooler temp at 44°F during morning check',
    description: 'Prep cooler read 44°F during opening check. Door seal appears worn. Items still safe but at threshold.',
    location: 'Location 2', // demo
    status: 'reported',
    assignedTo: 'Emily Rogers',
    reportedBy: 'John Smith',
    createdAt: h(1),
    updatedAt: h(1),
    sourceType: 'temp_log',
    sourceId: 'TL-4530',
    sourceLabel: 'Temperature Reading #4530 — Prep Cooler',
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
// Incident resolution time feeds into the Operational safety category.
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
  const navigate = useNavigate();
  const { userRole, getAccessibleLocations } = useRole();
  const { t } = useTranslation();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  usePageTitle('Incident Log');
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
  const { user, profile } = useAuth();
  const { isDemoMode } = useDemo();
  const locationOptions = isDemoMode ? LOCATIONS : getAccessibleLocations().map(l => l.locationName);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Org members for name display (live mode only)
  const [orgMembers, setOrgMembers] = useState<{ id: string; full_name: string | null; email: string | null; role: string | null }[]>([]);

  useEffect(() => {
    if (isDemoMode || !profile?.organization_id) return;
    supabase
      .from('user_profiles')
      .select('id, full_name, email, role')
      .eq('organization_id', profile.organization_id)
      .then(({ data }) => { if (data) setOrgMembers(data); });
  }, [isDemoMode, profile?.organization_id]);

  const memberById = useMemo(() => {
    const map: Record<string, string> = {};
    orgMembers.forEach(m => { map[m.id] = m.full_name || m.email || 'Unknown'; });
    return map;
  }, [orgMembers]);

  const displayName = useCallback((uid: string | null | undefined) => {
    if (!uid) return 'Unknown';
    if (memberById[uid]) return memberById[uid];
    return uid; // demo mode: already a name string
  }, [memberById]);

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
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'severity' | 'resolution'>('newest');

  // Create form
  const [newType, setNewType] = useState<IncidentType>('temperature_violation');
  const [newCategory, setNewCategory] = useState<IncidentCategory>(TYPE_CATEGORY_MAP['temperature_violation']!);
  const [newSeverity, setNewSeverity] = useState<Severity>('major');
  const [newLocation, setNewLocation] = useState(locationOptions[0] || '');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPhotos, setNewPhotos] = useState<PhotoRecord[]>([]);
  const [aiDraftApplied, setAiDraftApplied] = useState(false);
  const [newRegulatoryRequired, setNewRegulatoryRequired] = useState(false);

  // Template tab state (D2)
  const [createTab, setCreateTab] = useState<'template' | 'scratch'>('template');
  const [templateCategory, setTemplateCategory] = useState<'all' | 'food_safety' | 'fire_safety' | 'facility_services'>('all');
  const [incidentTemplates, setIncidentTemplates] = useState<IncidentTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Fetch templates when modal opens
  useEffect(() => {
    if (!showCreateForm) return;
    let cancelled = false;
    setTemplatesLoading(true);
    supabase
      .from('incident_templates')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('title', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Error fetching incident templates:', error);
          setIncidentTemplates([]);
        } else {
          setIncidentTemplates((data as IncidentTemplate[]) || []);
        }
        setTemplatesLoading(false);
      });
    return () => { cancelled = true; };
  }, [showCreateForm]);

  // Map template severity (critical|high|medium|low) to modal Severity (critical|major|minor)
  const mapTemplateSeverity = (s: string): Severity => {
    if (s === 'critical') return 'critical';
    if (s === 'high' || s === 'medium') return 'major';
    return 'minor';
  };

  const handleSelectTemplate = (tpl: IncidentTemplate) => {
    setSelectedTemplateId(tpl.id);
    setNewTitle(tpl.title);
    setNewDescription(tpl.description || '');
    setNewSeverity(mapTemplateSeverity(tpl.severity));
    if (tpl.default_incident_type) {
      setNewType(tpl.default_incident_type as IncidentType);
    }
    setCreateTab('scratch');
  };

  const filteredTemplates = templateCategory === 'all'
    ? incidentTemplates
    : incidentTemplates.filter(t => t.category === templateCategory);

  const templateCounts = {
    all: incidentTemplates.length,
    food_safety: incidentTemplates.filter(t => t.category === 'food_safety').length,
    fire_safety: incidentTemplates.filter(t => t.category === 'fire_safety').length,
    facility_services: incidentTemplates.filter(t => t.category === 'facility_services').length,
  };

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
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());

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
        dbId: row.id,
        category: (row.category || 'food_safety') as IncidentCategory,
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
            user: c.author_id || '',
            text: c.comment_text,
            timestamp: c.created_at,
          })),
      }));

      setIncidents(mapped);
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

  // ── PRP signals ──────────────────────────────────────────────
  const recurringPatterns = useRecurringPatterns(incidents);
  const prpStats = useIncidentsPRPStats(incidents, recurringPatterns);

  // Set of incident IDs that belong to any recurring pattern
  const recurringIncidentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of recurringPatterns) {
      for (const id of p.incidentIds) ids.add(id);
    }
    return ids;
  }, [recurringPatterns]);

  // ── Filtered & sorted incidents ────────────────────────────────
  const filteredIncidents = useMemo(() => {
    let list = [...incidents];
    // Role-based filtering: kitchen staff only sees incidents they reported or are assigned to
    if (userRole === 'kitchen_staff') {
      list = list.filter(i => i.reportedBy === (user?.id ?? '') || i.assignedTo === (user?.id ?? ''));
    }
    if (statusFilter !== 'all') list = list.filter(i => i.status === statusFilter);
    if (severityFilter !== 'all') list = list.filter(i => i.severity === severityFilter);
    if (typeFilter !== 'all') list = list.filter(i => i.type === typeFilter);
    if (categoryFilter !== 'all') list = list.filter(i => i.category === categoryFilter);
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
  }, [incidents, statusFilter, severityFilter, typeFilter, categoryFilter, locationFilter, assigneeFilter, dateRange, sortBy]);

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
    const assignee = isDemoMode ? TEAM_MEMBERS[Math.floor(Math.random() * TEAM_MEMBERS.length)] : null;
    const incNumber = `INC-${String(incidents.length + 1).padStart(3, '0')}`;
    const nowIso = new Date().toISOString();

    // Live mode: insert to Supabase
    let insertedDbId: string | undefined;
    if (!isDemoMode && profile?.organization_id) {
      const { data: inserted, error } = await supabase.from('incidents').insert({
        organization_id: profile.organization_id,
        incident_number: incNumber,
        category: newCategory,
        type: newType,
        severity: newSeverity,
        title: newTitle,
        description: newDescription,
        location_name: newLocation,
        status: 'open',
        assigned_to: assignee,
        reported_by: user?.id ?? null,
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
        insertedDbId = inserted.id;
        await supabase.from('incident_timeline').insert([
          { incident_id: inserted.id, action: 'Incident reported', status: 'open', performed_by: user?.id ?? null },
          { incident_id: inserted.id, action: 'Auto-assigned to location manager', status: 'open', performed_by: 'System' },
        ]);
      }
    }

    const newIncident: Incident = {
      id: incNumber,
      dbId: insertedDbId,
      category: newCategory,
      type: newType,
      severity: newSeverity,
      title: newTitle,
      description: newDescription,
      location: newLocation,
      status: 'open',
      assignedTo: assignee ?? '',
      reportedBy: user?.id ?? '',
      createdAt: nowIso,
      updatedAt: nowIso,
      regulatoryReportRequired: newRegulatoryRequired || undefined,
      photos: newPhotos,
      resolutionPhotos: [],
      timeline: [
        { id: `t-${Date.now()}`, action: 'Incident reported', status: 'reported', user: user?.id ?? '', timestamp: nowIso },
        { id: `t-${Date.now() + 1}`, action: 'Auto-assigned to location manager', status: 'assigned', user: 'System', timestamp: nowIso },
      ],
      comments: [],
    };
    setIncidents(prev => [newIncident, ...prev]);
    setShowCreateForm(false);
    setNewTitle(''); setNewDescription(''); setNewPhotos([]); setAiDraftApplied(false); setNewRegulatoryRequired(false); setNewCategory(TYPE_CATEGORY_MAP[newType] ?? 'food_safety');
    setSelectedIncident(newIncident);
    showToast('Incident reported successfully.');
  };

  const handleTakeAction = async () => {
    if (!selectedIncident || !actionText.trim()) return;
    const updated = { ...selectedIncident };
    updated.status = 'investigating';
    updated.correctiveAction = actionText;
    updated.actionChips = actionChips;
    updated.updatedAt = new Date().toISOString();
    const estLabel = estimatedCompletion ? ` (est. completion: ${estimatedCompletion})` : '';
    updated.timeline = [...updated.timeline, {
      id: `t-${Date.now()}`,
      action: `Corrective action: ${actionText}${estLabel}`,
      status: 'investigating',
      user: user?.id ?? '',
      timestamp: new Date().toISOString(),
      photos: actionPhotos.length > 0 ? actionPhotos : undefined,
    }];

    if (!isDemoMode && profile?.organization_id) {
      if (!selectedIncident.dbId) {
        console.error('[IncidentLog] Missing dbId on incident in live mode — write skipped', selectedIncident);
        return;
      }
      await supabase.from('incidents').update({
        status: 'investigating',
        corrective_action: actionText,
        action_chips: actionChips,
        updated_at: new Date().toISOString(),
      }).eq('incident_number', selectedIncident.id).eq('organization_id', profile.organization_id);

      await supabase.from('incident_timeline').insert({
        incident_id: selectedIncident.dbId,
        action: `Corrective action: ${actionText}${estLabel}`,
        status: 'investigating',
        performed_by: user?.id ?? null,
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
      user: user?.id ?? '',
      timestamp: nowIso,
      photos: resolutionPhotos.length > 0 ? resolutionPhotos : undefined,
    }];

    if (!isDemoMode && profile?.organization_id) {
      if (!selectedIncident.dbId) {
        console.error('[IncidentLog] Missing dbId on incident in live mode — write skipped', selectedIncident);
        return;
      }
      await supabase.from('incidents').update({
        status: 'resolved',
        resolved_at: nowIso,
        resolution_summary: resolutionSummary,
        root_cause: rootCause,
        resolution_photos: resolutionPhotos,
        updated_at: nowIso,
      }).eq('incident_number', selectedIncident.id).eq('organization_id', profile.organization_id);

      await supabase.from('incident_timeline').insert({
        incident_id: selectedIncident.dbId,
        action: `Resolved: ${resolutionSummary}`,
        status: 'resolved',
        performed_by: user?.id ?? null,
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
      updated.verifiedBy = user?.id ?? '';
      updated.updatedAt = nowIso;
      updated.timeline = [...updated.timeline, {
        id: `t-${Date.now()}`,
        action: 'Resolution verified and approved',
        status: 'verified',
        user: user?.id ?? '',
        timestamp: new Date().toISOString(),
      }];
    } else {
      updated.status = 'investigating';
      updated.resolvedAt = undefined;
      updated.updatedAt = new Date().toISOString();
      updated.timeline = [...updated.timeline, {
        id: `t-${Date.now()}`,
        action: 'Resolution rejected — sent back for additional action',
        status: 'investigating',
        user: user?.id ?? '',
        timestamp: new Date().toISOString(),
      }];
    }

    if (!isDemoMode && profile?.organization_id) {
      if (!selectedIncident.dbId) {
        console.error('[IncidentLog] Missing dbId on incident in live mode — write skipped', selectedIncident);
        return;
      }
      if (approved) {
        await supabase.from('incidents').update({
          status: 'verified',
          verified_at: nowIso,
          verified_by: user?.id ?? null,
          updated_at: nowIso,
        }).eq('incident_number', selectedIncident.id).eq('organization_id', profile.organization_id);

        await supabase.from('incident_timeline').insert({
          incident_id: selectedIncident.dbId,
          action: 'Resolution verified and approved',
          status: 'verified',
          performed_by: user?.id ?? null,
        });
      } else {
        await supabase.from('incidents').update({
          status: 'investigating',
          resolved_at: null,
          updated_at: nowIso,
        }).eq('incident_number', selectedIncident.id).eq('organization_id', profile.organization_id);

        await supabase.from('incident_timeline').insert({
          incident_id: selectedIncident.dbId,
          action: 'Resolution rejected — sent back for additional action',
          status: 'investigating',
          performed_by: user?.id ?? null,
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
      user: user?.id ?? '',
      text: commentText,
      timestamp: new Date().toISOString(),
    }];

    if (!isDemoMode && profile?.organization_id) {
      if (!selectedIncident.dbId) {
        console.error('[IncidentLog] Missing dbId on incident in live mode — write skipped', selectedIncident);
        return;
      }
      await supabase.from('incident_comments').insert({
        incident_id: selectedIncident.dbId,
        author_id: user?.id ?? null,
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
              className="flex items-center gap-1 text-sm text-[#1E2D4D] hover:underline mb-3 min-h-[44px]"
            >
              <ArrowLeft className="h-4 w-4" /> {t('incidents.backToIncidentLog')}
            </button>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold tracking-tight text-[#1E2D4D]">{inc.id}</h1>
                  <SeverityBadge severity={inc.severity} />
                  <StatusBadge status={inc.status} />
                  {overdue && (
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', color: '#dc2626', backgroundColor: '#fef2f2' }}>
                      {t('common.overdue')}
                    </span>
                  )}
                </div>
                <h2 className="text-lg text-[#1E2D4D]/80">{inc.title}</h2>
              </div>
              <div className="flex gap-2 flex-wrap">
                {inc.status === 'open' && (
                  <button
                    onClick={() => setShowActionForm(true)}
                    className="px-4 py-2 min-h-[44px] bg-[#1E2D4D] text-white rounded-lg hover:bg-[#162340] text-sm font-medium"
                  >
                    {t('incidents.takeAction')}
                  </button>
                )}
                {inc.status === 'investigating' && (
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
                      className="px-4 py-2 min-h-[44px] bg-red-50 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
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
              <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-[#1E2D4D]/50 block">{t('common.type')}</span>
                    <span className="font-medium text-[#1E2D4D]">{typeLabels[INCIDENT_TYPES.find(tp => tp.value === inc.type)?.label || ''] || INCIDENT_TYPES.find(tp => tp.value === inc.type)?.label}</span>
                  </div>
                  <div>
                    <span className="text-[#1E2D4D]/50 block">{t('common.location')}</span>
                    <span className="font-medium text-[#1E2D4D] flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{inc.location}</span>
                  </div>
                  <div>
                    <span className="text-[#1E2D4D]/50 block">{t('common.assignedTo')}</span>
                    <span className="font-medium text-[#1E2D4D] flex items-center gap-1"><User className="h-3.5 w-3.5" />{displayName(inc.assignedTo)}</span>
                  </div>
                  <div>
                    <span className="text-[#1E2D4D]/50 block">{t('incidents.reported')}</span>
                    <span className="font-medium text-[#1E2D4D]">{formatDistanceToNow(new Date(inc.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[#1E2D4D]/50 text-sm block mb-1">{t('common.description')}</span>
                  <p className="text-[#1E2D4D]/90">{inc.description}</p>
                </div>
                {inc.sourceLabel && (
                  <div className="flex items-center gap-2 text-sm bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-800">{t('incidents.linked')} {inc.sourceLabel}</span>
                  </div>
                )}
                {/* Regulatory Report Flag */}
                {inc.regulatoryReportRequired && (
                  <div className={`flex items-center justify-between text-sm rounded-lg p-3 border ${inc.regulatoryReportFiledAt ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-300'}`}>
                    <div className="flex items-center gap-2">
                      <ShieldAlert className={`h-4 w-4 ${inc.regulatoryReportFiledAt ? 'text-green-600' : 'text-red-600'}`} />
                      <span className={`font-semibold ${inc.regulatoryReportFiledAt ? 'text-green-800' : 'text-red-800'}`}>
                        Regulatory Report {inc.regulatoryReportFiledAt ? 'Filed' : 'Required'}
                      </span>
                    </div>
                    {inc.regulatoryReportFiledAt ? (
                      <span className="text-xs text-green-700">Filed {format(new Date(inc.regulatoryReportFiledAt), 'MMM d, yyyy')}</span>
                    ) : (
                      <button
                        onClick={() => {
                          guardAction('file_report', 'Incident Reports', () => {
                            const updated = { ...inc, regulatoryReportFiledAt: new Date().toISOString() };
                            setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
                            setSelectedIncident(updated);
                            showToast('Regulatory report marked as filed.');
                          });
                        }}
                        className="text-xs font-semibold text-red-700 hover:text-red-900 underline"
                      >
                        Mark as Filed
                      </button>
                    )}
                  </div>
                )}
                {/* Linked Corrective Action */}
                {inc.linkedCorrectiveActionId && (
                  <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <ClipboardList className="h-4 w-4 text-amber-600" />
                    <span className="text-amber-800">
                      Linked Corrective Action: <button onClick={() => navigate('/corrective-actions')} className="font-semibold underline hover:text-amber-900">{inc.linkedCorrectiveActionId}</button>
                    </span>
                  </div>
                )}
                {/* Create Corrective Action from Incident */}
                {!inc.linkedCorrectiveActionId && inc.status !== 'verified' && (
                  <button
                    onClick={() => {
                      guardAction('create_ca', 'Corrective Actions', () => {
                        const caId = `CA-${String(Math.floor(Math.random() * 900) + 100)}`;
                        const updated = { ...inc, linkedCorrectiveActionId: caId };
                        setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
                        setSelectedIncident(updated);
                        showToast(`Corrective action ${caId} created from incident ${inc.id}`);
                      });
                    }}
                    className="flex items-center gap-2 text-sm font-medium text-[#1E2D4D] hover:underline"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Create Corrective Action from this Incident
                  </button>
                )}
                {inc.correctiveAction && (
                  <div>
                    <span className="text-[#1E2D4D]/50 text-sm block mb-1">{t('common.correctiveAction')}</span>
                    <p className="text-[#1E2D4D]/90">{inc.correctiveAction}</p>
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
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <span className="text-green-800 text-sm font-semibold block mb-1">{t('incidents.resolution')}</span>
                    <p className="text-green-900 text-sm">{inc.resolutionSummary}</p>
                    {inc.rootCause && (
                      <p className="text-green-700 text-xs mt-1">{t('incidents.rootCause')}: <span className="font-medium capitalize">{rootCauseLabels[inc.rootCause.charAt(0).toUpperCase() + inc.rootCause.slice(1)] || inc.rootCause}</span></p>
                    )}
                  </div>
                )}
                {resTime && (
                  <div className="flex items-center gap-2 text-sm text-[#1E2D4D]/70">
                    <Clock className="h-4 w-4 text-[#A08C5A]" />
                    {t('incidents.resolvedIn')} <span className="font-semibold text-[#1E2D4D]">{resTime}</span>
                  </div>
                )}
                {inc.verifiedBy && (
                  <div className="flex items-center gap-2 text-sm bg-green-50 border border-green-200 rounded-xl p-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-green-800">
                      {t('incidents.verifiedBy')} <span className="font-semibold">{displayName(inc.verifiedBy)}</span> {t('incidents.on')} {format(new Date(inc.verifiedAt!), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5">
                <h3 className="text-lg font-bold text-[#1E2D4D] mb-4">{t('incidents.timeline')}</h3>
                <div className="relative pl-6">
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-[#1E2D4D]/8" />
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
                          <p className="text-sm font-medium text-[#1E2D4D]">{entry.action}</p>
                          <div className="flex items-center gap-3 text-xs text-[#1E2D4D]/50 mt-1">
                            <span className="flex items-center gap-1"><User className="h-3 w-3" />{displayName(entry.user)}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(entry.timestamp), 'MMM d, h:mm a')}</span>
                          </div>
                          {entry.photos && entry.photos.length > 0 && (
                            <div className="mt-2 flex gap-2">
                              {entry.photos.map(p => (
                                <img key={p.id} src={p.dataUrl} alt="" loading="lazy" className="w-12 h-12 rounded object-cover border" />
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
              <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5">
                <h3 className="text-lg font-bold text-[#1E2D4D] mb-4">{t('incidents.comments')}</h3>
                {inc.comments.length === 0 && (
                  <p className="text-sm text-[#1E2D4D]/30">{t('incidents.noComments')}</p>
                )}
                <div className="space-y-3 mb-4">
                  {inc.comments.map(c => (
                    <div key={c.id} className="border border-[#1E2D4D]/5 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-xs text-[#1E2D4D]/50 mb-1">
                        <span className="font-semibold text-[#1E2D4D]/80">{displayName(c.user)}</span>
                        <span>{formatDistanceToNow(new Date(c.timestamp), { addSuffix: true })}</span>
                      </div>
                      <p className="text-sm text-[#1E2D4D]/90">{c.text}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                    className="flex-1 px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                    placeholder={t('incidents.addComment')}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!commentText.trim()}
                    className="px-4 py-2 min-h-[44px] bg-[#1E2D4D] text-white rounded-lg hover:bg-[#162340] text-sm font-medium disabled:opacity-40"
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
                <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5">
                  <h3 className="text-lg font-bold text-[#1E2D4D] mb-3">{t('common.photoEvidence')}</h3>
                  <div className={`grid gap-4 ${inc.photos.length > 0 && inc.resolutionPhotos.length > 0 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
                    {inc.photos.length > 0 && (
                      <div className={inc.resolutionPhotos.length > 0 ? 'sm:border-r sm:border-[#1E2D4D]/10 sm:pr-3' : ''}>
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
              <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5">
                <h3 className="font-semibold text-[#1E2D4D] mb-3">{t('incidents.details')}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#1E2D4D]/50">{t('incidents.incidentId')}</span>
                    <span className="font-mono font-medium text-[#1E2D4D]">{inc.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#1E2D4D]/50">{t('common.reportedBy')}</span>
                    <span className="font-medium text-[#1E2D4D]">{displayName(inc.reportedBy)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#1E2D4D]/50">{t('incidents.created')}</span>
                    <span className="font-medium text-[#1E2D4D]">{format(new Date(inc.createdAt), 'MMM d, h:mm a')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#1E2D4D]/50">{t('common.lastUpdated')}</span>
                    <span className="font-medium text-[#1E2D4D]">{format(new Date(inc.updatedAt), 'MMM d, h:mm a')}</span>
                  </div>
                  {inc.rootCause && (
                    <div className="flex justify-between">
                      <span className="text-[#1E2D4D]/50">{t('incidents.rootCause')}</span>
                      <span className="font-medium text-[#1E2D4D] capitalize">{rootCauseLabels[inc.rootCause.charAt(0).toUpperCase() + inc.rootCause.slice(1)] || inc.rootCause}</span>
                    </div>
                  )}
                  {resTime && (
                    <div className="flex justify-between">
                      <span className="text-[#1E2D4D]/50">{t('incidents.resolutionTime')}</span>
                      <span className="font-semibold text-[#1E2D4D]">{resTime}</span>
                    </div>
                  )}
                  {inc.regulatoryReportRequired && (
                    <div className="flex justify-between">
                      <span className="text-[#1E2D4D]/50">Regulatory Report</span>
                      <span className={`font-medium ${inc.regulatoryReportFiledAt ? 'text-green-600' : 'text-red-600'}`}>
                        {inc.regulatoryReportFiledAt ? 'Filed' : 'Required'}
                      </span>
                    </div>
                  )}
                  {inc.linkedCorrectiveActionId && (
                    <div className="flex justify-between">
                      <span className="text-[#1E2D4D]/50">Corrective Action</span>
                      <span className="font-medium text-[#1E2D4D]">{inc.linkedCorrectiveActionId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Export */}
              <button
                onClick={() => guardAction('export', 'incident reports', () => showToast('PDF export generated for incident ' + inc.id))} // demo
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] border-2 border-[#1E2D4D]/10 rounded-lg text-sm font-medium text-[#1E2D4D]/80 hover:bg-[#FAF7F0]"
              >
                <Download className="h-4 w-4" />
                {t('incidents.exportToPdf')}
              </button>
            </div>
          </div>
        </div>

        {/* Take Action Modal */}
        {showActionForm && (
          <Modal isOpen onClose={() => { setShowActionForm(false); setActionText(''); setActionChips([]); setActionPhotos([]); setEstimatedCompletion(''); }} size="lg">
            <div className="p-4 sm:p-6">
              <h3 className="text-xl font-bold text-[#1E2D4D] mb-4">{t('incidents.takeCorrectiveAction')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">{t('incidents.quickActions')}</label>
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
                            ? 'bg-[#1E2D4D] text-white border-[#1E2D4D]'
                            : 'bg-white text-[#1E2D4D]/80 border-[#1E2D4D]/15 hover:border-[#1E2D4D]'
                        }`}
                      >
                        {actionChipLabels[chip] || chip}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-[#1E2D4D]/80">
                      {t('incidents.whatActionTaken')}
                    </label>
                    <AIAssistButton
                      fieldLabel="What Action Taken"
                      context={{ title: inc.title, severity: inc.severity }}
                      currentValue={actionText}
                      onGenerated={(text) => { setActionText(text); setAiFields(prev => new Set(prev).add('actionText')); }}
                    />
                  </div>
                  <textarea
                    value={actionText}
                    onChange={e => { setActionText(e.target.value); setAiFields(prev => { const s = new Set(prev); s.delete('actionText'); return s; }); }}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                    placeholder="Describe the corrective action taken..."
                  />
                  {aiFields.has('actionText') && <AIGeneratedIndicator />}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">{t('incidents.estimatedCompletion')}</label>
                  <select
                    value={estimatedCompletion}
                    onChange={e => setEstimatedCompletion(e.target.value)}
                    className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
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
                    className="flex-1 px-4 py-2.5 min-h-[44px] border-2 border-[#1E2D4D]/15 rounded-lg text-sm font-medium text-[#1E2D4D]/80 hover:bg-[#FAF7F0]"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleTakeAction}
                    disabled={!actionText.trim()}
                    className="flex-1 px-4 py-2.5 min-h-[44px] bg-[#1E2D4D] text-white rounded-lg text-sm font-bold hover:bg-[#162340] disabled:opacity-40"
                  >
                    {t('incidents.submitAction')}
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Resolve Modal */}
        {showResolveForm && (
          <Modal isOpen onClose={() => setShowResolveForm(false)} size="lg">
            <div className="p-4 sm:p-6">
              <h3 className="text-xl font-bold text-[#1E2D4D] mb-4">{t('incidents.resolveIncident')}</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-[#1E2D4D]/80">
                      {t('incidents.resolutionSummary')}
                    </label>
                    <AIAssistButton
                      fieldLabel="Resolution Summary"
                      context={{ title: inc.title, description: inc.description }}
                      currentValue={resolutionSummary}
                      onGenerated={(text) => { setResolutionSummary(text); setAiFields(prev => new Set(prev).add('resolutionSummary')); }}
                    />
                  </div>
                  <textarea
                    value={resolutionSummary}
                    onChange={e => { setResolutionSummary(e.target.value); setAiFields(prev => { const s = new Set(prev); s.delete('resolutionSummary'); return s; }); }}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                    placeholder="Summarize how the incident was resolved..."
                  />
                  {aiFields.has('resolutionSummary') && <AIGeneratedIndicator />}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">{t('incidents.rootCause')}</label>
                  <select
                    value={rootCause}
                    onChange={e => setRootCause(e.target.value as RootCause)}
                    className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
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
                  <label className="flex items-center gap-2 text-xs text-[#1E2D4D]/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={managerPhotoOverride}
                      onChange={(e) => setManagerPhotoOverride(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#1E2D4D]/15 text-[#A08C5A] focus:ring-[#A08C5A]"
                    />
                    {t('incidents.managerOverride')}
                  </label>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowResolveForm(false); setResolutionSummary(''); setRootCause('unknown'); setResolutionPhotos([]); setManagerPhotoOverride(false); }}
                    className="flex-1 px-4 py-2.5 min-h-[44px] border-2 border-[#1E2D4D]/15 rounded-lg text-sm font-medium text-[#1E2D4D]/80 hover:bg-[#FAF7F0]"
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
          </Modal>
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
  const resetCreateForm = () => {
    setShowCreateForm(false);
    setNewTitle('');
    setNewDescription('');
    setNewPhotos([]);
    setAiDraftApplied(false);
    setNewRegulatoryRequired(false);
    setCreateTab('template');
    setTemplateCategory('all');
    setSelectedTemplateId(null);
  };

  const CATEGORY_LABELS: Record<'food_safety' | 'fire_safety' | 'facility_services', string> = {
    food_safety: 'Food Safety',
    fire_safety: 'Fire Safety',
    facility_services: 'Facility Services',
  };

  const SEVERITY_PILL: Record<string, { label: string; color: string; bg: string; border: string }> = {
    critical: { label: 'CRITICAL', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    high:     { label: 'HIGH',     color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    medium:   { label: 'MEDIUM',   color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    low:      { label: 'LOW',      color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
  };

  const CreateModal = (
    <Modal isOpen={!!showCreateForm} onClose={resetCreateForm} size="lg" className="flex flex-col">
      {/* Modal header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4D]/10 flex-shrink-0">
        <h2 className="text-lg font-bold text-[#1E2D4D]">Report New Incident</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAiDraft}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: '#fdf8e8', color: '#b8962f', border: '1px solid #A08C5A' }}
          >
            <Sparkles className="h-4 w-4" />
            AI Draft
          </button>
          <button onClick={resetCreateForm} className="text-[#1E2D4D]/30 hover:text-[#1E2D4D]/70">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex flex-shrink-0 border-b border-[#1E2D4D]/10 px-6">
        <button
          type="button"
          onClick={() => setCreateTab('template')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            createTab === 'template'
              ? 'border-[#1E2D4D] text-[#1E2D4D] font-semibold'
              : 'border-transparent text-[#1E2D4D]/50 hover:text-[#1E2D4D]/80'
          }`}
        >
          <BookOpen size={14} />
          From Template
        </button>
        <button
          type="button"
          onClick={() => setCreateTab('scratch')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            createTab === 'scratch'
              ? 'border-[#1E2D4D] text-[#1E2D4D] font-semibold'
              : 'border-transparent text-[#1E2D4D]/50 hover:text-[#1E2D4D]/80'
          }`}
        >
          <PenLine size={14} />
          From Scratch
        </button>
      </div>

      {/* Modal body */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
        {createTab === 'template' ? (
          <div className="space-y-4">
            {/* Category chips */}
            <div className="flex flex-wrap gap-2">
              {(['all', 'food_safety', 'fire_safety', 'facility_services'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setTemplateCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    templateCategory === cat
                      ? 'text-white'
                      : 'text-[#1E2D4D]/70 bg-[#1E2D4D]/5 hover:bg-[#1E2D4D]/10'
                  }`}
                  style={templateCategory === cat ? { backgroundColor: '#1E2D4D' } : undefined}
                >
                  {cat === 'all' ? 'All Templates' : CATEGORY_LABELS[cat]}
                  <span className="ml-1 opacity-70">({templateCounts[cat]})</span>
                </button>
              ))}
            </div>

            {/* Template grid */}
            {templatesLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-[#1E2D4D]/50">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading templates...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-sm text-[#1E2D4D]/50">
                No templates in this category yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto">
                {filteredTemplates.map(tpl => {
                  const sev = SEVERITY_PILL[tpl.severity] || SEVERITY_PILL.medium;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl)}
                      className="text-left p-3 rounded-xl border border-[#1E2D4D]/10 hover:border-[#1E2D4D]/15 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-[#1E2D4D] truncate">{tpl.title}</h4>
                            <span
                              className="text-xs font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0"
                              style={{ color: sev.color, backgroundColor: sev.bg, border: `1px solid ${sev.border}` }}
                            >
                              {sev.label}
                            </span>
                          </div>
                          {tpl.description && (
                            <p className="text-xs text-[#1E2D4D]/50 line-clamp-1">{tpl.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-[#1E2D4D]/30">
                            {tpl.regulation_reference && (
                              <span className="flex items-center gap-1">
                                <Shield size={10} />
                                {tpl.regulation_reference}
                              </span>
                            )}
                            {tpl.recommended_timeframe_days != null && (
                              <span>{tpl.recommended_timeframe_days}d timeframe</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-[#1E2D4D]/30 shrink-0 mt-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* From Scratch / Form view */
          <div className="space-y-4">
            {selectedTemplateId && (
              <div className="flex items-center justify-between text-xs bg-indigo-50 px-3 py-2 rounded-lg">
                <div className="flex items-center gap-2 text-[#1E2D4D]/70">
                  <BookOpen size={12} className="text-indigo-500" />
                  Using template: <span className="font-semibold text-[#1E2D4D]">{newTitle}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedTemplateId(null); setCreateTab('template'); }}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Change
                </button>
              </div>
            )}

            {aiDraftApplied && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: '#fdf8e8', border: '1px solid #fde68a', color: '#92400e' }}>
                <Sparkles className="h-4 w-4 flex-shrink-0" style={{ color: '#A08C5A' }} />
                <span>AI-generated draft — review and edit before saving</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">{t('incidents.incidentType')}</label>
              <select
                value={newType}
                onChange={e => {
                  const t = e.target.value as IncidentType;
                  setNewType(t);
                  const inferred = TYPE_CATEGORY_MAP[t];
                  if (inferred) setNewCategory(inferred);
                }}
                className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
              >
                {INCIDENT_TYPES.map(tp => (
                  <option key={tp.value} value={tp.value}>{typeLabels[tp.label] || tp.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">
                Category <span className="text-red-600">*</span>
              </label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as IncidentCategory)}
                disabled={!!TYPE_CATEGORY_MAP[newType]}
                className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A] disabled:bg-gray-50 disabled:text-[#1E2D4D]/50"
              >
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {TYPE_CATEGORY_MAP[newType] && (
                <p className="text-xs text-[#1E2D4D]/40 mt-1">Auto-assigned from incident type</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">{t('incidents.severity')}</label>
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
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">{t('common.location')}</label>
              <select
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
              >
                {locationOptions.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">
                {t('incidents.titleField')} <span className="text-red-600">*</span>
              </label>
              <GhostInput
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                placeholder={t('incidents.titlePlaceholder')}
                fieldLabel="Incident Title"
                formContext={{ incidentType: newType || '', severity: newSeverity || '' }}
                entityType="incident"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-[#1E2D4D]/80">
                  {t('incidents.descriptionField')} <span className="text-red-600">*</span>
                </label>
                <AIAssistButton
                  fieldLabel="Description"
                  context={{ title: newTitle, severity: newSeverity, location: newLocation }}
                  currentValue={newDescription}
                  onGenerated={(text) => { setNewDescription(text); setAiFields(prev => new Set(prev).add('newDescription')); }}
                />
              </div>
              <textarea
                value={newDescription}
                onChange={e => { setNewDescription(e.target.value); setAiFields(prev => { const s = new Set(prev); s.delete('newDescription'); return s; }); }}
                rows={3}
                className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                placeholder={t('incidents.descriptionPlaceholder')}
              />
              {aiFields.has('newDescription') && <AIGeneratedIndicator />}
            </div>

            <PhotoEvidence
              photos={newPhotos}
              onChange={setNewPhotos}
              label={t('incidents.photoOfIncident')}
            />

            <label className="flex items-start gap-3 p-3 border border-[#1E2D4D]/10 rounded-xl cursor-pointer hover:bg-[#FAF7F0]">
              <input
                type="checkbox"
                checked={newRegulatoryRequired}
                onChange={e => setNewRegulatoryRequired(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#1E2D4D]/15 text-red-600 focus:ring-red-500"
              />
              <div>
                <span className="text-sm font-medium text-[#1E2D4D]/80">Requires regulatory report</span>
                <p className="text-xs text-[#1E2D4D]/50 mt-0.5">Check if this incident requires notification to health department or AHJ</p>
              </div>
            </label>

            <button
              onClick={handleCreateIncident}
              disabled={!newTitle.trim() || !newDescription.trim()}
              className="w-full px-4 py-2.5 min-h-[44px] bg-[#1E2D4D] text-white rounded-lg text-sm font-medium hover:bg-[#162340] disabled:opacity-40"
            >
              {t('incidents.reportIncident')}
            </button>
          </div>
        )}
      </div>

      {/* Persistent footer — Cancel always visible regardless of active tab */}
      <div className="flex justify-end px-6 py-3 border-t border-[#1E2D4D]/10 flex-shrink-0">
        <button
          type="button"
          onClick={resetCreateForm}
          className="text-sm text-[#1E2D4D]/60 hover:text-[#1E2D4D] px-3 py-1"
        >
          {t('common.cancel')}
        </button>
      </div>
    </Modal>
  );

  // ── List View ──────────────────────────────────────────────────
  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: t('incidents.title') }]} />
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1E2D4D]">{t('incidents.title')}</h1>
            <p className="text-[11px] text-[#8A93A6] mt-1">
              <span className="font-semibold" style={{ color: '#1E2D4D' }}>Predict</span> what's escalating.{' '}
              <span className="font-semibold" style={{ color: '#1E2D4D' }}>Reduce</span> open exposure.{' '}
              <span className="font-semibold" style={{ color: '#1E2D4D' }}>Prove</span> every resolution.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => guardAction('export', 'incident reports', () => showToast('PDF export of all incidents generated.'))} // demo
              className="flex items-center gap-2 px-4 py-2 min-h-[44px] border-2 border-[#1E2D4D]/10 rounded-lg text-sm font-medium text-[#1E2D4D]/80 hover:bg-[#FAF7F0]"
            >
              <Download className="h-4 w-4" />
              {t('common.export')}
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-[#1E2D4D] text-white rounded-lg hover:bg-[#162340] text-sm font-medium shadow-sm"
            >
              <Plus className="h-4 w-4" />
              {t('incidents.reportIncident')}
            </button>
          </div>
        </div>

        {/* PRP Band */}
        <IncidentsPRPBand
          stats={prpStats}
          loading={loading}
          onFilterPredict={() => {
            setStatusFilter('all');
            setSeverityFilter('all');
            setTypeFilter('all');
            setCategoryFilter('all');
            setLocationFilter('all');
            setAssigneeFilter('all');
            setDateRange('all');
            setSortBy('oldest');
          }}
          onFilterProve={() => {
            setStatusFilter('resolved');
            setSeverityFilter('all');
            setTypeFilter('all');
            setCategoryFilter('all');
            setLocationFilter('all');
            setAssigneeFilter('all');
            setDateRange('7d');
            setSortBy('newest');
          }}
        />

        {/* Filters — hidden when zero incidents exist */}
        {incidents.length > 0 && <div data-demo-allow className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="h-4 w-4 text-[#1E2D4D]/30" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-1.5 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]">
              <option value="all">{t('incidents.allStatus')}</option>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{statusLabels[val.label] || val.label}</option>
              ))}
            </select>
            <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="px-3 py-1.5 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]">
              <option value="all">{t('incidents.allSeverity')}</option>
              {SEVERITIES.map(s => <option key={s.value} value={s.value}>{severityLabels[s.label] || s.label}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-1.5 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]">
              <option value="all">{t('incidents.allTypes')}</option>
              {INCIDENT_TYPES.map(tp => <option key={tp.value} value={tp.value}>{typeLabels[tp.label] || tp.label}</option>)}
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-1.5 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]">
              <option value="all">All Categories</option>
              {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="px-3 py-1.5 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]">
              <option value="all">{t('common.allLocations')}</option>
              {locationOptions.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} className="px-3 py-1.5 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]">
              <option value="all">{t('incidents.allAssignees')}</option>
              {isDemoMode
                ? TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)
                : orgMembers.map(m => <option key={m.id} value={m.id}>{m.full_name || m.email || 'Unknown'}</option>)
              }
            </select>
            <select value={dateRange} onChange={e => setDateRange(e.target.value as any)} className="px-3 py-1.5 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]">
              <option value="all">{t('incidents.allTime')}</option>
              <option value="24h">{t('incidents.last24Hours')}</option>
              <option value="7d">{t('incidents.last7Days')}</option>
              <option value="30d">{t('incidents.last30Days')}</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-1.5 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]">
              <option value="newest">{t('incidents.newestFirst')}</option>
              <option value="oldest">{t('incidents.oldestFirst')}</option>
              <option value="severity">{t('incidents.bySeverity')}</option>
              <option value="resolution">{t('incidents.byResolutionTime')}</option>
            </select>
          </div>
        </div>}

        {/* Recurring pattern callouts */}
        {incidents.length > 0 && (
          <IncidentsRecurringBar patterns={recurringPatterns} />
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#1E2D4D]" />
          </div>
        )}

        {/* Incident Cards */}
        {!loading && (() => {
          // True empty state: zero incidents in the system
          if (incidents.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(47,122,77,0.1)' }}>
                  <CheckCircle className="w-7 h-7" style={{ color: '#2f7a4d' }} />
                </div>
                <h3 className="text-lg font-semibold text-[#1E2D4D] mb-1">No incidents reported</h3>
                <p className="text-sm font-semibold mb-3" style={{ color: '#2f7a4d' }}>Your kitchen is running clean.</p>
                <p className="text-[13px] text-[#1E2D4D]/50 max-w-[480px] mb-6 leading-relaxed">
                  When something does happen, EvidLY identifies risk signals early and keeps the resolution record together.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 max-w-[720px] w-full mb-6">
                  <div className="bg-white border border-[#E2DDD4] rounded-lg p-3 text-left" style={{ borderTop: `3px solid ${prp.predict.accent}` }}>
                    <div className="text-[10px] uppercase font-bold tracking-[0.12em]" style={{ color: prp.predict.accent }}>PREDICT</div>
                    <p className="text-[11px] text-[#6B7F96] mt-1">Recurring patterns and aging incidents get flagged before they become citations.</p>
                  </div>
                  <div className="bg-white border border-[#E2DDD4] rounded-lg p-3 text-left" style={{ borderTop: `3px solid ${prp.reduce.accent}` }}>
                    <div className="text-[10px] uppercase font-bold tracking-[0.12em]" style={{ color: prp.reduce.accent }}>REDUCE</div>
                    <p className="text-[11px] text-[#6B7F96] mt-1">Open-incident exposure stays visible until resolved and documented.</p>
                  </div>
                  <div className="bg-white border border-[#E2DDD4] rounded-lg p-3 text-left" style={{ borderTop: `3px solid ${prp.prove.accent}` }}>
                    <div className="text-[10px] uppercase font-bold tracking-[0.12em]" style={{ color: prp.prove.accent }}>PROVE</div>
                    <p className="text-[11px] text-[#6B7F96] mt-1">Every resolution is timestamped, assigned, and ready to send to inspectors or insurers.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-5 py-2.5 text-white rounded-xl font-medium transition-all hover:-translate-y-0.5 hover:shadow-md min-h-[44px]"
                  style={{ backgroundColor: '#1E2D4D' }}
                >
                  + Report your first incident
                </button>
                <p className="text-[12px] italic text-[#1E2D4D]/40 mt-6 pt-4 max-w-[480px]" style={{ borderTop: '1px solid #E2DDD4' }}>
                  An incident without a record is a problem you can't prove you fixed.
                </p>
              </div>
            );
          }

          // Separate aging from non-aging for section headers
          const agingList = filteredIncidents.filter(inc => prpStats.agingIncidentIds.has(inc.id));
          const restList = filteredIncidents.filter(inc => !prpStats.agingIncidentIds.has(inc.id));
          const hasAgingSection = agingList.length > 0;

          const renderIncidentCard = (inc: Incident) => {
            const typeInfo = INCIDENT_TYPES.find(tp => tp.value === inc.type);
            const TypeIcon = typeInfo?.icon || AlertCircle;
            const overdue = isOverdue(inc);
            const resTime = getResolutionTime(inc);
            const isRecurring = recurringIncidentIds.has(inc.id);
            const isClosed = inc.status === 'resolved' || inc.status === 'verified';
            const ageHours = Math.round((now - new Date(inc.createdAt).getTime()) / 3600000);
            return (
              <div
                key={inc.id}
                onClick={() => setSelectedIncident(inc)}
                className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer"
                style={overdue ? { borderLeft: '4px solid #dc2626' } : { borderLeft: '4px solid transparent' }}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: SEVERITIES.find(s => s.value === inc.severity)?.bg }}>
                      <TypeIcon className="h-5 w-5" style={{ color: SEVERITIES.find(s => s.value === inc.severity)?.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-[#1E2D4D]/30">{inc.id}</span>
                        <SeverityBadge severity={inc.severity} />
                        <StatusBadge status={inc.status} />
                        {overdue && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', color: '#c2731a', backgroundColor: 'rgba(194,115,26,0.12)', border: '1px dashed #c2731a' }}>
                            Predict · Aging {ageHours}h
                          </span>
                        )}
                        {isRecurring && !isClosed && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', color: '#A08C5A', backgroundColor: 'rgba(160,140,90,0.15)' }}>
                            Recurring
                          </span>
                        )}
                        {isRecurring && isClosed && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', color: '#A08C5A', backgroundColor: 'rgba(160,140,90,0.15)' }}>
                            Same root cause
                          </span>
                        )}
                        {inc.regulatoryReportRequired && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', color: inc.regulatoryReportFiledAt ? '#15803d' : '#dc2626', backgroundColor: inc.regulatoryReportFiledAt ? '#f0fdf4' : '#fef2f2' }}>
                            {inc.regulatoryReportFiledAt ? 'Report Filed' : 'Report Required'}
                          </span>
                        )}
                        {inc.photos.length > 0 && (
                          <span className="flex items-center gap-0.5 text-[#1E2D4D]/30">
                            <Camera className="h-3 w-3" />
                            <span className="text-[11px]">{inc.photos.length}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-[#1E2D4D] mt-1 truncate">{inc.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-[#1E2D4D]/50 mt-1 flex-wrap">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{inc.location}</span>
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{displayName(inc.assignedTo)}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(inc.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {resTime && (
                      <span className="text-xs text-[#1E2D4D]/50 whitespace-nowrap">{t('incidents.resolvedIn')} {resTime}</span>
                    )}
                    <ChevronRight className="h-5 w-5 text-[#1E2D4D]/30" />
                  </div>
                </div>
              </div>
            );
          };

          if (filteredIncidents.length === 0) {
            return (
              <div className="space-y-3">
                <EmptyState
                  icon={AlertTriangle}
                  title="No incidents match filters"
                  description="Adjust your filters to see incidents."
                />
              </div>
            );
          }

          return (
            <div className="space-y-3">
              {hasAgingSection && (
                <>
                  <p className="text-[10px] uppercase font-bold tracking-[0.12em] text-[#8A93A6] pt-1">
                    Aging beyond 24h · Predict signal
                  </p>
                  {agingList.map(renderIncidentCard)}
                  <p className="text-[10px] uppercase font-bold tracking-[0.12em] text-[#8A93A6] pt-3">
                    All incidents
                  </p>
                </>
              )}
              {restList.map(renderIncidentCard)}
            </div>
          );
        })()}
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
