import { useState } from 'react';
import { X, Thermometer } from 'lucide-react';
import { toast } from 'sonner';

interface QuickEquipment {
  id: string;
  name: string;
  type: string;
  minTemp: number;
  maxTemp: number;
}

const DEMO_EQUIPMENT: QuickEquipment[] = [
  { id: 'eq-1', name: 'Walk-in Cooler #1', type: 'cooler', minTemp: 33, maxTemp: 41 },
  { id: 'eq-2', name: 'Walk-in Freezer #1', type: 'freezer', minTemp: -Infinity, maxTemp: 0 },
  { id: 'eq-3', name: 'Prep Cooler', type: 'cooler', minTemp: 33, maxTemp: 41 },
  { id: 'eq-4', name: 'Walk-in Cooler #2', type: 'cooler', minTemp: 33, maxTemp: 41 },
  { id: 'eq-5', name: 'Hot Hold Station', type: 'hot', minTemp: 135, maxTemp: 165 },
];

interface QuickTempSheetProps {
  open: boolean;
  onClose: () => void;
}

export function QuickTempSheet({ open, onClose }: QuickTempSheetProps) {
  const [equipmentId, setEquipmentId] = useState('');
  const [temperature, setTemperature] = useState('');

  if (!open) return null;

  const selected = DEMO_EQUIPMENT.find(e => e.id === equipmentId);

  const handleSubmit = () => {
    if (!equipmentId || !temperature) {
      toast.error('Select equipment and enter temperature');
      return;
    }
    const temp = parseFloat(temperature);
    if (isNaN(temp)) {
      toast.error('Enter a valid temperature');
      return;
    }
    if (selected) {
      const inRange = selected.type === 'freezer'
        ? temp <= selected.maxTemp
        : temp >= selected.minTemp && temp <= selected.maxTemp;
      if (inRange) {
        toast.success(`${selected.name}: ${temp}°F logged`);
      } else {
        toast.error(`${selected.name}: ${temp}°F — OUT OF RANGE`);
      }
    }
    setEquipmentId('');
    setTemperature('');
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl px-5 pb-8 pt-4 animate-slide-up">
        {/* Handle + close */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Thermometer size={18} style={{ color: '#1e4d6b' }} />
            <span className="text-sm font-bold" style={{ color: '#1E2D4D' }}>Quick Temp Log</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 -m-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} style={{ color: '#6b7280' }} />
          </button>
        </div>

        {/* Equipment select */}
        <select
          value={equipmentId}
          onChange={e => setEquipmentId(e.target.value)}
          className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm mb-3"
          style={{ fontSize: 16 }}
        >
          <option value="">Select equipment...</option>
          {DEMO_EQUIPMENT.map(eq => (
            <option key={eq.id} value={eq.id}>{eq.name}</option>
          ))}
        </select>

        {/* Range hint */}
        {selected && (
          <p className="text-xs text-gray-500 mb-2">
            {selected.type === 'freezer'
              ? `Must remain: ${selected.maxTemp}°F or below`
              : `Range: ${selected.minTemp}°F – ${selected.maxTemp}°F`}
          </p>
        )}

        {/* Temperature input */}
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={temperature}
          onChange={e => setTemperature(e.target.value)}
          placeholder="°F"
          className="w-full border border-gray-300 rounded-lg text-center font-bold mb-4"
          style={{ fontSize: 24, height: 56 }}
        />

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-lg text-white font-bold transition-colors"
          style={{ backgroundColor: '#1E2D4D', height: 56, fontSize: 16 }}
        >
          Log Temperature
        </button>
      </div>
    </>
  );
}
