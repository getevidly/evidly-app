/**
 * InsurancePolicyModal — Add a new insurance policy (company or vehicle).
 */
import { useState } from 'react';
import { X } from 'lucide-react';
import { NAVY, CARD_BORDER, TEXT_TERTIARY } from '@shared/components/dashboard/shared/constants';

interface Props {
  onClose: () => void;
}

type Scope = 'company' | 'vehicle';

const COMPANY_TYPES = [
  { value: 'general_liability', label: 'General Liability' },
  { value: 'workers_comp', label: "Workers' Comp" },
  { value: 'professional_liability', label: 'Professional Liability' },
  { value: 'property', label: 'Property' },
  { value: 'cyber', label: 'Cyber' },
  { value: 'umbrella', label: 'Umbrella' },
];

const VEHICLE_TYPES = [
  { value: 'liability', label: 'Liability' },
  { value: 'collision', label: 'Collision' },
  { value: 'comprehensive', label: 'Comprehensive' },
  { value: 'commercial_auto', label: 'Commercial Auto' },
  { value: 'umbrella', label: 'Umbrella' },
];

const FREQ = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];

export function InsurancePolicyModal({ onClose }: Props) {
  const [scope, setScope] = useState<Scope>('company');
  const [policyType, setPolicyType] = useState('general_liability');
  const [company, setCompany] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [coverage, setCoverage] = useState('');
  const [deductible, setDeductible] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [premium, setPremium] = useState('');
  const [frequency, setFrequency] = useState('annual');
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentEmail, setAgentEmail] = useState('');

  const types = scope === 'company' ? COMPANY_TYPES : VEHICLE_TYPES;

  const handleSave = () => {
    if (!company.trim() || !policyNumber.trim() || !effectiveDate || !expiryDate) {
      alert('Company, policy number, and dates are required');
      return;
    }
    alert(`Policy created (save pending — Supabase table required)`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <h2 className="text-lg font-bold" style={{ color: NAVY }}>Add Insurance Policy</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Scope toggle */}
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: CARD_BORDER }}>
            <button
              onClick={() => { setScope('company'); setPolicyType('general_liability'); }}
              className="flex-1 px-4 py-2 text-sm font-medium transition-colors"
              style={{ background: scope === 'company' ? NAVY : '#fff', color: scope === 'company' ? '#fff' : TEXT_TERTIARY }}
            >
              Company
            </button>
            <button
              onClick={() => { setScope('vehicle'); setPolicyType('liability'); }}
              className="flex-1 px-4 py-2 text-sm font-medium transition-colors"
              style={{ background: scope === 'vehicle' ? NAVY : '#fff', color: scope === 'vehicle' ? '#fff' : TEXT_TERTIARY }}
            >
              Vehicle
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: TEXT_TERTIARY }}>Policy Type *</label>
            <select
              value={policyType}
              onChange={e => setPolicyType(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            >
              {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <Field label="Insurance Company *" value={company} onChange={setCompany} placeholder="State Farm" />
          <Field label="Policy Number *" value={policyNumber} onChange={setPolicyNumber} placeholder="POL-123456" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Coverage ($)" value={coverage} onChange={setCoverage} placeholder="1000000" />
            <Field label="Deductible ($)" value={deductible} onChange={setDeductible} placeholder="5000" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: TEXT_TERTIARY }}>Effective Date *</label>
              <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg" style={{ borderColor: CARD_BORDER, color: NAVY }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: TEXT_TERTIARY }}>Expiry Date *</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg" style={{ borderColor: CARD_BORDER, color: NAVY }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Premium ($)" value={premium} onChange={setPremium} placeholder="5000" />
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: TEXT_TERTIARY }}>Payment Frequency</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg" style={{ borderColor: CARD_BORDER, color: NAVY }}>
                {FREQ.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          <Field label="Agent Name" value={agentName} onChange={setAgentName} placeholder="John Smith" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Agent Phone" value={agentPhone} onChange={setAgentPhone} placeholder="(555) 123-4567" />
            <Field label="Agent Email" value={agentEmail} onChange={setAgentEmail} placeholder="agent@example.com" />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: CARD_BORDER }}>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border" style={{ borderColor: CARD_BORDER, color: NAVY }}>Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ background: NAVY }}>Save Policy</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: TEXT_TERTIARY }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 text-sm border rounded-lg" style={{ borderColor: CARD_BORDER, color: NAVY }} />
    </div>
  );
}
