import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { SocialLoginButtons } from '../components/SocialLoginButtons';
import { trackEvent, trackConversion } from '../utils/analytics';
import { FOUNDER_PRICING_DEADLINE } from '../lib/stripe';
import { useCrispHide } from '../hooks/useCrisp';

// ── 58 California counties ──────────────────────────────────
const CA_COUNTIES = [
  'Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa',
  'Contra Costa', 'Del Norte', 'El Dorado', 'Fresno', 'Glenn',
  'Humboldt', 'Imperial', 'Inyo', 'Kern', 'Kings', 'Lake', 'Lassen',
  'Los Angeles', 'Madera', 'Marin', 'Mariposa', 'Mendocino', 'Merced',
  'Modoc', 'Mono', 'Monterey', 'Napa', 'Nevada', 'Orange', 'Placer',
  'Plumas', 'Riverside', 'Sacramento', 'San Benito', 'San Bernardino',
  'San Diego', 'San Francisco', 'San Joaquin', 'San Luis Obispo',
  'San Mateo', 'Santa Barbara', 'Santa Clara', 'Santa Cruz', 'Shasta',
  'Sierra', 'Siskiyou', 'Solano', 'Sonoma', 'Stanislaus', 'Sutter',
  'Tehama', 'Trinity', 'Tulare', 'Tuolumne', 'Ventura', 'Yolo', 'Yuba',
];

// Cities with independent health departments (not covered by their county's EHD)
const INDEPENDENT_JURISDICTIONS = [
  { value: 'city:berkeley', label: 'City of Berkeley', county: 'Alameda' },
  { value: 'city:long_beach', label: 'City of Long Beach', county: 'Los Angeles' },
  { value: 'city:pasadena', label: 'City of Pasadena', county: 'Los Angeles' },
  { value: 'city:vernon', label: 'City of Vernon', county: 'Los Angeles' },
];

const INDUSTRY_TYPES = {
  RESTAURANT: {
    code: 'RESTAURANT',
    label: 'Restaurant',
    subtypes: ['Restaurant', 'Hotel Restaurant', 'Casino Restaurant', 'Bar / Lounge', 'Ghost Kitchen', 'Catering Company', 'Corporate Cafeteria', 'Other'],
    weights: { foodSafety: 60, facilitySafety: 40 }
  },
  HEALTHCARE: {
    code: 'HEALTHCARE',
    label: 'Healthcare',
    subtypes: ['Hospital', 'Medical Center'],
    weights: { foodSafety: 60, facilitySafety: 40 }
  },
  SENIOR_LIVING: {
    code: 'SENIOR_LIVING',
    label: 'Senior Living',
    subtypes: ['Assisted Living', 'Nursing Home / Skilled Nursing', 'Memory Care', 'Independent Living'],
    weights: { foodSafety: 60, facilitySafety: 40 }
  },
  K12_EDUCATION: {
    code: 'K12_EDUCATION',
    label: 'K-12 Education',
    subtypes: ['School District', 'Private School', 'Charter School'],
    weights: { foodSafety: 65, facilitySafety: 35 }
  },
  HIGHER_EDUCATION: {
    code: 'HIGHER_EDUCATION',
    label: 'Higher Education',
    subtypes: ['University Dining Hall', 'College Cafeteria', 'Campus Food Court'],
    weights: { foodSafety: 60, facilitySafety: 40 }
  }
};

// ── Founder pricing countdown banner ────────────────────────
function FounderBanner() {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const diff = FOUNDER_PRICING_DEADLINE.getTime() - now.getTime();
      if (diff <= 0) { setTimeLeft(''); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      setTimeLeft(`${days}d ${hours}h`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!timeLeft) return null;

  return (
    <div className="bg-gradient-to-r from-[#A08C5A] to-[#d4af37] text-white text-center py-2.5 px-4 text-sm font-medium">
      Founder pricing locked until July 4, 2026 — <span className="font-bold">{timeLeft} remaining</span>
    </div>
  );
}

export function Signup() {
  useCrispHide();
  const [fullName, setFullName] = useState('');
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [industryType, setIndustryType] = useState('');
  const [industrySubtype, setIndustrySubtype] = useState('');
  const [sb1383Qualified, setSb1383Qualified] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const limited = digits.slice(0, 10);
    if (limited.length <= 3) return limited;
    if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumber(e.target.value));
  };

  const passwordRequirements = {
    minLength: password.length >= 12,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const getPasswordStrength = () => {
    const metCount = Object.values(passwordRequirements).filter(Boolean).length;
    if (metCount === 0) return { label: '', width: '0%', color: 'bg-gray-300' };
    if (metCount <= 2) return { label: 'Weak', width: '25%', color: 'bg-red-500' };
    if (metCount === 3) return { label: 'Fair', width: '50%', color: 'bg-yellow-500' };
    if (metCount === 4) return { label: 'Good', width: '75%', color: 'bg-blue-500' };
    return { label: 'Strong', width: '100%', color: 'bg-green-500' };
  };

  const strength = getPasswordStrength();
  const selectedIndustry = industryType ? INDUSTRY_TYPES[industryType as keyof typeof INDUSTRY_TYPES] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allRequirementsMet) {
      setError('Please meet all password requirements');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!industryType || !industrySubtype) {
      setError('Please select your industry type');
      return;
    }

    if (!termsAccepted) {
      setError('You must accept the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);
    trackEvent('signup_start', { method: 'email' });

    const isK12 = industryType === 'K12_EDUCATION';
    const { error } = await signUp(email, password, fullName, phone, orgName, industryType, industrySubtype, {
      k12_enrolled: isK12,
      k12_enrolled_at: isK12 ? new Date().toISOString() : null,
      sb1383_enrolled: sb1383Qualified || isK12,
      sb1383_enrolled_at: (sb1383Qualified || isK12) ? new Date().toISOString() : null,
      org_type: isK12 ? 'k12' : 'standard',
      jurisdiction_selection: jurisdiction || null,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      trackEvent('signup_complete', { method: 'email' });
      trackConversion('trial_started');
      setEmailSent(true);
      setLoading(false);
    }
  };

  // ── Email sent confirmation ──
  if (emailSent) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex flex-col">
        {/* Navy top bar */}
        <div className="bg-[#1E2D4D] px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center">
            <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
              <rect width="48" height="48" rx="10.5" fill="rgba(255,255,255,0.1)"/>
              <circle cx="24" cy="24" r="3" fill="white"/>
              <circle cx="24" cy="13" r="3" fill="#A08C5A"/>
              <circle cx="34.5" cy="19" r="3" fill="#A08C5A"/>
              <circle cx="30.5" cy="31" r="3" fill="#A08C5A"/>
              <circle cx="17.5" cy="31" r="3" fill="#A08C5A"/>
              <circle cx="13.5" cy="19" r="3" fill="#A08C5A"/>
            </svg>
            <span className="ml-2.5 text-xl font-bold">
              <span className="text-[#A08C5A]">E</span>
              <span className="text-white">vid</span>
              <span className="text-[#A08C5A]">LY</span>
            </span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-[#1E2D4D] mb-2">Check Your Email</h2>
            <p className="text-gray-600 mb-4">
              We've sent a confirmation link to <strong>{email}</strong>. Click the link to verify your email and finish setting up your account.
            </p>
            <p className="text-sm text-gray-500">
              Didn't receive it? Check your spam folder or{' '}
              <button onClick={() => setEmailSent(false)} className="text-[#1E2D4D] font-medium hover:underline">
                try again
              </button>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex flex-col">
      {/* ── Navy top bar ── */}
      <div className="bg-[#1E2D4D] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
              <rect width="48" height="48" rx="10.5" fill="rgba(255,255,255,0.1)"/>
              <circle cx="24" cy="24" r="3" fill="white"/>
              <circle cx="24" cy="13" r="3" fill="#A08C5A"/>
              <circle cx="34.5" cy="19" r="3" fill="#A08C5A"/>
              <circle cx="30.5" cy="31" r="3" fill="#A08C5A"/>
              <circle cx="17.5" cy="31" r="3" fill="#A08C5A"/>
              <circle cx="13.5" cy="19" r="3" fill="#A08C5A"/>
            </svg>
            <span className="ml-2.5 text-xl font-bold">
              <span className="text-[#A08C5A]">E</span>
              <span className="text-white">vid</span>
              <span className="text-[#A08C5A]">LY</span>
            </span>
          </div>
          <Link to="/login" className="text-sm text-white/70 hover:text-white transition-colors">
            Already have an account? <span className="font-semibold text-white">Sign in</span>
          </Link>
        </div>
      </div>

      {/* ── Founder pricing banner ── */}
      <FounderBanner />

      {/* ── Main content ── */}
      <div className="flex-1 flex items-start justify-center px-4 sm:px-6 py-8">
        <div className="max-w-lg w-full">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="mb-6">
              <p className="text-center text-sm font-semibold text-[#A08C5A] mb-1">Lead with Confidence</p>
              <h2 className="text-center text-2xl font-bold text-[#1E2D4D]">Create your account</h2>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <SocialLoginButtons mode="signup" />

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/40 focus:border-[#A08C5A] transition-colors"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/40 focus:border-[#A08C5A] transition-colors"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(555) 555-5555"
                  className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/40 focus:border-[#A08C5A] transition-colors"
                />
              </div>

              <div>
                <label htmlFor="orgName" className="block text-sm font-medium text-gray-700">
                  Organization Name
                </label>
                <input
                  id="orgName"
                  name="orgName"
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/40 focus:border-[#A08C5A] transition-colors"
                />
              </div>

              {/* ── County / Jurisdiction dropdown ── */}
              <div>
                <label htmlFor="jurisdiction" className="block text-sm font-medium text-gray-700">
                  County / Jurisdiction
                </label>
                <select
                  id="jurisdiction"
                  name="jurisdiction"
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/40 focus:border-[#A08C5A] transition-colors"
                >
                  <option value="">Select county...</option>
                  <optgroup label="California Counties">
                    {CA_COUNTIES.map((county) => (
                      <option key={county} value={`county:${county.toLowerCase().replace(/\s+/g, '_')}`}>
                        {county} County
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Independent Jurisdictions">
                    {INDEPENDENT_JURISDICTIONS.map((j) => (
                      <option key={j.value} value={j.value}>
                        {j.label} ({j.county} Co.)
                      </option>
                    ))}
                  </optgroup>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Some cities operate independent health departments separate from their county.
                </p>
              </div>

              <div>
                <label htmlFor="industryType" className="block text-sm font-medium text-gray-700">
                  Industry Type
                </label>
                <select
                  id="industryType"
                  name="industryType"
                  required
                  value={industryType}
                  onChange={(e) => {
                    const code = e.target.value;
                    setIndustryType(code);
                    setIndustrySubtype('');
                    setSb1383Qualified(code === 'K12_EDUCATION');
                  }}
                  className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/40 focus:border-[#A08C5A] transition-colors"
                >
                  <option value="">Select industry...</option>
                  {Object.entries(INDUSTRY_TYPES).map(([key, industry]) => (
                    <option key={key} value={key}>{industry.label}</option>
                  ))}
                </select>
              </div>

              {selectedIndustry && (
                <div>
                  <label htmlFor="industrySubtype" className="block text-sm font-medium text-gray-700">
                    {selectedIndustry.label} Type
                  </label>
                  <select
                    id="industrySubtype"
                    name="industrySubtype"
                    required
                    value={industrySubtype}
                    onChange={(e) => setIndustrySubtype(e.target.value)}
                    className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/40 focus:border-[#A08C5A] transition-colors"
                  >
                    <option value="">Select type...</option>
                    {selectedIndustry.subtypes.map((subtype) => (
                      <option key={subtype} value={subtype}>{subtype}</option>
                    ))}
                  </select>
                </div>
              )}

              {industryType && industryType !== 'K12_EDUCATION' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Does your operation generate organic waste (food scraps, food-soiled paper) for disposal or recovery?
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    California SB 1383 applies to most commercial food generators. Selecting yes enables the SB 1383 compliance module.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSb1383Qualified(true)}
                      className="flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors"
                      style={{
                        border: '2px solid',
                        borderColor: sb1383Qualified ? '#40916C' : '#d1d5db',
                        background: sb1383Qualified ? '#D8F3DC' : 'white',
                        color: sb1383Qualified ? '#1B4332' : '#6b7280',
                        cursor: 'pointer',
                      }}
                    >
                      Yes — we generate organic waste
                    </button>
                    <button
                      type="button"
                      onClick={() => setSb1383Qualified(false)}
                      className="flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors"
                      style={{
                        border: '2px solid',
                        borderColor: !sb1383Qualified ? '#1E2D4D' : '#d1d5db',
                        background: !sb1383Qualified ? '#f3f4f6' : 'white',
                        color: !sb1383Qualified ? '#1E2D4D' : '#6b7280',
                        cursor: 'pointer',
                      }}
                    >
                      No — not applicable
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative mt-1">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/40 focus:border-[#A08C5A] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">Password Strength</span>
                      <span className={`text-xs font-medium ${strength.color.replace('bg-', 'text-')}`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${strength.color} h-2 rounded-full transition-all duration-300`}
                        style={{ width: strength.width }}
                      />
                    </div>
                  </div>
                )}
                <div className="mt-2 space-y-1">
                  <div className={`flex items-center text-xs ${passwordRequirements.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                    {passwordRequirements.minLength ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                    Minimum 12 characters
                  </div>
                  <div className={`flex items-center text-xs ${passwordRequirements.hasUpper ? 'text-green-600' : 'text-gray-500'}`}>
                    {passwordRequirements.hasUpper ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                    At least one uppercase letter
                  </div>
                  <div className={`flex items-center text-xs ${passwordRequirements.hasLower ? 'text-green-600' : 'text-gray-500'}`}>
                    {passwordRequirements.hasLower ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                    At least one lowercase letter
                  </div>
                  <div className={`flex items-center text-xs ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                    {passwordRequirements.hasNumber ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                    At least one number
                  </div>
                  <div className={`flex items-center text-xs ${passwordRequirements.hasSpecial ? 'text-green-600' : 'text-gray-500'}`}>
                    {passwordRequirements.hasSpecial ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                    At least one special character
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="relative mt-1">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/40 focus:border-[#A08C5A] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {confirmPassword && (
                  <div className={`mt-1 flex items-center text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordsMatch ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Passwords match
                      </>
                    ) : (
                      <>
                        <X className="h-3 w-3 mr-1" />
                        Passwords do not match
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="h-4 w-4 text-[#A08C5A] focus:ring-[#A08C5A] border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="text-gray-700">
                    I agree to the{' '}
                    <a
                      href="https://getevidly.com/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[#1E2D4D] hover:text-[#2A3F6B]"
                    >
                      Terms of Service
                    </a>
                    {' '}and{' '}
                    <a
                      href="https://getevidly.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[#1E2D4D] hover:text-[#2A3F6B]"
                    >
                      Privacy Policy
                    </a>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !allRequirementsMet || !passwordsMatch || !industryType || !industrySubtype || !termsAccepted}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#1E2D4D] hover:bg-[#2a3d5d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E2D4D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating account...' : 'Sign up'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-[#1E2D4D] hover:text-[#2A3F6B]">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
