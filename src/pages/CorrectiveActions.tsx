import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { useRole } from '../contexts/RoleContext';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { AIAssistButton, AIGeneratedIndicator } from '../components/ui/AIAssistButton';
import {
  CA_STATUS_MAP,
  CA_STATUS_ORDER,
  SEVERITY_CONFIG,
  SEVERITY_ORDER,
  DEMO_TEAM_MEMBERS,
  type CAStatus,
  type CASeverity,
} from '../constants/correctiveActionStatus';
import {
  DEMO_CORRECTIVE_ACTIONS,
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

// ── Constants ────────────────────────────────────────────────

const NAVY = '#1e4d6b';

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
};

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type SortOption = 'due_date' | 'severity' | 'created' | 'status';

// ── Component ────────────────────────────────────────────────

export function CorrectiveActions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const { userRole } = useRole();

  // URL param pre-filter
  const urlLocation = searchParams.get('location') || 'all';

  const [filterStatus, setFilterStatus] = useState<'all' | CAStatus>('all');
  const [filterLocation, setFilterLocation] = useState<string>(urlLocation);
  const [filterSeverity, setFilterSeverity] = useState<'all' | CASeverity>('all');
  const [sortBy, setSortBy] = useState<SortOption>('due_date');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTab, setCreateTab] = useState<'template' | 'scratch'>('template');
  const [templateCategory, setTemplateCategory] = useState<CACategory | 'all'>('all');
  const [createForm, setCreateForm] = useState<CreateCAForm>(EMPTY_FORM);

  // AI Assist tracking
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());

  // Local actions state (for demo lifecycle transitions)
  const [localActions, setLocalActions] = useState<CorrectiveActionItem[]>([]);
  const allActions = localActions.length > 0 ? localActions : (isDemoMode ? DEMO_CORRECTIVE_ACTIONS : []);

  // Initialize local state from demo data on first render
  useState(() => {
    if (isDemoMode) setLocalActions([...DEMO_CORRECTIVE_ACTIONS]);
  });

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
          category: first.section?.toLowerCase().includes('facility') || first.section?.toLowerCase().includes('fire') || first.section?.toLowerCase().includes('suppression') ? 'facility_safety' : 'food_safety',
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
      category: next.section?.toLowerCase().includes('facility') || next.section?.toLowerCase().includes('fire') || next.section?.toLowerCase().includes('suppression') ? 'facility_safety' : 'food_safety',
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
    if (userRole === 'facilities_manager') {
      return allActions.filter(i => i.category === 'facility_safety');
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
      open: actions.filter(i => ['reported', 'assigned', 'in_progress'].includes(i.status)).length,
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
    });
  }, [guardAction]);

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
    guardAction('create', 'Corrective Actions', () => {
      // Build new CA with reported status + initial history
      const now = new Date();
      const newCA: CorrectiveActionItem = {
        id: `ca-new-${Date.now()}`,
        title: createForm.title,
        description: createForm.description,
        location: DEMO_LOCATIONS.find(l => l.id === createForm.locationId)?.name || 'Location 1',
        locationId: createForm.locationId || 'downtown',
        category: createForm.category,
        severity: createForm.severity,
        status: 'reported',
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

      // If assignee was set, also mark as assigned
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
      setShowCreateModal(false);
      setCreateForm(EMPTY_FORM);
      setAiFields(new Set());
      toast.success('Corrective action created');
      // If processing items from self-inspection, advance to next
      if (inspectionItems.length > 0) {
        setTimeout(() => advanceInspectionItem(), 300);
      }
    });
  }, [guardAction, createForm, aiFields, inspectionItems.length, advanceInspectionItem]);

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

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6" style={{ fontFamily: 'system-ui' }}>
      {/* Inspection handoff banner */}
      {inspectionItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
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
          <p className="text-sm text-gray-500 mt-1">Track and resolve compliance violations with documented action plans.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Open', value: counts.open, color: '#dc2626' },
          { label: 'Overdue', value: counts.overdue, color: '#991b1b' },
          { label: 'Avg Resolve', value: `${counts.avgResolve}d`, color: '#d97706' },
          { label: 'Verified', value: counts.verified, color: NAVY },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-wrap items-center gap-3">
        <Filter size={16} className="text-gray-400" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700"
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
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700"
        >
          <option value="all">All Locations</option>
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value as any)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <div className="flex items-center gap-1.5 ml-auto">
          <ArrowDown size={12} className="text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700"
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
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Action list */}
      <div className="space-y-3">
        {/* Empty state: no actions at all */}
        {actions.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">No corrective actions yet</p>
            <p className="text-xs text-gray-500 mt-1">
              When violations or issues are found, create a corrective action to track resolution.
            </p>
          </div>
        )}

        {/* Empty state: no matches */}
        {actions.length > 0 && filtered.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
            No corrective actions match the selected filters.
          </div>
        )}

        {filtered.map(item => {
          const sev = SEVERITY_CONFIG[item.severity];
          const stat = CA_STATUS_MAP[item.status];
          const overdue = isOverdue(item);
          const StatusIcon = STATUS_ICON_MAP[item.status];

          return (
            <div
              key={item.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden cursor-pointer transition-all hover:shadow-sm hover:border-gray-300"
              onClick={() => navigate(`/corrective-actions/${item.id}`)}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <StatusIcon
                    size={18}
                    className="shrink-0 mt-0.5"
                    style={{ color: stat.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                        style={{ color: sev.color, backgroundColor: sev.bg, border: `1px solid ${sev.border}` }}
                      >
                        {sev.label}
                      </span>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: stat.color, backgroundColor: stat.bg }}
                      >
                        {stat.label}
                      </span>
                      {overdue && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-red-700 bg-red-50 border border-red-200">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><MapPin size={12} />{item.location}</span>
                      {item.assignee && <span className="flex items-center gap-1"><User size={12} />{item.assignee}</span>}
                      <span>Source: {item.source}</span>
                      <span>Due: {formatDate(item.dueDate)}</span>
                      {item.resolvedAt && <span>Resolved: {formatDate(item.resolvedAt)}</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Create CA Modal ──────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold" style={{ color: NAVY }}>New Corrective Action</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Tab toggle */}
            <div className="flex border-b border-gray-200 px-6">
              <button
                onClick={() => setCreateTab('template')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  createTab === 'template'
                    ? 'border-current text-[#1e4d6b]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <BookOpen size={14} />
                From Template
              </button>
              <button
                onClick={() => setCreateTab('scratch')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  createTab === 'scratch'
                    ? 'border-current text-[#1e4d6b]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <PenLine size={14} />
                From Scratch
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {createTab === 'template' ? (
                <div className="space-y-4">
                  {/* Category chips */}
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'food_safety', 'facility_safety', 'operational'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setTemplateCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          templateCategory === cat
                            ? 'text-white'
                            : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
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
                          className="text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-semibold text-gray-900 truncate">{tpl.title}</h4>
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0"
                                  style={{ color: sev.color, backgroundColor: sev.bg, border: `1px solid ${sev.border}` }}
                                >
                                  {sev.label}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 line-clamp-1">{tpl.description}</p>
                              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Shield size={10} />
                                  {tpl.regulation_reference}
                                </span>
                                <span>{tpl.recommended_timeframe_days}d timeframe</span>
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-gray-300 shrink-0 mt-1" />
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
                    <div className="flex items-center gap-2 text-xs text-gray-500 bg-indigo-50 px-3 py-2 rounded-lg">
                      <BookOpen size={12} className="text-indigo-500" />
                      Pre-filled from template. Edit any field below.
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={createForm.title}
                      onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Walk-in cooler temperature excursion"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1e4d6b]"
                    />
                  </div>

                  {/* Category + Severity side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={createForm.category}
                        onChange={e => setCreateForm(f => ({ ...f, category: e.target.value as CACategory }))}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                      >
                        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
                      <select
                        value={createForm.severity}
                        onChange={e => setCreateForm(f => ({ ...f, severity: e.target.value as CASeverity }))}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                      >
                        {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Source + Location side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
                      <input
                        type="text"
                        value={createForm.source}
                        onChange={e => setCreateForm(f => ({ ...f, source: e.target.value }))}
                        placeholder="e.g. Temperature Log"
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1e4d6b]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                      <select
                        value={createForm.locationId}
                        onChange={e => setCreateForm(f => ({ ...f, locationId: e.target.value }))}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                      >
                        <option value="">Select location...</option>
                        {DEMO_LOCATIONS.map(loc => (
                          <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Assignee + Due Date side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Assignee</label>
                      <select
                        value={createForm.assignee}
                        onChange={e => setCreateForm(f => ({ ...f, assignee: e.target.value }))}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                      >
                        <option value="">Unassigned</option>
                        {DEMO_TEAM_MEMBERS.map(m => (
                          <option key={m.id} value={m.name}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={createForm.dueDate}
                        onChange={e => setCreateForm(f => ({ ...f, dueDate: e.target.value }))}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1e4d6b]"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-700">Description</label>
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
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1e4d6b] resize-none"
                    />
                    {aiFields.has('description') && <AIGeneratedIndicator />}
                  </div>

                  {/* Root Cause */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-700">Root Cause</label>
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
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1e4d6b] resize-none"
                    />
                    {aiFields.has('rootCause') && <AIGeneratedIndicator />}
                  </div>

                  {/* Regulation Reference */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Regulation Reference</label>
                    <input
                      type="text"
                      value={createForm.regulationReference}
                      onChange={e => setCreateForm(f => ({ ...f, regulationReference: e.target.value }))}
                      placeholder="e.g. FDA 21 CFR 117.150"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1e4d6b]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
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
          </div>
        </div>
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
