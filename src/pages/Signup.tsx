import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { SocialLoginButtons } from '../components/SocialLoginButtons';
import { trackEvent, trackConversion } from '../utils/analytics';

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
    subtypes: ['University Dining Hall', 'College Cafeteria', 'Campus Food Court'], // demo
    weights: { foodSafety: 60, facilitySafety: 40 }
  }
};

export function Signup() {
  const [fullName, setFullName] = useState('');
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [industryType, setIndustryType] = useState('');
  const [industrySubtype, setIndustrySubtype] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');

    // Limit to 10 digits
    const limited = digits.slice(0, 10);

    // Format as (XXX) XXX-XXXX
    if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 6) {
      return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
    } else {
      return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const passwordRequirements = {
    minLength: password.length >= 8,
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

    const { error } = await signUp(email, password, fullName, phone, orgName, industryType, industrySubtype);

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

  if (emailSent) {
    return (
      <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center">
              <span className="text-3xl font-bold">
                <span className="text-[#1e4d6b]">Evid</span>
                <span className="text-[#d4af37]">LY</span>
              </span>
            </div>
          </div>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check Your Email</h2>
          <p className="text-gray-600 mb-4">
            We've sent a confirmation link to <strong>{email}</strong>. Click the link to verify your email and finish setting up your account.
          </p>
          <p className="text-sm text-gray-500">
            Didn't receive it? Check your spam folder or{' '}
            <button onClick={() => setEmailSent(false)} className="text-[#1e4d6b] font-medium hover:underline">
              try again
            </button>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex justify-center mb-6">
            <div className="flex items-center">
              <div className="w-12 h-14">
                <svg viewBox="0 0 56 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <path d="M28 0L56 10V28C56 47.33 44.12 58.17 28 65C11.88 58.17 0 47.33 0 28V10L28 0Z" fill="#d4af37"/>
                  <path d="M28 6L50 14V28C50 43.5 40.5 52.5 28 58C15.5 52.5 6 43.5 6 28V14L28 6Z" fill="#1e4d6b"/>
                  <path d="M22 32L26 36L34 26" stroke="#d4af37" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="ml-3 text-3xl font-bold">
                <span className="text-[#1e4d6b]">Evid</span>
                <span className="text-[#d4af37]">LY</span>
              </span>
            </div>
          </div>

          <p className="text-center text-lg font-semibold text-[#1e4d6b] mb-2">Compliance Simplified</p>
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-6">Create your account</h2>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#d4af37] focus:border-[#d4af37]"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#d4af37] focus:border-[#d4af37]"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#d4af37] focus:border-[#d4af37]"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#d4af37] focus:border-[#d4af37]"
              />
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
                  setIndustryType(e.target.value);
                  setIndustrySubtype('');
                }}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#d4af37] focus:border-[#d4af37]"
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#d4af37] focus:border-[#d4af37]"
                >
                  <option value="">Select type...</option>
                  {selectedIndustry.subtypes.map((subtype) => (
                    <option key={subtype} value={subtype}>{subtype}</option>
                  ))}
                </select>
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
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#d4af37] focus:border-[#d4af37]"
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
                  Minimum 8 characters
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
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#d4af37] focus:border-[#d4af37]"
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
                  className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="terms" className="text-gray-700">
                  I agree to the{' '}
                  <a
                    href="https://getevidly.com/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#1e4d6b] hover:text-[#1e4d6b]"
                  >
                    Terms of Service
                  </a>
                  {' '}and{' '}
                  <a
                    href="https://getevidly.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#1e4d6b] hover:text-[#1e4d6b]"
                  >
                    Privacy Policy
                  </a>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !allRequirementsMet || !passwordsMatch || !industryType || !industrySubtype || !termsAccepted}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1e4d6b] hover:bg-[#2a6a8f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e4d6b] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-[#1e4d6b] hover:text-[#1e4d6b]">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
