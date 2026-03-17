import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCreateServiceType, useUpdateServiceType, type ServiceType } from '../../hooks/api/useSettings';
import {
  CARD_BG, CARD_BORDER, BODY_TEXT, MUTED, NAVY, FONT,
} from '../../components/dashboard/shared/constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  serviceType?: ServiceType | null;
  onSaved?: (st: ServiceType) => void;
}

const PRESET_COLORS = ['#1e4d6b', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#4f46e5'];

const ICON_OPTIONS = [
  'Wrench', 'Flame', 'Droplets', 'Wind', 'Zap', 'Shield',
  'Thermometer', 'Truck', 'Trash2', 'Spray', 'Bug', 'Sparkles',
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 8,
  fontSize: 14,
  color: BODY_TEXT,
  background: '#fff',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: BODY_TEXT,
  marginBottom: 4,
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function ServiceTypeFormModal({ isOpen, onClose, serviceType, onSaved }: Props) {
  const { mutate: createType, isLoading: creating } = useCreateServiceType();
  const { mutate: updateType, isLoading: updating } = useUpdateServiceType();
  const saving = creating || updating;
  const isEdit = !!serviceType;

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    icon: 'Wrench',
    color: '#1e4d6b',
    durationMinutes: 60,
    basePrice: 0,
    complianceCodes: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (serviceType) {
      setForm({
        name: serviceType.name,
        code: serviceType.code,
        description: serviceType.description,
        icon: serviceType.icon,
        color: serviceType.color,
        durationMinutes: serviceType.durationMinutes,
        basePrice: serviceType.basePrice,
        complianceCodes: serviceType.complianceCodes.join(', '),
        isActive: serviceType.isActive,
      });
    } else {
      setForm({ name: '', code: '', description: '', icon: 'Wrench', color: '#1e4d6b', durationMinutes: 60, basePrice: 0, complianceCodes: '', isActive: true });
    }
    setErrors({});
  }, [serviceType, isOpen]);

  const handleNameChange = (name: string) => {
    setForm(prev => ({ ...prev, name, code: isEdit ? prev.code : slugify(name) }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (form.durationMinutes <= 0) e.durationMinutes = 'Duration must be > 0';
    if (form.basePrice < 0) e.basePrice = 'Price must be >= 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const payload = {
      name: form.name.trim(),
      code: form.code || slugify(form.name),
      description: form.description.trim(),
      icon: form.icon,
      color: form.color,
      durationMinutes: form.durationMinutes,
      basePrice: form.basePrice,
      complianceCodes: form.complianceCodes.split(',').map(s => s.trim()).filter(Boolean),
      isActive: form.isActive,
    };

    try {
      if (isEdit && serviceType) {
        await updateType({ ...serviceType, ...payload });
        onSaved?.({ ...serviceType, ...payload });
      } else {
        const created = await createType(payload);
        onSaved?.(created);
      }
      onClose();
    } catch {
      alert('Failed to save service type');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{
        position: 'relative',
        background: CARD_BG,
        borderRadius: 14,
        width: '100%',
        maxWidth: 540,
        maxHeight: '90vh',
        overflow: 'auto',
        padding: 28,
        ...FONT,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: BODY_TEXT, margin: 0 }}>
            {isEdit ? 'Edit Service Type' : 'Add Service Type'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} aria-label="Close">
            <X size={20} color={MUTED} />
          </button>
        </div>

        {/* Name & Code */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input style={{ ...inputStyle, borderColor: errors.name ? '#dc2626' : CARD_BORDER }} value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="Hood Cleaning" />
            {errors.name && <span style={{ color: '#dc2626', fontSize: 12 }}>{errors.name}</span>}
          </div>
          <div>
            <label style={labelStyle}>Code</label>
            <input style={{ ...inputStyle, background: '#f9fafb', color: MUTED }} value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="hood_cleaning" />
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Description</label>
          <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the service..." />
        </div>

        {/* Icon picker */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Icon</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ICON_OPTIONS.map(icon => (
              <button
                key={icon}
                onClick={() => setForm(p => ({ ...p, icon }))}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: `1px solid ${form.icon === icon ? NAVY : CARD_BORDER}`,
                  background: form.icon === icon ? NAVY : '#fff',
                  color: form.icon === icon ? '#fff' : BODY_TEXT,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setForm(p => ({ ...p, color: c }))}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: c,
                  border: `2px solid ${form.color === c ? BODY_TEXT : 'transparent'}`,
                  cursor: 'pointer',
                }}
              />
            ))}
            <input
              type="color"
              value={form.color}
              onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
              style={{ width: 28, height: 28, border: `1px solid ${CARD_BORDER}`, borderRadius: 6, cursor: 'pointer', padding: 1 }}
            />
          </div>
        </div>

        {/* Duration & Price */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Duration (minutes) *</label>
            <input style={{ ...inputStyle, borderColor: errors.durationMinutes ? '#dc2626' : CARD_BORDER }} type="number" min={1} value={form.durationMinutes} onChange={e => setForm(p => ({ ...p, durationMinutes: Number(e.target.value) }))} />
            {errors.durationMinutes && <span style={{ color: '#dc2626', fontSize: 12 }}>{errors.durationMinutes}</span>}
          </div>
          <div>
            <label style={labelStyle}>Base Price ($)</label>
            <input style={{ ...inputStyle, borderColor: errors.basePrice ? '#dc2626' : CARD_BORDER }} type="number" min={0} step={0.01} value={form.basePrice} onChange={e => setForm(p => ({ ...p, basePrice: Number(e.target.value) }))} />
            {errors.basePrice && <span style={{ color: '#dc2626', fontSize: 12 }}>{errors.basePrice}</span>}
          </div>
        </div>

        {/* Compliance codes */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Compliance Codes</label>
          <input style={inputStyle} value={form.complianceCodes} onChange={e => setForm(p => ({ ...p, complianceCodes: e.target.value }))} placeholder="NFPA-96, UL-300 (comma-separated)" />
        </div>

        {/* Active toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
            style={{ width: 18, height: 18, accentColor: NAVY, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 14, color: BODY_TEXT, fontWeight: 500 }}>Active</span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: '#fff', color: BODY_TEXT, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: NAVY,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
