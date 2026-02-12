import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDemo } from '../contexts/DemoContext';
import { useOperatingHours, generateOpeningTimes, generateClosingTimes, DAY_LABELS, formatTime24to12 } from '../contexts/OperatingHoursContext';
import {
  Building2, MapPin, Thermometer, ClipboardCheck, CheckCircle,
  ChevronRight, ChevronLeft, Sparkles, ArrowRight, User, Mail, Phone, Clock, LogIn
} from 'lucide-react';

const INDUSTRIES = [
  { code: 'RESTAURANT', label: 'Restaurant', icon: '🍽️', subtypes: ['Full-Service', 'Quick-Service', 'Bar / Lounge', 'Ghost Kitchen', 'Catering', 'Hotel Restaurant', 'Casino Restaurant', 'Corporate Cafeteria'] },
  { code: 'HEALTHCARE', label: 'Healthcare', icon: '🏥', subtypes: ['Hospital', 'Medical Center'] },
  { code: 'SENIOR_LIVING', label: 'Senior Living', icon: '🏡', subtypes: ['Assisted Living', 'Nursing Home / Skilled Nursing', 'Memory Care', 'Independent Living'] },
  { code: 'K12_EDUCATION', label: 'K-12 Education', icon: '🏫', subtypes: ['School District', 'Private School', 'Charter School'] },
  { code: 'HIGHER_EDUCATION', label: 'Higher Education', icon: '🎓', subtypes: ['University Dining Hall', 'College Cafeteria', 'Campus Food Court'] },
];

const WEIGHTS: Record<string, { operational: number; equipment: number; documentation: number }> = {
  RESTAURANT: { operational: 45, equipment: 30, documentation: 25 },
  HEALTHCARE: { operational: 35, equipment: 25, documentation: 40 },
  SENIOR_LIVING: { operational: 35, equipment: 25, documentation: 40 },
  K12_EDUCATION: { operational: 40, equipment: 20, documentation: 40 },
  HIGHER_EDUCATION: { operational: 45, equipment: 30, documentation: 25 },
};

interface DemoLead {
  name: string;
  email: string;
  phone: string;
  orgName: string;
  industry: string;
  subtype: string;
  locationType: 'single' | 'multi';
  locationCount: number;
  locationName: string;
}

const TEMP_EQUIPMENT = [
  { name: 'Walk-in Cooler', range: '32-41°F', icon: '❄️' },
  { name: 'Walk-in Freezer', range: '-10 to 0°F', icon: '🧊' },
  { name: 'Prep Cooler', range: '32-41°F', icon: '🥗' },
  { name: 'Hot Hold Cabinet', range: '135°F+', icon: '🔥' },
];

const CHECKLIST_ITEMS = [
  { name: 'Handwashing stations stocked', category: 'Sanitation' },
  { name: 'Food stored at proper temperatures', category: 'Food Safety' },
  { name: 'Prep surfaces sanitized', category: 'Sanitation' },
  { name: 'Date labels on all prep items', category: 'Food Safety' },
  { name: 'Floor drains clear', category: 'Sanitation' },
  { name: 'Chemical storage separated from food', category: 'Safety' },
];

export function DemoWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { enterDemo } = useDemo();
  const { updateLocationHours, addShift, setLocationHours, setShifts } = useOperatingHours();

  // ── Bypass: URL param ──────────────────────────────────
  const [bypassChecked, setBypassChecked] = useState(false);
  useEffect(() => {
    const bypassKey = searchParams.get('bypass');
    const expectedKey = import.meta.env.VITE_DEMO_BYPASS_KEY;
    if (bypassKey && expectedKey && bypassKey === expectedKey) {
      enterDemo();
      navigate('/dashboard', { replace: true });
    } else {
      setBypassChecked(true);
    }
  }, []);

  // ── Bypass: Staff login ────────────────────────────────
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [staffUser, setStaffUser] = useState('');
  const [staffPass, setStaffPass] = useState('');
  const [staffError, setStaffError] = useState('');

  const handleStaffLogin = () => {
    const expectedUser = import.meta.env.VITE_DEMO_STAFF_USER;
    const expectedPass = import.meta.env.VITE_DEMO_STAFF_PASS;
    if (staffUser === expectedUser && staffPass === expectedPass) {
      enterDemo();
      navigate('/dashboard', { replace: true });
    } else {
      setStaffError('Invalid credentials');
    }
  };

  const [step, setStep] = useState(0);
  const [lead, setLead] = useState<DemoLead>({
    name: '', email: '', phone: '', orgName: '',
    industry: '', subtype: '', locationType: 'single', locationCount: 1, locationName: ''
  });

  const [tempLogs, setTempLogs] = useState<Record<string, string>>({});
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  // Operating hours wizard state
  const [wizardDays, setWizardDays] = useState<boolean[]>([false, true, true, true, true, true, false]); // Mon-Sat default
  const [wizardOpenTime, setWizardOpenTime] = useState('06:00');
  const [wizardCloseTime, setWizardCloseTime] = useState('22:00');
  const [wizardShift1Name, setWizardShift1Name] = useState('Morning');
  const [wizardShift1End, setWizardShift1End] = useState('14:00');
  const [wizardShift2Name, setWizardShift2Name] = useState('Evening');
  const [showShifts, setShowShifts] = useState(true);

  const selectedIndustry = INDUSTRIES.find(i => i.code === lead.industry);
  const weights = WEIGHTS[lead.industry] || WEIGHTS.RESTAURANT;

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const canProceed = () => {
    switch (step) {
      case 0: return lead.name && lead.email && lead.phone;
      case 1: return lead.orgName && lead.industry && lead.subtype;
      case 2: return lead.locationName;
      case 3: return wizardDays.some(Boolean); // At least 1 day selected
      case 4: return Object.keys(tempLogs).length >= 2;
      case 5: return checkedItems.size >= 3;
      default: return true;
    }
  };

  const handleFinish = () => {
    sessionStorage.setItem('evidly_demo_lead', JSON.stringify(lead));

    // Store operating hours to shared context
    const locName = lead.locationName || 'My Kitchen';
    setLocationHours([
      { locationName: 'Downtown Kitchen', days: wizardDays, openTime: wizardOpenTime, closeTime: wizardCloseTime },
      { locationName: 'Airport Cafe', days: [true, true, true, true, true, true, true], openTime: '04:00', closeTime: '22:00' },
      { locationName: 'University Dining', days: [false, true, true, true, true, true, false], openTime: '06:00', closeTime: '21:00' },
    ]);
    if (showShifts) {
      setShifts([
        { id: 'w1', name: wizardShift1Name, locationName: 'Downtown Kitchen', startTime: wizardOpenTime, endTime: wizardShift1End, days: wizardDays },
        { id: 'w2', name: wizardShift2Name, locationName: 'Downtown Kitchen', startTime: wizardShift1End, endTime: wizardCloseTime, days: wizardDays },
        { id: 's3', name: 'Morning', locationName: 'Airport Cafe', startTime: '04:00', endTime: '12:00', days: [true, true, true, true, true, true, true] },
        { id: 's4', name: 'Afternoon', locationName: 'Airport Cafe', startTime: '12:00', endTime: '22:00', days: [true, true, true, true, true, true, true] },
        { id: 's5', name: 'Morning', locationName: 'University Dining', startTime: '06:00', endTime: '14:00', days: [false, true, true, true, true, true, false] },
        { id: 's6', name: 'Evening', locationName: 'University Dining', startTime: '14:00', endTime: '21:00', days: [false, true, true, true, true, true, false] },
      ]);
    }

    enterDemo();
    navigate('/dashboard');
  };

  const saveLead = async () => {
    try {
      const { supabase } = await import('../lib/supabase');
      await supabase.from('demo_leads').insert([{
        full_name: lead.name,
        email: lead.email,
        phone: lead.phone,
        organization_name: lead.orgName,
        industry_type: lead.industry,
        industry_subtype: lead.subtype,
        location_type: lead.locationType,
        location_count: lead.locationCount,
        location_name: lead.locationName,
      }]);
    } catch {
      // Silent fail
    }
  };

  const steps = [
    { label: 'About You', icon: User },
    { label: 'Your Business', icon: Building2 },
    { label: 'Location', icon: MapPin },
    { label: 'Hours', icon: Clock },
    { label: 'Log Temps', icon: Thermometer },
    { label: 'Checklist', icon: ClipboardCheck },
    { label: 'Your Dashboard', icon: Sparkles },
  ];

  // Don't render the wizard until we've checked the bypass param
  if (!bypassChecked) return null;

  return (
    <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center py-8 px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-6">
          <span className="text-3xl font-bold">
            <span className="text-[#1e4d6b]">Evid</span>
            <span className="text-[#d4af37]">LY</span>
          </span>
          <p className="text-[#1e4d6b] font-semibold mt-1">Interactive Demo</p>
        </div>

        <div className="flex items-center justify-center gap-1 mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? 'bg-[#d4af37] text-white' :
                i === step ? 'bg-[#1e4d6b] text-white' :
                'bg-gray-200 text-gray-400'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? 'bg-[#d4af37]' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {step === 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Let's personalize your demo</h2>
              <p className="text-gray-500 mb-6">We'll set up a demo environment tailored to your business.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type="text" value={lead.name} onChange={e => setLead({ ...lead, name: e.target.value })} placeholder="John Smith" className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type="email" value={lead.email} onChange={e => setLead({ ...lead, email: e.target.value })} placeholder="john@company.com" className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type="tel" value={lead.phone} onChange={e => setLead({ ...lead, phone: formatPhone(e.target.value) })} placeholder="(555) 555-5555" className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Tell us about your business</h2>
              <p className="text-gray-500 mb-6">This helps us show you the right compliance tools.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                  <input type="text" value={lead.orgName} onChange={e => setLead({ ...lead, orgName: e.target.value })} placeholder="Pacific Coast Dining" className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Industry</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {INDUSTRIES.map(ind => (
                      <button key={ind.code} onClick={() => setLead({ ...lead, industry: ind.code, subtype: '' })} className={`p-4 rounded-xl border-2 text-center transition-all ${lead.industry === ind.code ? 'border-[#d4af37] bg-[#d4af37]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="text-2xl mb-1">{ind.icon}</div>
                        <div className="text-sm font-medium">{ind.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {selectedIndustry && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{selectedIndustry.label} Type</label>
                    <select value={lead.subtype} onChange={e => setLead({ ...lead, subtype: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent">
                      <option value="">Select type...</option>
                      {selectedIndustry.subtypes.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                {lead.industry && (
                  <div className="bg-blue-50 rounded-lg p-4 mt-4">
                    <p className="text-sm font-medium text-[#1e4d6b] mb-2">Your compliance scoring weights:</p>
                    <div className="flex gap-4 text-sm">
                      <span>Operational: <strong>{weights.operational}%</strong></span>
                      <span>Equipment: <strong>{weights.equipment}%</strong></span>
                      <span>Documentation: <strong>{weights.documentation}%</strong></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Set up your location</h2>
              <p className="text-gray-500 mb-6">How many locations do you operate?</p>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <button onClick={() => setLead({ ...lead, locationType: 'single', locationCount: 1 })} className={`flex-1 p-6 rounded-xl border-2 text-center transition-all ${lead.locationType === 'single' ? 'border-[#d4af37] bg-[#d4af37]/5' : 'border-gray-200'}`}>
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-[#1e4d6b]" />
                    <div className="font-semibold">Single Location</div>
                    <div className="text-sm text-gray-500 mt-1">1 kitchen</div>
                  </button>
                  <button onClick={() => setLead({ ...lead, locationType: 'multi', locationCount: 3 })} className={`flex-1 p-6 rounded-xl border-2 text-center transition-all ${lead.locationType === 'multi' ? 'border-[#d4af37] bg-[#d4af37]/5' : 'border-gray-200'}`}>
                    <Building2 className="h-8 w-8 mx-auto mb-2 text-[#1e4d6b]" />
                    <div className="font-semibold">Multi-Location</div>
                    <div className="text-sm text-gray-500 mt-1">2+ kitchens</div>
                  </button>
                </div>
                {lead.locationType === 'multi' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">How many locations?</label>
                    <select value={lead.locationCount} onChange={e => setLead({ ...lead, locationCount: parseInt(e.target.value) })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
                      {[2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} locations</option>)}
                      <option value={15}>11-20 locations</option>
                      <option value={25}>21-50 locations</option>
                      <option value={100}>50+ locations</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name your {lead.locationType === 'multi' ? 'first ' : ''}location</label>
                  <input type="text" value={lead.locationName} onChange={e => setLead({ ...lead, locationName: e.target.value })} placeholder="e.g. Downtown Kitchen, Main Campus" className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent" />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">When is your kitchen open?</h2>
              <p className="text-gray-500 mb-6">Set your operating days and hours. We'll use this for scheduling and compliance tracking.</p>
              <div className="space-y-5">
                {/* Day checkboxes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Days of Operation</label>
                  <div className="flex flex-wrap gap-3">
                    {DAY_LABELS.map((day, idx) => (
                      <label key={day} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                        wizardDays[idx] ? 'border-[#d4af37] bg-[#d4af37]/5' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="checkbox"
                          checked={wizardDays[idx]}
                          onChange={() => {
                            const newDays = [...wizardDays];
                            newDays[idx] = !newDays[idx];
                            setWizardDays(newDays);
                          }}
                          className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Time dropdowns */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Opening Time</label>
                    <select
                      value={wizardOpenTime}
                      onChange={(e) => setWizardOpenTime(e.target.value)}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
                    >
                      {generateOpeningTimes().map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Closing Time</label>
                    <select
                      value={wizardCloseTime}
                      onChange={(e) => setWizardCloseTime(e.target.value)}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
                    >
                      {generateClosingTimes().map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Summary line */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-[#1e4d6b]">
                    <strong>{lead.locationName || 'Your kitchen'}</strong> will be open {wizardDays.filter(Boolean).length} days/week, {formatTime24to12(wizardOpenTime)} – {formatTime24to12(wizardCloseTime)}
                  </p>
                </div>

                {/* Shift Config (optional) */}
                <div className="border-t border-gray-100 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={showShifts}
                      onChange={(e) => setShowShifts(e.target.checked)}
                      className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Configure shifts (optional)</span>
                  </label>

                  {showShifts && (
                    <div className="space-y-3 pl-6">
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={wizardShift1Name}
                          onChange={(e) => setWizardShift1Name(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold w-32 focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                        />
                        <span className="text-sm text-gray-500">{formatTime24to12(wizardOpenTime)} – {formatTime24to12(wizardShift1End)}</span>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Shift changeover time</label>
                        <select
                          value={wizardShift1End}
                          onChange={(e) => setWizardShift1End(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 10).map(h => {
                            const val = `${String(h).padStart(2, '0')}:00`;
                            return <option key={val} value={val}>{formatTime24to12(val)}</option>;
                          })}
                        </select>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={wizardShift2Name}
                          onChange={(e) => setWizardShift2Name(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold w-32 focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                        />
                        <span className="text-sm text-gray-500">{formatTime24to12(wizardShift1End)} – {formatTime24to12(wizardCloseTime)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Log your first temperatures</h2>
              <p className="text-gray-500 mb-2">This is what your kitchen staff will do daily. Tap an equipment item and enter a reading.</p>
              <p className="text-sm text-[#d4af37] font-medium mb-6">Log at least 2 readings to continue</p>
              <div className="space-y-3">
                {TEMP_EQUIPMENT.map((eq, i) => (
                  <div key={i} className={`rounded-xl border-2 p-4 transition-all ${tempLogs[eq.name] ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{eq.icon}</span>
                        <div>
                          <div className="font-semibold">{eq.name}</div>
                          <div className="text-sm text-gray-500">Safe range: {eq.range}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" placeholder="°F" value={tempLogs[eq.name] || ''} onChange={e => setTempLogs({ ...tempLogs, [eq.name]: e.target.value })} className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
                        {tempLogs[eq.name] && <CheckCircle className="h-6 w-6 text-green-500" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-[#1e4d6b]"><strong>In the real app:</strong> Staff log temps from their phone. Out-of-range readings trigger instant alerts to managers. All readings are timestamped and stored for health inspections.</p>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete a checklist</h2>
              <p className="text-gray-500 mb-2">Opening checklists ensure nothing gets missed. Check off items like your team would.</p>
              <p className="text-sm text-[#d4af37] font-medium mb-6">Complete at least 3 items to continue</p>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-[#1e4d6b] text-white px-4 py-3 flex justify-between items-center">
                  <span className="font-semibold">Opening Checklist - {lead.locationName || 'Your Location'}</span>
                  <span className="text-sm opacity-80">{checkedItems.size}/{CHECKLIST_ITEMS.length}</span>
                </div>
                {CHECKLIST_ITEMS.map((item, i) => (
                  <div key={i} onClick={() => { const next = new Set(checkedItems); if (next.has(i)) next.delete(i); else next.add(i); setCheckedItems(next); }} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors ${checkedItems.has(i) ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${checkedItems.has(i) ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                      {checkedItems.has(i) && <span className="text-xs font-bold">✓</span>}
                    </div>
                    <div className="flex-1">
                      <span className={checkedItems.has(i) ? 'line-through text-gray-400' : ''}>{item.name}</span>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{item.category}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-[#1e4d6b]"><strong>In the real app:</strong> Checklists are customizable per location, role, and shift. Managers see real-time completion rates and get alerts for missed items.</p>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-[#d4af37] to-[#b8941e] rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Your demo is ready, {lead.name.split(' ')[0]}!</h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                We've built a personalized dashboard for <strong>{lead.orgName}</strong> with {lead.locationType === 'multi' ? `${lead.locationCount} locations` : `your ${lead.locationName} location`} and {selectedIndustry?.label || 'Restaurant'} compliance requirements.
              </p>
              <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left max-w-md mx-auto">
                <h3 className="font-semibold mb-3 text-[#1e4d6b]">What you'll see:</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Compliance dashboard with your {selectedIndustry?.label} scoring weights ({weights.operational}/{weights.equipment}/{weights.documentation})</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Temperature monitoring, checklists, and document management</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Vendor service tracking with automated alerts</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Role-based views: Manager, Kitchen Staff, Facilities</span>
                  </div>
                </div>
              </div>
              <button onClick={handleFinish} className="inline-flex items-center gap-2 px-8 py-4 bg-[#1e4d6b] text-white font-bold rounded-xl hover:bg-[#2a6a8f] transition-all hover:-translate-y-0.5 hover:shadow-lg text-lg">
                Launch My Dashboard
                <ArrowRight className="h-5 w-5" />
              </button>
              <p className="text-sm text-gray-400 mt-4">Explore freely with sample data - sign up anytime to start your real account</p>
            </div>
          )}

          {step < 6 && (
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
              <button onClick={() => step > 0 ? setStep(step - 1) : navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
                <ChevronLeft className="h-5 w-5" />
                {step === 0 ? 'Back to home' : 'Back'}
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">Step {step + 1} of 7</span>
                <button onClick={() => { if (step === 0) saveLead(); setStep(step + 1); }} disabled={!canProceed()} className="flex items-center gap-2 px-6 py-3 bg-[#1e4d6b] text-white font-semibold rounded-xl hover:bg-[#2a6a8f] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  Continue
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-400 mt-4">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="text-[#1e4d6b] font-medium hover:underline">Sign in</button>
        </p>

        {/* Staff login — subtle link for sales team */}
        {!showStaffLogin ? (
          <p className="text-center mt-6">
            <button
              onClick={() => setShowStaffLogin(true)}
              className="text-xs text-gray-300 hover:text-gray-400 transition-colors"
            >
              Staff Login
            </button>
          </p>
        ) : (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-5 max-w-sm mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <LogIn className="h-4 w-4 text-[#1e4d6b]" />
              <span className="text-sm font-semibold text-[#1e4d6b]">Staff Login</span>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Username"
                value={staffUser}
                onChange={e => { setStaffUser(e.target.value); setStaffError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleStaffLogin()}
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
              />
              <input
                type="password"
                placeholder="Password"
                value={staffPass}
                onChange={e => { setStaffPass(e.target.value); setStaffError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleStaffLogin()}
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
              />
              {staffError && <p className="text-xs text-red-500">{staffError}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleStaffLogin}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-[#1e4d6b] text-white rounded-lg hover:bg-[#2a6a8f] transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => { setShowStaffLogin(false); setStaffError(''); setStaffUser(''); setStaffPass(''); }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}