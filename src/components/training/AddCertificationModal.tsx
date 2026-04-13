// ── GAP-06 AUDIT ───────────────────────────────────────────────────────
// BUILT: employee_certifications DB table, EmployeeTrainingProfile with cert display,
//        TrainingRecords grid, AssignTrainingModal, TrainingComplianceWidget,
//        comprehensive demo data (9 employees, 15 certs)
// MISSING: This modal — add/edit certification per employee with all fields
// PURPOSE: Allow adding new certifications or editing existing ones per employee
// ────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { X, Award, Calendar, FileText, Hash, Building2, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDemo } from '../../contexts/DemoContext';
import { supabase } from '../../lib/supabase';
import type { TrainingEmployeeCert } from '../../data/trainingRecordsDemoData';
import { GhostInput } from '../ai/GhostInput';
import { SuggestionPill } from '../ai/SuggestionPill';

const NAVY = '#1e4d6b';

const CERT_TYPES = [
  { value: 'food_handler', label: 'Food Handler Card' },
  { value: 'cfpm', label: 'Certified Food Protection Manager (ServSafe)' },
  { value: 'haccp_training', label: 'HACCP Principles Training' },
  { value: 'fire_extinguisher_training', label: 'Fire Extinguisher Training' },
  { value: 'hood_safety', label: 'Hood / Suppression System Training' },
  { value: 'allergen_awareness', label: 'Allergen Awareness' },
  { value: 'first_aid_cpr', label: 'First Aid / CPR' },
  { value: 'food_safety_other', label: 'Other Food Safety' },
  { value: 'facility_safety_other', label: 'Other Facility Safety' },
];

const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] bg-white';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  existingCert?: TrainingEmployeeCert | null;
  onSaved: (cert: TrainingEmployeeCert) => void;
}

export function AddCertificationModal({ isOpen, onClose, employeeId, employeeName, existingCert, onSaved }: Props) {
  const { isDemoMode } = useDemo();
  const [saving, setSaving] = useState(false);

  const [certType, setCertType] = useState(existingCert?.type || 'food_handler');
  const [certName, setCertName] = useState(existingCert?.name || '');
  const [certNumber, setCertNumber] = useState(existingCert?.number || '');
  const [authority, setAuthority] = useState(existingCert?.authority || '');
  const [issuedDate, setIssuedDate] = useState(existingCert?.issued || '');
  const [expirationDate, setExpirationDate] = useState(existingCert?.expires || '');
  const [notes, setNotes] = useState('');

  // Auto-fill cert name from type when creating new
  useEffect(() => {
    if (!existingCert && certType) {
      const found = CERT_TYPES.find(t => t.value === certType);
      if (found && !certName) setCertName(found.label);
    }
  }, [certType, existingCert, certName]);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      if (existingCert) {
        setCertType(existingCert.type);
        setCertName(existingCert.name);
        setCertNumber(existingCert.number || '');
        setAuthority(existingCert.authority);
        setIssuedDate(existingCert.issued);
        setExpirationDate(existingCert.expires || '');
        setNotes('');
      } else {
        setCertType('food_handler');
        setCertName('');
        setCertNumber('');
        setAuthority('');
        setIssuedDate(new Date().toISOString().split('T')[0]);
        setExpirationDate('');
        setNotes('');
      }
    }
  }, [isOpen, existingCert]);

  const isValid = certName.trim() && authority.trim() && issuedDate;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);

    const certRecord: TrainingEmployeeCert = {
      id: existingCert?.id || `tc-new-${Date.now()}`,
      type: certType,
      name: certName.trim(),
      number: certNumber.trim() || null,
      authority: authority.trim(),
      issued: issuedDate,
      expires: expirationDate || null,
      documentUrl: existingCert?.documentUrl || null,
    };

    if (!isDemoMode) {
      try {
        const payload = {
          user_id: employeeId,
          certification_name: certRecord.name,
          issue_date: certRecord.issued,
          expiration_date: certRecord.expires,
          status: getStatus(certRecord.expires),
          file_url: certRecord.documentUrl,
          notes: notes.trim() || null,
        };

        if (existingCert) {
          const { error } = await supabase
            .from('employee_certifications')
            .update(payload)
            .eq('id', existingCert.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('employee_certifications')
            .insert(payload);
          if (error) throw error;
        }
      } catch (err) {
        toast.error('Failed to save certification');
        setSaving(false);
        return;
      }
    }

    // Demo mode: use local state via callback
    onSaved(certRecord);
    toast.success(existingCert ? 'Certification updated' : 'Certification added', {
      description: `${certRecord.name} for ${employeeName}`,
    });
    setSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-4 sm:p-6 w-[95vw] sm:w-auto max-w-lg sm:w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award size={20} color={NAVY} />
            <h3 className="text-lg font-bold text-gray-900">
              {existingCert ? 'Edit Certification' : 'Add Certification'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          {existingCert ? 'Update' : 'Add a new'} certification for <span className="font-semibold text-gray-700">{employeeName}</span>
        </p>

        <div className="space-y-4">
          {/* Cert Type */}
          <div>
            <label className={labelClass}>Certification Type</label>
            <select value={certType} onChange={e => { setCertType(e.target.value); if (!existingCert) setCertName(CERT_TYPES.find(t => t.value === e.target.value)?.label || ''); }} className={inputClass}>
              {CERT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Cert Name */}
          <div>
            <label className={labelClass}>
              Certificate Name <span className="text-red-500">*</span>
            </label>
            <GhostInput
              type="text"
              value={certName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCertName(e.target.value)}
              placeholder="e.g., California Food Handler Card"
              className={inputClass}
              fieldLabel="Cert Name"
              formContext={{ certType }}
              entityType="training"
            />
          </div>

          {/* Authority */}
          <div>
            <label className={labelClass}>
              <Building2 size={14} className="inline mr-1" />
              Issuing Authority <span className="text-red-500">*</span>
            </label>
            <GhostInput
              type="text"
              value={authority}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuthority(e.target.value)}
              placeholder="e.g., ServSafe, ANSI, State of CA"
              className={inputClass}
              fieldLabel="Issuing Authority"
              formContext={{ certType }}
              entityType="training"
            />
          </div>

          {/* Cert Number */}
          <div>
            <label className={labelClass}>
              <Hash size={14} className="inline mr-1" />
              Certificate Number
            </label>
            <input
              type="text"
              value={certNumber}
              onChange={e => setCertNumber(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                <Calendar size={14} className="inline mr-1" />
                Issue Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={issuedDate}
                onChange={e => setIssuedDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                <Calendar size={14} className="inline mr-1" />
                Expiration Date
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={e => setExpirationDate(e.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-gray-400 mt-1">Leave blank for non-expiring certs</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>
              <FileText size={14} className="inline mr-1" />
              Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes about this certification..."
              rows={2}
              className={`${inputClass} resize-none`}
            />
            <SuggestionPill
              fieldLabel="Certification Notes"
              formContext={{ certType, certName }}
              entityType="training"
              onAccept={(text: string) => setNotes(text)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 min-h-[44px] border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-white rounded-lg text-sm font-bold disabled:opacity-40"
            style={{ backgroundColor: NAVY }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : existingCert ? 'Update' : 'Add Certification'}
          </button>
        </div>
      </div>
    </div>
  );
}

function getStatus(expires: string | null): string {
  if (!expires) return 'active';
  const days = Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000);
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring_soon';
  return 'active';
}
