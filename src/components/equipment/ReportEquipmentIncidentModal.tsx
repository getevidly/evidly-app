/**
 * ReportEquipmentIncidentModal -- Modal form for reporting equipment incidents.
 */
import { useState } from 'react';
import { X } from 'lucide-react';
import type { EquipmentIncidentType } from '../../hooks/api/useIncidents';

// ── Design tokens ────────────────────────────────────────────
const NAVY = '#163a5f';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#D1D9E6';
const TEXT_TERTIARY = '#6B7F96';

// ── Incident type options ────────────────────────────────────
const INCIDENT_TYPES: { value: EquipmentIncidentType; label: string }[] = [
  { value: 'damage', label: 'Damage' },
  { value: 'loss', label: 'Loss' },
  { value: 'theft', label: 'Theft' },
  { value: 'malfunction', label: 'Malfunction' },
];

interface ReportEquipmentIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportEquipmentIncidentModal({ isOpen, onClose }: ReportEquipmentIncidentModalProps) {
  const [incidentType, setIncidentType] = useState<EquipmentIncidentType>('damage');
  const [equipmentName, setEquipmentName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [description, setDescription] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');

  if (!isOpen) return null;

  const canSubmit = equipmentName.trim() !== '' && description.trim() !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    alert('Equipment incident reported successfully.');
    onClose();
  };

  // ── Shared input styles ────────────────────────────────────
  const inputClass =
    'w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#1E2D4D]/30';
  const inputStyle = { background: CARD_BG, borderColor: CARD_BORDER, color: NAVY };
  const labelStyle = { color: NAVY };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
        style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${CARD_BORDER}` }}
        >
          <h2 className="text-lg font-bold" style={{ color: NAVY }}>Report Equipment Incident</h2>
          <button
            onClick={onClose}
            className="p-2.5 -m-1 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" style={{ color: TEXT_TERTIARY }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Incident type */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Incident Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {INCIDENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setIncidentType(t.value)}
                  className="px-3 py-2 text-sm rounded-lg border font-medium transition-colors"
                  style={{
                    borderColor: incidentType === t.value ? '#1E2D4D' : CARD_BORDER,
                    background: incidentType === t.value ? '#1E2D4D0D' : CARD_BG,
                    color: incidentType === t.value ? NAVY : TEXT_TERTIARY,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Equipment name */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Equipment Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={equipmentName}
              onChange={(e) => setEquipmentName(e.target.value)}
              placeholder="e.g. Walk-in Cooler #2"
              className={inputClass}
              style={inputStyle}
              required
            />
          </div>

          {/* Serial number */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Serial Number <span className="text-xs" style={{ color: TEXT_TERTIARY }}>(optional)</span>
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="e.g. SN-4820193"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened..."
              rows={3}
              className={inputClass}
              style={inputStyle}
              required
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Date of Incident
            </label>
            <input
              type="date"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Main Kitchen"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          {/* Estimated cost */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
              Estimated Cost ($)
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="0.00"
              className={inputClass}
              style={{ ...inputStyle, fontSize: 16 }}
            />
          </div>

          {/* Actions */}
          <div
            className="flex justify-end gap-3 pt-4"
            style={{ borderTop: `1px solid ${CARD_BORDER}` }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-50"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
              style={{ background: '#1E2D4D' }}
            >
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
