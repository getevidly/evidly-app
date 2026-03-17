/**
 * EquipmentFormModal — Create/edit equipment with dynamic custom fields.
 */
import { useState } from 'react';
import { X, Loader2, Wrench } from 'lucide-react';
import { useCreateEquipment, useUpdateEquipment } from '../../hooks/api/useEquipment';
import type { EquipmentItem, CreateEquipmentInput } from '../../hooks/api/useEquipment';
import { NAVY, CARD_BG, CARD_BORDER, TEXT_TERTIARY, MUTED } from '../dashboard/shared/constants';

const EQUIPMENT_TYPES = [
  { value: 'hood', label: 'Hood System' },
  { value: 'duct', label: 'Ductwork' },
  { value: 'fan', label: 'Fan / Blower' },
  { value: 'filter', label: 'Grease Filter' },
  { value: 'suppression', label: 'Fire Suppression' },
  { value: 'extinguisher', label: 'Fire Extinguisher' },
  { value: 'ansul', label: 'Ansul System' },
];

const CUSTOM_FIELDS_BY_TYPE: Record<string, { key: string; label: string; type: 'text' | 'number' }[]> = {
  hood: [
    { key: 'width', label: 'Width (in)', type: 'number' },
    { key: 'depth', label: 'Depth (in)', type: 'number' },
    { key: 'filterCount', label: 'Filter Count', type: 'number' },
    { key: 'cfm', label: 'CFM', type: 'number' },
  ],
  duct: [
    { key: 'length', label: 'Length (ft)', type: 'number' },
    { key: 'material', label: 'Material', type: 'text' },
    { key: 'accessPoints', label: 'Access Points', type: 'number' },
  ],
  fan: [
    { key: 'size', label: 'Size (in)', type: 'number' },
    { key: 'motorHp', label: 'Motor HP', type: 'number' },
    { key: 'beltType', label: 'Belt Type', type: 'text' },
  ],
  suppression: [
    { key: 'agentType', label: 'Agent Type', type: 'text' },
    { key: 'tankSize', label: 'Tank Size (gal)', type: 'number' },
    { key: 'lastInspection', label: 'Last Inspection', type: 'text' },
  ],
};

interface EquipmentFormModalProps {
  equipment?: EquipmentItem;
  onClose: () => void;
}

export function EquipmentFormModal({ equipment, onClose }: EquipmentFormModalProps) {
  const isEdit = !!equipment;
  const { mutate: create, isLoading: creating } = useCreateEquipment();
  const { mutate: update, isLoading: updating } = useUpdateEquipment();
  const saving = creating || updating;

  const [name, setName] = useState(equipment?.name || '');
  const [equipmentType, setEquipmentType] = useState(equipment?.equipmentType || '');
  const [locationId, setLocationId] = useState(equipment?.locationId || '');
  const [manufacturer, setManufacturer] = useState(equipment?.manufacturer || '');
  const [model, setModel] = useState(equipment?.model || '');
  const [serialNumber, setSerialNumber] = useState(equipment?.serialNumber || '');
  const [installDate, setInstallDate] = useState(equipment?.installDate || '');
  const [installedArea, setInstalledArea] = useState(equipment?.installedArea || '');
  const [notes, setNotes] = useState(equipment?.notes || '');
  const [customFields, setCustomFields] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(equipment?.customFields || {}).map(([k, v]) => [k, String(v)]))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const customFieldDefs = CUSTOM_FIELDS_BY_TYPE[equipmentType] || [];

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!equipmentType) e.equipmentType = 'Equipment type is required';
    if (!locationId.trim()) e.locationId = 'Location is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const input: CreateEquipmentInput = {
      name: name.trim(),
      equipmentType,
      locationId: locationId.trim(),
      manufacturer: manufacturer.trim() || undefined,
      model: model.trim() || undefined,
      serialNumber: serialNumber.trim() || undefined,
      installDate: installDate || undefined,
      installedArea: installedArea.trim() || undefined,
      notes: notes.trim() || undefined,
      customFields: Object.fromEntries(
        Object.entries(customFields).filter(([, v]) => v.trim())
      ),
    };

    try {
      if (isEdit) {
        await update({ id: equipment.id, ...input });
      } else {
        await create(input);
      }
      onClose();
    } catch { /* hook handles error */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="rounded-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col"
        style={{ background: CARD_BG, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0" style={{ borderColor: CARD_BORDER }}>
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5" style={{ color: '#1e4d6b' }} />
            <h2 className="text-base font-bold" style={{ color: NAVY }}>
              {isEdit ? 'Edit Equipment' : 'Add Equipment'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100" aria-label="Close">
            <X className="w-5 h-5" style={{ color: TEXT_TERTIARY }} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Location */}
          <Field label="Location" required error={errors.locationId}>
            <input
              value={locationId}
              onChange={e => setLocationId(e.target.value)}
              placeholder="Search for a location..."
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30"
              style={{ borderColor: errors.locationId ? '#DC2626' : CARD_BORDER, color: NAVY }}
            />
          </Field>

          {/* Equipment Type */}
          <Field label="Equipment Type" required error={errors.equipmentType}>
            <select
              value={equipmentType}
              onChange={e => setEquipmentType(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30"
              style={{ borderColor: errors.equipmentType ? '#DC2626' : CARD_BORDER, color: NAVY }}
            >
              <option value="">Select type...</option>
              {EQUIPMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>

          {/* Name */}
          <Field label="Name" required error={errors.name}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Main Kitchen Hood #1"
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30"
              style={{ borderColor: errors.name ? '#DC2626' : CARD_BORDER, color: NAVY }}
            />
          </Field>

          {/* Manufacturer + Model row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Manufacturer">
              <input value={manufacturer} onChange={e => setManufacturer(e.target.value)} placeholder="e.g., CaptiveAire"
                className="w-full px-3 py-2 text-sm rounded-lg border" style={{ borderColor: CARD_BORDER, color: NAVY }} />
            </Field>
            <Field label="Model">
              <input value={model} onChange={e => setModel(e.target.value)} placeholder="e.g., ND-2-6"
                className="w-full px-3 py-2 text-sm rounded-lg border" style={{ borderColor: CARD_BORDER, color: NAVY }} />
            </Field>
          </div>

          {/* Serial + Install Date row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Serial Number">
              <input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="e.g., SN-12345"
                className="w-full px-3 py-2 text-sm rounded-lg border font-mono" style={{ borderColor: CARD_BORDER, color: NAVY }} />
            </Field>
            <Field label="Install Date">
              <input type="date" value={installDate} onChange={e => setInstallDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border" style={{ borderColor: CARD_BORDER, color: NAVY }} />
            </Field>
          </div>

          {/* Installed Area */}
          <Field label="Installed Area">
            <input value={installedArea} onChange={e => setInstalledArea(e.target.value)} placeholder="e.g., Main Kitchen Hood #1"
              className="w-full px-3 py-2 text-sm rounded-lg border" style={{ borderColor: CARD_BORDER, color: NAVY }} />
          </Field>

          {/* Custom fields based on equipment type */}
          {customFieldDefs.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase mb-2" style={{ color: TEXT_TERTIARY }}>
                {EQUIPMENT_TYPES.find(t => t.value === equipmentType)?.label} Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                {customFieldDefs.map(f => (
                  <Field key={f.key} label={f.label}>
                    <input
                      type={f.type}
                      value={customFields[f.key] || ''}
                      onChange={e => setCustomFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg border"
                      style={{ borderColor: CARD_BORDER, color: NAVY }}
                    />
                  </Field>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes..."
              className="w-full px-3 py-2 text-sm rounded-lg border resize-none"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t flex-shrink-0" style={{ borderColor: CARD_BORDER }}>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50" style={{ borderColor: CARD_BORDER, color: NAVY }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ background: saving ? '#9CA3AF' : '#1e4d6b' }}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Equipment'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: MUTED }}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}
