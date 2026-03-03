import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Users, Settings2, ArrowRight, AlertTriangle, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import { isBlockedDomain, KITCHEN_TYPES, OPERATION_VOLUMES, US_STATES } from '../../data/demoGeneratorData';
import { generateDemoData, GENERATION_STEPS } from '../../lib/demoDataGenerator';
import type { GenerationProgress } from '../../lib/demoDataGenerator';
import { DemoGenerationLoading } from '../../components/demo/DemoGenerationLoading';

const NAVY = '#1E2D4D';

interface FormData {
  prospectName: string;
  prospectEmail: string;
  prospectPhone: string;
  companyName: string;
  companyType: string;
  operationVolume: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  numLocations: number;
  demoDuration: number;
  includeTemperature: boolean;
  includeCompliance: boolean;
  includeInspections: boolean;
  includeVendors: boolean;
  includeCorrectiveActions: boolean;
  generateNow: boolean;
  scheduledDate: string;
}

export function DemoGenerator() {
  useDemoGuard();
  const { isDemoMode } = useDemo();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>({
    prospectName: '',
    prospectEmail: '',
    prospectPhone: '',
    companyName: '',
    companyType: 'restaurant',
    operationVolume: 'moderate',
    address: '',
    city: '',
    state: 'CA',
    zipCode: '',
    numLocations: 1,
    demoDuration: 14,
    includeTemperature: true,
    includeCompliance: true,
    includeInspections: true,
    includeVendors: true,
    includeCorrectiveActions: true,
    generateNow: true,
    scheduledDate: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<GenerationProgress[]>([]);
  const [success, setSuccess] = useState(false);

  const update = (field: keyof FormData, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleGenerate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.prospectName || !form.prospectEmail || !form.companyName || !form.address || !form.city || !form.zipCode) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.prospectEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    const blockCheck = isBlockedDomain(form.prospectEmail);
    if (blockCheck.blocked) {
      setError(blockCheck.reason === 'competitor'
        ? "Blocked: competitor email domain detected."
        : "Blocked: disposable email domain.");
      return;
    }

    if (form.generateNow) {
      setGenerating(true);
      setGenerationSteps(GENERATION_STEPS.map(s => ({ ...s, status: 'pending' as const })));

      try {
        await generateDemoData(
          {
            companyName: form.companyName,
            companyType: form.companyType,
            operationType: form.operationVolume as 'light' | 'moderate' | 'heavy' | 'institutional',
            city: form.city,
            county: '',
            state: form.state,
            zipCode: form.zipCode,
            healthAuthority: `${form.city} County Department of Public Health`,
            fireAuthority: `${form.city} Fire Department`,
            numLocations: form.numLocations,
            durationDays: form.demoDuration,
            includeInsights: [
              form.includeTemperature && 'temperature_trends',
              form.includeCompliance && 'compliance_progression',
              form.includeInspections && 'inspection_predictions',
              form.includeVendors && 'vendor_reminders',
              form.includeCorrectiveActions && 'corrective_actions',
            ].filter(Boolean) as string[],
          },
          (steps) => setGenerationSteps(steps),
        );
        setGenerating(false);
        setSuccess(true);
      } catch (err) {
        setGenerating(false);
        setError('Demo generation failed. Please try again.');
      }
    } else {
      // Schedule for later
      if (isDemoMode) {
        alert('Demo session saved and scheduled. The demo data will be generated before the meeting.');
      }
      setSuccess(true);
    }
  }, [form, isDemoMode]);

  // ── Loading Screen ──
  if (generating) {
    return (
      <DemoGenerationLoading
        companyName={form.companyName}
        city={form.city}
        state={form.state}
        steps={generationSteps}
      />
    );
  }

  // ── Success Screen ──
  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: NAVY }}>
            {form.generateNow ? 'Demo Ready!' : 'Demo Scheduled!'}
          </h2>
          <p className="text-gray-600 mb-1">
            Personalized demo for <span className="font-semibold">{form.companyName}</span>
          </p>
          <p className="text-gray-500 text-sm mb-6">
            {form.city}, {form.state} | {KITCHEN_TYPES.find(t => t.value === form.companyType)?.label} | {OPERATION_VOLUMES.find(v => v.value === form.operationVolume)?.label} Volume
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/admin/demos')}
              className="px-6 py-2.5 rounded-lg text-white font-medium text-sm"
              style={{ backgroundColor: NAVY }}
            >
              View Demo Pipeline
            </button>
            <button
              onClick={() => { setSuccess(false); setForm(f => ({ ...f, prospectName: '', prospectEmail: '', prospectPhone: '', companyName: '', address: '', city: '', zipCode: '' })); }}
              className="px-6 py-2.5 rounded-lg font-medium text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Generate Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[#1e4d6b] focus:ring-2 focus:ring-[#1e4d6b]/20 outline-none transition-colors text-sm';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${NAVY}10` }}>
          <Sparkles className="w-5 h-5" style={{ color: NAVY }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: NAVY }}>Generate Custom Demo for Prospect</h1>
          <p className="text-sm text-gray-500">Build a personalized, jurisdiction-accurate demo environment</p>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="space-y-0">
        {/* Prospect Information */}
        <div className="bg-white rounded-t-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5" style={{ color: NAVY }} />
            <h2 className="font-semibold text-sm" style={{ color: NAVY }}>PROSPECT INFORMATION</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Name *</label>
              <input type="text" className={inputClass} value={form.prospectName}
                onChange={e => update('prospectName', e.target.value)} placeholder="Prospect name" />
            </div>
            <div>
              <label className={labelClass}>Email *</label>
              <input type="email" className={inputClass} value={form.prospectEmail}
                onChange={e => update('prospectEmail', e.target.value)} placeholder="prospect@company.com" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Phone</label>
              <input type="tel" className={inputClass} value={form.prospectPhone}
                onChange={e => update('prospectPhone', e.target.value)} placeholder="(555) 555-1234" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Company Name *</label>
              <input type="text" className={inputClass} value={form.companyName}
                onChange={e => update('companyName', e.target.value)} placeholder="Company name" />
            </div>
          </div>
        </div>

        {/* Kitchen Details */}
        <div className="bg-white border-x border-b border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5" style={{ color: NAVY }} />
            <h2 className="font-semibold text-sm" style={{ color: NAVY }}>KITCHEN DETAILS</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Kitchen Type *</label>
              <select className={inputClass} value={form.companyType}
                onChange={e => update('companyType', e.target.value)}>
                {KITCHEN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Operation Volume *</label>
              <select className={inputClass} value={form.operationVolume}
                onChange={e => update('operationVolume', e.target.value)}>
                {OPERATION_VOLUMES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white border-x border-b border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5" style={{ color: NAVY }} />
            <h2 className="font-semibold text-sm" style={{ color: NAVY }}>LOCATION</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Address *</label>
              <input type="text" className={inputClass} value={form.address}
                onChange={e => update('address', e.target.value)} placeholder="123 Main St" />
            </div>
            <div>
              <label className={labelClass}>City *</label>
              <input type="text" className={inputClass} value={form.city}
                onChange={e => update('city', e.target.value)} placeholder="Fresno" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>State *</label>
                <select className={inputClass} value={form.state}
                  onChange={e => update('state', e.target.value)}>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Zip Code *</label>
                <input type="text" className={inputClass} value={form.zipCode}
                  onChange={e => update('zipCode', e.target.value)} placeholder="93721" maxLength={10} />
              </div>
            </div>
            <div>
              <label className={labelClass}># of Locations</label>
              <select className={inputClass} value={form.numLocations}
                onChange={e => update('numLocations', parseInt(e.target.value))}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Demo Options */}
        <div className="bg-white border-x border-b border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="w-5 h-5" style={{ color: NAVY }} />
            <h2 className="font-semibold text-sm" style={{ color: NAVY }}>DEMO OPTIONS</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Demo Duration</label>
              <select className={inputClass} value={form.demoDuration}
                onChange={e => update('demoDuration', parseInt(e.target.value))}>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Include Insights</label>
              <div className="space-y-2 mt-1">
                {[
                  { key: 'includeTemperature', label: 'Temperature trends' },
                  { key: 'includeCompliance', label: 'Compliance score progression' },
                  { key: 'includeInspections', label: 'Inspection predictions' },
                  { key: 'includeVendors', label: 'Vendor service reminders' },
                  { key: 'includeCorrectiveActions', label: 'Sample corrective actions' },
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form[opt.key as keyof FormData] as boolean}
                      onChange={e => update(opt.key as keyof FormData, e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Demo Timing */}
        <div className="bg-white border-x border-b border-gray-200 rounded-b-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5" style={{ color: NAVY }} />
            <h2 className="font-semibold text-sm" style={{ color: NAVY }}>DEMO TIMING</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="radio" name="timing" checked={form.generateNow}
                onChange={() => update('generateNow', true)} className="text-[#1e4d6b]" />
              Generate demo now (ready immediately)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="radio" name="timing" checked={!form.generateNow}
                onChange={() => update('generateNow', false)} className="text-[#1e4d6b]" />
              Schedule meeting first
            </label>
            {!form.generateNow && (
              <div className="ml-6">
                <input type="datetime-local" className={inputClass} value={form.scheduledDate}
                  onChange={e => update('scheduledDate', e.target.value)} />
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 mt-4">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            className="px-8 py-3 rounded-lg font-semibold text-white transition-colors flex items-center gap-2"
            style={{ backgroundColor: NAVY }}
            onMouseEnter={e => (e.target as HTMLButtonElement).style.backgroundColor = '#2a6a8f'}
            onMouseLeave={e => (e.target as HTMLButtonElement).style.backgroundColor = NAVY}
          >
            <Sparkles className="w-4 h-4" />
            Generate Demo & Save
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default DemoGenerator;
