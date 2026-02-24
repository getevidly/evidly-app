import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Play } from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { supabase } from '../lib/supabase';
import ReCAPTCHA from 'react-google-recaptcha';
import { LeadCaptureModal } from '../components/LeadCaptureModal';
import { SocialLoginButtons } from '../components/SocialLoginButtons';
import { useBranding } from '../contexts/BrandingContext';
import { trackEvent } from '../utils/analytics';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { branding } = useBranding();

  useEffect(() => {
    if (user) {
      const userType = user.user_metadata?.user_type;
      if (userType === 'vendor') {
        navigate('/vendor/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  const captchaEnabled = false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (captchaEnabled && !captchaToken) {
      setError('Please complete the CAPTCHA verification');
      return;
    }

    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } else {
      trackEvent('login', { method: 'email' });
      const { data: { user } } = await supabase.auth.getUser();
      const userType = user?.user_metadata?.user_type;

      if (userType === 'vendor') {
        navigate('/vendor/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex justify-center mb-2">
            <div className="flex items-center">
              <div className="w-12 h-14">
                <svg viewBox="0 0 56 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <path d="M28 0L56 10V28C56 47.33 44.12 58.17 28 65C11.88 58.17 0 47.33 0 28V10L28 0Z" fill={branding.colors.accent}/>
                  <path d="M28 6L50 14V28C50 43.5 40.5 52.5 28 58C15.5 52.5 6 43.5 6 28V14L28 6Z" fill={branding.colors.primary}/>
                  <path d="M22 32L26 36L34 26" stroke={branding.colors.accent} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {branding.brandName === 'EvidLY' ? (
                <span className="ml-3 text-3xl font-bold">
                  <span style={{ color: branding.colors.primary }}>Evid</span>
                  <span style={{ color: branding.colors.accent }}>LY</span>
                </span>
              ) : (
                <span className="ml-3 text-2xl font-bold" style={{ color: branding.colors.primary }}>
                  {branding.brandName}
                </span>
              )}
            </div>
          </div>

          <p className="text-center text-lg font-semibold mb-2" style={{ color: branding.colors.primary }}>{branding.tagline}</p>
          <h2 className="text-center text-xl font-bold text-gray-900 mb-6">{branding.loginWelcomeText ? 'Sign in to your account' : 'Sign in to your account'}</h2>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <SocialLoginButtons mode="login" />

          <form onSubmit={handleSubmit} className="space-y-6">
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
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
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium" style={{ color: branding.colors.primary }}>
                  Forgot password?
                </Link>
              </div>
            </div>

            {captchaEnabled && (
              <div className="flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={recaptchaKey}
                  onChange={(token) => setCaptchaToken(token)}
                  onExpired={() => setCaptchaToken(null)}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (captchaEnabled && !captchaToken)}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ backgroundColor: branding.colors.primary, '--tw-ring-color': branding.colors.primary } as React.CSSProperties}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = branding.colors.primaryLight)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = branding.colors.primary)}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* SSO / SAML login button (enterprise white-label) */}
          {branding.sso.enabled && (
            <div className="mt-4">
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-sm"><span className="bg-white px-3 text-gray-500">or</span></div>
              </div>
              <button
                onClick={() => toast.info('SSO login is a demo placeholder. In production, this redirects to your identity provider.')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border-2 rounded-md text-sm font-semibold transition-colors"
                style={{ borderColor: branding.colors.primary, color: branding.colors.primary }}
              >
                <EvidlyIcon size={16} />
                Sign in with {branding.sso.provider === 'saml' ? 'SAML SSO' : branding.sso.provider === 'oidc' ? 'OpenID Connect' : 'SSO'}
              </button>
              {branding.sso.enforce && (
                <p className="text-xs text-center text-gray-500 mt-2">
                  Your organization requires SSO sign-in
                </p>
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium" style={{ color: branding.colors.primary }}>
                Sign up
              </Link>
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Are you a vendor?{' '}
              <Link to="/vendor/login" className="font-medium" style={{ color: branding.colors.primary }}>
                Sign in here →
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowLeadModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-semibold text-[#1e4d6b] bg-[#d4af37]/10 border-2 border-[#d4af37]/30 hover:bg-[#d4af37]/20 hover:border-[#d4af37]/50 transition-all"
            >
              <Play className="h-4 w-4" />
              Try Interactive Demo
            </button>
            <p className="text-xs text-center text-gray-400 mt-3">
              No account needed — explore the full platform
            </p>
          </div>
        </div>

        {/* Powered by EvidLY badge for white-label */}
        {branding.poweredByVisible && (
          <div className="mt-4 flex justify-center">
            <a
              href="https://evidly.com?ref=powered-by"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <EvidlyIcon size={14} />
              <span>Powered by <span className="font-semibold text-gray-500">EvidLY</span></span>
            </a>
          </div>
        )}
      </div>
      <LeadCaptureModal isOpen={showLeadModal} onClose={() => setShowLeadModal(false)} />
    </div>
  );
}
