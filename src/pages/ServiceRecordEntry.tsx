import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Wrench, Calendar, Truck, FileText, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';

// ── Brand ─────────────────────────────────────────────────────────
const NAVY = '#1e4d6b';
const NAVY_HOVER = '#163a52';
const GOLD = '#d4af37';
const F: React.CSSProperties = { fontFamily: "'Inter', 'DM Sans', sans-serif" };

// ── Demo equipment lookup ─────────────────────────────────────────
const EQUIPMENT_NAMES: Record<string, { name: string; type: string; location: string; linkedVendor: string }> = {
  'EQ-001': { name: 'Walk-in Cooler #1', type: 'Walk-in Cooler', location: 'Downtown Kitchen', linkedVendor: 'CleanAir HVAC' }, // demo
  'EQ-002': { name: 'Walk-in Freezer', type: 'Walk-in Freezer', location: 'Downtown Kitchen', linkedVendor: 'CleanAir HVAC' }, // demo
  'EQ-003': { name: 'Hood Ventilation System', type: 'Hood System', location: 'Downtown Kitchen', linkedVendor: 'ABC Fire Protection' }, // demo
  'EQ-004': { name: 'Fire Suppression System', type: 'Fire Suppression System', location: 'Downtown Kitchen', linkedVendor: 'Valley Fire Systems' }, // demo
  'EQ-005': { name: 'Commercial Fryer #1', type: 'Commercial Fryer', location: 'Downtown Kitchen', linkedVendor: 'CleanAir HVAC' }, // demo
  'EQ-007': { name: 'Commercial Dishwasher', type: 'Commercial Dishwasher', location: 'Downtown Kitchen', linkedVendor: 'CleanAir HVAC' }, // demo
  'EQ-008': { name: 'Walk-in Cooler', type: 'Walk-in Cooler', location: 'Airport Cafe', linkedVendor: 'CleanAir HVAC' }, // demo
  'EQ-009': { name: 'Hood Ventilation System', type: 'Hood System', location: 'Airport Cafe', linkedVendor: 'ABC Fire Protection' }, // demo
  'EQ-010': { name: 'Ice Machine', type: 'Ice Machine', location: 'Airport Cafe', linkedVendor: 'CleanAir HVAC' }, // demo
  'EQ-011': { name: 'Walk-in Cooler', type: 'Walk-in Cooler', location: 'University Dining', linkedVendor: 'CleanAir HVAC' }, // demo
  'EQ-013': { name: 'Hood Ventilation System', type: 'Hood System', location: 'University Dining', linkedVendor: 'ABC Fire Protection' }, // demo
  'EQ-017': { name: 'Upblast Exhaust Fan — Main Hood', type: 'Exhaust Fan', location: 'Downtown Kitchen', linkedVendor: 'ABC Fire Protection' }, // demo
};

const SERVICE_TYPES = [
  { value: 'inspection', label: 'Inspection' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'repair', label: 'Repair' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'certification', label: 'Certification' },
  { value: 'maintenance', label: 'Maintenance' },
];

interface FormState {
  serviceType: string;
  serviceDate: string;
  vendorName: string;
  vendorContact: string;
  certificateNumber: string;
  passFail: 'pass' | 'fail' | '';
  nextServiceDate: string;
  notes: string;
  cost: string;
}

const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] bg-white';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

export function ServiceRecordEntry() {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  const equipment = EQUIPMENT_NAMES[equipmentId || ''];

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<FormState>({
    serviceType: '',
    serviceDate: today,
    vendorName: equipment?.linkedVendor || '',
    vendorContact: '',
    certificateNumber: '',
    passFail: '',
    nextServiceDate: '',
    notes: '',
    cost: '',
  });

  const update = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!form.serviceType) e.push('Service type is required');
    if (!form.serviceDate) e.push('Service date is required');
    if (!form.vendorName.trim()) e.push('Vendor name is required');
    if (form.passFail === 'fail' && !form.notes.trim()) e.push('Notes are required when service fails');
    return e;
  }, [form]);

  const canSubmit = errors.length === 0 && form.serviceType && form.serviceDate && form.vendorName.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    guardAction('save', 'Service Records', () => {
      setSubmitting(true);
      setTimeout(() => {
        setSubmitting(false);
        toast.success('Service record saved successfully', {
          description: `${SERVICE_TYPES.find(t => t.value === form.serviceType)?.label || form.serviceType} recorded for ${equipment?.name || equipmentId}`,
        });
        if (form.passFail === 'fail') {
          toast.warning('Equipment flagged as "Needs Repair"', {
            description: 'Facilities manager has been notified.',
          });
        }
        navigate(`/equipment/${equipmentId}`);
      }, 800);
    });
  };

  return (
    <div style={F} className="max-w-2xl mx-auto">
      {/* Back link */}
      <button
        onClick={() => navigate(equipmentId ? `/equipment/${equipmentId}` : '/equipment')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={16} /> Back to {equipment?.name || 'Equipment'}
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Record Service</h1>
        {equipment && (
          <p className="text-sm text-gray-500 mt-1">
            {equipment.name} · {equipment.type} · {equipment.location}
          </p>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 space-y-5">
          {/* Service Type */}
          <div>
            <label className={labelClass}>
              Service Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.serviceType}
              onChange={e => update('serviceType', e.target.value)}
              className={inputClass}
            >
              <option value="">Select service type...</option>
              {SERVICE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Date row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Service Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.serviceDate}
                onChange={e => update('serviceDate', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Next Service Date</label>
              <input
                type="date"
                value={form.nextServiceDate}
                onChange={e => update('nextServiceDate', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Vendor row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Vendor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.vendorName}
                onChange={e => update('vendorName', e.target.value)}
                placeholder="Vendor / technician name"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Vendor Contact</label>
              <input
                type="text"
                value={form.vendorContact}
                onChange={e => update('vendorContact', e.target.value)}
                placeholder="Phone or email"
                className={inputClass}
              />
            </div>
          </div>

          {/* Certificate + Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Certificate Number</label>
              <input
                type="text"
                value={form.certificateNumber}
                onChange={e => update('certificateNumber', e.target.value)}
                placeholder="IKECA / NFPA cert #"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Cost ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.cost}
                onChange={e => update('cost', e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          </div>

          {/* Pass / Fail */}
          <div>
            <label className={labelClass}>Result</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => update('passFail', form.passFail === 'pass' ? '' : 'pass')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                  form.passFail === 'pass'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                }`}
              >
                <CheckCircle size={16} /> Pass
              </button>
              <button
                type="button"
                onClick={() => update('passFail', form.passFail === 'fail' ? '' : 'fail')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                  form.passFail === 'fail'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'
                }`}
              >
                <XCircle size={16} /> Fail
              </button>
            </div>
            {form.passFail === 'fail' && (
              <p className="text-xs text-red-600 mt-1.5">Equipment will be flagged as "Needs Repair". Notes are required.</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>
              Notes {form.passFail === 'fail' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="Service details, findings, recommendations..."
              rows={4}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Document upload placeholder */}
          <div>
            <label className={labelClass}>Document Upload</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <FileText size={24} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">Drag & drop certificate, invoice, or photo</p>
              <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 25MB</p>
              <button
                type="button"
                onClick={() => guardAction('upload', 'Service Records', () => toast.info('Document upload available in full version'))}
                className="mt-3 text-xs font-medium px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Browse Files
              </button>
            </div>
          </div>
        </div>

        {/* Submit footer */}
        <div className="border-t border-gray-200 p-5 bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(equipmentId ? `/equipment/${equipmentId}` : '/equipment')}
            className="px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: canSubmit ? NAVY : '#9ca3af' }}
            onMouseEnter={e => { if (canSubmit) (e.target as HTMLElement).style.backgroundColor = NAVY_HOVER; }}
            onMouseLeave={e => { if (canSubmit) (e.target as HTMLElement).style.backgroundColor = NAVY; }}
          >
            <Save size={16} />
            {submitting ? 'Saving...' : 'Save Service Record'}
          </button>
        </div>
      </form>

      {/* Bottom padding */}
      <div className="h-20" />

      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          featureName={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
