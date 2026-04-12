/**
 * EquipmentServiceHistory — Timeline of services for an equipment item.
 */
import { useState } from 'react';
import { Wrench, Calendar, User, Clock, Camera, FileText, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useEquipmentServiceHistory } from '../../hooks/api/useEquipment';
import type { EquipmentCondition } from '../../hooks/api/useEquipment';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY, MUTED } from '../dashboard/shared/constants';
import { SERVICE_TYPES, type ServiceTypeCode } from '../../constants/serviceTypes';

const FILTER_PILLS = [
  { label: 'All', code: null },
  { label: 'KEC', code: 'KEC' },
  { label: 'FPM', code: 'FPM' },
  { label: 'GFX', code: 'GFX' },
  { label: 'RGC', code: 'RGC' },
  { label: 'Suppression', code: 'FS' },
] as const;

const CONDITION_STYLES: Record<EquipmentCondition, { bg: string; text: string }> = {
  clean: { bg: '#F0FFF4', text: '#059669' },
  light: { bg: '#ECFDF5', text: '#10B981' },
  moderate: { bg: '#FFFBEB', text: '#D97706' },
  heavy: { bg: '#FEF3C7', text: '#B45309' },
  deficient: { bg: '#FEF2F2', text: '#DC2626' },
};

interface EquipmentServiceHistoryProps {
  equipmentId: string;
}

export function EquipmentServiceHistory({ equipmentId }: EquipmentServiceHistoryProps) {
  const { data: records, isLoading } = useEquipmentServiceHistory(equipmentId);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

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

  const items = records || [];
  const filtered = items.filter(r => {
    if (dateFrom && r.serviceDate < dateFrom) return false;
    if (dateTo && r.serviceDate > dateTo) return false;
    if (typeFilter && (r as any).serviceTypeCode !== typeFilter) return false;
    return true;
  });

  if (items.length === 0) {
    return (
      <div className="text-center py-16 rounded-xl" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
        <Wrench className="w-12 h-12 mx-auto mb-3" style={{ color: TEXT_TERTIARY }} />
        <p className="text-base font-semibold" style={{ color: NAVY }}>No service history yet</p>
        <p className="text-sm mt-1" style={{ color: TEXT_TERTIARY }}>Service records will appear here after work is performed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Service type pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTER_PILLS.map(pill => {
            const isActive = typeFilter === pill.code;
            const stDef = pill.code ? SERVICE_TYPES[pill.code as ServiceTypeCode] : null;
            return (
              <button
                key={pill.label}
                onClick={() => setTypeFilter(isActive ? null : (pill.code || null))}
                className="text-xs font-medium px-3 py-1.5 rounded-full border transition-colors"
                style={{
                  background: isActive ? (stDef?.color || NAVY) : 'transparent',
                  color: isActive ? '#fff' : (stDef?.color || TEXT_TERTIARY),
                  borderColor: isActive ? (stDef?.color || NAVY) : CARD_BORDER,
                }}
              >
                {stDef && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: isActive ? '#fff' : stDef.color, marginRight: 4, verticalAlign: 'middle' }} />}
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium" style={{ color: MUTED }}>From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-2 py-1.5 text-sm rounded-lg border" style={{ borderColor: CARD_BORDER, color: NAVY }} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium" style={{ color: MUTED }}>To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-2 py-1.5 text-sm rounded-lg border" style={{ borderColor: CARD_BORDER, color: NAVY }} />
        </div>
        <span className="text-xs" style={{ color: TEXT_TERTIARY }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px" style={{ background: CARD_BORDER }} />

        <div className="space-y-4">
          {filtered.map(record => {
            const isExpanded = expandedId === record.id;
            const beforeStyle = CONDITION_STYLES[record.conditionBefore] || CONDITION_STYLES.clean;
            const afterStyle = CONDITION_STYLES[record.conditionAfter] || CONDITION_STYLES.clean;

            return (
              <div key={record.id} className="relative pl-12">
                {/* Timeline dot — color-coded by service type */}
                {(() => {
                  const stCode = (record as any).serviceTypeCode as ServiceTypeCode;
                  const stColor = stCode && SERVICE_TYPES[stCode] ? SERVICE_TYPES[stCode].color : '#1E2D4D';
                  return <div className="absolute left-3.5 top-4 w-3 h-3 rounded-full border-2" style={{ background: CARD_BG, borderColor: stColor }} />;
                })()}

                <div className="rounded-xl" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : record.id)}
                    className="w-full text-left p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold" style={{ color: NAVY }}>{record.serviceType}</span>
                        <span className="text-xs" style={{ color: TEXT_TERTIARY }}>{new Date(record.serviceDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs" style={{ color: TEXT_TERTIARY }}>
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {record.technicianName}</span>
                        {record.durationMinutes && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {record.durationMinutes} min</span>
                        )}
                        {record.photoUrls.length > 0 && (
                          <span className="flex items-center gap-1"><Camera className="w-3 h-3" /> {record.photoUrls.length} photos</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Condition change */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded capitalize" style={{ background: beforeStyle.bg, color: beforeStyle.text }}>
                          {record.conditionBefore}
                        </span>
                        <span className="text-xs" style={{ color: TEXT_TERTIARY }}>&rarr;</span>
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded capitalize" style={{ background: afterStyle.bg, color: afterStyle.text }}>
                          {record.conditionAfter}
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: TEXT_TERTIARY }} /> : <ChevronDown className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 space-y-3" style={{ borderTop: `1px solid ${CARD_BORDER}` }}>
                      {record.notes && (
                        <p className="text-sm mt-3" style={{ color: MUTED }}>{record.notes}</p>
                      )}
                      {record.certificateNumber && (
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: TEXT_TERTIARY }}>
                          <FileText className="w-3 h-3" /> Certificate: {record.certificateNumber}
                        </div>
                      )}
                      {record.cost !== null && (
                        <div className="text-xs" style={{ color: TEXT_TERTIARY }}>
                          Cost: <span style={{ color: NAVY, fontWeight: 600 }}>${record.cost.toLocaleString()}</span>
                        </div>
                      )}
                      {(record as any).certificateUrl && (
                        <a
                          href={(record as any).certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs hover:underline"
                          style={{ color: '#1E2D4D' }}
                        >
                          <ExternalLink className="w-3 h-3" /> View Certificate (from HoodOps)
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
