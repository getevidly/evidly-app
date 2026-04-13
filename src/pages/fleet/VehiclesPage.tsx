/**
 * VehiclesPage — Fleet inventory with tabs, stats, filters, and table.
 * Route: /fleet
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Plus, Search, Wrench, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useVehicles, type VehicleType, type VehicleStatus } from '../../hooks/api/useVehicles';
import { VehicleFormModal } from '../../components/fleet/VehicleFormModal';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY } from '../../components/dashboard/shared/constants';

const TYPE_TABS: { value: VehicleType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'truck', label: 'Trucks' },
  { value: 'van', label: 'Vans' },
  { value: 'trailer', label: 'Trailers' },
];

const STATUS_BADGE: Record<VehicleStatus, { label: string; bg: string; text: string }> = {
  active: { label: 'Active', bg: '#dcfce7', text: '#16a34a' },
  maintenance: { label: 'Maintenance', bg: '#fef3c7', text: '#d97706' },
  out_of_service: { label: 'Out of Service', bg: '#fee2e2', text: '#dc2626' },
  sold: { label: 'Sold', bg: '#e5e7eb', text: '#6b7280' },
};

export function VehiclesPage() {
  const navigate = useNavigate();
  const [typeTab, setTypeTab] = useState<VehicleType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const { data: vehicles, isLoading } = useVehicles({
    vehicleType: typeTab !== 'all' ? typeTab : undefined,
    search: search || undefined,
  });

  const items = vehicles || [];

  const filtered = useMemo(() => {
    let list = items;
    if (typeTab !== 'all') list = list.filter(v => v.vehicleType === typeTab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        v.name.toLowerCase().includes(q) ||
        (v.make?.toLowerCase().includes(q)) ||
        (v.model?.toLowerCase().includes(q)) ||
        (v.licensePlate?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, typeTab, search]);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(v => v.status === 'active').length,
    inMaintenance: items.filter(v => v.status === 'maintenance').length,
    regExpiring: items.filter(v => {
      if (!v.registrationExpiry) return false;
      const diff = new Date(v.registrationExpiry).getTime() - Date.now();
      return diff > 0 && diff < 30 * 86400000;
    }).length,
  }), [items]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6" style={{ color: NAVY }} />
            <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Fleet</h1>
          </div>
          <p className="text-sm mt-1" style={{ color: TEXT_TERTIARY }}>Manage vehicles, maintenance, and registrations.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
          style={{ background: NAVY }}
        >
          <Plus className="w-4 h-4" /> Add Vehicle
        </button>
      </div>

      {/* Stats row */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg p-4 animate-pulse" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <div className="h-3 w-20 bg-gray-200 rounded mb-2 mx-auto" />
              <div className="h-6 w-10 bg-gray-200 rounded mx-auto" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Truck} label="Total Vehicles" value={stats.total} color={NAVY} />
          <StatCard icon={CheckCircle} label="Active" value={stats.active} color="#16a34a" />
          <StatCard icon={Wrench} label="In Maintenance" value={stats.inMaintenance} color="#d97706" />
          <StatCard icon={Clock} label="Reg. Expiring" value={stats.regExpiring} color="#dc2626" />
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: CARD_BORDER }}>
          {TYPE_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setTypeTab(t.value)}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{
                background: typeTab === t.value ? NAVY : CARD_BG,
                color: typeTab === t.value ? 'white' : TEXT_TERTIARY,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: TEXT_TERTIARY }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search vehicles..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30"
            style={{ background: CARD_BG, borderColor: CARD_BORDER, color: NAVY }}
          />
        </div>
      </div>

      {/* Table / Empty state */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg p-4 animate-pulse" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <div className="h-4 w-full bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <Truck className="w-12 h-12 mx-auto mb-3" style={{ color: TEXT_TERTIARY }} />
          <p className="text-base font-semibold" style={{ color: NAVY }}>
            {items.length === 0 ? 'Add your first vehicle' : 'No vehicles match your filters'}
          </p>
          <p className="text-sm mt-1" style={{ color: TEXT_TERTIARY }}>
            {items.length === 0
              ? 'Track your fleet, maintenance schedules, and registrations.'
              : 'Try adjusting your search or tab filter.'}
          </p>
          {items.length === 0 && (
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 px-4 py-2 text-sm font-semibold text-white rounded-lg"
              style={{ background: NAVY }}
            >
              Add Vehicle
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: CARD_BORDER }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#F4F6FA' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: NAVY }}>Vehicle</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" style={{ color: NAVY }}>Year/Make/Model</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell" style={{ color: NAVY }}>License Plate</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell" style={{ color: NAVY }}>Assigned To</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell" style={{ color: NAVY }}>Odometer</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: NAVY }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => {
                const badge = STATUS_BADGE[v.status];
                return (
                  <tr
                    key={v.id}
                    onClick={() => navigate(`/fleet/${v.id}`)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors border-t"
                    style={{ borderColor: CARD_BORDER, background: CARD_BG }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: NAVY }}>{v.name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell" style={{ color: TEXT_TERTIARY }}>
                      {[v.year, v.make, v.model].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell" style={{ color: TEXT_TERTIARY }}>
                      {v.licensePlate || '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell" style={{ color: TEXT_TERTIARY }}>
                      {v.assignedEmployeeName || 'Unassigned'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell" style={{ color: TEXT_TERTIARY }}>
                      {v.currentOdometer ? v.currentOdometer.toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: badge.bg, color: badge.text }}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <VehicleFormModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Truck; label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: `${color}12` }}>
        <Icon className="w-4.5 h-4.5" style={{ color }} />
      </div>
      <p className="text-xs" style={{ color: TEXT_TERTIARY }}>{label}</p>
      <p className="text-xl font-bold mt-1" style={{ color: NAVY }}>{value}</p>
    </div>
  );
}
