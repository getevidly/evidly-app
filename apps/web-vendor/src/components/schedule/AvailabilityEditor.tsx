/**
 * AvailabilityEditor — Set technician availability for a selected week.
 */
import { useState, useMemo } from 'react';
import { X, Clock, Check } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import type { Technician } from '../../hooks/api/useSchedule';
import { useUpdateAvailability } from '../../hooks/api/useSchedule';
import { NAVY, CARD_BG, CARD_BORDER, TEXT_TERTIARY, MUTED } from '@shared/components/dashboard/shared/constants';

interface AvailabilityEditorProps {
  technician: Technician;
  weekStart: Date;
  onClose: () => void;
}

interface DaySlot {
  date: string;
  dayLabel: string;
  available: boolean;
  startTime: string;
  endTime: string;
}

export function AvailabilityEditor({ technician, weekStart, onClose }: AvailabilityEditorProps) {
  const { mutate: update } = useUpdateAvailability();

  const initialSlots: DaySlot[] = useMemo(() => {
    const week = startOfWeek(weekStart, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(week, i);
      const isWeekend = i >= 5;
      return {
        date: format(d, 'yyyy-MM-dd'),
        dayLabel: format(d, 'EEE, MMM d'),
        available: !isWeekend,
        startTime: '07:00',
        endTime: '17:00',
      };
    });
  }, [weekStart]);

  const [slots, setSlots] = useState<DaySlot[]>(initialSlots);

  const updateSlot = (idx: number, patch: Partial<DaySlot>) => {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  const handleSave = () => {
    update({
      technicianId: technician.id,
      slots: slots.map(s => ({
        date: s.date,
        available: s.available,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    });
    onClose();
  };

  const totalHours = slots
    .filter(s => s.available)
    .reduce((sum, s) => {
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      return sum + (eh * 60 + em - sh * 60 - sm) / 60;
    }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-xl shadow-xl" style={{ background: CARD_BG }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: NAVY }}>Set Availability</h2>
            <p className="text-xs mt-0.5" style={{ color: TEXT_TERTIARY }}>{technician.name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />
          </button>
        </div>

        {/* Summary */}
        <div className="px-5 py-2 border-b flex items-center justify-between" style={{ borderColor: CARD_BORDER }}>
          <span className="text-xs font-medium" style={{ color: TEXT_TERTIARY }}>
            Total scheduled hours
          </span>
          <span className="text-sm font-bold" style={{ color: NAVY }}>{totalHours.toFixed(1)}h</span>
        </div>

        {/* Day slots */}
        <div className="px-5 py-3 space-y-2 max-h-[50vh] overflow-y-auto">
          {slots.map((slot, idx) => (
            <div
              key={slot.date}
              className="flex items-center gap-3 p-2.5 rounded-lg border transition-colors"
              style={{
                borderColor: slot.available ? '#1e4d6b40' : CARD_BORDER,
                background: slot.available ? '#F0F7FF' : '#F9FAFB',
                opacity: slot.available ? 1 : 0.6,
              }}
            >
              {/* Toggle */}
              <button
                type="button"
                onClick={() => updateSlot(idx, { available: !slot.available })}
                className="w-5 h-5 rounded border flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: slot.available ? '#1e4d6b' : CARD_BORDER,
                  background: slot.available ? '#1e4d6b' : 'white',
                }}
              >
                {slot.available && <Check className="w-3 h-3 text-white" />}
              </button>

              {/* Day label */}
              <span className="text-xs font-semibold w-24" style={{ color: NAVY }}>
                {slot.dayLabel}
              </span>

              {/* Time range */}
              {slot.available ? (
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={e => updateSlot(idx, { startTime: e.target.value })}
                    className="px-2 py-1 text-[10px] rounded border w-20"
                    style={{ borderColor: CARD_BORDER, color: NAVY }}
                  />
                  <span className="text-[10px]" style={{ color: TEXT_TERTIARY }}>to</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={e => updateSlot(idx, { endTime: e.target.value })}
                    className="px-2 py-1 text-[10px] rounded border w-20"
                    style={{ borderColor: CARD_BORDER, color: NAVY }}
                  />
                </div>
              ) : (
                <span className="text-[10px] font-medium" style={{ color: MUTED }}>Day off</span>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: CARD_BORDER }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border hover:bg-gray-50"
            style={{ borderColor: CARD_BORDER, color: NAVY }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold rounded-lg text-white"
            style={{ background: '#1e4d6b' }}
          >
            Save Availability
          </button>
        </div>
      </div>
    </div>
  );
}
