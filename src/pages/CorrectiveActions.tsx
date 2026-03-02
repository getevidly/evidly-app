import { useState, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  ChevronRight,
  ChevronDown,
  User,
  MapPin,
  FileText,
  Archive,
  X,
  BookOpen,
  PenLine,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { AIAssistButton, AIGeneratedIndicator } from '../components/ui/AIAssistButton';
import {
  DEMO_CORRECTIVE_ACTIONS,
  CA_SYSTEM_TEMPLATES,
  getTemplatesByCategory,
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  type CACategory,
  type CASeverity,
  type CAStatus,
  type CATemplate,
  type CorrectiveActionItem,
} from '../data/correctiveActionsDemoData';

// ── Constants ────────────────────────────────────────────────

const NAVY = '#1e4d6b';

const SEVERITY_CONFIG: Record<CASeverity, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Critical', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
  high:     { label: 'High', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  medium:   { label: 'Medium', color: NAVY, bg: '#eef4f8', border: '#b8d4e8' },
  low:      { label: 'Low', color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
};

const STATUS_CONFIG: Record<CAStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  created:     { label: 'Created', color: '#6366f1', bg: '#eef2ff', icon: FileText },
  in_progress: { label: 'In Progress', color: '#d97706', bg: '#fffbeb', icon: Clock },
  completed:   { label: 'Completed', color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle2 },
  verified:    { label: 'Verified', color: NAVY, bg: '#eef4f8', icon: CheckCircle2 },
  closed:      { label: 'Closed', color: '#6b7280', bg: '#f3f4f6', icon: Archive },
  archived:    { label: 'Archived', color: '#9ca3af', bg: '#f9fafb', icon: Archive },
};

const LIFECYCLE_NEXT: Partial<Record<CAStatus, { label: string; next: CAStatus }>> = {
  created:     { label: 'Start Work', next: 'in_progress' },
  in_progress: { label: 'Mark Completed', next: 'completed' },
  completed:   { label: 'Verify', next: 'verified' },
  verified:    { label: 'Close', next: 'closed' },
};

const DEMO_LOCATIONS = [
  { id: 'downtown', name: 'Downtown Kitchen' },
  { id: 'airport', name: 'Airport Cafe' },
  { id: 'university', name: 'University Hub' },
];

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

function isOverdue(item: CorrectiveActionItem): boolean {
  if (['completed', 'verified', 'closed', 'archived'].includes(item.status)) return false;
  return new Date(item.dueDate) < new Date(new Date().toISOString().slice(0, 10));
}

// ── Component ────────────────────────────────────────────────

export function CorrectiveActions() {
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  const [filterStatus, setFilterStatus] = useState<'all' | CAStatus>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTab, setCreateTab] = useState<'template' | 'scratch'>('template');
  const [templateCategory, setTemplateCategory] = useState<CACategory | 'all'>('all');
  const [createForm, setCreateForm] = useState<CreateCAForm>(EMPTY_FORM);

  // Detail view state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // AI Assist tracking
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());

  // Local actions state (for demo lifecycle transitions)
  const [localActions, setLocalActions] = useState<CorrectiveActionItem[]>([]);
  const actions = localActions.length > 0 ? localActions : (isDemoMode ? DEMO_CORRECTIVE_ACTIONS : []);

  // Initialize local state from demo data on first render
  useState(() => {
    if (isDemoMode) setLocalActions([...DEMO_CORRECTIVE_ACTIONS]);
  });

  const filtered = useMemo(() => {
    let items = actions;
    if (filterStatus !== 'all') items = items.filter(i => i.status === filterStatus);
    if (filterLocation !== 'all') items = items.filter(i => i.locationId === filterLocation);
    return items;
  }, [filterStatus, filterLocation, actions]);

  const counts = useMemo(() => ({
    open: actions.filter(i => i.status === 'created' || i.status === 'in_progress').length,
    in_progress: actions.filter(i => i.status === 'in_progress').length,
    completed: actions.filter(i => i.status === 'completed').length,
    verified: actions.filter(i => i.status === 'verified').length,
    overdue: actions.filter(i => isOverdue(i)).length,
  }), [actions]);

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
      setShowCreateModal(false);
      setCreateForm(EMPTY_FORM);
      toast.success('Corrective action created');
    });
  }, [guardAction]);

  const handleAdvanceStatus = useCallback((id: string, nextStatus: CAStatus) => {
    guardAction('update', 'Corrective Actions', () => {
      setLocalActions(prev => prev.map(a => {
        if (a.id !== id) return a;
        const now = new Date().toISOString().slice(0, 10);
        const updates: Partial<CorrectiveActionItem> = { status: nextStatus };
        if (nextStatus === 'completed') updates.completedAt = now;
        if (nextStatus === 'verified') updates.verifiedAt = now;
        if (nextStatus === 'closed') updates.closedAt = now;
        if (nextStatus === 'archived') updates.archivedAt = now;
        return { ...a, ...updates };
      }));
      toast.success(`Status updated to ${STATUS_CONFIG[nextStatus].label}`);
    });
  }, [guardAction]);

  const handleArchive = useCallback((id: string) => {
    guardAction('update', 'Corrective Actions', () => {
      setLocalActions(prev => prev.map(a =>
        a.id === id ? { ...a, status: 'archived' as CAStatus, archivedAt: new Date().toISOString().slice(0, 10) } : a
      ));
      toast.success('Corrective action archived');
    });
  }, [guardAction]);

  // ── Templates for modal ─────────────────────────────────

  const filteredTemplates = useMemo(() => getTemplatesByCategory(templateCategory), [templateCategory]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6" style={{ fontFamily: 'system-ui' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: NAVY }}>Corrective Actions</h1>
          <p className="text-sm text-gray-500 mt-1">Track and resolve compliance violations with documented action plans.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white shrink-0"
          style={{ backgroundColor: NAVY }}
        >
          + New Action
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Open', value: counts.open, color: '#dc2626' },
          { label: 'In Progress', value: counts.in_progress, color: '#d97706' },
          { label: 'Completed', value: counts.completed, color: '#16a34a' },
          { label: 'Verified', value: counts.verified, color: NAVY },
          { label: 'Overdue', value: counts.overdue, color: '#991b1b' },
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
          <option value="created">Created</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="verified">Verified</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
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
        {(filterStatus !== 'all' || filterLocation !== 'all') && (
          <button
            onClick={() => { setFilterStatus('all'); setFilterLocation('all'); }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Action list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
            No corrective actions match the selected filters.
          </div>
        )}
        {filtered.map(item => {
          const sev = SEVERITY_CONFIG[item.severity];
          const stat = STATUS_CONFIG[item.status];
          const overdue = isOverdue(item);
          const StatusIcon = stat.icon;
          const isExpanded = expandedId === item.id;
          const lifecycle = LIFECYCLE_NEXT[item.status];

          return (
            <div key={item.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Row header */}
              <div
                className="p-4 cursor-pointer transition-all hover:bg-gray-50"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
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
                      <span className="flex items-center gap-1"><User size={12} />{item.assignee}</span>
                      <span>Source: {item.source}</span>
                      <span>Due: {formatDate(item.dueDate)}</span>
                      {item.completedAt && <span>Completed: {formatDate(item.completedAt)}</span>}
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronDown size={16} className="text-gray-300 shrink-0 mt-1" />
                    : <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1" />
                  }
                </div>
              </div>

              {/* Expanded detail view */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
                  {/* Detail fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailField label="Category" value={CATEGORY_LABELS[item.category]} />
                    <DetailField label="Regulation" value={item.regulationReference || 'N/A'} />
                    <DetailField label="Root Cause" value={item.rootCause || 'Not yet documented'} />
                    <DetailField label="Source" value={item.source} />
                  </div>
                  {item.correctiveSteps && (
                    <DetailField label="Corrective Steps" value={item.correctiveSteps} full />
                  )}
                  {item.preventiveMeasures && (
                    <DetailField label="Preventive Measures" value={item.preventiveMeasures} full />
                  )}

                  {/* Lifecycle buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
                    {lifecycle && item.status !== 'archived' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAdvanceStatus(item.id, lifecycle.next); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5"
                        style={{ backgroundColor: NAVY }}
                      >
                        <ArrowRight size={14} />
                        {lifecycle.label}
                      </button>
                    )}
                    {item.status !== 'archived' && item.status !== 'closed' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleArchive(item.id); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 flex items-center gap-1.5"
                      >
                        <Archive size={14} />
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              )}
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
                      <input
                        type="text"
                        value={createForm.assignee}
                        onChange={e => setCreateForm(f => ({ ...f, assignee: e.target.value }))}
                        placeholder="e.g. David Kim"
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1e4d6b]"
                      />
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

// ── Detail field helper ──────────────────────────────────────

function DetailField({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'col-span-1 sm:col-span-2' : ''}>
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-700">{value}</p>
    </div>
  );
}
