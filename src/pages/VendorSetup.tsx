/**
 * SERVICE-PROVIDER-1 — Service Provider Onboarding Wizard
 *
 * 5-step setup flow for service providers (e.g., Cleaning Pros Plus).
 * Route: /vendor/setup (non-layout, ProtectedRoute wrapped)
 *
 * Steps:
 *  1. Company Profile
 *  2. Certifications & Credentials
 *  3. COI / Insurance Upload
 *  4. Service Defaults
 *  5. Team (Optional)
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Award, FileText, Settings, Users,
  ChevronRight, ChevronLeft, Check, Plus, X, Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { useDemo } from '../contexts/DemoContext';
import { VENDOR_CATEGORIES } from '../config/vendorCategories';
import {
  DEMO_SP_PROFILE,
  SERVICE_FREQUENCIES,
  PREFERRED_WINDOWS,
  SERVICE_REPORT_OPTIONS,
  SP_TEAM_ROLES,
  type SPTeamMember,
} from '../data/serviceProviderDemoData';

// ── Brand ──────────────────────────────────────────────────
const NAVY = '#1e4d6b';
const NAVY_HOVER = '#163a52';
const GOLD = '#d4af37';

// ── Service type display names ─────────────────────────────
const SERVICE_OPTIONS = [
  { id: 'hood_cleaning', label: 'Hood Cleaning / Exhaust Cleaning', category: 'kitchen_exhaust' },
  { id: 'fan_performance', label: 'Fan Performance Management', category: 'kitchen_exhaust' },
  { id: 'grease_filter', label: 'Grease Filter Exchange', category: 'kitchen_exhaust' },
  { id: 'rooftop_grease', label: 'Rooftop Grease Containment', category: 'kitchen_exhaust' },
  { id: 'oil_removal_svc', label: 'Oil Recycling / Fryer Management', category: 'oil_removal' },
  { id: 'fire_suppression_svc', label: 'Fire Suppression', category: 'fire_suppression' },
  { id: 'fire_extinguisher_svc', label: 'Fire Extinguisher Service', category: 'fire_extinguisher' },
  { id: 'pest_control_svc', label: 'Pest Control', category: 'pest_control' },
  { id: 'grease_trap_svc', label: 'Grease Trap Service', category: 'grease_trap' },
  { id: 'backflow_svc', label: 'Backflow Prevention', category: 'backflow' },
  { id: 'equipment_repair_svc', label: 'General Kitchen Equipment', category: 'equipment_repair' },
];

// ── Steps config ───────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Company Profile', icon: Building2 },
  { id: 2, label: 'Certifications', icon: Award },
  { id: 3, label: 'Insurance / COI', icon: FileText },
  { id: 4, label: 'Service Defaults', icon: Settings },
  { id: 5, label: 'Team', icon: Users },
];

// ── Types ──────────────────────────────────────────────────
interface CertEntry {
  id: string;
  name: string;
  certNumber: string;
  state: string;
  expiration: string;
}

interface InsuranceEntry {
  id: string;
  type: string;
  label: string;
  fileName: string | null;
  provider: string;
  policyNumber: string;
  coverageAmount: string;
  expiration: string;
}

interface ServiceDefaultEntry {
  serviceId: string;
  serviceName: string;
  frequency: string;
}

interface TeamEntry {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ── Component ──────────────────────────────────────────────
export function VendorSetup() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Company Profile
  const [companyName, setCompanyName] = useState(isDemoMode ? DEMO_SP_PROFILE.companyName : '');
  const [dba, setDba] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>(
    isDemoMode ? DEMO_SP_PROFILE.subServices : [],
  );
  const [phone, setPhone] = useState(isDemoMode ? DEMO_SP_PROFILE.phone : '');
  const [email, setEmail] = useState(isDemoMode ? DEMO_SP_PROFILE.email : '');
  const [website, setWebsite] = useState(isDemoMode ? (DEMO_SP_PROFILE.website || '') : '');
  const [serviceArea, setServiceArea] = useState(isDemoMode ? DEMO_SP_PROFILE.serviceArea : '');

  // Step 2: Certifications
  const [ikecaCertified, setIkecaCertified] = useState<'yes' | 'no' | 'pending'>(isDemoMode ? 'yes' : 'no');
  const [ikecaNumber, setIkecaNumber] = useState(isDemoMode ? 'IKECA-2024-0847' : '');
  const [ikecaExpiry, setIkecaExpiry] = useState(isDemoMode ? '2027-03-15' : '');
  const [contractorLicense, setContractorLicense] = useState(isDemoMode ? 'C-61/D-34 #1042857' : '');
  const [licenseState, setLicenseState] = useState(isDemoMode ? 'California' : '');
  const [licenseExpiry, setLicenseExpiry] = useState(isDemoMode ? '2028-01-31' : '');
  const [additionalCerts, setAdditionalCerts] = useState<CertEntry[]>([]);

  // Step 3: Insurance
  const [insuranceDocs, setInsuranceDocs] = useState<InsuranceEntry[]>([
    { id: 'coi', type: 'insurance_coi', label: 'General Liability COI', fileName: isDemoMode ? 'cpp-coi-2026.pdf' : null, provider: isDemoMode ? 'Hartford Insurance' : '', policyNumber: isDemoMode ? 'GL-2026-44891' : '', coverageAmount: isDemoMode ? '2,000,000' : '', expiration: isDemoMode ? '2026-12-31' : '' },
    { id: 'wc', type: 'insurance_workers_comp', label: "Workers' Compensation", fileName: isDemoMode ? 'cpp-workers-comp.pdf' : null, provider: isDemoMode ? 'State Fund' : '', policyNumber: isDemoMode ? 'WC-2026-11234' : '', coverageAmount: '', expiration: isDemoMode ? '2026-06-30' : '' },
    { id: 'auto', type: 'insurance_auto', label: 'Commercial Auto Insurance', fileName: isDemoMode ? 'cpp-auto-insurance.pdf' : null, provider: isDemoMode ? 'Progressive Commercial' : '', policyNumber: isDemoMode ? 'CA-2026-78320' : '', coverageAmount: isDemoMode ? '1,000,000' : '', expiration: isDemoMode ? '2026-09-15' : '' },
  ]);

  // Step 4: Service Defaults
  const [serviceDefaults, setServiceDefaults] = useState<ServiceDefaultEntry[]>(
    isDemoMode
      ? selectedServices.map(id => {
          const opt = SERVICE_OPTIONS.find(s => s.id === id);
          return { serviceId: id, serviceName: opt?.label || id, frequency: 'quarterly' };
        })
      : [],
  );
  const [preferredWindow, setPreferredWindow] = useState(isDemoMode ? 'after_close' : 'after_close');
  const [reportRequirements, setReportRequirements] = useState<string[]>(
    isDemoMode ? SERVICE_REPORT_OPTIONS.map(r => r.id) : [],
  );

  // Step 5: Team
  const [teamMembers, setTeamMembers] = useState<TeamEntry[]>(
    isDemoMode
      ? [
          { id: 'spt-1', name: 'Miguel Hernandez', email: 'miguel@cprosplus.com', role: 'technician' },
          { id: 'spt-2', name: 'Jessica Park', email: 'jessica@cprosplus.com', role: 'office_admin' },
        ]
      : [],
  );

  // ── Handlers ─────────────────────────────────────────────
  const toggleService = useCallback((id: string) => {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id],
    );
  }, []);

  const handleNext = () => {
    // Validation
    if (currentStep === 1) {
      if (!companyName.trim()) { toast.error('Company name is required'); return; }
      if (selectedServices.length === 0) { toast.error('Select at least one service'); return; }
      if (!phone.trim()) { toast.error('Phone number is required'); return; }
      if (!email.trim()) { toast.error('Email is required'); return; }
      // Build service defaults from selected services
      setServiceDefaults(prev => {
        const existing = new Set(prev.map(d => d.serviceId));
        const updated = [...prev];
        selectedServices.forEach(id => {
          if (!existing.has(id)) {
            const opt = SERVICE_OPTIONS.find(s => s.id === id);
            updated.push({ serviceId: id, serviceName: opt?.label || id, frequency: 'quarterly' });
          }
        });
        return updated.filter(d => selectedServices.includes(d.serviceId));
      });
    }
    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleComplete = () => {
    // In demo mode, mark setup as complete and navigate
    if (isDemoMode) {
      sessionStorage.setItem('evidly_vendor_setup_complete', 'true');
      toast.success('Service provider profile set up successfully!');
      navigate('/vendor/dashboard');
      return;
    }
    // Auth mode: would save to Supabase here
    sessionStorage.setItem('evidly_vendor_setup_complete', 'true');
    navigate('/vendor/dashboard');
  };

  const handleSkip = () => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  // ── Insurance doc helpers ────────────────────────────────
  const updateInsurance = (id: string, field: keyof InsuranceEntry, value: string) => {
    setInsuranceDocs(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const simulateUpload = (id: string) => {
    const doc = insuranceDocs.find(d => d.id === id);
    if (doc) {
      updateInsurance(id, 'fileName', `${companyName.toLowerCase().replace(/\s+/g, '-')}-${doc.type}.pdf`);
      toast.success(`${doc.label} uploaded (Demo)`);
    }
  };

  // ── Render helpers ───────────────────────────────────────
  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  const renderStep1 = () => (
    <div className="space-y-5">
      <div>
        <label className={labelClass}>Company Name *</label>
        <input className={inputClass} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g., Cleaning Pros Plus, LLC" />
      </div>
      <div>
        <label className={labelClass}>DBA (if different)</label>
        <input className={inputClass} value={dba} onChange={e => setDba(e.target.value)} placeholder="Doing business as..." />
      </div>
      <div>
        <label className={labelClass}>Services Offered *</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
          {SERVICE_OPTIONS.map(svc => (
            <label
              key={svc.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                selectedServices.includes(svc.id) ? 'border-[#1e4d6b] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedServices.includes(svc.id)}
                onChange={() => toggleService(svc.id)}
                className="rounded text-[#1e4d6b] focus:ring-[#1e4d6b]"
              />
              <span className="text-sm text-gray-700">{svc.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Phone *</label>
          <input className={inputClass} value={phone} onChange={e => setPhone(e.target.value)} placeholder="(209) 636-6116" />
        </div>
        <div>
          <label className={labelClass}>Email *</label>
          <input className={inputClass} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="service@company.com" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Website</label>
          <input className={inputClass} value={website} onChange={e => setWebsite(e.target.value)} placeholder="www.company.com" />
        </div>
        <div>
          <label className={labelClass}>Service Area *</label>
          <input className={inputClass} value={serviceArea} onChange={e => setServiceArea(e.target.value)} placeholder="Central Valley, Northern CA" />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">These will be visible to your clients and automatically shared when you're added as a vendor on their account.</p>

      {/* IKECA */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <label className="text-sm font-semibold text-gray-900">IKECA Certified?</label>
        <div className="flex gap-4">
          {(['yes', 'no', 'pending'] as const).map(v => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="ikeca" checked={ikecaCertified === v} onChange={() => setIkecaCertified(v)} className="text-[#1e4d6b] focus:ring-[#1e4d6b]" />
              <span className="text-sm text-gray-700 capitalize">{v}</span>
            </label>
          ))}
        </div>
        {ikecaCertified === 'yes' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>IKECA Cert #</label>
              <input className={inputClass} value={ikecaNumber} onChange={e => setIkecaNumber(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Expiration</label>
              <input className={inputClass} type="date" value={ikecaExpiry} onChange={e => setIkecaExpiry(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Contractor License */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <label className="text-sm font-semibold text-gray-900">Contractor License</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>License #</label>
            <input className={inputClass} value={contractorLicense} onChange={e => setContractorLicense(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input className={inputClass} value={licenseState} onChange={e => setLicenseState(e.target.value)} placeholder="California" />
          </div>
          <div>
            <label className={labelClass}>Expiration</label>
            <input className={inputClass} type="date" value={licenseExpiry} onChange={e => setLicenseExpiry(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Additional Certs */}
      {additionalCerts.map((cert, i) => (
        <div key={cert.id} className="bg-gray-50 rounded-xl p-4 space-y-3 relative">
          <button type="button" onClick={() => setAdditionalCerts(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 text-gray-400 hover:text-red-500">
            <X size={16} />
          </button>
          <label className="text-sm font-semibold text-gray-900">Additional Certification</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Name</label>
              <input className={inputClass} value={cert.name} onChange={e => { const u = [...additionalCerts]; u[i] = { ...u[i], name: e.target.value }; setAdditionalCerts(u); }} />
            </div>
            <div>
              <label className={labelClass}>Cert / License #</label>
              <input className={inputClass} value={cert.certNumber} onChange={e => { const u = [...additionalCerts]; u[i] = { ...u[i], certNumber: e.target.value }; setAdditionalCerts(u); }} />
            </div>
            <div>
              <label className={labelClass}>Expiration</label>
              <input className={inputClass} type="date" value={cert.expiration} onChange={e => { const u = [...additionalCerts]; u[i] = { ...u[i], expiration: e.target.value }; setAdditionalCerts(u); }} />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setAdditionalCerts(prev => [...prev, { id: `cert-${Date.now()}`, name: '', certNumber: '', state: '', expiration: '' }])}
        className="flex items-center gap-2 text-sm font-medium hover:underline"
        style={{ color: NAVY }}
      >
        <Plus size={16} /> Add Another Certification
      </button>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">Upload your current certificates of insurance. These will be automatically shared with all your clients. EvidLY will notify you AND your clients before they expire.</p>

      {insuranceDocs.map(doc => (
        <div key={doc.id} className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-900">{doc.label}</label>
            {doc.fileName && (
              <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                <Check size={12} /> Uploaded
              </span>
            )}
          </div>

          {/* Upload zone */}
          {!doc.fileName ? (
            <button
              type="button"
              onClick={() => simulateUpload(doc.id)}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center gap-2 hover:border-[#1e4d6b] hover:bg-blue-50/30 transition-colors"
            >
              <Upload size={24} className="text-gray-400" />
              <span className="text-sm text-gray-500">Click to upload PDF or image</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
              <FileText size={16} className="text-gray-400" />
              <span className="text-sm text-gray-700 flex-1">{doc.fileName}</span>
              <button type="button" onClick={() => updateInsurance(doc.id, 'fileName', '')} className="text-xs text-red-500 hover:underline">Remove</button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Insurance Provider</label>
              <input className={inputClass} value={doc.provider} onChange={e => updateInsurance(doc.id, 'provider', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Policy Number</label>
              <input className={inputClass} value={doc.policyNumber} onChange={e => updateInsurance(doc.id, 'policyNumber', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {doc.type !== 'insurance_workers_comp' && (
              <div>
                <label className={labelClass}>Coverage Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                  <input className={`${inputClass} pl-7`} value={doc.coverageAmount} onChange={e => updateInsurance(doc.id, 'coverageAmount', e.target.value)} />
                </div>
              </div>
            )}
            <div>
              <label className={labelClass}>Expiration Date</label>
              <input className={inputClass} type="date" value={doc.expiration} onChange={e => updateInsurance(doc.id, 'expiration', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">These defaults apply to all clients unless overridden per-client.</p>

      {/* Service frequencies */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <label className="text-sm font-semibold text-gray-900">Default Service Frequency</label>
        {serviceDefaults.map((sd, i) => (
          <div key={sd.serviceId} className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-700 flex-1">{sd.serviceName}</span>
            <select
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]"
              value={sd.frequency}
              onChange={e => {
                const u = [...serviceDefaults];
                u[i] = { ...u[i], frequency: e.target.value };
                setServiceDefaults(u);
              }}
            >
              {SERVICE_FREQUENCIES.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        ))}
        {serviceDefaults.length === 0 && (
          <p className="text-sm text-gray-400 italic">No services selected. Go back to step 1 to choose services.</p>
        )}
      </div>

      {/* Preferred window */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <label className="text-sm font-semibold text-gray-900">Preferred Service Window</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]"
          value={preferredWindow}
          onChange={e => setPreferredWindow(e.target.value)}
        >
          {PREFERRED_WINDOWS.map(w => (
            <option key={w.value} value={w.value}>{w.label}</option>
          ))}
        </select>
      </div>

      {/* Report requirements */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <label className="text-sm font-semibold text-gray-900">Service Report Template</label>
        <div className="space-y-2">
          {SERVICE_REPORT_OPTIONS.map(opt => (
            <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={reportRequirements.includes(opt.id)}
                onChange={() => setReportRequirements(prev =>
                  prev.includes(opt.id) ? prev.filter(r => r !== opt.id) : [...prev, opt.id],
                )}
                className="rounded text-[#1e4d6b] focus:ring-[#1e4d6b]"
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">Add team members who will service clients and upload reports through EvidLY. You can always add more later.</p>

      {teamMembers.map((member, i) => (
        <div key={member.id} className="bg-gray-50 rounded-xl p-4 relative">
          <button
            type="button"
            onClick={() => setTeamMembers(prev => prev.filter((_, idx) => idx !== i))}
            className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
          >
            <X size={16} />
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Name</label>
              <input
                className={inputClass}
                value={member.name}
                onChange={e => {
                  const u = [...teamMembers];
                  u[i] = { ...u[i], name: e.target.value };
                  setTeamMembers(u);
                }}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                className={inputClass}
                type="email"
                value={member.email}
                onChange={e => {
                  const u = [...teamMembers];
                  u[i] = { ...u[i], email: e.target.value };
                  setTeamMembers(u);
                }}
                placeholder="email@company.com"
              />
            </div>
            <div>
              <label className={labelClass}>Role</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]"
                value={member.role}
                onChange={e => {
                  const u = [...teamMembers];
                  u[i] = { ...u[i], role: e.target.value };
                  setTeamMembers(u);
                }}
              >
                {SP_TEAM_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label} — {r.description}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setTeamMembers(prev => [...prev, { id: `tm-${Date.now()}`, name: '', email: '', role: 'technician' }])}
        className="flex items-center gap-2 text-sm font-medium hover:underline"
        style={{ color: NAVY }}
      >
        <Plus size={16} /> Add Team Member
      </button>

      {teamMembers.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Users size={32} className="mx-auto mb-2" />
          <p className="text-sm">No team members added yet. You can skip this step and add them later.</p>
        </div>
      )}
    </div>
  );

  const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  return (
    <div className="min-h-screen bg-[#faf8f3] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-12">
              <svg viewBox="0 0 56 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M28 0L56 10V28C56 47.33 44.12 58.17 28 65C11.88 58.17 0 47.33 0 28V10L28 0Z" fill={GOLD} />
                <path d="M28 6L50 14V28C50 43.5 40.5 52.5 28 58C15.5 52.5 6 43.5 6 28V14L28 6Z" fill={NAVY} />
                <path d="M22 32L26 36L34 26" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set Up Your Service Provider Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Complete your profile so clients can find you and verify your credentials.</p>
        </div>

        {/* Step Progress */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {STEPS.map((step, i) => {
            const isActive = currentStep === step.id;
            const isComplete = currentStep > step.id;
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      isComplete ? 'bg-green-500 text-white'
                        : isActive ? 'text-white' : 'bg-gray-200 text-gray-500'
                    }`}
                    style={isActive ? { backgroundColor: NAVY } : undefined}
                  >
                    {isComplete ? <Check size={18} /> : <Icon size={18} />}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium text-center w-16 ${isActive ? 'text-[#1e4d6b]' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 sm:w-12 h-0.5 mx-1 mt-[-12px] ${isComplete ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">{STEPS[currentStep - 1].label}</h2>
          <div className="h-[2px] rounded-full mb-6" style={{ background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
          {stepRenderers[currentStep - 1]()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft size={16} /> Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {currentStep >= 2 && currentStep <= 5 && (
              <button
                type="button"
                onClick={handleSkip}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                {currentStep === 5 ? 'Skip & Finish' : 'Skip'}
              </button>
            )}
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1 px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors"
                style={{ backgroundColor: NAVY }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = NAVY_HOVER)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = NAVY)}
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                className="flex items-center gap-1 px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors"
                style={{ backgroundColor: NAVY }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = NAVY_HOVER)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = NAVY)}
              >
                Complete Setup <Check size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
