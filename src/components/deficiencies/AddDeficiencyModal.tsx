import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import type { DefSeverity } from '../../data/deficienciesDemoData';

const LOCATIONS = [
  { id: 'downtown', name: 'Downtown Kitchen' },
  { id: 'airport', name: 'Airport Concourse B' },
  { id: 'university', name: 'University Dining Hall' },
];

const SEVERITIES: { value: DefSeverity; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'advisory', label: 'Advisory' },
];

interface AddDeficiencyModalProps {
  onClose: () => void;
  onSubmit: (data: {
    code: string;
    title: string;
    description: string;
    locationDescription: string;
    locationId: string;
    severity: DefSeverity;
    estimatedCost: number | null;
  }) => void;
}

export function AddDeficiencyModal({ onClose, onSubmit }: AddDeficiencyModalProps) {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [locationId, setLocationId] = useState('');
  const [severity, setSeverity] = useState<DefSeverity>('major');
  const [costStr, setCostStr] = useState('');

  const canSubmit = code.trim() && title.trim() && description.trim() && locationId;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      code: code.trim(),
      title: title.trim(),
      description: description.trim(),
      locationDescription: locationDescription.trim(),
      locationId,
      severity,
      estimatedCost: costStr ? parseFloat(costStr) : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl shadow-xl border"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10" style={{ borderColor: '#D1D9E6' }}>
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5" style={{ color: '#1E2D4D' }} />
            <h3 className="text-lg font-semibold tracking-tight" style={{ color: '#0B1628' }}>Add Deficiency</h3>
          </div>
          <button onClick={onClose} className="p-2.5 -m-1 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Close">
            <X className="w-5 h-5" style={{ color: '#6B7F96' }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>
                Location <span className="text-red-500">*</span>
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37]"
                style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
              >
                <option value="">Select location...</option>
                {LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>
                Severity <span className="text-red-500">*</span>
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as DefSeverity)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37]"
                style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
              >
                {SEVERITIES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>
              Compliance Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. NFPA96-T12.4"
              className="w-full px-3 py-2 border rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37]"
              style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short description of the deficiency"
              className="w-full px-3 py-2 border rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37]"
              style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Full compliance code description and finding details..."
              className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37]"
              style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>
              Specific Location
            </label>
            <input
              type="text"
              value={locationDescription}
              onChange={(e) => setLocationDescription(e.target.value)}
              placeholder="e.g. Main hood system, fryer bank"
              className="w-full px-3 py-2 border rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37]"
              style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>
              Estimated Cost
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={costStr}
              onChange={(e) => setCostStr(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37]"
              style={{ borderColor: '#D1D9E6', color: '#0B1628', fontSize: 16 }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: '#D1D9E6' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50 transition-colors"
            style={{ borderColor: '#D1D9E6', color: '#3D5068' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#1E2D4D' }}
          >
            Add Deficiency
          </button>
        </div>
      </div>
    </div>
  );
}
