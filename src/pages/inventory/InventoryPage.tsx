/**
 * InventoryPage — Main inventory list with category tabs, stats, search, and table.
 * Route: /inventory
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Search, Plus, Loader2, AlertTriangle, XCircle, ClipboardCheck } from 'lucide-react';
import { useInventoryItems } from '../../hooks/api/useInventory';
import type { InventoryCategory, InventoryItem } from '../../hooks/api/useInventory';

const NAVY = '#163a5f';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#D1D9E6';
const CARD_SHADOW = '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)';
const TEXT_TERTIARY = '#6B7F96';

type CategoryTab = 'all' | InventoryCategory;

const CATEGORY_TABS: { key: CategoryTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'chemicals', label: 'Chemicals' },
  { key: 'parts', label: 'Parts' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'ppe', label: 'PPE' },
  { key: 'supplies', label: 'Supplies' },
];

function getStatus(item: InventoryItem): 'ok' | 'low' | 'out' {
  if (item.currentQuantity <= 0) return 'out';
  if (item.currentQuantity <= item.reorderPoint) return 'low';
  return 'ok';
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  ok:  { bg: '#F0FFF4', text: '#059669', label: 'OK' },
  low: { bg: '#FFFBEB', text: '#D97706', label: 'Low' },
  out: { bg: '#FEF2F2', text: '#DC2626', label: 'Out' },
};

export function InventoryPage() {
  const navigate = useNavigate();
  const { data: items, isLoading } = useInventoryItems();

  const [activeTab, setActiveTab] = useState<CategoryTab>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = items;
    if (activeTab !== 'all') {
      list = list.filter(i => i.category === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          (i.sku && i.sku.toLowerCase().includes(q)) ||
          (i.location && i.location.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [items, activeTab, search]);

  const totalItems = items.length;
  const lowStock = items.filter(i => getStatus(i) === 'low').length;
  const outOfStock = items.filter(i => getStatus(i) === 'out').length;
  const pendingRequests = 0; // Stubbed, no demo data

  const stats = [
    { label: 'Total Items', value: totalItems, icon: Package, color: NAVY },
    { label: 'Low Stock', value: lowStock, icon: AlertTriangle, color: '#D97706' },
    { label: 'Out of Stock', value: outOfStock, icon: XCircle, color: '#DC2626' },
    { label: 'Pending Requests', value: pendingRequests, icon: ClipboardCheck, color: '#6366F1' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#eef4f8', color: NAVY }}
          >
            <Package className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: NAVY }}>
            Inventory
          </h1>
        </div>
        <button
          onClick={() => alert('Add Item (not yet implemented)')}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors hover:opacity-90"
          style={{ background: NAVY }}
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: CARD_BORDER }}>
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2.5 text-sm font-medium transition-colors relative"
            style={{ color: activeTab === tab.key ? NAVY : TEXT_TERTIARY }}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                style={{ background: NAVY }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl p-4 text-center"
              style={{
                background: CARD_BG,
                border: `1px solid ${CARD_BORDER}`,
                boxShadow: CARD_SHADOW,
              }}
            >
              <Icon className="w-5 h-5 mx-auto mb-2" style={{ color: s.color }} />
              <p className="text-2xl font-bold" style={{ color: NAVY }}>
                {s.value}
              </p>
              <p className="text-xs mt-0.5" style={{ color: TEXT_TERTIARY }}>
                {s.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: TEXT_TERTIARY }}
        />
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#163a5f]/20"
          style={{ borderColor: CARD_BORDER, color: NAVY }}
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: NAVY }} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div
          className="rounded-xl p-10 text-center"
          style={{
            background: CARD_BG,
            border: `1px solid ${CARD_BORDER}`,
            boxShadow: CARD_SHADOW,
          }}
        >
          <Package className="w-10 h-10 mx-auto mb-3" style={{ color: TEXT_TERTIARY }} />
          <p className="text-sm font-medium" style={{ color: NAVY }}>
            No inventory items.
          </p>
          <p className="text-xs mt-1" style={{ color: TEXT_TERTIARY }}>
            Add items to start tracking.
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && filtered.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: CARD_BG,
            border: `1px solid ${CARD_BORDER}`,
            boxShadow: CARD_SHADOW,
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                  {['Item Name', 'SKU', 'Category', 'Location', 'Quantity', 'Reorder Point', 'Status'].map(h => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: TEXT_TERTIARY }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const status = getStatus(item);
                  const badge = STATUS_BADGE[status];
                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ borderBottom: `1px solid ${CARD_BORDER}` }}
                      onClick={() => navigate(`/inventory/${item.id}`)}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: NAVY }}>
                        {item.name}
                      </td>
                      <td className="px-4 py-3" style={{ color: TEXT_TERTIARY }}>
                        {item.sku || '\u2014'}
                      </td>
                      <td className="px-4 py-3 capitalize" style={{ color: TEXT_TERTIARY }}>
                        {item.category}
                      </td>
                      <td className="px-4 py-3" style={{ color: TEXT_TERTIARY }}>
                        {item.location || '\u2014'}
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: NAVY }}>
                        {item.currentQuantity}
                      </td>
                      <td className="px-4 py-3" style={{ color: TEXT_TERTIARY }}>
                        {item.reorderPoint}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: badge.bg, color: badge.text }}
                        >
                          {badge.label}
                        </span>
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
