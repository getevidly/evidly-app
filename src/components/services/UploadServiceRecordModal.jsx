/**
 * UploadServiceRecordModal — manual upload for hood cleaning + fire protection records.
 * Used by KitchenExhaustCleaning and FireProtection pages.
 */

import { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { supabase } from '../../lib/supabase';
import { colors, typography, radius, shadows } from '../../lib/designSystem';

// ── Service type options per category ────────────────────────
const CATEGORY_SERVICE_TYPES = {
  hood_cleaning: [
    { code: 'KEC', safeguardType: 'hood_cleaning', label: 'Kitchen Exhaust Cleaning' },
    { code: 'FPM', safeguardType: 'hood_cleaning', label: 'Fan Performance' },
    { code: 'GFX', safeguardType: 'hood_cleaning', label: 'Grease Filter Exchange' },
    { code: 'RGC', safeguardType: 'hood_cleaning', label: 'Rooftop Grease Containment' },
  ],
  fire_protection: [
    { code: 'FS', safeguardType: 'fire_suppression', label: 'Fire Suppression' },
    { code: 'FA', safeguardType: 'fire_alarm', label: 'Fire Alarm' },
    { code: 'SP', safeguardType: 'sprinklers', label: 'Sprinkler System' },
  ],
};

const COST_ROLES = ['owner_operator', 'executive', 'facilities_manager', 'platform_admin'];

// ── Component ────────────────────────────────────────────────
export default function UploadServiceRecordModal({ category, defaultLocationId, onClose, onSuccess }) {
  const { user, profile } = useAuth();
  const { userRole } = useRole();
  const showCost = COST_ROLES.includes(userRole);
  const orgId = profile?.organization_id;

  const serviceTypes = CATEGORY_SERVICE_TYPES[category] || CATEGORY_SERVICE_TYPES.hood_cleaning;

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    serviceTypeCode: serviceTypes[0]?.code || '',
    serviceDate: new Date().toISOString().split('T')[0],
    vendorName: '',
    price: '',
    certNumber: '',
    notes: '',
    document: null,
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const selectedType = serviceTypes.find(t => t.code === form.serviceTypeCode) || serviceTypes[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orgId || !user?.id) {
      toast.error('Session expired. Please reload.');
      return;
    }

    setSaving(true);
    try {
      if (!form.document) {
        toast.error('A document is required to seal this record.');
        setSaving(false);
        return;
      }

      if (!form.certNumber?.trim()) {
        toast.error('Certificate / Report Number is required.');
        setSaving(false);
        return;
      }

      if (!form.vendorName?.trim()) {
        toast.error('Vendor name is required.');
        setSaving(false);
        return;
      }

      // 1. Generate path and upload file
      const fileId = crypto.randomUUID();
      const filePath = `${orgId}/${defaultLocationId || 'org'}/${fileId}/${form.document.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('service-certificates')
        .upload(filePath, form.document, { upsert: false });

      if (uploadErr) {
        toast.error('File upload failed: ' + uploadErr.message);
        setSaving(false);
        return;
      }

      // 2. Seal via edge function (creates the VSR row)
      const { data: sealData, error: sealErr } = await supabase.functions.invoke(
        'seal-service-record',
        {
          body: {
            organization_id: orgId,
            location_id: defaultLocationId || null,
            safeguard_type: selectedType.safeguardType,
            service_type_code: form.serviceTypeCode,
            vendor_name: form.vendorName.trim(),
            service_date: form.serviceDate,
            cert_number: form.certNumber.trim(),
            technician_name: null,
            price_charged: form.price ? parseFloat(form.price) : null,
            notes: form.notes || null,
            source_file_bucket: 'service-certificates',
            source_file_path: filePath,
          },
        },
      );

      if (sealErr || sealData?.error) {
        await supabase.storage.from('service-certificates').remove([filePath]);
        toast.error('Seal failed: ' + (sealData?.error || sealErr?.message || 'Unknown error'));
        setSaving(false);
        return;
      }

      toast.success('Service record sealed.');
      onSuccess?.();
    } catch {
      toast.error('Unexpected error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: radius.md,
    border: `1px solid ${colors.border}`,
    fontSize: typography.size.sm,
    fontFamily: typography.family.body,
    color: colors.textPrimary,
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
    marginBottom: 4,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          overflow: 'auto',
          background: colors.white,
          borderRadius: '16px 16px 0 0',
          padding: 20,
          boxShadow: shadows.xl,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: typography.size.h3, fontWeight: typography.weight.bold, color: colors.textPrimary }}>
            Upload Service Record
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color={colors.textMuted} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Service type */}
          <div>
            <label style={labelStyle}>Service Type</label>
            <select
              value={form.serviceTypeCode}
              onChange={(e) => set('serviceTypeCode', e.target.value)}
              style={inputStyle}
            >
              {serviceTypes.map(t => (
                <option key={t.code} value={t.code}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Service date */}
          <div>
            <label style={labelStyle}>Service Date</label>
            <input
              type="date"
              value={form.serviceDate}
              onChange={(e) => set('serviceDate', e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Vendor name */}
          <div>
            <label style={labelStyle}>Vendor Name</label>
            <input
              type="text"
              value={form.vendorName}
              onChange={(e) => set('vendorName', e.target.value)}
              placeholder="e.g. Filta Environmental"
              style={inputStyle}
            />
          </div>

          {/* Cost (role-gated) */}
          {showCost && (
            <div>
              <label style={labelStyle}>Cost ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="0.00"
                style={inputStyle}
              />
            </div>
          )}

          {/* Certificate number */}
          <div>
            <label style={labelStyle}>Certificate / Report Number</label>
            <input
              type="text"
              value={form.certNumber}
              onChange={(e) => set('certNumber', e.target.value)}
              placeholder="Optional"
              style={inputStyle}
            />
          </div>

          {/* Document upload */}
          <div>
            <label style={labelStyle}>Document (PDF or image)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => set('document', e.target.files?.[0] || null)}
              style={{ ...inputStyle, padding: '6px 12px' }}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Optional notes"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 0',
              fontSize: typography.size.sm,
              fontWeight: typography.weight.semibold,
              color: colors.white,
              background: saving ? colors.textMuted : colors.navy,
              border: 'none',
              borderRadius: radius.md,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {saving ? 'Saving...' : 'Save Record'}
          </button>
        </form>
      </div>
    </div>
  );
}
