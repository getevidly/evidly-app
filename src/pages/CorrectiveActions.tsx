import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  ChevronRight,
  User,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Inline demo data ──────────────────────────────────────

type CASeverity = 'critical' | 'high' | 'medium' | 'low';
type CAStatus = 'open' | 'in_progress' | 'resolved' | 'verified';

interface CorrectiveActionItem {
  id: string;
  title: string;
  description: string;
  location: string;
  locationId: string;
  severity: CASeverity;
  status: CAStatus;
  source: string;
  assignee: string;
  createdAt: string;
  dueDate: string;
  resolvedAt: string | null;
}

const daysAgo = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString().slice(0, 10);
};
const daysFromNow = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
};

const DEMO_ACTIONS: CorrectiveActionItem[] = [
  {
    id: 'ca-1', title: 'Walk-in cooler temperature excursion',
    description: 'Walk-in cooler recorded 44.8°F — exceeds 41°F limit. Door was found ajar. Recheck required within 30 minutes.',
    location: 'Airport Cafe', locationId: 'airport', severity: 'critical', status: 'in_progress',
    source: 'Temperature Log', assignee: 'Carlos Rivera', createdAt: daysAgo(1), dueDate: daysFromNow(0), resolvedAt: null,
  },
  {
    id: 'ca-2', title: 'Missing hood suppression inspection certificate',
    description: 'Annual hood suppression system inspection certificate expired. Schedule re-inspection with certified vendor.',
    location: 'University Hub', locationId: 'university', severity: 'high', status: 'open',
    source: 'Fire Safety Audit', assignee: 'Robert Okafor', createdAt: daysAgo(5), dueDate: daysFromNow(2), resolvedAt: null,
  },
  {
    id: 'ca-3', title: 'Handwashing station soap dispenser empty',
    description: 'Prep area handwashing station found without soap during morning inspection. Restocked and verified.',
    location: 'Downtown Kitchen', locationId: 'downtown', severity: 'medium', status: 'resolved',
    source: 'Self-Inspection', assignee: 'Miguel Torres', createdAt: daysAgo(3), dueDate: daysAgo(1), resolvedAt: daysAgo(2),
  },
  {
    id: 'ca-4', title: 'Hot holding unit below minimum temperature',
    description: 'Hot holding unit recorded 131°F — below 135°F minimum. Food reheated to 165°F and returned to holding.',
    location: 'Downtown Kitchen', locationId: 'downtown', severity: 'high', status: 'verified',
    source: 'Temperature Log', assignee: 'Maria Santos', createdAt: daysAgo(4), dueDate: daysAgo(2), resolvedAt: daysAgo(3),
  },
  {
    id: 'ca-5', title: 'Pest control service overdue',
    description: 'Monthly pest control service is 10 days overdue. Contact vendor to reschedule immediately.',
    location: 'Airport Cafe', locationId: 'airport', severity: 'medium', status: 'open',
    source: 'Vendor Tracking', assignee: 'Robert Okafor', createdAt: daysAgo(10), dueDate: daysAgo(3), resolvedAt: null,
  },
  {
    id: 'ca-6', title: 'Employee food handler card expiring',
    description: 'Food handler certification for two staff members expires within 14 days. Schedule renewal.',
    location: 'University Hub', locationId: 'university', severity: 'low', status: 'in_progress',
    source: 'Regulatory Tracking', assignee: 'Sarah Kim', createdAt: daysAgo(7), dueDate: daysFromNow(7), resolvedAt: null,
  },
  {
    id: 'ca-7', title: 'Cutting board cross-contamination risk',
    description: 'Color-coded cutting boards not separated by protein type during prep. Staff retrained on SOP.',
    location: 'Downtown Kitchen', locationId: 'downtown', severity: 'high', status: 'resolved',
    source: 'HACCP Monitoring', assignee: 'Carlos Rivera', createdAt: daysAgo(6), dueDate: daysAgo(4), resolvedAt: daysAgo(5),
  },
  {
    id: 'ca-8', title: 'Receiving log missing for Thursday delivery',
    description: 'Produce delivery on Thursday was not logged in the receiving log. Vendor invoice used to backfill record.',
    location: 'Airport Cafe', locationId: 'airport', severity: 'medium', status: 'verified',
    source: 'Audit Trail Review', assignee: 'Miguel Torres', createdAt: daysAgo(8), dueDate: daysAgo(5), resolvedAt: daysAgo(6),
  },
];

// ── Helpers ──────────────────────────────────────────────

const SEVERITY_CONFIG: Record<CASeverity, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Critical', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
  high:     { label: 'High', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  medium:   { label: 'Medium', color: '#1e4d6b', bg: '#eef4f8', border: '#b8d4e8' },
  low:      { label: 'Low', color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
};

const STATUS_CONFIG: Record<CAStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  open:        { label: 'Open', color: '#dc2626', bg: '#fef2f2', icon: AlertTriangle },
  in_progress: { label: 'In Progress', color: '#d97706', bg: '#fffbeb', icon: Clock },
  resolved:    { label: 'Resolved', color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle2 },
  verified:    { label: 'Verified', color: '#1e4d6b', bg: '#eef4f8', icon: CheckCircle2 },
};

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(item: CorrectiveActionItem): boolean {
  if (item.status === 'resolved' || item.status === 'verified') return false;
  return new Date(item.dueDate) < new Date(new Date().toISOString().slice(0, 10));
}

// ── Component ────────────────────────────────────────────

export function CorrectiveActions() {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<'all' | CAStatus>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');

  const filtered = useMemo(() => {
    let items = DEMO_ACTIONS;
    if (filterStatus !== 'all') items = items.filter(i => i.status === filterStatus);
    if (filterLocation !== 'all') items = items.filter(i => i.locationId === filterLocation);
    return items;
  }, [filterStatus, filterLocation]);

  const counts = useMemo(() => ({
    open: DEMO_ACTIONS.filter(i => i.status === 'open').length,
    in_progress: DEMO_ACTIONS.filter(i => i.status === 'in_progress').length,
    resolved: DEMO_ACTIONS.filter(i => i.status === 'resolved').length,
    verified: DEMO_ACTIONS.filter(i => i.status === 'verified').length,
    overdue: DEMO_ACTIONS.filter(i => isOverdue(i)).length,
  }), []);

  const locations = useMemo(() => {
    const set = new Set(DEMO_ACTIONS.map(i => i.locationId));
    return Array.from(set).map(id => ({
      id,
      name: DEMO_ACTIONS.find(i => i.locationId === id)!.location,
    }));
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6" style={{ fontFamily: 'system-ui' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1e4d6b' }}>Corrective Actions</h1>
          <p className="text-sm text-gray-500 mt-1">Track and resolve compliance violations with documented action plans.</p>
        </div>
        <button
          onClick={() => toast.info('New Corrective Action (Demo)')}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white shrink-0"
          style={{ backgroundColor: '#1e4d6b' }}
        >
          + New Action
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Open', value: counts.open, color: '#dc2626' },
          { label: 'In Progress', value: counts.in_progress, color: '#d97706' },
          { label: 'Resolved', value: counts.resolved, color: '#16a34a' },
          { label: 'Verified', value: counts.verified, color: '#1e4d6b' },
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
          <option value="open">Open</option>
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
          return (
            <div
              key={item.id}
              className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer transition-all hover:shadow-md hover:border-gray-300"
              onClick={() => toast.info(`${item.title} — ${stat.label}`)}
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
                    {item.resolvedAt && <span>Resolved: {formatDate(item.resolvedAt)}</span>}
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
