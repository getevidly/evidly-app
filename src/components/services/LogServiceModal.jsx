/**
 * LogServiceModal — HOODOPS-SERVICES-01
 *
 * Manual service entry modal. Service type dropdown shows KEC parent group
 * with FPM/GFX/RGC children, plus FS as standalone.
 */
import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { SERVICE_TYPES, SERVICE_TYPE_CODES, KEC_CHILDREN, formatFrequency } from '../../constants/serviceTypes';

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];

export function LogServiceModal({ isOpen, onClose }) {
  const { isDemoMode } = useDemo();
  const [form, setForm] = useState({
    service_type_code: 'KEC',
    date: new Date().toISOString().split('T')[0],
    provider: '',
    technician: '',
    price: '',
    frequency: 'quarterly',
    notes: '',
    certificate: null,
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isDemoMode) {
      alert('Service logged (demo mode — not persisted)');
      onClose();
      return;
    }
    // Production: insert vendor_service_records + upsert location_service_schedules
    alert('Service logged successfully');
    onClose();
  };

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid var(--border, #D1D9E6)',
    fontSize: 13, color: 'var(--text-primary, #0B1628)',
    outline: 'none',
  };
  const labelStyle = {
    fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #3D5068)',
    marginBottom: 4, display: 'block',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {/* Modal */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480,
            maxHeight: '85vh', overflow: 'auto', padding: '20px 24px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #0B1628)' }}>
                Log Service
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary, #6B7F96)' }}>
                Record a completed vendor service
              </div>
            </div>
            <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer' }}>
              <X style={{ width: 18, height: 18, color: '#6B7F96' }} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Service type */}
            <div>
              <label style={labelStyle}>Service Type</label>
              <select
                value={form.service_type_code}
                onChange={e => set('service_type_code', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <optgroup label="Kitchen Exhaust (KEC)">
                  <option value="KEC">{SERVICE_TYPES.KEC.name}</option>
                  {KEC_CHILDREN.map(code => (
                    <option key={code} value={code}>&nbsp;&nbsp;{SERVICE_TYPES[code].name}</option>
                  ))}
                </optgroup>
                <optgroup label="Standalone">
                  <option value="FS">{SERVICE_TYPES.FS.name}</option>
                </optgroup>
              </select>
            </div>

            {/* Date + Provider */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Service Date</label>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Provider</label>
                <input type="text" value={form.provider} onChange={e => set('provider', e.target.value)} placeholder="Cleaning Pros Plus" style={inputStyle} />
              </div>
            </div>

            {/* Technician + Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Technician</label>
                <input type="text" value={form.technician} onChange={e => set('technician', e.target.value)} placeholder="Optional" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Price</label>
                <input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder={String(SERVICE_TYPES[form.service_type_code]?.basePrice || 0)} style={inputStyle} />
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label style={labelStyle}>Frequency</label>
              <select value={form.frequency} onChange={e => set('frequency', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {FREQUENCY_OPTIONS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Optional service notes..."
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {/* Certificate upload */}
            <div>
              <label style={labelStyle}>Certificate / Document</label>
              <div style={{
                border: '2px dashed var(--border, #D1D9E6)', borderRadius: 8,
                padding: '14px 16px', textAlign: 'center', cursor: 'pointer',
              }}>
                <Upload style={{ width: 18, height: 18, color: '#6B7F96', margin: '0 auto 4px' }} />
                <div style={{ fontSize: 12, color: 'var(--text-tertiary, #6B7F96)' }}>
                  {form.certificate ? form.certificate.name : 'Click or drag to upload certificate'}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 20px', borderRadius: 8,
                  border: '1px solid var(--border, #D1D9E6)',
                  background: '#fff', fontSize: 13, fontWeight: 600,
                  color: 'var(--text-secondary, #3D5068)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '8px 20px', borderRadius: 8,
                  border: 'none', background: '#1e4d6b',
                  fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
                }}
              >
                Save Service
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
