import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  ChevronRight,
  User,
  MapPin,
  FileText,
  X,
  BookOpen,
  PenLine,
  Shield,
  ArrowDown,
  Download,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useLocations } from '../hooks/api/useLocations';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { useRole } from '../contexts/RoleContext';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { AIAssistButton, AIGeneratedIndicator } from '../components/ui/AIAssistButton';
import {
  CA_STATUS_MAP,
  CA_STATUS_ORDER,
  SEVERITY_CONFIG,
  SEVERITY_ORDER,
  OPEN_CORRECTIVE_ACTION_STATUSES,
  type CAStatus,
  type CASeverity,
} from '../constants/correctiveActionStatus';
import { useOrgMembers } from '../hooks/useOrgMembers';
import {
  CA_SYSTEM_TEMPLATES,
  getTemplatesByCategory,
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  isOverdue,
  type CACategory,
  type CATemplate,
  type CorrectiveActionItem,
} from '../data/correctiveActionsDemoData';
import { exportCorrectiveActionsPdf } from '../lib/correctiveActionPdf';
import { useCARecurringPatterns } from '../hooks/corrective-actions/useCARecurringPatterns';
import { useCorrectiveActionsPRPStats } from '../hooks/corrective-actions/useCorrectiveActionsPRPStats';
import { CorrectiveActionsPRPBand } from '../components/corrective-actions/CorrectiveActionsPRPBand';
import { CARecurringBar } from '../components/corrective-actions/CARecurringBar';

// ── Constants ────────────────────────────────────────────────

import { colors, shadows, radius, typography, prp } from '../lib/designSystem';

const NAVY = colors.navy;

const STATUS_ICON_MAP: Record<CAStatus, typeof Clock> = {
  reported: FileText,
  assigned: User,
  in_progress: Clock,
  resolved: CheckCircle2,
  verified: CheckCircle2,
};

const DEMO_LOCATIONS = [
  { id: 'downtown', name: 'Location 1' },
  { id: 'airport', name: 'Location 2' },
  { id: 'university', name: 'Location 3' },
];

// Kitchen staff demo user name
const KITCHEN_STAFF_NAME = 'Lisa Nguyen';

interface CreateCAForm {
  title: string;
  category: CACategory;
  severity: CASeverity;
  source: string;
  locationId: string;
  assignee: string;
  dueDate: string;
  description: string;
  rootCause: string;
  regulationReference: string;
  templateId: string | null;
  linkedIncidentId: string | null;
}

const EMPTY_FORM: CreateCAForm = {
  title: '',
  category: 'food_safety',
  severity: 'medium',
  source: '',
  locationId: '',
  assignee: '',
  dueDate: '',
  description: '',
  rootCause: '',
  regulationReference: '',
  templateId: null,
  linkedIncidentId: null,
};

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type SortOption = 'due_date' | 'severity' | 'created' | 'status';

// ── Component ────────────────────────────────────────────────

export function CorrectiveActions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const { userRole } = useRole();
  const { members: orgMembers } = useOrgMembers();
  const { user, profile } = useAuth();
  const { isDemoMode } = useDemo();
  const { data: dbLocations } = useLocations();
  const locationOptions = isDemoMode ? DEMO_LOCATIONS : (dbLocations ?? []);

  // URL param pre-filter
  const urlLocation = searchParams.get('location') || 'all';

  const [filterStatus, setFilterStatus] = useState<'all' | CAStatus>('all');
  const [filterLocation, setFilterLocation] = useState<string>(urlLocation);
  const [filterSeverity, setFilterSeverity] = useState<'all' | CASeverity>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | CACategory>('all');
  const [sortBy, setSortBy] = useState<SortOption>('due_date');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTab, setCreateTab] = useState<'template' | 'scratch'>('template');
  const [templateCategory, setTemplateCategory] = useState<CACategory | 'all'>('all');
  const [createForm, setCreateForm] = useState<CreateCAForm>(EMPTY_FORM);

  // Incident picker state (FIX 3)
  const [orgIncidents, setOrgIncidents] = useState<{ id: string; incident_number: string; title: string; category: string; severity: string }[]>([]);

  // AI Assist tracking
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [aiDraftApplied, setAiDraftApplied] = useState(false);

  // E1 — Hardcoded drafts keyed on category. E3 will replace with ai-text-assist
  // call that uses linked incident context.
  const CA_AI_DRAFT_DATA: Record<CACategory, { title: string; description: string; rootCause: string }> = {
    food_safety: {
      title: 'Cold-chain temperature excursion — corrective response',
      description: 'Walk-in cooler recorded above 41°F threshold during routine monitoring. TCS items in unit assessed for safety. Affected products evaluated against FDA Food Code 4-hour limit.',
      rootCause: 'Door gasket deterioration and compressor cycling suggest mechanical wear. Closing shift door discipline also a contributing factor based on prior temperature pattern.',
    },
    fire_safety: {
      title: 'Hood / suppression system inspection lapse — corrective response',
      description: 'Annual fire suppression inspection certificate expired. NFPA 96 requires current certification on file. Vendor contracted for re-inspection. Affected hood line documented.',
      rootCause: 'Vendor service agreement lapsed without automated renewal. No reminder system in place for fire safety certification expirations.',
    },
    facility_services: {
      title: 'Facility services finding — corrective response',
      description: 'Facility services finding identified during routine review. Issue documented and assigned for resolution. Vendor service or maintenance schedule under review.',
      rootCause: 'Maintenance schedule gap, vendor coordination lapse, or process ambiguity. Contributing factors being evaluated for preventive action.',
    },
  };

  const handleAiDraft = () => {
    const draft = CA_AI_DRAFT_DATA[createForm.category] || CA_AI_DRAFT_DATA.facility_services;
    setCreateForm(f => ({
      ...f,
      title: f.title || draft.title,
      description: draft.description,
      rootCause: draft.rootCause,
    }));
    setAiDraftApplied(true);
  };

  // Local actions state — seeded from DB in live mode
  const [localActions, setLocalActions] = useState<CorrectiveActionItem[]>([]);
  const [caFetched, setCaFetched] = useState(false);

  // Fetch existing CAs from DB (live mode)
  useEffect(() => {
    if (isDemoMode || !profile?.organization_id || caFetched) return;
    setCaFetched(true);
    supabase.from('corrective_actions')
      .select('id, title, description, category, severity, status, source, source_type, source_id, assigned_to, due_date, root_cause, regulation_reference, template_id, created_at, resolved_at, resolved_by, verified_at, verified_by, resolution_note, verification_note, ai_draft, location_id')
      .eq('organization_id', profile.organization_id)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error || !data) return;
        const locs = dbLocations ?? [];
        const members = orgMembers ?? [];
        setLocalActions(data.map((row: any) => ({
          id: row.id,
          title: row.title || '',
          description: row.description || '',
          location: locs.find((l: any) => l.id === row.location_id)?.name || '',
          locationId: row.location_id || '',
          category: (row.category || 'food_safety') as CACategory,
          severity: (row.severity || 'medium') as CASeverity,
          status: (row.status || 'reported') as CAStatus,
          source: row.source || '',
          source_type: row.source_type || 'manual',
          source_id: row.source_id || null,
          assignee: members.find((m: any) => m.id === row.assigned_to)?.full_name || row.assigned_to || '',
          assigned_by: '',
          assignedAt: null,
          createdAt: row.created_at?.slice(0, 10) || '',
          dueDate: row.due_date || '',
          resolvedAt: row.resolved_at?.slice(0, 10) || null,
          resolved_by: row.resolved_by || null,
          resolution_note: row.resolution_note || null,
          verifiedAt: row.verified_at?.slice(0, 10) || null,
          verified_by: row.verified_by || null,
          verification_note: row.verification_note || null,
          rootCause: row.root_cause || '',
          correctiveSteps: '',
          preventiveMeasures: '',
          regulationReference: row.regulation_reference || '',
          templateId: row.template_id || null,
          ai_draft: row.ai_draft || null,
          notes: [],
          attachments: [],
          history: [],
        })));
      });
  }, [isDemoMode, profile?.organization_id]);

  const allActions = localActions;

  // ── Self-Inspection Handoff ──────────────────────────────────
  const isFromInspection = searchParams.get('from') === 'self-inspection';
  const [inspectionItems, setInspectionItems] = useState<{ title: string; description: string; severity: string; section: string; citation: string; notes: string }[]>([]);
  const [inspectionIdx, setInspectionIdx] = useState(0);

  useEffect(() => {
    if (!isFromInspection) return;
    try {
      const raw = sessionStorage.getItem('inspection_ca_items');
      if (!raw) return;
      const items = JSON.parse(raw);
      if (Array.isArray(items) && items.length > 0) {
        setInspectionItems(items);
        setInspectionIdx(0);
        // Pre-populate the create form with first item
        const first = items[0];
        const sevMap: Record<string, CASeverity> = { critical: 'critical', major: 'high', minor: 'medium' };
        setCreateForm({
          ...EMPTY_FORM,
          title: first.title,
          description: first.description,
          severity: sevMap[first.severity] || 'medium',
          regulationReference: first.citation || '',
          source: 'Self-Inspection',
          category: first.section?.toLowerCase().includes('facility') || first.section?.toLowerCase().includes('fire') || first.section?.toLowerCase().includes('suppression') ? 'fire_safety' : 'food_safety',
          dueDate: (() => {
            const d = new Date();
            d.setDate(d.getDate() + (first.severity === 'critical' ? 1 : first.severity === 'major' ? 2 : 7));
            return d.toISOString().slice(0, 10);
          })(),
        });
        setCreateTab('scratch');
        setShowCreateModal(true);
      }
    } catch { /* ignore */ }
  }, [isFromInspection]);

  // ── Evidence Trail CA Handoff ──────────────────────────────
  const isFromEvidence = searchParams.get('from') === 'evidence-trail';
  useEffect(() => {
    if (!isFromEvidence) return;
    try {
      const raw = sessionStorage.getItem('evidence_ca_context');
      if (!raw) return;
      const ctx = JSON.parse(raw);
      setCreateForm({
        ...EMPTY_FORM,
        title: ctx.title || '',
        description: ctx.description || '',
        severity: ctx.severity || 'medium',
        category: ctx.category || 'food_safety',
        source: ctx.source || 'Evidence Trail',
      });
      setCreateTab('scratch');
      setShowCreateModal(true);
      sessionStorage.removeItem('evidence_ca_context');
    } catch { /* ignore */ }
  }, [isFromEvidence]);

  const advanceInspectionItem = useCallback(() => {
    const nextIdx = inspectionIdx + 1;
    if (nextIdx >= inspectionItems.length) {
      // All items processed
      setInspectionItems([]);
      sessionStorage.removeItem('inspection_ca_items');
      toast.success('All inspection items processed');
      return;
    }
    setInspectionIdx(nextIdx);
    const next = inspectionItems[nextIdx];
    const sevMap: Record<string, CASeverity> = { critical: 'critical', major: 'high', minor: 'medium' };
    setCreateForm({
      ...EMPTY_FORM,
      title: next.title,
      description: next.description,
      severity: sevMap[next.severity] || 'medium',
      regulationReference: next.citation || '',
      source: 'Self-Inspection',
      category: next.section?.toLowerCase().includes('facility') || next.section?.toLowerCase().includes('fire') || next.section?.toLowerCase().includes('suppression') ? 'fire_safety' : 'food_safety',
      dueDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + (next.severity === 'critical' ? 1 : next.severity === 'major' ? 2 : 7));
        return d.toISOString().slice(0, 10);
      })(),
    });
    setCreateTab('scratch');
    setShowCreateModal(true);
  }, [inspectionIdx, inspectionItems]);

  // Role-based visibility filtering
  const actions = useMemo(() => {
    if (userRole === 'kitchen_staff') {
      return allActions.filter(i => i.assignee === KITCHEN_STAFF_NAME);
    }
    return allActions;
  }, [allActions, userRole]);

  // Permission flags
  const canCreate = userRole !== 'kitchen_staff';

  const filtered = useMemo(() => {
    let items = actions;
    if (filterStatus !== 'all') items = items.filter(i => i.status === filterStatus);
    if (filterLocation !== 'all') items = items.filter(i => i.locationId === filterLocation);
    if (filterSeverity !== 'all') items = items.filter(i => i.severity === filterSeverity);
    if (filterCategory !== 'all') items = items.filter(i => i.category === filterCategory);

    // Sort
    items = [...items].sort((a, b) => {
      switch (sortBy) {
        case 'severity':
          return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'status':
          return (CA_STATUS_ORDER[a.status] ?? 5) - (CA_STATUS_ORDER[b.status] ?? 5);
        case 'due_date':
        default:
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
    });

    return items;
  }, [filterStatus, filterLocation, filterSeverity, sortBy, actions]);

  const counts = useMemo(() => {
    const resolvedItems = actions.filter(i => i.resolvedAt);
    const avgResolveDays = resolvedItems.length > 0
      ? Math.round(
          resolvedItems.reduce((sum, i) => {
            const created = new Date(i.createdAt).getTime();
            const resolved = new Date(i.resolvedAt!).getTime();
            return sum + (resolved - created) / (1000 * 60 * 60 * 24);
          }, 0) / resolvedItems.length,
        )
      : 0;

    return {
      open: actions.filter(i => (OPEN_CORRECTIVE_ACTION_STATUSES as readonly string[]).includes(i.status)).length,
      overdue: actions.filter(i => isOverdue(i)).length,
      avgResolve: avgResolveDays,
      verified: actions.filter(i => i.status === 'verified').length,
    };
  }, [actions]);

  const locations = useMemo(() => {
    const set = new Set(actions.map(i => i.locationId));
    return Array.from(set).map(id => ({
      id,
      name: actions.find(i => i.locationId === id)?.location ?? id,
    }));
  }, [actions]);

  // ── Handlers ─────────────────────────────────────────────

  const handleOpenCreate = useCallback(() => {
    guardAction('create', 'Corrective Actions', () => {
      setCreateForm(EMPTY_FORM);
      setCreateTab('template');
      setTemplateCategory('all');
      setShowCreateModal(true);
      // Fetch linkable incidents (live mode only)
      if (!isDemoMode && profile?.organization_id) {
        supabase.from('incidents')
          .select('id, incident_number, title, category, severity')
          .eq('organization_id', profile.organization_id)
          .in('status', ['open', 'investigating'])
          .is('archived_at', null)
          .is('linked_corrective_action_id', null)
          .order('created_at', { ascending: false })
          .limit(50)
          .then(({ data }) => { if (data) setOrgIncidents(data); });
      }
    });
  }, [guardAction, isDemoMode, profile?.organization_id]);

  const handleSelectTemplate = useCallback((tpl: CATemplate) => {
    setCreateForm({
      ...EMPTY_FORM,
      title: tpl.title,
      category: tpl.category,
      severity: tpl.severity,
      description: tpl.description,
      rootCause: tpl.suggested_root_cause,
      regulationReference: tpl.regulation_reference,
      templateId: tpl.id,
      dueDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + tpl.recommended_timeframe_days);
        return d.toISOString().slice(0, 10);
      })(),
    });
    setCreateTab('scratch'); // switch to form view to edit
  }, []);

  const handleCreateCA = useCallback(() => {
    guardAction('create', 'Corrective Actions', async () => {
      const now = new Date();
      const caStatus: CAStatus = createForm.assignee ? 'assigned' : 'reported';

      // Resolve assignee name from UUID for display
      const assigneeMember = orgMembers.find(m => m.id === createForm.assignee);
      const assigneeName = assigneeMember?.full_name || assigneeMember?.email || createForm.assignee;

      // Pillar: facility_services has no pillar (nullable per migration 20260930000004)
      const caPillar = createForm.category === 'facility_services' ? null : createForm.category;

      // Source fields from incident picker or manual entry
      const sourceType = createForm.linkedIncidentId ? 'incident' : 'manual';
      const sourceId = createForm.linkedIncidentId || null;
      const sourceLabel = createForm.linkedIncidentId
        ? orgIncidents.find(i => i.id === createForm.linkedIncidentId)?.title || 'Incident'
        : (createForm.source || 'Manual');

      if (!isDemoMode && profile?.organization_id) {
        // ── Live mode: persist to Supabase ──
        try {
          const { data: ca, error: caErr } = await supabase.from('corrective_actions').insert({
            organization_id: profile.organization_id,
            location_id: createForm.locationId || null,
            title: createForm.title,
            description: createForm.description || null,
            category: createForm.category,
            pillar: caPillar,
            severity: createForm.severity,
            status: caStatus,
            source: sourceLabel,
            source_type: sourceType,
            source_id: sourceId,
            assigned_to: createForm.assignee || null,
            due_date: createForm.dueDate || null,
            root_cause: createForm.rootCause || null,
            regulation_reference: createForm.regulationReference || null,
            template_id: createForm.templateId || null,
            ai_draft: aiFields.has('description') ? createForm.description : null,
          }).select('id, created_at').single();

          if (caErr || !ca?.id) {
            console.error('[CorrectiveActions] CA insert failed:', caErr);
            toast.error('Failed to create corrective action.');
            return;
          }

          // Link back to incident if selected
          if (createForm.linkedIncidentId) {
            await supabase.from('incidents').update({
              linked_corrective_action_id: ca.id,
            }).eq('id', createForm.linkedIncidentId);
          }

          // Build local item for immediate display
          const locName = locationOptions.find(l => l.id === createForm.locationId)?.name || '';
          const newCA: CorrectiveActionItem = {
            id: ca.id,
            title: createForm.title,
            description: createForm.description,
            location: locName,
            locationId: createForm.locationId || '',
            category: createForm.category,
            severity: createForm.severity,
            status: caStatus,
            source: sourceLabel,
            source_type: sourceType as any,
            source_id: sourceId,
            assignee: createForm.assignee ? assigneeName : '',
            assigned_by: '',
            assignedAt: createForm.assignee ? now.toISOString().slice(0, 10) : null,
            createdAt: ca.created_at?.slice(0, 10) || now.toISOString().slice(0, 10),
            dueDate: createForm.dueDate || now.toISOString().slice(0, 10),
            resolvedAt: null,
            resolved_by: null,
            resolution_note: null,
            verifiedAt: null,
            verified_by: null,
            verification_note: null,
            rootCause: createForm.rootCause,
            correctiveSteps: '',
            preventiveMeasures: '',
            regulationReference: createForm.regulationReference,
            templateId: createForm.templateId,
            ai_draft: aiFields.has('description') ? createForm.description : null,
            notes: [],
            attachments: [],
            history: [],
          };

          setLocalActions(prev => [newCA, ...prev]);
          toast.success('Corrective action created');
        } catch (err) {
          console.error('[CorrectiveActions] CA creation failed:', err);
          toast.error('Failed to create corrective action.');
          return;
        }
      } else {
        // ── Demo mode: state-only ──
        const newCA: CorrectiveActionItem = {
          id: `ca-new-${Date.now()}`,
          title: createForm.title,
          description: createForm.description,
          location: DEMO_LOCATIONS.find(l => l.id === createForm.locationId)?.name || 'Location 1',
          locationId: createForm.locationId || 'downtown',
          category: createForm.category,
          severity: createForm.severity,
          status: caStatus,
          source: createForm.source || 'Manual',
          source_type: 'manual',
          source_id: null,
          assignee: createForm.assignee,
          assigned_by: '',
          assignedAt: createForm.assignee ? now.toISOString().slice(0, 10) : null,
          createdAt: now.toISOString().slice(0, 10),
          dueDate: createForm.dueDate || now.toISOString().slice(0, 10),
          resolvedAt: null,
          resolved_by: null,
          resolution_note: null,
          verifiedAt: null,
          verified_by: null,
          verification_note: null,
          rootCause: createForm.rootCause,
          correctiveSteps: '',
          preventiveMeasures: '',
          regulationReference: createForm.regulationReference,
          templateId: createForm.templateId,
          ai_draft: aiFields.has('description') ? createForm.description : null,
          notes: [],
          attachments: [],
          history: [
            { action: 'status_changed', to: 'reported', by: 'You', timestamp: now.toISOString() },
          ],
        };

        if (createForm.assignee) {
          newCA.status = 'assigned';
          newCA.assigned_by = 'You';
          newCA.history.push({
            action: 'status_changed',
            from: 'reported',
            to: 'assigned',
            by: 'You',
            timestamp: now.toISOString(),
            detail: `Assigned to ${createForm.assignee}`,
          });
        }

        setLocalActions(prev => [newCA, ...prev]);
        toast.success('Corrective action created');
      }

      setShowCreateModal(false);
      setCreateForm(EMPTY_FORM);
      setAiFields(new Set());
      setAiDraftApplied(false);
      // If processing items from self-inspection, advance to next
      if (inspectionItems.length > 0) {
        setTimeout(() => advanceInspectionItem(), 300);
      }
    });
  }, [guardAction, createForm, aiFields, inspectionItems.length, advanceInspectionItem, isDemoMode, profile, orgMembers, locationOptions, orgIncidents]);

  const handleExportPdf = useCallback(() => {
    const locationName = filterLocation !== 'all'
      ? DEMO_LOCATIONS.find(l => l.id === filterLocation)?.name || 'All Locations'
      : 'All Locations';
    exportCorrectiveActionsPdf(filtered, locationName);
    toast.success('PDF exported');
  }, [filtered, filterLocation]);

  // ── Templates for modal ─────────────────────────────────

  const filteredTemplates = useMemo(() => getTemplatesByCategory(templateCategory), [templateCategory]);

  const hasAnyFilters = filterStatus !== 'all' || filterLocation !== 'all' || filterSeverity !== 'all';

  // ── PRP hooks ───────────────────────────────────────────────
  const recurringPatterns = useCARecurringPatterns(actions);
  const caStats = useCorrectiveActionsPRPStats(actions, recurringPatterns);
  const recurringActionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of recurringPatterns) {
      for (const id of p.actionIds) ids.add(id);
    }
    return ids;
  }, [recurringPatterns]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6" style={{ fontFamily: 'system-ui' }}>
      {/* Inspection handoff banner */}
      {inspectionItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-semibold text-blue-800">Creating from Self-Inspection</span>
            <span className="text-blue-600 ml-2">
              Item {inspectionIdx + 1} of {inspectionItems.length}
            </span>
          </div>
          <button
            onClick={() => {
              setInspectionItems([]);
              sessionStorage.removeItem('inspection_ca_items');
              setShowCreateModal(false);
              toast.info('Inspection import dismissed');
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: NAVY }}>Corrective Actions</h1>
          <p className="text-sm text-[#1E2D4D]/50 mt-1">
            <span className="font-semibold" style={{ color: NAVY }}>Predict</span> what's coming due.{' '}
            <span className="font-semibold" style={{ color: NAVY }}>Reduce</span> open exposure.{' '}
            <span className="font-semibold" style={{ color: NAVY }}>Prove</span> every verified resolution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-[#1E2D4D]/10 text-[#1E2D4D]/70 hover:bg-[#FAF7F0] flex items-center gap-1.5"
          >
            <Download size={14} />
            Export PDF
          </button>
          {canCreate && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white shrink-0"
              style={{ backgroundColor: NAVY }}
            >
              + New Action
            </button>
          )}
        </div>
      </div>

      {/* PRP Band */}
      <CorrectiveActionsPRPBand
        stats={caStats}
        loading={false}
        onFilterPredict={() => { setFilterStatus('all'); setFilterSeverity('all'); setFilterLocation('all'); setFilterCategory('all'); setSortBy('due_date'); }}
        onFilterProve={() => { setFilterStatus('verified' as CAStatus); setFilterSeverity('all'); setFilterLocation('all'); setFilterCategory('all'); }}
      />

      {/* Filters — hidden when no actions exist */}
      {actions.length > 0 && (
        <>
          <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-3 flex flex-wrap items-center gap-3">
            <Filter size={16} className="text-[#1E2D4D]/30" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2.5 text-[#1E2D4D]/80"
              style={{ fontSize: 16 }}
            >
              <option value="all">All Statuses</option>
              <option value="reported">Reported</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="verified">Verified</option>
            </select>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2.5 text-[#1E2D4D]/80"
              style={{ fontSize: 16 }}
            >
              <option value="all">All Locations</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2.5 text-[#1E2D4D]/80"
              style={{ fontSize: 16 }}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2.5 text-[#1E2D4D]/80"
              style={{ fontSize: 16 }}
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <div className="flex items-center gap-1.5 ml-auto">
              <ArrowDown size={12} className="text-[#1E2D4D]/30" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2.5 text-[#1E2D4D]/80"
                style={{ fontSize: 16 }}
              >
                <option value="due_date">Sort: Due Date</option>
                <option value="severity">Sort: Severity</option>
                <option value="created">Sort: Newest</option>
                <option value="status">Sort: Status</option>
              </select>
            </div>
            {hasAnyFilters && (
              <button
                onClick={() => { setFilterStatus('all'); setFilterLocation('all'); setFilterSeverity('all'); }}
                className="text-xs text-[#1E2D4D]/50 hover:text-[#1E2D4D]/80 underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Recurring root cause callouts */}
          <CARecurringBar patterns={recurringPatterns} />
        </>
      )}

      {/* Action list */}
      <div className="space-y-3">
        {/* True empty state — PRP framed */}
        {actions.length === 0 && (
          <div className="bg-white rounded-xl border border-[#E2DDD4] p-10 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgba(47,122,77,0.12)' }}
            >
              <CheckCircle2 className="w-7 h-7" style={{ color: '#2f7a4d' }} />
            </div>
            <p className="text-base font-semibold" style={{ color: NAVY }}>
              No corrective actions on file
            </p>
            <p className="text-sm text-[#6B7F96] mt-1 max-w-md mx-auto">
              Your operations are running clean. When issues arise from inspections, checklists,
              or temperature logs, corrective actions will appear here.
            </p>
            <div className="flex items-center justify-center gap-6 mt-6">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold tracking-[0.12em]" style={{ color: prp.predict.accent }}>PREDICT</p>
                <p className="text-[10px] text-[#8A93A6] mt-0.5">Overdue + due soon</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold tracking-[0.12em]" style={{ color: prp.reduce.accent }}>REDUCE</p>
                <p className="text-[10px] text-[#8A93A6] mt-0.5">Open exposure</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold tracking-[0.12em]" style={{ color: prp.prove.accent }}>PROVE</p>
                <p className="text-[10px] text-[#8A93A6] mt-0.5">Verified + documented</p>
              </div>
            </div>
            {canCreate && (
              <button
                onClick={handleOpenCreate}
                className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: NAVY }}
              >
                + Report your first action
              </button>
            )}
            <div className="mt-4 pt-4" style={{ borderTop: '1px dashed #E2DDD4' }}>
              <p className="text-[11px] text-[#8A93A6] italic max-w-sm mx-auto">
                Every corrective action closes a gap. Predict what needs attention,
                reduce open exposure, prove the fix.
              </p>
            </div>
          </div>
        )}

        {/* Filter empty state */}
        {actions.length > 0 && filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-8 text-center text-[#1E2D4D]/30 text-sm">
            No corrective actions match the selected filters.
          </div>
        )}

        {/* Section headers + action cards */}
        {(() => {
          const signalItems = filtered.filter(
            (i) => caStats.overdueIds.has(i.id) || caStats.dueSoonIds.has(i.id)
          );
          const restItems = filtered.filter(
            (i) => !caStats.overdueIds.has(i.id) && !caStats.dueSoonIds.has(i.id)
          );
          const showHeaders = signalItems.length > 0;

          const renderCard = (item: CorrectiveActionItem) => {
            const sev = SEVERITY_CONFIG[item.severity];
            const stat = CA_STATUS_MAP[item.status];
            const overdue = isOverdue(item);
            const StatusIcon = STATUS_ICON_MAP[item.status];
            const isOpen = (OPEN_CORRECTIVE_ACTION_STATUSES as readonly string[]).includes(item.status);

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden cursor-pointer transition-all hover:border-[#1E2D4D]/15"
                onClick={() => navigate(`/corrective-actions/${item.id}`)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <StatusIcon size={18} className="shrink-0 mt-0.5" style={{ color: stat.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-semibold text-[#1E2D4D]">{item.title}</h3>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full uppercase"
                          style={{ color: sev.color, backgroundColor: sev.bg, border: `1px solid ${sev.border}` }}
                        >
                          {sev.label}
                        </span>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ color: stat.color, backgroundColor: stat.bg }}
                        >
                          {stat.label}
                        </span>
                        {overdue && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: '#c2731a', backgroundColor: 'rgba(194,115,26,0.12)', border: '1px dashed #c2731a' }}
                          >
                            Predict · Overdue
                          </span>
                        )}
                        {caStats.dueSoonIds.has(item.id) && !overdue && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: '#c2731a', backgroundColor: 'rgba(194,115,26,0.12)', border: '1px dashed #c2731a' }}
                          >
                            Predict · Due 48h
                          </span>
                        )}
                        {recurringActionIds.has(item.id) && isOpen && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: '#A08C5A', backgroundColor: 'rgba(160,140,90,0.15)' }}
                          >
                            Recurring
                          </span>
                        )}
                        {recurringActionIds.has(item.id) && !isOpen && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: '#A08C5A', backgroundColor: 'rgba(160,140,90,0.15)' }}
                          >
                            Same root cause
                          </span>
                        )}
                        {!item.assignee && isOpen && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: '#b3261e', backgroundColor: 'rgba(179,38,30,0.08)', border: '1px dashed #b3261e' }}
                          >
                            Unassigned
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#1E2D4D]/50 mb-2 line-clamp-2">{item.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#1E2D4D]/30">
                        <span className="flex items-center gap-1"><MapPin size={12} />{item.location}</span>
                        {item.assignee && <span className="flex items-center gap-1"><User size={12} />{item.assignee}</span>}
                        <span>Source: {item.source}</span>
                        <span>Due: {formatDate(item.dueDate)}</span>
                        {item.resolvedAt && <span>Resolved: {formatDate(item.resolvedAt)}</span>}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[#1E2D4D]/30 shrink-0 mt-1" />
                  </div>
                </div>
              </div>
            );
          };

          return (
            <>
              {showHeaders && (
                <p className="text-[10px] uppercase font-bold tracking-[0.12em] text-[#BA7517] pt-2">
                  Overdue or due within 48h · Predict signal
                </p>
              )}
              {signalItems.map(renderCard)}
              {showHeaders && restItems.length > 0 && (
                <p className="text-[10px] uppercase font-bold tracking-[0.12em] text-[#8A93A6] pt-2">
                  All corrective actions
                </p>
              )}
              {showHeaders ? restItems.map(renderCard) : filtered.map(renderCard)}
            </>
          );
        })()}
      </div>

      {/* ── Create CA Modal ──────────────────────────────────── */}
      {showCreateModal && (
        <Modal isOpen onClose={() => setShowCreateModal(false)} size="lg" className="flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4D]/10 flex-shrink-0">
              <h2 className="text-lg font-bold" style={{ color: NAVY }}>New Corrective Action</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAiDraft}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#fdf8e8', color: '#b8962f', border: '1px solid #A08C5A' }}
                >
                  <Sparkles className="h-4 w-4" />
                  AI Draft
                </button>
                <button onClick={() => setShowCreateModal(false)} className="text-[#1E2D4D]/30 hover:text-[#1E2D4D]/70">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Tab toggle — always visible regardless of active tab */}
            <div className="flex flex-shrink-0 border-b border-[#1E2D4D]/10 px-6">
              <button
                type="button"
                onClick={() => setCreateTab('template')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 flex-shrink-0 ${
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
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 flex-shrink-0 ${
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
                        style={templateCategory === cat ? { backgroundColor: NAVY } : undefined}
                      >
                        {cat === 'all' ? 'All Templates' : CATEGORY_LABELS[cat]}
                        <span className="ml-1 opacity-70">
                          ({cat === 'all' ? CA_SYSTEM_TEMPLATES.length : getTemplatesByCategory(cat).length})
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Template grid */}
                  <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto">
                    {filteredTemplates.map(tpl => {
                      const sev = SEVERITY_CONFIG[tpl.severity];
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
                              <p className="text-xs text-[#1E2D4D]/50 line-clamp-1">{tpl.description}</p>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-[#1E2D4D]/30">
                                <span className="flex items-center gap-1">
                                  <Shield size={10} />
                                  {tpl.regulation_reference}
                                </span>
                                <span>{tpl.recommended_timeframe_days}d timeframe</span>
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-[#1E2D4D]/30 shrink-0 mt-1" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* From Scratch / Form view */
                <div className="space-y-4">
                  {createForm.templateId && (
                    <div className="flex items-center justify-between text-xs bg-indigo-50 px-3 py-2 rounded-lg">
                      <div className="flex items-center gap-2 text-[#1E2D4D]/70">
                        <BookOpen size={12} className="text-indigo-500" />
                        Using template: <span className="font-semibold text-[#1E2D4D]">{createForm.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCreateTab('template')}
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

                  {/* Title */}
                  <div>
                    <label className="block text-xs font-medium text-[#1E2D4D]/80 mb-1">Title *</label>
                    <input
                      type="text"
                      value={createForm.title}
                      onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Walk-in cooler temperature excursion"
                      className="w-full text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2 focus:outline-none focus:border-[#1E2D4D]"
                    />
                  </div>

                  {/* Category + Severity side by side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#1E2D4D]/80 mb-1">Category</label>
                      <select
                        value={createForm.category}
                        onChange={e => setCreateForm(f => ({ ...f, category: e.target.value as CACategory }))}
                        className="w-full text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2"
                      >
                        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#1E2D4D]/80 mb-1">Severity</label>
                      <select
                        value={createForm.severity}
                        onChange={e => setCreateForm(f => ({ ...f, severity: e.target.value as CASeverity }))}
                        className="w-full text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2"
                      >
                        {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Link Incident (FIX 3) */}
                  {!isDemoMode && orgIncidents.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-[#1E2D4D]/80 mb-1">Link to Incident (optional)</label>
                      <select
                        value={createForm.linkedIncidentId || ''}
                        onChange={e => {
                          const incId = e.target.value || null;
                          const inc = orgIncidents.find(i => i.id === incId);
                          setCreateForm(f => ({
                            ...f,
                            linkedIncidentId: incId,
                            // Prefill category/severity from incident
                            ...(inc ? {
                              category: (inc.category || f.category) as CACategory,
                              severity: (inc.severity || f.severity) as CASeverity,
                              source: inc.title || f.source,
                            } : {}),
                          }));
                        }}
                        className="w-full text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2"
                      >
                        <option value="">None — manual source</option>
                        {orgIncidents.map(inc => (
                          <option key={inc.id} value={inc.id}>
                            {inc.incident_number} — {inc.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Source + Location side by side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#1E2D4D]/80 mb-1">Source</label>
                      <input
                        type="text"
                        value={createForm.source}
                        onChange={e => setCreateForm(f => ({ ...f, source: e.target.value }))}
                        placeholder="e.g. Temperature Log"
                        className="w-full text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2 focus:outline-none focus:border-[#1E2D4D]"
                        disabled={!!createForm.linkedIncidentId}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#1E2D4D]/80 mb-1">Location</label>
                      <select
                        value={createForm.locationId}
                        onChange={e => setCreateForm(f => ({ ...f, locationId: e.target.value }))}
                        className="w-full text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2"
                      >
                        <option value="">Select location...</option>
                        {locationOptions.map(loc => (
                          <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Assignee + Due Date side by side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#1E2D4D]/80 mb-1">Assignee</label>
                      <select
                        value={createForm.assignee}
                        onChange={e => setCreateForm(f => ({ ...f, assignee: e.target.value }))}
                        className="w-full text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2"
                      >
                        <option value="">Unassigned</option>
                        {orgMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.full_name || m.email || 'Unknown'}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#1E2D4D]/80 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={createForm.dueDate}
                        onChange={e => setCreateForm(f => ({ ...f, dueDate: e.target.value }))}
                        className="w-full text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2 focus:outline-none focus:border-[#1E2D4D]"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-[#1E2D4D]/80">Description</label>
                      <AIAssistButton
                        fieldLabel="Description"
                        context={{ title: createForm.title, severity: createForm.severity, category: createForm.category, location: DEMO_LOCATIONS.find(l => l.id === createForm.locationId)?.name, source: createForm.source }}
                        currentValue={createForm.description}
                        onGenerated={(text) => { setCreateForm(f => ({ ...f, description: text })); setAiFields(prev => new Set(prev).add('description')); }}
                      />
                    </div>
                    <textarea
                      value={createForm.description}
                      onChange={e => { setCreateForm(f => ({ ...f, description: e.target.value })); setAiFields(prev => { const s = new Set(prev); s.delete('description'); return s; }); }}
                      rows={3}
                      placeholder="Describe the issue and required corrective actions..."
                      className="w-full text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2 focus:outline-none focus:border-[#1E2D4D] resize-none"
                    />
                    {aiFields.has('description') && <AIGeneratedIndicator />}
                  </div>

                  {/* Root Cause */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-[#1E2D4D]/80">Root Cause</label>
                      <AIAssistButton
                        fieldLabel="Root Cause"
                        context={{ title: createForm.title, severity: createForm.severity, category: createForm.category, description: createForm.description, location: DEMO_LOCATIONS.find(l => l.id === createForm.locationId)?.name }}
                        currentValue={createForm.rootCause}
                        onGenerated={(text) => { setCreateForm(f => ({ ...f, rootCause: text })); setAiFields(prev => new Set(prev).add('rootCause')); }}
                      />
                    </div>
                    <textarea
                      value={createForm.rootCause}
                      onChange={e => { setCreateForm(f => ({ ...f, rootCause: e.target.value })); setAiFields(prev => { const s = new Set(prev); s.delete('rootCause'); return s; }); }}
                      rows={2}
                      placeholder="Identify the underlying cause..."
                      className="w-full text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2 focus:outline-none focus:border-[#1E2D4D] resize-none"
                    />
                    {aiFields.has('rootCause') && <AIGeneratedIndicator />}
                  </div>

                  {/* Regulation Reference */}
                  <div>
                    <label className="block text-xs font-medium text-[#1E2D4D]/80 mb-1">Regulation Reference</label>
                    <input
                      type="text"
                      value={createForm.regulationReference}
                      onChange={e => setCreateForm(f => ({ ...f, regulationReference: e.target.value }))}
                      placeholder="e.g. FDA 21 CFR 117.150"
                      className="w-full text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2 focus:outline-none focus:border-[#1E2D4D]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1E2D4D]/10 flex-shrink-0">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#1E2D4D]/70 hover:bg-[#1E2D4D]/5"
              >
                Cancel
              </button>
              {createTab === 'scratch' && (
                <button
                  onClick={handleCreateCA}
                  disabled={!createForm.title.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: NAVY }}
                >
                  Create Corrective Action
                </button>
              )}
            </div>
        </Modal>
      )}

      {/* Demo upgrade prompt */}
      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          feature={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
