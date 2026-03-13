/**
 * VehicleFormModal — Add/edit a vehicle.
 */
import { useState } from 'react';
import { X } from 'lucide-react';
import type { VehicleType } from '../../hooks/api/useVehicles';
import { NAVY, CARD_BORDER, TEXT_TERTIARY } from '../../components/dashboard/shared/constants';

interface Props {
  onClose: () => void;
}

const TYPES: { value: VehicleType; label: string }[] = [
  { value: 'truck', label: 'Truck' },
  { value: 'van', label: 'Van' },
  { value: 'trailer', label: 'Trailer' },
];

export function VehicleFormModal({ onClose }: Props) {
  const [name, setName] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('truck');
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [vin, setVin] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [licenseState, setLicenseState] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!name.trim()) { alert('Vehicle name is required'); return; }
    alert(`Vehicle "${name}" created (save pending — Supabase table required)`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <h2 className="text-lg font-bold" style={{ color: NAVY }}>Add Vehicle</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <Field label="Vehicle Name *" value={name} onChange={setName} placeholder="e.g. Truck 1" />

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: TEXT_TERTIARY }}>Type *</label>
            <select
              value={vehicleType}
              onChange={e => setVehicleType(e.target.value as VehicleType)}
              className="w-full px-3 py-2 text-sm border rounded-lg"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            >
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Year" value={year} onChange={setYear} placeholder="2024" />
            <Field label="Make" value={make} onChange={setMake} placeholder="Ford" />
            <Field label="Model" value={model} onChange={setModel} placeholder="E-450" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Color" value={color} onChange={setColor} placeholder="White" />
            <Field label="VIN" value={vin} onChange={setVin} placeholder="1FDFE4..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="License Plate" value={licensePlate} onChange={setLicensePlate} placeholder="ABC 1234" />
            <Field label="State" value={licenseState} onChange={setLicenseState} placeholder="CA" />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: TEXT_TERTIARY }}>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border rounded-lg resize-none"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: CARD_BORDER }}>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border" style={{ borderColor: CARD_BORDER, color: NAVY }}>
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ background: NAVY }}>
            Save Vehicle
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: TEXT_TERTIARY }}>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border rounded-lg"
        style={{ borderColor: CARD_BORDER, color: NAVY }}
      />
    </div>
  );
}
