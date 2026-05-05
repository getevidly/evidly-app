import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { colors } from '../../lib/designSystem';
import type { TemperatureEquipment } from './types';

interface ReadingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: TemperatureEquipment | null;
  variant: 'hot' | 'cold';
}

const METHOD_LABELS: Record<string, string> = {
  manual: 'Typed',
  qr_scan: 'QR scan',
  iot_sensor: 'Sensor',
  voice: 'Voice',
  photo_ocr: 'Photo OCR',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${month} ${day}, ${year} \u00B7 ${hours}:${minutes} ${ampm}`;
}

function formatTimeSince(iso: string): string {
  const minutes = (Date.now() - new Date(iso).getTime()) / (1000 * 60);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${Math.floor(minutes % 60)}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ReadingDetailModal({ isOpen, onClose, equipment, variant }: ReadingDetailModalProps) {
  const navigate = useNavigate();

  if (!equipment || !equipment.last_check) return null;

  const { last_check, held_items } = equipment;
  const isHot = variant === 'hot';
  const accentColor = isHot ? '#EA580C' : '#2563EB';
  const statusInRange = last_check.is_within_range;
  const statusColor = statusInRange ? colors.success : colors.danger;
  const statusBg = statusInRange ? colors.successSoft : colors.dangerSoft;
  const statusLabel = statusInRange ? 'In Range' : 'Out of Range';

  const handleCTA = () => {
    navigate('/temp-logs');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      {/* 1. Accent strip */}
      <div style={{ height: '4px', backgroundColor: accentColor, width: '100%' }} />

      {/* 2. Header */}
      <div className="px-5 pt-5 pb-3">
        <p className="text-[10px] uppercase tracking-wide font-medium mb-1" style={{ color: colors.textMuted }}>
          Reading detail &middot; view only
        </p>
        <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
          {equipment.name}
        </h3>
        <p className="text-xs" style={{ color: colors.textSecondary }}>
          {equipment.equipment_type.replace(/_/g, ' ')}
        </p>
      </div>

      {/* 3. Hero block */}
      <div className="px-5 pb-4" style={{ borderBottom: `0.5px solid ${colors.border}` }}>
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-semibold" style={{ color: statusColor }}>
            {last_check.temperature_value}&deg;F
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{ backgroundColor: statusBg, color: statusColor }}
          >
            {statusLabel}
          </span>
        </div>
        <p className="text-[11px] mt-1" style={{ color: colors.textMuted }}>
          Threshold: {isHot ? `\u2265 ${equipment.min_temp}\u00B0F` : `\u2264 ${equipment.max_temp}\u00B0F`}
        </p>
      </div>

      {/* 4. Labeled values */}
      <div className="px-5 py-4 grid gap-y-2 gap-x-3" style={{ gridTemplateColumns: '110px 1fr' }}>
        <span className="text-xs" style={{ color: colors.textSecondary }}>Recorded at</span>
        <span className="text-xs" style={{ color: colors.textPrimary }}>{formatDateTime(last_check.created_at)}</span>

        <span className="text-xs" style={{ color: colors.textSecondary }}>Logged by</span>
        <span className="text-xs" style={{ color: colors.textPrimary }}>{last_check.recorded_by_name ?? '\u2014'}</span>

        <span className="text-xs" style={{ color: colors.textSecondary }}>Method</span>
        <span className="text-xs" style={{ color: colors.textPrimary }}>
          {last_check.input_method ? (METHOD_LABELS[last_check.input_method] ?? last_check.input_method) : '\u2014'}
        </span>
      </div>

      {/* 5. Held items */}
      <div className="px-5 pt-3 pb-4" style={{ borderTop: `0.5px solid ${colors.border}` }}>
        <p className="text-[10px] uppercase tracking-wide font-medium mb-2" style={{ color: colors.textMuted }}>
          Currently held in this unit
        </p>
        {(held_items && held_items.length > 0) ? (
          <div className="flex flex-col">
            {held_items.map(item => {
              const itemColor = item.temp_pass ? colors.success : colors.danger;
              return (
                <div key={item.menu_item_id} className="flex items-center justify-between py-1.5">
                  <span className="text-[13px]" style={{ color: colors.textPrimary }}>
                    {item.menu_item_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium" style={{ color: itemColor }}>
                      {item.temperature}&deg;F
                    </span>
                    <span className="text-[11px]" style={{ color: colors.textMuted }}>
                      {formatTimeSince(item.reading_time)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs italic" style={{ color: colors.textMuted }}>
            No items currently held.
          </p>
        )}
      </div>

      {/* 6. Footer */}
      <div
        className="px-5 py-3 flex justify-between gap-2"
        style={{ borderTop: `0.5px solid ${colors.border}` }}
      >
        <button
          type="button"
          className="px-4 py-2 rounded-md text-sm"
          style={{
            color: colors.textSecondary,
            border: `0.5px solid ${colors.border}`,
            backgroundColor: 'transparent',
            minHeight: '44px',
          }}
          onClick={onClose}
        >
          Close
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded-md text-sm font-medium"
          style={{
            color: colors.navy,
            border: `0.5px solid ${colors.navy}`,
            backgroundColor: 'transparent',
            minHeight: '44px',
          }}
          onClick={handleCTA}
        >
          Open in Temp Logs
        </button>
      </div>
    </Modal>
  );
}

export default ReadingDetailModal;
