import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  Plus,
  Bot,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { AddDeficiencyModal } from '../components/deficiencies/AddDeficiencyModal';
import { ErrorState, PageEmptyState } from '../components/shared/PageStates';
import {
  DEMO_DEFICIENCIES,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
  SEVERITY_ORDER,
  daysOpen,
  type DeficiencyItem,
  type DefCategory,
  type DefSeverity,
  type DefStatus,
} from '../data/deficienciesDemoData';
import { usePageTitle } from '../hooks/usePageTitle';
import { useDeficiencyRecurringPatterns } from '../hooks/deficiencies/useDeficiencyRecurringPatterns';
import { useDeficienciesPRPStats } from '../hooks/deficiencies/useDeficienciesPRPStats';
import { DeficienciesPRPBand } from '../components/deficiencies/DeficienciesPRPBand';
import { DeficienciesFilterBar } from '../components/deficiencies/DeficienciesFilterBar';
import { DeficienciesRecurringBar } from '../components/deficiencies/DeficienciesRecurringBar';
import { prp } from '../lib/designSystem';

const NAVY = '#1E2D4D';

const SEVERITY_ICONS = {
  critical: AlertOctagon,
  major: AlertTriangle,
  minor: AlertCircle,
  advisory: Info,
};

type SortKey = 'severity' | 'foundDate' | 'deadline';

export function Deficiencies() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  usePageTitle('Deficiencies');

  const statusFilter = (searchParams.get('status') || 'all') as DefStatus | 'all';
  const severityFilter = (searchParams.get('severity') || 'all') as DefSeverity | 'all';
  const categoryFilter = (searchParams.get('category') || 'all') as DefCategory | 'all';
  const searchQuery = searchParams.get('q') || '';
  const sortBy = (searchParams.get('sort') || 'severity') as SortKey;
  const locationFilter = searchParams.get('location') || 'all';
  const inspectorFilter = searchParams.get('inspector') || 'all';

  const [showAddModal, setShowAddModal] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [localRecords, setLocalRecords] = useState<DeficiencyItem[]>(() => {
    try {
      return isDemoMode ? DEMO_DEFICIENCIES : [];
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to load deficiencies data');
      return [];
    }
  });

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all' || value === '') next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  // ── PRP hooks ──────────────────────────────────────────────
  const recurringPatterns = useDeficiencyRecurringPatterns(localRecords);
  const prpStats = useDeficienciesPRPStats(localRecords, recurringPatterns);

  const recurringDeficiencyIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of recurringPatterns) {
      for (const id of p.deficiencyIds) ids.add(id);
    }
    return ids;
  }, [recurringPatterns]);

  const locations = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of localRecords) {
      if (d.locationId) map.set(d.locationId, d.locationName);
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [localRecords]);

  const inspectors = useMemo(() => {
    const set = new Set<string>();
    for (const d of localRecords) {
      if (d.foundBy) set.add(d.foundBy);
    }
    return Array.from(set).sort();
  }, [localRecords]);

  const hasAnyFilters = statusFilter !== 'all' || severityFilter !== 'all' || categoryFilter !== 'all' || locationFilter !== 'all' || inspectorFilter !== 'all' || searchQuery !== '';

  const clearFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  // ── Filter + Sort ─────────────────────────────────────────
  const filtered = useMemo(() => {
    let items = [...localRecords];
    if (statusFilter !== 'all') items = items.filter(d => d.status === statusFilter);
    if (severityFilter !== 'all') items = items.filter(d => d.severity === severityFilter);
    if (categoryFilter !== 'all') items = items.filter(d => d.category === categoryFilter);
    if (locationFilter !== 'all') items = items.filter(d => d.locationId === locationFilter);
    if (inspectorFilter !== 'all') items = items.filter(d => d.foundBy === inspectorFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.locationName.toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q)
      );
    }
    const TIMELINE_DAYS: Record<string, number> = { immediate: 0, '30_days': 30, '90_days': 90 };
    items.sort((a, b) => {
      if (sortBy === 'severity') return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (sortBy === 'foundDate') return new Date(b.foundDate).getTime() - new Date(a.foundDate).getTime();
      if (sortBy === 'deadline') {
        const dA = TIMELINE_DAYS[a.timelineRequirement] !== undefined
          ? new Date(a.foundDate + 'T00:00:00').getTime() + TIMELINE_DAYS[a.timelineRequirement] * 86400000
          : Infinity;
        const dB = TIMELINE_DAYS[b.timelineRequirement] !== undefined
          ? new Date(b.foundDate + 'T00:00:00').getTime() + TIMELINE_DAYS[b.timelineRequirement] * 86400000
          : Infinity;
        return dA - dB;
      }
      return daysOpen(b) - daysOpen(a);
    });
    return items;
  }, [localRecords, statusFilter, severityFilter, categoryFilter, locationFilter, inspectorFilter, searchQuery, sortBy]);

  // ── Section splits for PRP grouping ─────────────────────────
  const approachingItems = useMemo(() =>
    filtered.filter(d => prpStats.approachingIds.has(d.id)),
    [filtered, prpStats.approachingIds]
  );
  const recurringOnlyItems = useMemo(() =>
    filtered.filter(d => recurringDeficiencyIds.has(d.id) && !prpStats.approachingIds.has(d.id)),
    [filtered, recurringDeficiencyIds, prpStats.approachingIds]
  );
  const remainingItems = useMemo(() =>
    filtered.filter(d => !prpStats.approachingIds.has(d.id) && !recurringDeficiencyIds.has(d.id)),
    [filtered, prpStats.approachingIds, recurringDeficiencyIds]
  );

  // ── Add Deficiency Handler ────────────────────────────────
  const handleAddDeficiency = (data: {
    category: DefCategory; code: string; title: string; description: string;
    locationDescription: string; locationId: string;
    severity: DefSeverity; estimatedCost: number | null;
  }) => {
    guardAction('create', 'Deficiencies', () => {
      const loc = data.locationId;
      const newDef: DeficiencyItem = {
        id: `def-new-${Date.now()}`,
        category: data.category,
        code: data.code,
        title: data.title,
        description: data.description,
        locationDescription: data.locationDescription,
        severity: data.severity,
        status: 'open',
        locationId: data.locationId,
        locationName: loc,
        customerName: 'Maria Rodriguez',
        equipmentId: null,
        equipmentName: null,
        serviceRecordId: null,
        foundBy: 'You',
        foundDate: new Date().toISOString().slice(0, 10),
        requiredAction: '',
        timelineRequirement: '30_days',
        estimatedCost: data.estimatedCost,
        resolvedAt: null,
        resolvedBy: null,
        resolutionNotes: null,
        followUpServiceRecordId: null,
        deferredReason: null,
        deferredUntil: null,
        timeline: [{ status: 'open', date: new Date().toISOString().slice(0, 10), by: 'You', notes: 'Manually created.' }],
        photoIds: [],
        resolutionPhotoIds: [],
        aiDetected: false,
        aiConfidence: null,
      };
      setLocalRecords(prev => [newDef, ...prev]);
      setShowAddModal(false);
      toast.success('Deficiency added');
    });
  };

  if (pageError) {
    return <ErrorState error={pageError} onRetry={() => { setPageError(null); setLocalRecords(isDemoMode ? DEMO_DEFICIENCIES : []); }} />;
  }

  // ── Card renderer ─────────────────────────────────────────
  const renderDeficiencyCard = (d: DeficiencyItem) => {
    const sev = SEVERITY_CONFIG[d.severity];
    const stat = STATUS_CONFIG[d.status];
    const Icon = SEVERITY_ICONS[d.severity];
    const isApproaching = prpStats.approachingIds.has(d.id);
    const isRecurring = recurringDeficiencyIds.has(d.id);

    return (
      <div
        key={d.id}
        onClick={() => navigate(`/deficiencies/${d.id}`)}
        className="bg-white rounded-xl border border-[#E2DDD4] p-4 cursor-pointer hover:shadow-md transition-shadow"
        style={d.severity === 'critical' ? { borderLeftWidth: '4px', borderLeftColor: '#b3261e' } : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon size={16} style={{ color: sev.color }} />
            <span className="text-xs font-mono font-medium" style={{ color: sev.color }}>{d.code}</span>
            {d.aiDetected && <Bot size={14} style={{ color: '#2563eb' }} />}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {isApproaching && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ color: '#c2731a', backgroundColor: 'rgba(194,115,26,0.12)', border: '1px dashed #c2731a' }}
              >
                Predict · Deadline
              </span>
            )}
            {isRecurring && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ color: '#A08C5A', backgroundColor: 'rgba(160,140,90,0.15)' }}
              >
                Recurring
              </span>
            )}
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ color: stat.color, backgroundColor: stat.bg }}
            >
              {stat.label}
            </span>
          </div>
        </div>
        <p className="text-sm font-medium mt-2" style={{ color: '#0B1628' }}>{d.title}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs" style={{ color: '#6B7F96' }}>{d.locationName}</span>
          <span className="text-xs font-medium" style={{ color: '#3D5068' }}>
            {d.status === 'resolved' ? 'Corrected' : `${daysOpen(d)}d open`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-8" style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}>
      <Breadcrumb items={[{ label: 'Compliance', path: '/compliance' }, { label: 'Deficiencies' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0B1628' }}>Deficiencies</h1>
          <p className="text-sm mt-1" style={{ color: '#3D5068' }}>
            Predict what's approaching deadline. Reduce open exposure. Prove every correction.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors whitespace-nowrap"
          style={{ backgroundColor: NAVY }}
        >
          <Plus className="w-4 h-4" /> Add Deficiency
        </button>
      </div>

      {/* Empty state */}
      {!isDemoMode && localRecords.length === 0 && (
        <div className="text-center py-16 space-y-4">
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: 'rgba(47,122,77,0.1)' }}>
            <CheckCircle size={28} style={{ color: '#2f7a4d' }} />
          </div>
          <div>
            <p className="text-lg font-semibold" style={{ color: NAVY }}>No deficiencies recorded</p>
            <p className="text-sm mt-1" style={{ color: '#6B7F96' }}>
              When code violations are found during inspections and service visits, they appear here.
            </p>
          </div>
          <div className="grid grid-cols-3 max-w-md mx-auto gap-3 text-center">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.12em]" style={{ color: prp.predict.accent }}>PREDICT</p>
              <p className="text-[11px] text-[#8A93A6]">Approaching deadlines</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.12em]" style={{ color: prp.reduce.accent }}>REDUCE</p>
              <p className="text-[11px] text-[#8A93A6]">Exposure range</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.12em]" style={{ color: prp.prove.accent }}>PROVE</p>
              <p className="text-[11px] text-[#8A93A6]">Every correction</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: NAVY }}
          >
            <Plus className="w-4 h-4" /> Add first deficiency
          </button>
          <p className="text-[11px] italic text-[#8A93A6] max-w-sm mx-auto">
            Deficiencies will flow in automatically from service reports and AI-detected findings.
          </p>
        </div>
      )}

      {localRecords.length > 0 && <>
      {/* PRP Band */}
      <DeficienciesPRPBand stats={prpStats} loading={false} />

      {/* Filter Bar */}
      <DeficienciesFilterBar
        statusFilter={statusFilter as 'all' | DefStatus}
        severityFilter={severityFilter as 'all' | DefSeverity}
        categoryFilter={categoryFilter as 'all' | DefCategory}
        locationFilter={locationFilter}
        inspectorFilter={inspectorFilter}
        sortBy={sortBy}
        locations={locations}
        inspectors={inspectors}
        hasAnyFilters={hasAnyFilters}
        onStatusChange={(v) => setFilter('status', v)}
        onSeverityChange={(v) => setFilter('severity', v)}
        onCategoryChange={(v) => setFilter('category', v)}
        onLocationChange={(v) => setFilter('location', v)}
        onInspectorChange={(v) => setFilter('inspector', v)}
        onSortChange={(v) => setFilter('sort', v)}
        onClearFilters={clearFilters}
      />

      <DeficienciesRecurringBar patterns={recurringPatterns} />

      {/* Deficiency list */}
      <div className="space-y-3">
        {approachingItems.length > 0 && (
          <>
            <p className="text-[10px] uppercase font-bold tracking-[0.12em] text-[#8A93A6] pt-2">
              Approaching correction deadline
            </p>
            {approachingItems.map(renderDeficiencyCard)}
          </>
        )}
        {recurringOnlyItems.length > 0 && (
          <>
            <p className="text-[10px] uppercase font-bold tracking-[0.12em] text-[#8A93A6] pt-2">
              Recurring violations
            </p>
            {recurringOnlyItems.map(renderDeficiencyCard)}
          </>
        )}
        {remainingItems.length > 0 && (approachingItems.length > 0 || recurringOnlyItems.length > 0) && (
          <p className="text-[10px] uppercase font-bold tracking-[0.12em] text-[#8A93A6] pt-2">
            All deficiencies
          </p>
        )}
        {remainingItems.map(renderDeficiencyCard)}
        {filtered.length === 0 && (
          <PageEmptyState
            title="No deficiencies match your filters"
            description="Try adjusting your status, severity, or category filters."
          />
        )}
      </div>

      </>}

      {/* Modals */}
      {showAddModal && (
        <AddDeficiencyModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddDeficiency}
        />
      )}

      {showUpgrade && (
        <DemoUpgradePrompt
          feature={upgradeFeature}
          action={upgradeAction}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
