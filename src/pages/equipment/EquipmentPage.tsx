/**
 * EquipmentPage — Equipment inventory with grid/list views, filters, and stats.
 * Route: /equipment
 */
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, LayoutGrid, List, Search, SlidersHorizontal, Wrench, AlertTriangle, Clock, AlertCircle } from 'lucide-react';
import { useEquipment, type EquipmentCondition, type EquipmentStatus } from '../../hooks/api/useEquipment';
import { EquipmentGrid } from '../../components/equipment/EquipmentGrid';
import { EquipmentList } from '../../components/equipment/EquipmentList';
import { EquipmentFormModal } from '../../components/equipment/EquipmentFormModal';
import { BulkQRPrintModal } from '../../components/equipment/BulkQRPrintModal';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY, MUTED } from '../../components/dashboard/shared/constants';

const CONDITION_OPTIONS: { value: EquipmentCondition | ''; label: string }[] = [
  { value: '', label: 'All Conditions' },
  { value: 'clean', label: 'Clean' },
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'heavy', label: 'Heavy' },
  { value: 'deficient', label: 'Deficient' },
];

const STATUS_OPTIONS: { value: EquipmentStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'needs_service', label: 'Needs Service' },
  { value: 'overdue', label: 'Overdue' },
];

export function EquipmentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = (searchParams.get('view') as 'grid' | 'list') || 'grid';
  const typeFilter = searchParams.get('type') || '';
  const conditionFilter = searchParams.get('condition') || '';
  const statusFilter = searchParams.get('status') || '';
  const searchQuery = searchParams.get('q') || '';

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkQR, setShowBulkQR] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const { data: equipment, isLoading } = useEquipment({
    equipmentType: typeFilter || undefined,
    condition: (conditionFilter as EquipmentCondition) || undefined,
    status: (statusFilter as EquipmentStatus) || undefined,
    search: searchQuery || undefined,
  });

  const items = equipment || [];

  const filtered = useMemo(() => {
    let list = items;
    if (typeFilter) list = list.filter(e => e.equipmentType === typeFilter);
    if (conditionFilter) list = list.filter(e => e.condition === conditionFilter);
    if (statusFilter) list = list.filter(e => e.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.customerName.toLowerCase().includes(q) ||
        e.locationName.toLowerCase().includes(q) ||
        e.serialNumber.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, typeFilter, conditionFilter, statusFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: items.length,
    dueForService: items.filter(e => e.status === 'needs_service').length,
    overdue: items.filter(e => e.status === 'overdue').length,
    withDeficiencies: items.filter(e => e.deficiencyCount > 0).length,
  }), [items]);

  const setParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set(key, val);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const handleSearch = () => setParam('q', localSearch);

  // Skeletons
  const StatSkeleton = () => (
    <div className="rounded-lg p-4 animate-pulse" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
      <div className="h-6 w-10 bg-gray-200 rounded" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Equipment</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Track equipment inventory, service schedules, and QR codes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkQR(true)}
            className="px-3 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50 transition-colors"
            style={{ borderColor: CARD_BORDER, color: NAVY }}
          >
            Print QR Codes
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ background: '#1e4d6b' }}
          >
            <Plus className="w-4 h-4" /> Add Equipment
          </button>
        </div>
      </div>

      {/* Stats row */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Wrench} label="Total Equipment" value={stats.total} color="#1e4d6b" />
          <StatCard icon={Clock} label="Due for Service" value={stats.dueForService} color="#D97706" />
          <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} color="#DC2626" />
          <StatCard icon={AlertCircle} label="With Deficiencies" value={stats.withDeficiencies} color="#7C3AED" />
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: TEXT_TERTIARY }} />
          <input
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search equipment..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30"
            style={{ background: CARD_BG, borderColor: CARD_BORDER, color: NAVY }}
          />
        </div>

        <select
          value={typeFilter}
          onChange={e => setParam('type', e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border"
          style={{ borderColor: CARD_BORDER, color: NAVY }}
        >
          <option value="">All Types</option>
          <option value="hood">Hood System</option>
          <option value="duct">Ductwork</option>
          <option value="fan">Fan/Blower</option>
          <option value="filter">Grease Filter</option>
          <option value="suppression">Fire Suppression</option>
          <option value="extinguisher">Fire Extinguisher</option>
          <option value="ansul">Ansul System</option>
        </select>

        <select
          value={conditionFilter}
          onChange={e => setParam('condition', e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border"
          style={{ borderColor: CARD_BORDER, color: NAVY }}
        >
          {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={e => setParam('status', e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border"
          style={{ borderColor: CARD_BORDER, color: NAVY }}
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* View toggle */}
        <div className="flex rounded-lg border overflow-hidden ml-auto" style={{ borderColor: CARD_BORDER }}>
          <button
            onClick={() => setParam('view', 'grid')}
            className="px-3 py-2 transition-colors"
            style={{ background: view === 'grid' ? '#1e4d6b' : CARD_BG, color: view === 'grid' ? 'white' : TEXT_TERTIARY }}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setParam('view', 'list')}
            className="px-3 py-2 transition-colors"
            style={{ background: view === 'list' ? '#1e4d6b' : CARD_BG, color: view === 'list' ? 'white' : TEXT_TERTIARY }}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <div className="h-8 w-8 bg-gray-200 rounded-lg mb-3" />
              <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-1/2 bg-gray-200 rounded mb-4" />
              <div className="h-3 w-full bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <Wrench className="w-12 h-12 mx-auto mb-3" style={{ color: TEXT_TERTIARY }} />
          <p className="text-base font-semibold" style={{ color: NAVY }}>
            {items.length === 0 ? 'Add your first piece of equipment' : 'No equipment matches your filters'}
          </p>
          <p className="text-sm mt-1" style={{ color: TEXT_TERTIARY }}>
            {items.length === 0
              ? 'Track inventory, service schedules, and generate QR codes.'
              : 'Try adjusting your filters or search query.'}
          </p>
          {items.length === 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 text-sm font-semibold text-white rounded-lg"
              style={{ background: '#1e4d6b' }}
            >
              Add Equipment
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <EquipmentGrid items={filtered} />
      ) : (
        <EquipmentList items={filtered} onBulkPrintQR={() => setShowBulkQR(true)} />
      )}

      {/* Modals */}
      {showAddModal && <EquipmentFormModal onClose={() => setShowAddModal(false)} />}
      {showBulkQR && <BulkQRPrintModal items={filtered} onClose={() => setShowBulkQR(false)} />}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Wrench; label: string; value: number; color: string }) {
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
