import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReCAPTCHA from 'react-google-recaptcha';
import { SocialLoginButtons } from '../components/SocialLoginButtons';
import { useBranding } from '../contexts/BrandingContext';
import { trackEvent } from '../utils/analytics';
import { useCrispHide } from '../hooks/useCrisp';
import { colors, shadows, radius, typography, transitions } from '../lib/designSystem';

export function Login() {
  useCrispHide();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { branding } = useBranding();

  useEffect(() => { setMounted(true); }, []);

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

  const inputStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '12px 14px',
    border: `1.5px solid ${colors.border}`,
    borderRadius: radius.md,
    fontSize: typography.size.body,
    fontFamily: typography.family.body,
    color: colors.textPrimary,
    backgroundColor: colors.white,
    transition: `border-color ${transitions.fast}, box-shadow ${transitions.fast}`,
    outline: 'none',
  };

  const inputFocusHandler = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = colors.gold;
    e.currentTarget.style.boxShadow = shadows.goldGlow;
    e.currentTarget.style.backgroundColor = colors.white;
  };
  const inputBlurHandler = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = colors.border;
    e.currentTarget.style.boxShadow = 'none';
    e.currentTarget.style.backgroundColor = colors.white;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyDark} 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        maxWidth: 420,
        width: '100%',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 500ms ease, transform 500ms ease',
      }}>
        {/* Wordmark above card */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {branding.brandName === 'EvidLY' ? (
            <span style={{
              fontFamily: typography.family.logo,
              fontSize: 28,
              fontWeight: typography.weight.extrabold,
              letterSpacing: '-0.02em',
            }}>
              <span style={{ color: colors.gold }}>E</span>
              <span style={{ color: colors.cream }}>vid</span>
              <span style={{ color: colors.gold }}>LY</span>
            </span>
          ) : (
            <span style={{
              fontSize: 22,
              fontWeight: typography.weight.bold,
              color: colors.cream,
            }}>
              {branding.brandName}
            </span>
          )}
        </div>

        {/* ── Login card ── */}
        <div style={{
          background: colors.white,
          borderRadius: 16,
          padding: '40px 36px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.1)',
        }}>
          {/* Heading */}
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <h2 style={{
              fontSize: typography.size.h2,
              fontWeight: typography.weight.bold,
              letterSpacing: '-0.02em',
              color: colors.navy,
              margin: 0,
            }}>
              Sign in to your account
            </h2>
          </div>

          {error && (
            <div style={{
              marginBottom: 16,
              background: colors.dangerSoft,
              border: `1px solid ${colors.danger}30`,
              color: colors.danger,
              padding: '10px 14px',
              borderRadius: radius.md,
              fontSize: typography.size.sm,
            }}>
              {error}
            </div>
          )}

          <SocialLoginButtons mode="login" />

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label htmlFor="email" style={{
                display: 'block',
                fontSize: typography.size.sm,
                fontWeight: typography.weight.medium,
                color: colors.textSecondary,
                marginBottom: 6,
              }}>
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
                onFocus={inputFocusHandler}
                onBlur={inputBlurHandler}
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="password" style={{
                display: 'block',
                fontSize: typography.size.sm,
                fontWeight: typography.weight.medium,
                color: colors.textSecondary,
                marginBottom: 6,
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={inputFocusHandler}
                  onBlur={inputBlurHandler}
                  style={{ ...inputStyle, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: 12,
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    color: colors.textMuted,
                    transition: `color ${transitions.fast}`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = colors.textSecondary; }}
                  onMouseLeave={e => { e.currentTarget.style.color = colors.textMuted; }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    width: 16, height: 16,
                    accentColor: colors.gold,
                    borderRadius: radius.sm,
                    cursor: 'pointer',
                  }}
                />
                <label htmlFor="remember-me" style={{
                  fontSize: typography.size.sm,
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}>
                  Remember me
                </label>
              </div>

              <Link to="/forgot-password" style={{
                fontSize: typography.size.sm,
                fontWeight: typography.weight.medium,
                color: colors.gold,
                textDecoration: 'none',
                transition: `color ${transitions.fast}`,
              }}
                onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
              >
                Forgot password?
              </Link>
            </div>

            {captchaEnabled && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
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
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                padding: '14px 16px',
                border: 'none',
                borderRadius: radius.md,
                boxShadow: shadows.sm,
                fontSize: typography.size.body,
                fontWeight: typography.weight.semibold,
                fontFamily: typography.family.body,
                color: colors.white,
                background: `linear-gradient(135deg, ${colors.navy}, ${colors.navyDark})`,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: `box-shadow ${transitions.normal}, transform ${transitions.normal}`,
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.boxShadow = shadows.md;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = shadows.sm;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* SSO / SAML login button (enterprise white-label) */}
          {branding.sso.enabled && (
            <div style={{ marginTop: 16 }}>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '100%', height: 1, background: colors.borderLight }} />
                </div>
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                  <span style={{
                    background: colors.white,
                    padding: '0 12px',
                    fontSize: typography.size.sm,
                    color: colors.textMuted,
                  }}>or</span>
                </div>
              </div>
              <button
                onClick={() => toast.info('SSO login is a demo placeholder. In production, this redirects to your identity provider.')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  border: `2px solid ${branding.colors.primary}`,
                  borderRadius: radius.lg,
                  fontSize: typography.size.sm,
                  fontWeight: typography.weight.semibold,
                  fontFamily: typography.family.body,
                  color: branding.colors.primary,
                  background: 'transparent',
                  cursor: 'pointer',
                  transition: `background ${transitions.fast}`,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${branding.colors.primary}08`; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                Sign in with {branding.sso.provider === 'saml' ? 'SAML SSO' : branding.sso.provider === 'oidc' ? 'OpenID Connect' : 'SSO'}
              </button>
              {branding.sso.enforce && (
                <p style={{
                  fontSize: typography.size.xs,
                  textAlign: 'center',
                  color: colors.textMuted,
                  marginTop: 8,
                }}>
                  Your organization requires SSO sign-in
                </p>
              )}
            </div>
          )}

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <p style={{ fontSize: typography.size.sm, color: colors.textSecondary }}>
              Don't have an account?{' '}
              <Link to="/signup" style={{
                fontWeight: typography.weight.semibold,
                color: colors.navy,
                textDecoration: 'none',
                transition: `color ${transitions.fast}`,
              }}>
                Sign up
              </Link>
            </p>
          </div>

          {/* Powered by EvidLY badge for white-label */}
          {branding.poweredByVisible && (
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
              <a
                href="https://evidly.com?ref=powered-by"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: typography.size.xs,
                  color: colors.textMuted,
                  textDecoration: 'none',
                  transition: `color ${transitions.fast}`,
                }}
              >
                <span>Powered by <span style={{ fontWeight: typography.weight.semibold, color: colors.textSecondary }}>EvidLY</span></span>
              </a>
            </div>
          )}
        </div>

        {/* Partner portal link + security line under card */}
        <p style={{
          textAlign: 'center',
          fontSize: typography.size.xs,
          color: 'rgba(255,255,255,0.4)',
          marginTop: 20,
          lineHeight: 1.6,
        }}>
          Insurance partner?{' '}
          <a
            href="https://portal.getevidly.com"
            style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'underline' }}
          >
            Go to the partner portal
          </a>
        </p>
        <p style={{
          textAlign: 'center',
          fontFamily: typography.family.body,
          fontSize: 12,
          fontWeight: typography.weight.regular,
          color: 'rgba(255,255,255,0.3)',
          marginTop: 8,
          lineHeight: 1.6,
        }}>
          Encrypted connection · MFA available · sessions expire on inactivity.
        </p>
      </div>
    </div>
  );
}
