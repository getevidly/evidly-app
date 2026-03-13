import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { supabase } from '../lib/supabase';
import ReCAPTCHA from 'react-google-recaptcha';
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
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { branding } = useBranding();

  useEffect(() => {
    if (user) {
      const userType = user.user_metadata?.user_type;
      if (userType === 'vendor') {
        navigate('/vendor/dashboard', { replace: true });
      } else if (user.email?.endsWith('@getevidly.com') || userType === 'platform_admin') {
        navigate('/admin', { replace: true });
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
      } else if (user?.email?.endsWith('@getevidly.com') || userType === 'platform_admin') {
        navigate('/admin');
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
              <div>
                <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" width="56" height="56">
                  <rect width="48" height="48" rx="10.5" fill="#1E2D4D"/>
                  <circle cx="24" cy="24" r="3" fill="white"/>
                  <circle cx="24" cy="13" r="3" fill="#A08C5A"/>
                  <circle cx="34.5" cy="19" r="3" fill="#A08C5A"/>
                  <circle cx="30.5" cy="31" r="3" fill="#A08C5A"/>
                  <circle cx="17.5" cy="31" r="3" fill="#A08C5A"/>
                  <circle cx="13.5" cy="19" r="3" fill="#A08C5A"/>
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
    </div>
  );
}
