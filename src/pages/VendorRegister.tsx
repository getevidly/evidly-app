import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useDemo } from '../contexts/DemoContext';
import ReCAPTCHA from 'react-google-recaptcha';
import { toast } from 'sonner';
import { EvidlyLogo } from '../components/ui/EvidlyLogo';

const SERVICE_TYPES = [
  'Hood Cleaning',
  'Fire Suppression',
  'Pest Control',
  'HVAC',
  'Plumbing',
  'Grease Trap',
  'Equipment Maintenance',
  'Other'
];

export function VendorRegister() {
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const recaptchaRef = useRef<ReCAPTCHA>(null);

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
    if (metCount === 0) return { label: '', width: '0%', color: 'bg-[#1E2D4D]/15' };
    if (metCount <= 2) return { label: 'Weak', width: '25%', color: 'bg-red-500' };
    if (metCount === 3) return { label: 'Fair', width: '50%', color: 'bg-yellow-500' };
    if (metCount === 4) return { label: 'Good', width: '75%', color: 'bg-blue-500' };
    return { label: 'Strong', width: '100%', color: 'bg-green-500' };
  };

  const strength = getPasswordStrength();

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

    if (!serviceType) {
      setError('Please select a service type');
      return;
    }

    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification');
      return;
    }

    setLoading(true);

    // Demo mode: simulate success without writing to database
    if (isDemoMode) {
      setLoading(false);
      toast.success('Vendor account created (demo mode)');
      navigate('/vendor/dashboard');
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_type: 'vendor',
          contact_name: contactName
        }
      }
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
      return;
    }

    if (authData.user) {
      const { error: vendorError } = await supabase.from('vendors').insert([{
        company_name: companyName,
        contact_name: contactName,
        email: email,
        phone: phone,
        service_type: serviceType
      }]);

      if (vendorError) {
        setError(vendorError.message);
        setLoading(false);
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
        return;
      }

      const { data: vendorData } = await supabase
        .from('vendors')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (vendorData) {
        await supabase.from('vendor_users').insert([{
          user_id: authData.user.id,
          vendor_id: vendorData.id,
          role: 'admin'
        }]);
      }

      navigate('/vendor/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-8">
          <div className="flex justify-center mb-2">
            <EvidlyLogo onDark={false} showTagline={false} />
          </div>

          <p className="text-center text-lg font-semibold tracking-tight text-[#1E2D4D] mb-2">Answers before you ask.</p>
          <h2 className="text-center text-xl font-bold text-[#1E2D4D] mb-6">Vendor Marketplace - Register</h2>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-[#1E2D4D]/80">
                Company Name
              </label>
              <input
                id="companyName"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-md shadow-sm focus:outline-none focus:ring-[#B24A2E] focus:border-[#B24A2E]"
              />
            </div>

            <div>
              <label htmlFor="contactName" className="block text-sm font-medium text-[#1E2D4D]/80">
                Contact Name
              </label>
              <input
                id="contactName"
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-md shadow-sm focus:outline-none focus:ring-[#B24A2E] focus:border-[#B24A2E]"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1E2D4D]/80">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-md shadow-sm focus:outline-none focus:ring-[#B24A2E] focus:border-[#B24A2E]"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[#1E2D4D]/80">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(555) 555-5555"
                className="mt-1 block w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-md shadow-sm focus:outline-none focus:ring-[#B24A2E] focus:border-[#B24A2E]"
              />
            </div>

            <div>
              <label htmlFor="serviceType" className="block text-sm font-medium text-[#1E2D4D]/80">
                Service Type
              </label>
              <select
                id="serviceType"
                required
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-md shadow-sm focus:outline-none focus:ring-[#B24A2E] focus:border-[#B24A2E]"
              >
                <option value="">Select service type...</option>
                {SERVICE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1E2D4D]/80">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-[#1E2D4D]/15 rounded-md shadow-sm focus:outline-none focus:ring-[#B24A2E] focus:border-[#B24A2E]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-[#1E2D4D]/30" />
                  ) : (
                    <Eye className="h-5 w-5 text-[#1E2D4D]/30" />
                  )}
                </button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[#1E2D4D]/80">Password Strength</span>
                    <span className={`text-xs font-medium ${strength.color.replace('bg-', 'text-')}`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="w-full bg-[#1E2D4D]/8 rounded-full h-2">
                    <div
                      className={`${strength.color} h-2 rounded-full transition-all duration-300`}
                      style={{ width: strength.width }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1E2D4D]/80">
                Confirm Password
              </label>
              <div className="relative mt-1">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-[#1E2D4D]/15 rounded-md shadow-sm focus:outline-none focus:ring-[#B24A2E] focus:border-[#B24A2E]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-[#1E2D4D]/30" />
                  ) : (
                    <Eye className="h-5 w-5 text-[#1E2D4D]/30" />
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

            <div className="flex justify-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey="6Le_3WEsAAAAAPiDQVzqzWZoEyAlKPaBwpRCum5Q"
                onChange={(token) => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !allRequirementsMet || !passwordsMatch || !serviceType || !captchaToken}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1E2D4D] hover:bg-[#162340] focus-visible:outline-none focus-visible:ring-2 focus:ring-offset-2 focus-visible:ring-[#B24A2E]/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[#1E2D4D]/70">
              Already have an account?{' '}
              <Link to="/vendor/login" className="font-medium text-[#1E2D4D] hover:text-[#1E2D4D]">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
