/**
 * IncidentReportsPage -- Safety incident tracking with stats, filters, and table.
 * Route: /safety/incidents
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, UserX, Eye, Search as SearchIcon } from 'lucide-react';
import {
  useIncidentReports,
  type SafetyIncidentType,
  type IncidentSeverity,
  type IncidentReportStatus,
  type IncidentReport,
} from '../../hooks/api/useIncidents';

// ── Design tokens ────────────────────────────────────────────
const NAVY = '#163a5f';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#D1D9E6';
const CARD_SHADOW = '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)';
const TEXT_TERTIARY = '#6B7F96';

// ── Type options ─────────────────────────────────────────────
const TYPE_OPTIONS: { value: SafetyIncidentType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'injury', label: 'Injury' },
  { value: 'near_miss', label: 'Near Miss' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'vehicle_accident', label: 'Vehicle Accident' },
  { value: 'chemical_exposure', label: 'Chemical Exposure' },
];

const SEVERITY_OPTIONS: { value: IncidentSeverity | ''; label: string }[] = [
  { value: '', label: 'All Severities' },
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'serious', label: 'Serious' },
  { value: 'critical', label: 'Critical' },
];

// ── Badge configs ────────────────────────────────────────────
const TYPE_BADGE: Record<SafetyIncidentType, { bg: string; text: string; label: string }> = {
  injury: { bg: '#FEF2F2', text: '#DC2626', label: 'Injury' },
  near_miss: { bg: '#FFF7ED', text: '#D97706', label: 'Near Miss' },
  property_damage: { bg: '#EFF6FF', text: '#2563EB', label: 'Property Damage' },
  vehicle_accident: { bg: '#FAF5FF', text: '#7C3AED', label: 'Vehicle Accident' },
  chemical_exposure: { bg: '#ECFDF5', text: '#059669', label: 'Chemical Exposure' },
};

const SEVERITY_BADGE: Record<IncidentSeverity, { bg: string; text: string }> = {
  minor: { bg: '#F1F5F9', text: '#64748B' },
  moderate: { bg: '#FEF3C7', text: '#D97706' },
  serious: { bg: '#FFF7ED', text: '#EA580C' },
  critical: { bg: '#FEF2F2', text: '#DC2626' },
};

const STATUS_BADGE: Record<IncidentReportStatus, { bg: string; text: string; label: string }> = {
  reported: { bg: '#F1F5F9', text: '#64748B', label: 'Reported' },
  investigating: { bg: '#EFF6FF', text: '#2563EB', label: 'Investigating' },
  resolved: { bg: '#F0FDF4', text: '#16a34a', label: 'Resolved' },
  closed: { bg: '#F8FAFC', text: '#475569', label: 'Closed' },
};

// ── Stat card ────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof ShieldAlert;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="rounded-lg p-4 text-center"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2"
        style={{ background: `${color}12` }}
      >
        <Icon className="w-4.5 h-4.5" style={{ color }} />
      </div>
      <p className="text-xs" style={{ color: TEXT_TERTIARY }}>{label}</p>
      <p className="text-xl font-bold mt-1" style={{ color: NAVY }}>{value}</p>
    </div>
  );
}

// ── Format helpers ───────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Main component ───────────────────────────────────────────
export function IncidentReportsPage() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<SafetyIncidentType | ''>('');
  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | ''>('');

  const filters = useMemo(() => {
    const f: { incidentType?: SafetyIncidentType; severity?: IncidentSeverity } = {};
    if (typeFilter) f.incidentType = typeFilter;
    if (severityFilter) f.severity = severityFilter;
    return Object.keys(f).length > 0 ? f : undefined;
  }, [typeFilter, severityFilter]);

  const { data: incidents, isLoading } = useIncidentReports(filters);
  const items = incidents || [];

  const filtered = useMemo(() => {
    let list = items;
    if (typeFilter) list = list.filter((i) => i.incidentType === typeFilter);
    if (severityFilter) list = list.filter((i) => i.severity === severityFilter);
    return list;
  }, [items, typeFilter, severityFilter]);

  const stats = useMemo(() => ({
    total: items.length,
    injuries: items.filter((i) => i.incidentType === 'injury').length,
    nearMisses: items.filter((i) => i.incidentType === 'near_miss').length,
    openInvestigations: items.filter((i) => i.status === 'investigating').length,
  }), [items]);

  // ── Skeletons ──────────────────────────────────────────────
  const StatSkeleton = () => (
    <div className="rounded-lg p-4 animate-pulse" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <div className="h-9 w-9 bg-[#1E2D4D]/8 rounded-lg mx-auto mb-2" />
      <div className="h-3 w-16 bg-[#1E2D4D]/8 rounded mx-auto mb-2" />
      <div className="h-6 w-10 bg-[#1E2D4D]/8 rounded mx-auto" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6" style={{ color: NAVY }} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>Safety Incidents</h1>
        </div>
        <button
          onClick={() => navigate('/safety/incidents/new')}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
          style={{ background: '#DC2626' }}
        >
          <ShieldAlert className="w-4 h-4" />
          Report Incident
        </button>
      </div>

      {/* Stats row */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={ShieldAlert} label="Total Incidents (Quarter)" value={stats.total} color="#1E2D4D" />
          <StatCard icon={UserX} label="Injuries" value={stats.injuries} color="#DC2626" />
          <StatCard icon={Eye} label="Near Misses" value={stats.nearMisses} color="#D97706" />
          <StatCard icon={SearchIcon} label="Open Investigations" value={stats.openInvestigations} color="#7C3AED" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as SafetyIncidentType | '')}
          className="px-3 py-2 text-sm rounded-lg border"
          style={{ borderColor: CARD_BORDER, color: NAVY }}
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as IncidentSeverity | '')}
          className="px-3 py-2 text-sm rounded-lg border"
          style={{ borderColor: CARD_BORDER, color: NAVY }}
        >
          {SEVERITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-xl animate-pulse" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-6 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
              <div className="h-4 w-20 bg-[#1E2D4D]/8 rounded" />
              <div className="h-4 w-20 bg-[#1E2D4D]/8 rounded" />
              <div className="h-4 w-16 bg-[#1E2D4D]/8 rounded" />
              <div className="h-4 w-24 bg-[#1E2D4D]/8 rounded" />
              <div className="h-4 w-24 bg-[#1E2D4D]/8 rounded" />
              <div className="h-4 w-16 bg-[#1E2D4D]/8 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        >
          <ShieldAlert className="w-12 h-12 mx-auto mb-3" style={{ color: TEXT_TERTIARY }} />
          <p className="text-base font-semibold" style={{ color: NAVY }}>No safety incidents reported</p>
          <p className="text-sm mt-1" style={{ color: TEXT_TERTIARY }}>
            Safety incidents will appear here once reported.
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                  {['Date', 'Type', 'Severity', 'Location', 'Reported By', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: TEXT_TERTIARY }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inc: IncidentReport) => {
                  const typeBadge = TYPE_BADGE[inc.incidentType];
                  const sevBadge = SEVERITY_BADGE[inc.severity];
                  const statusBadge = STATUS_BADGE[inc.status];
                  return (
                    <tr
                      key={inc.id}
                      className="hover:bg-gray-50/50 transition-colors"
                      style={{ borderBottom: `1px solid ${CARD_BORDER}` }}
                    >
                      <td className="px-4 py-3" style={{ color: NAVY }}>{formatDate(inc.incidentDate)}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: typeBadge.bg, color: typeBadge.text }}
                        >
                          {typeBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: sevBadge.bg, color: sevBadge.text }}
                        >
                          {capitalize(inc.severity)}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: NAVY }}>{inc.location}</td>
                      <td className="px-4 py-3" style={{ color: TEXT_TERTIARY }}>{inc.reportedByName || inc.reportedBy}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: statusBadge.bg, color: statusBadge.text }}
                        >
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/safety/incidents/${inc.id}`)}
                          className="text-xs font-medium px-3 py-1 rounded-md transition-colors"
                          style={{ color: '#1E2D4D', background: '#1E2D4D12' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
