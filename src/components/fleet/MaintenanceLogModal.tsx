/**
 * MaintenanceLogModal — Log a maintenance entry for a vehicle.
 */
import { useState } from 'react';
import { X } from 'lucide-react';
import type { MaintenanceType } from '../../hooks/api/useVehicles';
import { NAVY, CARD_BORDER, TEXT_TERTIARY } from '../../components/dashboard/shared/constants';

interface Props {
  vehicleId: string;
  onClose: () => void;
}

const MAINT_TYPES: { value: MaintenanceType; label: string }[] = [
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'tires', label: 'Tires' },
  { value: 'brakes', label: 'Brakes' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'repair', label: 'Repair' },
  { value: 'other', label: 'Other' },
];

export function MaintenanceLogModal({ vehicleId, onClose }: Props) {
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('oil_change');
  const [description, setDescription] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [odometer, setOdometer] = useState('');
  const [provider, setProvider] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [nextOdometer, setNextOdometer] = useState('');

  const handleSave = () => {
    if (!description.trim()) { alert('Description is required'); return; }
    alert(`Maintenance logged for vehicle ${vehicleId} (save pending — Supabase table required)`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <h2 className="text-lg font-bold" style={{ color: NAVY }}>Log Maintenance</h2>
          <button onClick={onClose} className="p-2.5 -m-1 rounded hover:bg-gray-100" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: TEXT_TERTIARY }}>Type *</label>
            <select
              value={maintenanceType}
              onChange={e => setMaintenanceType(e.target.value as MaintenanceType)}
              className="w-full px-3 py-2 text-sm border rounded-lg"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            >
              {MAINT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: TEXT_TERTIARY }}>Description *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border rounded-lg resize-none"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
              placeholder="Describe the work performed..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: TEXT_TERTIARY }}>Service Date *</label>
              <input
                type="date"
                value={serviceDate}
                onChange={e => setServiceDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg"
                style={{ borderColor: CARD_BORDER, color: NAVY }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: TEXT_TERTIARY }}>Odometer</label>
              <input
                type="number"
                inputMode="numeric"
                value={odometer}
                onChange={e => setOdometer(e.target.value)}
                placeholder="45000"
                className="w-full px-3 py-2 text-sm border rounded-lg"
                style={{ borderColor: CARD_BORDER, color: NAVY, fontSize: 16 }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: TEXT_TERTIARY }}>Service Provider</label>
            <input
              value={provider}
              onChange={e => setProvider(e.target.value)}
              placeholder="Shop name"
              className="w-full px-3 py-2 text-sm border rounded-lg"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: TEXT_TERTIARY }}>Parts Cost ($)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={partsCost}
                onChange={e => setPartsCost(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border rounded-lg"
                style={{ borderColor: CARD_BORDER, color: NAVY, fontSize: 16 }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: TEXT_TERTIARY }}>Labor Cost ($)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={laborCost}
                onChange={e => setLaborCost(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border rounded-lg"
                style={{ borderColor: CARD_BORDER, color: NAVY, fontSize: 16 }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: TEXT_TERTIARY }}>Next Service Date</label>
              <input
                type="date"
                value={nextDate}
                onChange={e => setNextDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg"
                style={{ borderColor: CARD_BORDER, color: NAVY }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: TEXT_TERTIARY }}>Next Service Odometer</label>
              <input
                type="number"
                inputMode="numeric"
                value={nextOdometer}
                onChange={e => setNextOdometer(e.target.value)}
                placeholder="50000"
                className="w-full px-3 py-2 text-sm border rounded-lg"
                style={{ borderColor: CARD_BORDER, color: NAVY, fontSize: 16 }}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: CARD_BORDER }}>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border" style={{ borderColor: CARD_BORDER, color: NAVY }}>
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ background: NAVY }}>
            Save Entry
          </button>
        </div>
      </div>
    </div>
  );
}
