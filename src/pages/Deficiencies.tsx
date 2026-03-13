import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  Search,
  Plus,
  ChevronRight,
  ArrowUpDown,
  Bot,
} from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { AddDeficiencyModal } from '../components/deficiencies/AddDeficiencyModal';
import {
  DEMO_DEFICIENCIES,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
  SEVERITY_ORDER,
  daysOpen,
  type DeficiencyItem,
  type DefSeverity,
  type DefStatus,
} from '../data/deficienciesDemoData';

const NAVY = '#1e4d6b';

const SEVERITY_ICONS = {
  critical: AlertOctagon,
  major: AlertTriangle,
  minor: AlertCircle,
  advisory: Info,
};

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type SortKey = 'severity' | 'foundDate' | 'daysOpen';

export function Deficiencies() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  const statusFilter = (searchParams.get('status') || 'all') as DefStatus | 'all';
  const severityFilter = (searchParams.get('severity') || 'all') as DefSeverity | 'all';
  const searchQuery = searchParams.get('q') || '';
  const sortBy = (searchParams.get('sort') || 'severity') as SortKey;

  const [showAddModal, setShowAddModal] = useState(false);
  const [localRecords, setLocalRecords] = useState<DeficiencyItem[]>(DEMO_DEFICIENCIES);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all' || value === '') next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  // ── Stats ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const openItems = localRecords.filter(d => d.status === 'open');
    const critOpen = openItems.filter(d => d.severity === 'critical').length;
    return {
      open: openItems.length,
      critOpen,
      acknowledged: localRecords.filter(d => d.status === 'acknowledged').length,
      inProgress: localRecords.filter(d => d.status === 'in_progress').length,
      resolvedMonth: localRecords.filter(d => d.status === 'resolved' && d.resolvedAt && new Date(d.resolvedAt) >= monthStart).length,
    };
  }, [localRecords]);

  // ── Filter + Sort ─────────────────────────────────────────
  const filtered = useMemo(() => {
    let items = [...localRecords];
    if (statusFilter !== 'all') items = items.filter(d => d.status === statusFilter);
    if (severityFilter !== 'all') items = items.filter(d => d.severity === severityFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.locationName.toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => {
      if (sortBy === 'severity') return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (sortBy === 'foundDate') return new Date(b.foundDate).getTime() - new Date(a.foundDate).getTime();
      return daysOpen(b) - daysOpen(a);
    });
    return items;
  }, [localRecords, statusFilter, severityFilter, searchQuery, sortBy]);

  // ── Add Deficiency Handler ────────────────────────────────
  const handleAddDeficiency = (data: {
    code: string; title: string; description: string;
    locationDescription: string; locationId: string;
    severity: DefSeverity; estimatedCost: number | null;
  }) => {
    guardAction('create', 'Deficiencies', () => {
      const loc = { downtown: 'Downtown Kitchen', airport: 'Airport Concourse B', university: 'University Dining Hall' }[data.locationId] || data.locationId;
      const newDef: DeficiencyItem = {
        id: `def-new-${Date.now()}`,
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

  // ── Stats Card ────────────────────────────────────────────
  const StatCard = ({ label, value, sub, accent }: { label: string; value: number; sub?: string; accent?: string }) => (
    <div className="rounded-xl border p-4" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
      <p className="text-sm font-medium" style={{ color: '#6B7F96' }}>{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: accent || '#0B1628' }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#dc2626' }}>{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6 pb-24 lg:pb-8" style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}>
      <Breadcrumb items={[{ label: 'Compliance', path: '/compliance' }, { label: 'Deficiencies' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0B1628' }}>Deficiencies</h1>
          <p className="text-sm mt-1" style={{ color: '#3D5068' }}>
            Compliance code violations found during service visits and inspections
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

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Open" value={stats.open} sub={stats.critOpen > 0 ? `${stats.critOpen} critical` : undefined} accent="#dc2626" />
        <StatCard label="Acknowledged" value={stats.acknowledged} accent="#d97706" />
        <StatCard label="In Progress" value={stats.inProgress} accent="#2563eb" />
        <StatCard label="Resolved This Month" value={stats.resolvedMonth} accent="#16a34a" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setFilter('status', e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
          style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="deferred">Deferred</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setFilter('severity', e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
          style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="major">Major</option>
          <option value="minor">Minor</option>
          <option value="advisory">Advisory</option>
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B7F96' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setFilter('q', e.target.value)}
            placeholder="Search deficiencies..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) => setFilter('sort', e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
          style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
        >
          <option value="severity">Sort: Severity</option>
          <option value="foundDate">Sort: Date Found</option>
          <option value="daysOpen">Sort: Days Open</option>
        </select>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block rounded-xl border overflow-hidden" style={{ borderColor: '#D1D9E6' }}>
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: '#EEF1F7' }}>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7F96' }}>Sev</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7F96' }}>Code</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7F96' }}>Title</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7F96' }}>Location</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7F96' }}>Found</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7F96' }}>Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7F96' }}>Days</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => {
              const sev = SEVERITY_CONFIG[d.severity];
              const stat = STATUS_CONFIG[d.status];
              const Icon = SEVERITY_ICONS[d.severity];
              return (
                <tr
                  key={d.id}
                  onClick={() => navigate(`/deficiencies/${d.id}`)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors border-t"
                  style={{
                    borderColor: '#E8EDF5',
                    ...(d.severity === 'critical' ? { borderLeft: '4px solid #dc2626' } : {}),
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-4 h-4" style={{ color: sev.color }} />
                      {d.aiDetected && <Bot className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono font-medium" style={{ color: sev.color }}>{d.code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium" style={{ color: '#0B1628' }}>{d.title}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm" style={{ color: '#3D5068' }}>{d.locationName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm" style={{ color: '#3D5068' }}>{formatDate(d.foundDate)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ color: stat.color, backgroundColor: stat.bg }}
                    >
                      {stat.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium" style={{ color: '#0B1628' }}>{daysOpen(d)}</span>
                  </td>
                  <td className="px-2 py-3">
                    <ChevronRight className="w-4 h-4" style={{ color: '#6B7F96' }} />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-sm" style={{ color: '#6B7F96' }}>
                  No deficiencies match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {filtered.map((d) => {
          const sev = SEVERITY_CONFIG[d.severity];
          const stat = STATUS_CONFIG[d.status];
          const Icon = SEVERITY_ICONS[d.severity];
          return (
            <div
              key={d.id}
              onClick={() => navigate(`/deficiencies/${d.id}`)}
              className="rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#D1D9E6',
                ...(d.severity === 'critical' ? { borderLeftWidth: '4px', borderLeftColor: '#dc2626' } : {}),
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: sev.color }} />
                  <span className="text-xs font-mono font-medium" style={{ color: sev.color }}>{d.code}</span>
                  {d.aiDetected && <Bot className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />}
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                  style={{ color: stat.color, backgroundColor: stat.bg }}
                >
                  {stat.label}
                </span>
              </div>
              <p className="text-sm font-medium mt-2" style={{ color: '#0B1628' }}>{d.title}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs" style={{ color: '#6B7F96' }}>{d.locationName}</span>
                <span className="text-xs font-medium" style={{ color: '#3D5068' }}>{daysOpen(d)}d open</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm" style={{ color: '#6B7F96' }}>
            No deficiencies match your filters.
          </div>
        )}
      </div>

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
