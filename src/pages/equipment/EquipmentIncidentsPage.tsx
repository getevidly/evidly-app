/**
 * EquipmentIncidentsPage -- Equipment incident tracking with stats, filters, and table.
 * Route: /equipment/incidents
 */
import { useState, useMemo } from 'react';
import { AlertTriangle, DollarSign, PackageX, Clock } from 'lucide-react';
import {
  useEquipmentIncidents,
  type EquipmentIncidentType,
  type EquipmentIncident,
} from '../../hooks/api/useIncidents';
import { ReportEquipmentIncidentModal } from '../../components/equipment/ReportEquipmentIncidentModal';

// ── Design tokens ────────────────────────────────────────────
const NAVY = '#163a5f';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#D1D9E6';
const CARD_SHADOW = '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)';
const TEXT_TERTIARY = '#6B7F96';

// ── Filter tabs ──────────────────────────────────────────────
const FILTER_TABS: { value: EquipmentIncidentType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'damage', label: 'Damage' },
  { value: 'loss', label: 'Loss' },
  { value: 'theft', label: 'Theft' },
  { value: 'malfunction', label: 'Malfunction' },
];

// ── Type badge config ────────────────────────────────────────
const TYPE_BADGE: Record<EquipmentIncidentType, { bg: string; text: string; label: string }> = {
  damage: { bg: '#FEF2F2', text: '#DC2626', label: 'Damage' },
  loss: { bg: '#FFF7ED', text: '#D97706', label: 'Loss' },
  theft: { bg: '#FAF5FF', text: '#7C3AED', label: 'Theft' },
  malfunction: { bg: '#EFF6FF', text: '#2563EB', label: 'Malfunction' },
};

// ── Stat card ────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof AlertTriangle;
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

function formatCurrency(amount: number | null): string {
  if (amount == null) return '--';
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

// ── Main component ───────────────────────────────────────────
export function EquipmentIncidentsPage() {
  const [activeFilter, setActiveFilter] = useState<EquipmentIncidentType | 'all'>('all');
  const [showReportModal, setShowReportModal] = useState(false);

  const filterArg = activeFilter === 'all' ? undefined : { incidentType: activeFilter };
  const { data: incidents, isLoading } = useEquipmentIncidents(filterArg);

  const items = incidents || [];

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return items;
    return items.filter((i) => i.incidentType === activeFilter);
  }, [items, activeFilter]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      damage: items.filter((i) => i.incidentType === 'damage').length,
      loss: items.filter((i) => i.incidentType === 'loss').length,
      pending: items.filter((i) => !i.resolvedAt).length,
    };
  }, [items]);

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
          <AlertTriangle className="w-6 h-6" style={{ color: NAVY }} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>Equipment Incidents</h1>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
          style={{ background: '#1E2D4D' }}
        >
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
          <StatCard icon={AlertTriangle} label="Total Incidents" value={stats.total} color="#1E2D4D" />
          <StatCard icon={DollarSign} label="Damage" value={stats.damage} color="#DC2626" />
          <StatCard icon={PackageX} label="Loss" value={stats.loss} color="#D97706" />
          <StatCard icon={Clock} label="Pending Resolution" value={stats.pending} color="#7C3AED" />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg p-1" style={{ background: '#EEF1F7' }}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
            style={{
              background: activeFilter === tab.value ? CARD_BG : 'transparent',
              color: activeFilter === tab.value ? NAVY : TEXT_TERTIARY,
              boxShadow: activeFilter === tab.value ? CARD_SHADOW : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-xl animate-pulse" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-6 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
              <div className="h-4 w-20 bg-[#1E2D4D]/8 rounded" />
              <div className="h-4 w-16 bg-[#1E2D4D]/8 rounded" />
              <div className="h-4 w-32 bg-[#1E2D4D]/8 rounded" />
              <div className="h-4 w-24 bg-[#1E2D4D]/8 rounded" />
              <div className="h-4 w-16 bg-[#1E2D4D]/8 rounded" />
              <div className="h-4 w-16 bg-[#1E2D4D]/8 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        >
          <AlertTriangle className="w-12 h-12 mx-auto mb-3" style={{ color: TEXT_TERTIARY }} />
          <p className="text-base font-semibold" style={{ color: NAVY }}>No equipment incidents reported</p>
          <p className="text-sm mt-1" style={{ color: TEXT_TERTIARY }}>
            Equipment incidents will appear here once reported.
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                  {['Date', 'Type', 'Equipment', 'Employee', 'Est. Cost', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: TEXT_TERTIARY }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inc: EquipmentIncident) => {
                  const badge = TYPE_BADGE[inc.incidentType];
                  const isResolved = !!inc.resolvedAt;
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
                          style={{ background: badge.bg, color: badge.text }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: NAVY }}>{inc.equipmentName}</td>
                      <td className="px-4 py-3" style={{ color: TEXT_TERTIARY }}>{inc.employeeName || inc.employeeId}</td>
                      <td className="px-4 py-3" style={{ color: NAVY }}>{formatCurrency(inc.estimatedCost)}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: isResolved ? '#F0FDF4' : '#FEF3C7',
                            color: isResolved ? '#16a34a' : '#D97706',
                          }}
                        >
                          {isResolved ? 'Resolved' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {!isResolved && (
                          <button
                            onClick={() => alert('Resolve incident flow coming soon.')}
                            className="text-xs font-medium px-3 py-1 rounded-md transition-colors"
                            style={{ color: '#1E2D4D', background: '#1E2D4D12' }}
                          >
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showReportModal && (
        <ReportEquipmentIncidentModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
}
