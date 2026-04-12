import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Users, ArrowRight, AlertTriangle, Shield } from 'lucide-react';
import { isBlockedDomain, KITCHEN_TYPES, OPERATION_VOLUMES, US_STATES } from '../data/demoGeneratorData';

const NAVY = '#1E2D4D';
const GOLD = '#d4af37';

interface FormData {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  companyType: string;
  operationVolume: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  numLocations: number;
}

export function DemoRequest() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    companyType: 'restaurant',
    operationVolume: 'moderate',
    address: '',
    city: '',
    state: 'CA',
    zipCode: '',
    numLocations: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof FormData, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!form.name || !form.email || !form.phone || !form.companyName || !form.address || !form.city || !form.zipCode) {
      setError('Please fill in all required fields.');
      return;
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    // Check competitor blocking
    const blockCheck = isBlockedDomain(form.email);
    if (blockCheck.blocked) {
      if (blockCheck.reason === 'competitor') {
        setError("We're unable to schedule a demo for this email domain. If you believe this is an error, please contact founders@getevidly.com.");
      } else {
        setError('Please use a business email address. Temporary or disposable email addresses are not accepted.');
      }
      return;
    }

    setSubmitting(true);

    // In a real implementation, this would save to Supabase.
    // For demo, we generate a fake session ID and navigate to the scheduling page.
    const sessionId = 'session-' + Date.now().toString(36);

    // Store form data in sessionStorage for the next page
    sessionStorage.setItem('demo_request_data', JSON.stringify({
      ...form,
      sessionId,
      createdAt: new Date().toISOString(),
    }));

    // Navigate to Calendly scheduling
    setTimeout(() => {
      navigate(`/demo/schedule/${sessionId}`);
    }, 500);
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-[#1E2D4D]/15 focus:border-[#1E2D4D] focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/20 outline-none transition-colors text-sm';
  const labelClass = 'block text-sm font-medium text-[#1E2D4D]/80 mb-1';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F6FA' }}>
      {/* Header */}
      <header className="border-b border-[#1E2D4D]/10 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: NAVY }}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold" style={{ color: NAVY }}>EvidLY</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3" style={{ color: NAVY }}>
            See EvidLY With YOUR Kitchen's Data
          </h1>
          <p className="text-[#1E2D4D]/70 max-w-xl mx-auto text-sm sm:text-base">
            We'll build a personalized demo showing exactly what compliance management
            looks like for your operation — using your real jurisdiction requirements.
          </p>
          <p className="text-[#1E2D4D]/50 mt-2 text-sm">
            An EvidLY specialist will walk you through it live.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#1E2D4D]/10">
          {/* Contact Info */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5" style={{ color: NAVY }} />
              <h2 className="font-semibold" style={{ color: NAVY }}>Your Information</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Your Name *</label>
                <input type="text" className={inputClass} value={form.name}
                  onChange={e => update('name', e.target.value)} placeholder="John Smith" />
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input type="email" className={inputClass} value={form.email}
                  onChange={e => update('email', e.target.value)} placeholder="john@company.com" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Phone *</label>
                <input type="tel" className={inputClass} value={form.phone}
                  onChange={e => update('phone', e.target.value)} placeholder="(555) 555-1234" />
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5" style={{ color: NAVY }} />
              <h2 className="font-semibold" style={{ color: NAVY }}>Company Details</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>Company Name *</label>
                <input type="text" className={inputClass} value={form.companyName}
                  onChange={e => update('companyName', e.target.value)} placeholder="Acme Kitchen" />
              </div>
              <div>
                <label className={labelClass}>Kitchen Type *</label>
                <select className={inputClass} value={form.companyType}
                  onChange={e => update('companyType', e.target.value)}>
                  {KITCHEN_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Operation Volume *</label>
                <select className={inputClass} value={form.operationVolume}
                  onChange={e => update('operationVolume', e.target.value)}>
                  {OPERATION_VOLUMES.map(v => (
                    <option key={v.value} value={v.value}>{v.label} — {v.description}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Location Info */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5" style={{ color: NAVY }} />
              <h2 className="font-semibold" style={{ color: NAVY }}>Kitchen Location</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>Kitchen Address *</label>
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
                <label className={labelClass}>Number of Locations</label>
                <select className={inputClass} value={form.numLocations}
                  onChange={e => update('numLocations', parseInt(e.target.value))}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit */}
          <div className="p-6">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-3 rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: NAVY }}
              onMouseEnter={e => { if (!submitting) (e.target as HTMLButtonElement).style.backgroundColor = '#2A3F6B'; }}
              onMouseLeave={e => (e.target as HTMLButtonElement).style.backgroundColor = NAVY}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Next: Schedule Your Demo
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Trust footer */}
        <div className="text-center mt-6 text-xs text-[#1E2D4D]/30">
          Your information is secure and will only be used to prepare your demo.
        </div>
      </div>
    </div>
  );
}

export default DemoRequest;
