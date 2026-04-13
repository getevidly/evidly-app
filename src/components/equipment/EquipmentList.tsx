/**
 * EquipmentList — Table view for equipment list with sortable columns.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, QrCode, Download } from 'lucide-react';
import type { EquipmentItem, EquipmentCondition } from '../../hooks/api/useEquipment';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY } from '../dashboard/shared/constants';

const CONDITION_STYLES: Record<EquipmentCondition, { bg: string; text: string }> = {
  clean: { bg: '#F0FFF4', text: '#059669' },
  light: { bg: '#ECFDF5', text: '#10B981' },
  moderate: { bg: '#FFFBEB', text: '#D97706' },
  heavy: { bg: '#FEF3C7', text: '#B45309' },
  deficient: { bg: '#FEF2F2', text: '#DC2626' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: '#F0FFF4', text: '#059669', label: 'Active' },
  inactive: { bg: '#F3F4F6', text: '#6B7280', label: 'Inactive' },
  needs_service: { bg: '#FFFBEB', text: '#D97706', label: 'Needs Service' },
  overdue: { bg: '#FEF2F2', text: '#DC2626', label: 'Overdue' },
};

const TYPE_ICONS: Record<string, string> = {
  hood: '\u2B1C', duct: '\u25AD', fan: '\u2B58', filter: '\u2593',
  suppression: '\u2B06', extinguisher: '\u2B06', ansul: '\u26E8',
};

type SortKey = 'name' | 'equipmentType' | 'condition' | 'lastServiceDate' | 'nextDueDate';

interface EquipmentListProps {
  items: EquipmentItem[];
  onBulkPrintQR?: () => void;
}

export function EquipmentList({ items, onBulkPrintQR }: EquipmentListProps) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sorted = [...items].sort((a, b) => {
    const va = a[sortKey] || '';
    const vb = b[sortKey] || '';
    const cmp = String(va).localeCompare(String(vb));
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === sorted.length) setSelected(new Set());
    else setSelected(new Set(sorted.map(e => e.id)));
  };

  const HEADERS: { key: SortKey | ''; label: string; sortable: boolean }[] = [
    { key: '', label: '', sortable: false },
    { key: 'equipmentType', label: 'Type', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: '', label: 'Customer', sortable: false },
    { key: '', label: 'Location', sortable: false },
    { key: '', label: 'Manufacturer / Model', sortable: false },
    { key: 'lastServiceDate', label: 'Last Service', sortable: true },
    { key: 'nextDueDate', label: 'Next Due', sortable: true },
    { key: 'condition', label: 'Condition', sortable: true },
    { key: '', label: 'Status', sortable: false },
  ];

  return (
    <div>
      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-3 py-2 rounded-lg" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <span className="text-xs font-semibold" style={{ color: '#1e4d6b' }}>{selected.size} selected</span>
          <button onClick={onBulkPrintQR} className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded" style={{ color: '#1e4d6b' }}>
            <QrCode className="w-3 h-3" /> Print QR Codes
          </button>
          <button onClick={() => alert('Export selected (demo)')} className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded" style={{ color: '#1e4d6b' }}>
            <Download className="w-3 h-3" /> Export
          </button>
        </div>
      )}

      <div className="rounded-xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                <th className="w-10 px-3 py-2">
                  <input type="checkbox" checked={selected.size === sorted.length && sorted.length > 0} onChange={toggleAll} style={{ accentColor: '#1e4d6b' }} />
                </th>
                {HEADERS.slice(1).map((h, i) => (
                  <th
                    key={i}
                    className={`text-left px-3 py-2 text-xs font-semibold uppercase whitespace-nowrap ${h.sortable ? 'cursor-pointer hover:text-[#1e4d6b]' : ''}`}
                    style={{ color: TEXT_TERTIARY }}
                    onClick={() => h.sortable && h.key && toggleSort(h.key as SortKey)}
                  >
                    <span className="flex items-center gap-1">
                      {h.label}
                      {h.sortable && h.key === sortKey && <ArrowUpDown className="w-3 h-3" />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(item => {
                const condStyle = CONDITION_STYLES[item.condition] || CONDITION_STYLES.clean;
                const statStyle = STATUS_STYLES[item.status] || STATUS_STYLES.active;
                const daysUntilDue = item.nextDueDate
                  ? Math.ceil((new Date(item.nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;
                const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

                return (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/equipment/${item.id}`)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{ borderBottom: `1px solid ${CARD_BORDER}` }}
                  >
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} style={{ accentColor: '#1e4d6b' }} />
                    </td>
                    <td className="px-3 py-2 text-center text-lg">{TYPE_ICONS[item.equipmentType] || '\u2699'}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap" style={{ color: NAVY }}>{item.name}</td>
                    <td className="px-3 py-2 truncate max-w-[140px]" style={{ color: TEXT_TERTIARY }}>{item.customerName}</td>
                    <td className="px-3 py-2 truncate max-w-[140px]" style={{ color: TEXT_TERTIARY }}>{item.locationName}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: TEXT_TERTIARY }}>
                      {item.manufacturer && item.model ? `${item.manufacturer} ${item.model}` : item.manufacturer || item.model || '—'}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: TEXT_TERTIARY }}>
                      {item.lastServiceDate ? new Date(item.lastServiceDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs font-medium" style={{
                      color: isOverdue ? '#DC2626' : daysUntilDue !== null && daysUntilDue <= 14 ? '#D97706' : TEXT_TERTIARY,
                    }}>
                      {item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: condStyle.bg, color: condStyle.text }}>
                        {item.condition}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: statStyle.bg, color: statStyle.text }}>
                        {statStyle.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
