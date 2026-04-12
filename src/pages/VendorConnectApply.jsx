/**
 * CPP-VENDOR-CONNECT-01 — Vendor Connect Application Page
 * Route: /vendor-connect/apply (PUBLIC — no auth required)
 *
 * Vendors apply to join the Vendor Connect partner program.
 * Shows spot availability per county/service type.
 * Follows VendorScheduleResponse.jsx public page pattern.
 */
import { useState, useEffect } from 'react';
import { CheckCircle, Loader2, MapPin, AlertCircle } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SERVICE_OPTIONS = [
  { id: 'hood_cleaning', label: 'Hood Cleaning (KEC)' },
  { id: 'fire_suppression', label: 'Fire Suppression (FS)' },
  { id: 'grease_management', label: 'Grease Trap / FOG Management' },
  { id: 'pest_control', label: 'Pest Control' },
  { id: 'equipment_repair', label: 'Equipment Repair / HVAC' },
];

const CA_COUNTIES = [
  'Alameda', 'Fresno', 'Kern', 'Los Angeles', 'Merced', 'Orange',
  'Riverside', 'Sacramento', 'San Bernardino', 'San Diego',
  'San Francisco', 'Santa Clara', 'Stanislaus', 'Tulare', 'Ventura',
];

const REFERRAL_OPTIONS = [
  'CPP / Cleaning Pros Plus',
  'Another vendor',
  'EvidLY website',
  'Trade show / event',
  'IKECA',
  'Social media',
  'Other',
];

export function VendorConnectApply() {
  const isDemoMode = typeof window !== 'undefined' && sessionStorage.getItem('evidly_demo_mode') === 'true';
  const [phase, setPhase] = useState('form');
  const [submitting, setSubmitting] = useState(false);
  const [spots, setSpots] = useState([]);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedCounties, setSelectedCounties] = useState([]);
  const [yearsInBusiness, setYearsInBusiness] = useState('');
  const [ikecaCertified, setIkecaCertified] = useState(false);
  const [whyApply, setWhyApply] = useState('');
  const [referredBy, setReferredBy] = useState('');

  // Fetch spot availability
  useEffect(() => {
    if (isDemoMode) return;
    fetch(`${SUPABASE_URL}/rest/v1/vendor_connect_spots?select=*`, {
      headers: { apikey: SUPABASE_ANON, 'Content-Type': 'application/json' },
    })
      .then(r => r.json())
      .then(data => setSpots(data || []))
      .catch(() => {});
  }, [isDemoMode]);

  function toggleService(id) {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  function toggleCounty(county) {
    setSelectedCounties(prev =>
      prev.includes(county) ? prev.filter(c => c !== county) : [...prev, county]
    );
  }

  function getSpotStatus(county, serviceType) {
    const spot = spots.find(s => s.county === county && s.service_type === serviceType);
    if (!spot) return null;
    const remaining = spot.max_spots - spot.filled_spots;
    return { remaining, max: spot.max_spots, waitlist: spot.waitlist_count };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!companyName || !contactName || !email || selectedServices.length === 0 || selectedCounties.length === 0) return;

    setSubmitting(true);
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 1200));
        setPhase('success');
        setSubmitting(false);
        return;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/vendor-connect-apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON },
        body: JSON.stringify({
          company_name: companyName,
          contact_name: contactName,
          email,
          phone: phone || null,
          service_types: selectedServices,
          service_areas: selectedCounties,
          ikeca_certified: ikecaCertified,
          years_in_business: yearsInBusiness ? parseInt(yearsInBusiness) : null,
          why_apply: whyApply || null,
          referred_by: referredBy || null,
        }),
      });
      const result = await res.json();
      if (result.id || result.success) {
        setPhase('success');
      } else {
        alert(result.error || 'Failed to submit. Please try again.');
      }
    } catch {
      alert('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Spot availability for selected counties + services
  const spotIndicators = selectedCounties.flatMap(county =>
    selectedServices.map(svc => {
      const status = getSpotStatus(county, svc);
      return status ? { county, service: svc, ...status } : null;
    }).filter(Boolean)
  );

  return (
    <div className="min-h-screen" style={{ background: '#F4F6FA' }}>
      {/* Header */}
      <div style={{ background: '#1E2D4D' }} className="px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🔒</span>
            <span className="text-xs font-bold text-white tracking-widest uppercase">EvidLY</span>
          </div>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#A08C5A' }}>
            VENDOR CONNECT — BY INVITATION ONLY
          </p>
          <h1 className="text-xl font-bold text-white">Apply to Vendor Connect</h1>
          <p className="text-sm text-[#1E2D4D]/30 mt-1">
            We accept a limited number of partners per service area. Applications are reviewed by Cleaning Pros Plus.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {phase === 'success' ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-lg font-bold text-[#1E2D4D] mb-2">Application Received</h2>
            <p className="text-sm text-[#1E2D4D]/50 max-w-sm mx-auto">
              Thank you for your interest in Vendor Connect. CPP will review your application within 3 business days.
              You'll receive an email at <strong>{email}</strong> with the outcome.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Info */}
            <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-[#1E2D4D]">Company Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#1E2D4D]/70 mb-1">Company Name *</label>
                  <input
                    type="text" required value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className="w-full border border-[#1E2D4D]/15 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#A08C5A] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1E2D4D]/70 mb-1">Contact Name *</label>
                  <input
                    type="text" required value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    className="w-full border border-[#1E2D4D]/15 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#A08C5A] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1E2D4D]/70 mb-1">Email *</label>
                  <input
                    type="email" required value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full border border-[#1E2D4D]/15 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#A08C5A] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1E2D4D]/70 mb-1">Phone</label>
                  <input
                    type="tel" value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full border border-[#1E2D4D]/15 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#A08C5A] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-[#1E2D4D]">Services Offered *</h2>
              <div className="space-y-2">
                {SERVICE_OPTIONS.map(svc => (
                  <button
                    key={svc.id} type="button"
                    onClick={() => toggleService(svc.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                      selectedServices.includes(svc.id) ? 'border-[#A08C5A] bg-amber-50/50' : 'border-[#1E2D4D]/10 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedServices.includes(svc.id) ? 'border-[#A08C5A] bg-[#A08C5A]' : 'border-[#1E2D4D]/15'
                    }`}>
                      {selectedServices.includes(svc.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{svc.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Counties */}
            <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-[#1E2D4D]">Counties Served *</h2>
              <div className="flex flex-wrap gap-2">
                {CA_COUNTIES.map(county => (
                  <button
                    key={county} type="button"
                    onClick={() => toggleCounty(county)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      selectedCounties.includes(county)
                        ? 'border-[#A08C5A] bg-amber-50 text-[#A08C5A]'
                        : 'border-[#1E2D4D]/10 text-[#1E2D4D]/70 hover:border-gray-300'
                    }`}
                  >
                    {county}
                  </button>
                ))}
              </div>
            </div>

            {/* Spot Availability */}
            {spotIndicators.length > 0 && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                  <MapPin className="w-3.5 h-3.5" />
                  Spot Availability
                </div>
                {spotIndicators.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-[#1E2D4D]/80">
                      {s.service.replace(/_/g, ' ')} — {s.county} County
                    </span>
                    <span className={`font-semibold ${s.remaining > 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {s.remaining > 0
                        ? `${s.remaining} of ${s.max} spots remaining`
                        : `Full — ${s.waitlist} on waitlist`
                      }
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Qualifications */}
            <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-[#1E2D4D]">Qualifications</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#1E2D4D]/70 mb-1">Years in Business</label>
                  <input
                    type="number" min="0" value={yearsInBusiness}
                    onChange={e => setYearsInBusiness(e.target.value)}
                    className="w-full border border-[#1E2D4D]/15 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#A08C5A] focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <button
                    type="button"
                    onClick={() => setIkecaCertified(!ikecaCertified)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      ikecaCertified ? 'bg-[#A08C5A]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        ikecaCertified ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                  <span className="text-sm text-[#1E2D4D]/80">IKECA Certified</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1E2D4D]/70 mb-1">How did you hear about Vendor Connect?</label>
                <select
                  value={referredBy}
                  onChange={e => setReferredBy(e.target.value)}
                  className="w-full border border-[#1E2D4D]/15 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#A08C5A] focus:border-transparent"
                >
                  <option value="">Select...</option>
                  {REFERRAL_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {/* Why Apply */}
            <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-[#1E2D4D]">Why do you want to join Vendor Connect?</h2>
              <textarea
                rows={4}
                value={whyApply}
                onChange={e => setWhyApply(e.target.value)}
                placeholder="Tell us about your business and why you'd be a great Vendor Connect partner..."
                className="w-full border border-[#1E2D4D]/15 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-[#A08C5A] focus:border-transparent"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !companyName || !contactName || !email || selectedServices.length === 0 || selectedCounties.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              style={{ background: '#1E2D4D' }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Application'}
            </button>

            <p className="text-center text-xs text-[#1E2D4D]/30">
              Applications are reviewed within 3 business days. Not everyone is accepted.
            </p>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-[#1E2D4D]/30">
        Powered by <span className="font-semibold" style={{ color: '#1E2D4D' }}>EvidLY</span>
      </div>
    </div>
  );
}
