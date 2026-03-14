/**
 * EquipmentDeficiencies — Deficiency list for an equipment item.
 */
import { useState } from 'react';
import { CheckCircle, AlertTriangle, Plus } from 'lucide-react';
import { useEquipmentDeficiencies } from '../../hooks/api/useEquipment';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY, MUTED } from '@shared/components/dashboard/shared/constants';

const SEVERITY_STYLES: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#FEF2F2', text: '#DC2626' },
  major: { bg: '#FFFBEB', text: '#D97706' },
  minor: { bg: '#EFF6FF', text: '#2563EB' },
};

interface EquipmentDeficienciesProps {
  equipmentId: string;
}

export function EquipmentDeficiencies({ equipmentId }: EquipmentDeficienciesProps) {
  const { data: deficiencies, isLoading } = useEquipmentDeficiencies(equipmentId);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
            <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-32 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const items = deficiencies || [];
  const filtered = filter === 'all' ? items : items.filter(d => d.status === filter);

  if (items.length === 0) {
    return (
      <div className="text-center py-16 rounded-xl" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
        <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#059669' }} />
        <p className="text-base font-semibold" style={{ color: NAVY }}>No deficiencies found</p>
        <p className="text-sm mt-1" style={{ color: TEXT_TERTIARY }}>This equipment has no recorded deficiencies.</p>
        <button
          onClick={() => alert('Add deficiency (demo)')}
          className="mt-4 flex items-center gap-1.5 mx-auto px-4 py-2 text-sm font-semibold text-white rounded-lg"
          style={{ background: '#1e4d6b' }}
        >
          <Plus className="w-4 h-4" /> Add Deficiency
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter + add button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#F3F4F6', width: 'fit-content' }}>
          {(['all', 'open', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all"
              style={{
                background: filter === f ? CARD_BG : 'transparent',
                color: filter === f ? NAVY : TEXT_TERTIARY,
                boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {f} ({f === 'all' ? items.length : items.filter(d => d.status === f).length})
            </button>
          ))}
        </div>

        <button
          onClick={() => alert('Add deficiency (demo)')}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white rounded-lg"
          style={{ background: '#1e4d6b' }}
        >
          <Plus className="w-4 h-4" /> Add Deficiency
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map(def => {
          const sevStyle = SEVERITY_STYLES[def.severity] || { bg: '#F3F4F6', text: '#6B7280' };
          return (
            <div
              key={def.id}
              className="rounded-xl p-4 hover:shadow-sm transition-all cursor-pointer"
              style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
              onClick={() => alert(`View deficiency ${def.id} (demo)`)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: sevStyle.bg, color: sevStyle.text }}>
                    {def.severity}
                  </span>
                  <span className="text-xs font-mono" style={{ color: TEXT_TERTIARY }}>{def.code}</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{
                  background: def.status === 'open' ? '#FEF2F2' : '#F0FFF4',
                  color: def.status === 'open' ? '#DC2626' : '#059669',
                }}>
                  {def.status}
                </span>
              </div>

              <p className="text-sm font-medium" style={{ color: NAVY }}>{def.title}</p>
              {def.description && (
                <p className="text-xs mt-1 line-clamp-2" style={{ color: MUTED }}>{def.description}</p>
              )}

              <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: TEXT_TERTIARY }}>
                <span>Found: {new Date(def.foundDate).toLocaleDateString()}</span>
                {def.resolvedDate && (
                  <span>Resolved: {new Date(def.resolvedDate).toLocaleDateString()}</span>
                )}
                {def.resolvedBy && (
                  <span>By: {def.resolvedBy}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
