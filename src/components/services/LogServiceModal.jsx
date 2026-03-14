/**
 * LogServiceModal — HOODOPS-SERVICES-01
 *
 * Manual service entry modal. Service type dropdown shows KEC parent group
 * with FPM/GFX/RGC children, plus FS as standalone.
 */
import { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDemo } from '../../contexts/DemoContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { SERVICE_TYPES, SERVICE_TYPE_CODES, KEC_CHILDREN, formatFrequency } from '../../constants/serviceTypes';

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];

function calculateNextDue(fromDate, frequency) {
  const d = new Date(fromDate);
  switch (frequency) {
    case 'monthly':       d.setMonth(d.getMonth() + 1); break;
    case 'quarterly':     d.setMonth(d.getMonth() + 3); break;
    case 'semi_annual':   d.setMonth(d.getMonth() + 6); break;
    case 'annual':        d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split('T')[0];
}

export function LogServiceModal({ isOpen, onClose, locationId, onSuccess }) {
  const { isDemoMode } = useDemo();
  const { user, profile } = useAuth();
  const [saving, setSaving] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isDemoMode) {
      toast.success('Service logged (demo mode — not persisted)');
      onClose();
      return;
    }

    setSaving(true);
    try {
      const orgId = profile?.organization_id;
      const userId = user?.id;

      // 1. Insert service record
      const { data: record, error } = await supabase
        .from('vendor_service_records')
        .insert({
          organization_id:   orgId,
          location_id:       locationId || null,
          service_type_code: form.service_type_code,
          service_date:      form.date,
          provider_name:     form.provider || null,
          technician_name:   form.technician || null,
          price_charged:     form.price ? parseFloat(form.price) : null,
          notes:             form.notes || null,
          source:            'manual',
          entered_by:        userId,
          status:            'completed',
        })
        .select()
        .single();

      if (error) {
        toast.error('Error saving service record. Please try again.');
        setSaving(false);
        return;
      }

      // 2. Upload certificate if provided (fire-and-forget)
      if (form.certificate && record) {
        const filename = `${orgId}/${locationId || 'org'}/${record.id}/${form.certificate.name}`;
        const { data: upload } = await supabase.storage
          .from('service-certificates')
          .upload(filename, form.certificate, { upsert: true });

        if (upload) {
          const { data: urlData } = supabase.storage
            .from('service-certificates')
            .getPublicUrl(filename);

          if (urlData?.publicUrl) {
            await supabase
              .from('vendor_service_records')
              .update({ certificate_url: urlData.publicUrl })
              .eq('id', record.id);
          }
        }
      }

      // 3. Update location_service_schedules
      if (locationId) {
        const nextDue = calculateNextDue(form.date, form.frequency);
        await supabase
          .from('location_service_schedules')
          .upsert({
            location_id:        locationId,
            service_type_code:  form.service_type_code,
            last_service_date:  form.date,
            next_due_date:      nextDue,
            last_price:         form.price ? parseFloat(form.price) : null,
            frequency:          form.frequency,
          }, { onConflict: 'location_id,service_type_code' });
      }

      // 4. Success
      toast.success('Service record saved.');
      onClose();
      onSuccess?.();
    } catch {
      toast.error('Unexpected error. Please try again.');
    } finally {
      setSaving(false);
    }
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
              <label style={{
                border: '2px dashed var(--border, #D1D9E6)', borderRadius: 8,
                padding: '14px 16px', textAlign: 'center', cursor: 'pointer',
                display: 'block',
              }}>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx"
                  style={{ display: 'none' }}
                  onChange={e => set('certificate', e.target.files?.[0] || null)}
                />
                <Upload style={{ width: 18, height: 18, color: '#6B7F96', margin: '0 auto 4px' }} />
                <div style={{ fontSize: 12, color: 'var(--text-tertiary, #6B7F96)' }}>
                  {form.certificate ? form.certificate.name : 'Click or drag to upload certificate'}
                </div>
              </label>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
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
                disabled={saving}
                style={{
                  padding: '8px 20px', borderRadius: 8,
                  border: 'none', background: '#1e4d6b',
                  fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
                  opacity: saving ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {saving && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
                {saving ? 'Saving...' : 'Save Service'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
