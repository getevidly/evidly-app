/**
 * EquipmentGrid — Card grid view for equipment list.
 */
import { useNavigate } from 'react-router-dom';
import { Calendar, AlertTriangle, QrCode } from 'lucide-react';
import type { EquipmentItem, EquipmentCondition, EquipmentStatus } from '../../hooks/api/useEquipment';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY } from '../dashboard/shared/constants';

const CONDITION_STYLES: Record<EquipmentCondition, { bg: string; text: string }> = {
  clean: { bg: '#F0FFF4', text: '#059669' },
  light: { bg: '#ECFDF5', text: '#10B981' },
  moderate: { bg: '#FFFBEB', text: '#D97706' },
  heavy: { bg: '#FEF3C7', text: '#B45309' },
  deficient: { bg: '#FEF2F2', text: '#DC2626' },
};

const TYPE_ICONS: Record<string, string> = {
  hood: '\u2B1C', duct: '\u25AD', fan: '\u2B58', filter: '\u2593',
  suppression: '\u2B06', extinguisher: '\u2B06', ansul: '\u26E8',
};

interface EquipmentGridProps {
  items: EquipmentItem[];
}

export function EquipmentGrid({ items }: EquipmentGridProps) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map(item => {
        const condStyle = CONDITION_STYLES[item.condition] || CONDITION_STYLES.clean;
        const daysUntilDue = item.nextDueDate
          ? Math.ceil((new Date(item.nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;
        const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
        const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 14;

        return (
          <button
            key={item.id}
            onClick={() => navigate(`/equipment/${item.id}`)}
            className="text-left rounded-xl p-4 transition-all hover:shadow-md group"
            style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
          >
            {/* Type icon + condition */}
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: '#eef4f8', color: '#1E2D4D' }}>
                {TYPE_ICONS[item.equipmentType] || '\u2699'}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: condStyle.bg, color: condStyle.text }}>
                  {item.condition}
                </span>
                {item.deficiencyCount > 0 && (
                  <span className="flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                    <AlertTriangle className="w-3 h-3" /> {item.deficiencyCount}
                  </span>
                )}
              </div>
            </div>

            {/* Name + location */}
            <p className="text-sm font-semibold mb-0.5 group-hover:text-[#1E2D4D] truncate" style={{ color: NAVY }}>
              {item.name}
            </p>
            <p className="text-xs truncate" style={{ color: TEXT_TERTIARY }}>
              {item.customerName} &middot; {item.locationName}
            </p>

            {/* Service dates */}
            <div className="mt-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: TEXT_TERTIARY }}>
                <Calendar className="w-3 h-3" />
                <span>Last: {item.lastServiceDate ? new Date(item.lastServiceDate).toLocaleDateString() : '—'}</span>
              </div>
              {item.nextDueDate && (
                <div className="flex items-center gap-1.5 text-xs" style={{
                  color: isOverdue ? '#DC2626' : isDueSoon ? '#D97706' : TEXT_TERTIARY,
                }}>
                  <Calendar className="w-3 h-3" />
                  <span>
                    Next: {new Date(item.nextDueDate).toLocaleDateString()}
                    {isOverdue && ' (Overdue)'}
                    {isDueSoon && ` (${daysUntilDue}d)`}
                  </span>
                </div>
              )}
            </div>

            {/* QR mini */}
            <div className="mt-3 flex items-center gap-1 text-xs" style={{ color: TEXT_TERTIARY }}>
              <QrCode className="w-3 h-3" />
              <span>{item.qrCodeId}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
