import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReCAPTCHA from 'react-google-recaptcha';
import { SocialLoginButtons } from '../components/SocialLoginButtons';
import { useBranding } from '../contexts/BrandingContext';
import { trackEvent } from '../utils/analytics';
import { useCrispHide } from '../hooks/useCrisp';

const TRUST_ITEMS = [
  { value: '169', label: 'Counties · 5 States' },
  { value: 'Food Safety', label: 'Inspection' },
  { value: 'Fire Safety', label: 'Inspection' },
];

export function Login() {
  useCrispHide();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [detectedJurisdiction, setDetectedJurisdiction] = useState<string | null>(null);
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

  // Jurisdiction detection via geolocation + Nominatim reverse geocode
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            { headers: { 'User-Agent': 'EvidLY/1.0 (https://getevidly.com)' } }
          );
          if (!res.ok) return;
          const data = await res.json();
          const county = data.address?.county;
          if (county && data.address?.state === 'California') {
            setDetectedJurisdiction(county.replace(' County', ''));
          }
        } catch { /* silent fail */ }
      },
      () => { /* permission denied — silent */ },
      { timeout: 5000, maximumAge: 300000 }
    );
  }, []);

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

      // Determine intended destination
      let destination = '/dashboard';
      if (userType === 'vendor') {
        destination = '/vendor/dashboard';
      } else if (user?.email?.endsWith('@getevidly.com') || userType === 'platform_admin') {
        destination = '/admin';
      }

      // Check for enrolled MFA factors — redirect to challenge if present
      const { data: mfaFactors } = await supabase.auth.mfa.listFactors();
      if (mfaFactors?.totp?.length && mfaFactors.totp.length > 0) {
        navigate('/mfa-challenge', { state: { redirectTo: destination } });
      } else {
        navigate(destination);
      }
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel — Navy brand panel (desktop only) ── */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1E2D4D 0%, #0B1628 100%)' }}
      >
        <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16">
          {/* Top: Logo + messaging */}
          <div>
            <div className="flex items-center mb-16">
              <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}>
                <span className="text-[#A08C5A]">E</span>
                <span className="text-white">vid</span>
                <span className="text-[#A08C5A]">LY</span>
              </span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight">
              Answers before<br />you ask.
            </h1>
            <p className="text-lg text-white/60 mb-12 max-w-md">
              Operational Intelligence for Commercial Kitchens.
            </p>

            {/* Trust bar */}
            <div className="flex gap-8">
              {TRUST_ITEMS.map((item) => (
                <div key={item.value}>
                  <p className="text-2xl font-bold tracking-tight text-white">{item.value}</p>
                  <p className="text-xs text-white/50 font-medium mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: Detected jurisdiction */}
          <div>
            {detectedJurisdiction && (
              <div className="flex items-center gap-2 text-white/40 text-sm">
                <MapPin size={14} />
                <span>Detected: {detectedJurisdiction} County, CA</span>
              </div>
            )}
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-[#A08C5A]/5" />
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/[0.02]" />
      </div>

      {/* ── Right Panel — Login form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-white">
        <div className="max-w-md w-full">
          {/* Mobile logo (hidden on desktop where left panel shows it) */}
          <div className="lg:hidden flex justify-center mb-6">
            <div className="text-center">
              {branding.brandName === 'EvidLY' ? (
                <span className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}>
                  <span style={{ color: '#A08C5A' }}>E</span>
                  <span style={{ color: '#1E2D4D' }}>vid</span>
                  <span style={{ color: '#A08C5A' }}>LY</span>
                </span>
              ) : (
                <span className="text-2xl font-bold tracking-tight" style={{ color: branding.colors.primary }}>
                  {branding.brandName}
                </span>
              )}
            </div>
          </div>

          {/* Mobile trust bar (hidden on desktop) */}
          <div className="lg:hidden flex justify-center gap-6 mb-6 pb-6 border-b border-[#1E2D4D]/5">
            {TRUST_ITEMS.map((item) => (
              <div key={item.value} className="text-center">
                <p className="text-base font-bold text-[#1E2D4D]">{item.value}</p>
                <p className="text-xs text-[#1E2D4D]/50 font-medium mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Heading */}
          <div className="mb-8">
            <p className="text-center lg:text-left text-sm font-semibold mb-1" style={{ color: '#A08C5A' }}>
              {branding.tagline}
            </p>
            <h2 className="text-center lg:text-left text-2xl font-bold tracking-tight text-[#1E2D4D]">
              Sign in to your account
            </h2>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <SocialLoginButtons mode="login" />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1E2D4D]/80">
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
                className="mt-1 block w-full px-3 py-2.5 border border-[#1E2D4D]/15 rounded-xl shadow-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]/40 focus:border-[#A08C5A] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1E2D4D]/80">
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
                  className="block w-full px-3 py-2.5 pr-10 border border-[#1E2D4D]/15 rounded-xl shadow-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]/40 focus:border-[#A08C5A] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-[#1E2D4D]/30 hover:text-[#1E2D4D]/70" />
                  ) : (
                    <Eye className="h-5 w-5 text-[#1E2D4D]/30 hover:text-[#1E2D4D]/70" />
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
                  className="h-4 w-4 text-[#A08C5A] focus:ring-[#A08C5A] border-[#1E2D4D]/15 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-[#1E2D4D]/70">
                  Remember me
                </label>
              </div>

              <Link to="/forgot-password" className="text-sm font-medium text-[#1E2D4D] hover:text-[#2A3F6B]">
                Forgot password?
              </Link>
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
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#1E2D4D] hover:bg-[#162340] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus:ring-offset-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* SSO / SAML login button (enterprise white-label) */}
          {branding.sso.enabled && (
            <div className="mt-4">
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#1E2D4D]/10" /></div>
                <div className="relative flex justify-center text-sm"><span className="bg-white px-3 text-[#1E2D4D]/50">or</span></div>
              </div>
              <button
                onClick={() => toast.info('SSO login is a demo placeholder. In production, this redirects to your identity provider.')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border-2 rounded-xl text-sm font-semibold transition-colors"
                style={{ borderColor: branding.colors.primary, color: branding.colors.primary }}
              >
                Sign in with {branding.sso.provider === 'saml' ? 'SAML SSO' : branding.sso.provider === 'oidc' ? 'OpenID Connect' : 'SSO'}
              </button>
              {branding.sso.enforce && (
                <p className="text-xs text-center text-[#1E2D4D]/50 mt-2">
                  Your organization requires SSO sign-in
                </p>
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-[#1E2D4D]/70">
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold text-[#1E2D4D] hover:text-[#2A3F6B]">
                Sign up
              </Link>
            </p>
          </div>

          {/* Powered by EvidLY badge for white-label */}
          {branding.poweredByVisible && (
            <div className="mt-6 flex justify-center">
              <a
                href="https://evidly.com?ref=powered-by"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#1E2D4D]/30 hover:text-[#1E2D4D]/70 transition-colors"
              >
                <span>Powered by <span className="font-semibold text-[#1E2D4D]/50">EvidLY</span></span>
              </a>
            </div>
          )}

          {/* Mobile jurisdiction detection */}
          {detectedJurisdiction && (
            <div className="lg:hidden mt-6 flex items-center justify-center gap-2 text-[#1E2D4D]/30 text-xs">
              <MapPin size={12} />
              <span>{detectedJurisdiction} County, CA</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
