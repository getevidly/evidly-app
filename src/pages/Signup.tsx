import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { SocialLoginButtons } from '../components/SocialLoginButtons';
import { trackEvent, trackConversion } from '../utils/analytics';
import { FOUNDER_PRICING_DEADLINE } from '../lib/stripe';
import { useCrispHide } from '../hooks/useCrisp';
import { colors, shadows, radius, typography, transitions } from '../lib/designSystem';
import {
  SUPPORTED_STATES,
  getCountiesForState,
  getIndependentJurisdictionsForState,
  countyToSlug,
  type StateAbbrev,
} from '../data/stateCounties';
import { KITCHEN_TYPES, labelToKitchenType } from '../config/kitchenTypes';

const INPUT_STYLE: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '10px 12px',
  border: `1.5px solid ${colors.border}`,
  borderRadius: radius.lg,
  fontSize: typography.size.body,
  fontFamily: typography.family.body,
  color: colors.textPrimary,
  background: colors.white,
  transition: `border-color ${transitions.fast}, box-shadow ${transitions.fast}`,
  outline: 'none',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: typography.size.sm,
  fontWeight: typography.weight.medium,
  color: colors.textSecondary,
  marginBottom: 6,
};

const focusIn = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = colors.gold;
  e.currentTarget.style.boxShadow = shadows.goldGlow;
};
const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = colors.border;
  e.currentTarget.style.boxShadow = 'none';
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
    <div style={{
      background: colors.gold,
      color: colors.white,
      textAlign: 'center',
      padding: '10px 16px',
      fontSize: typography.size.sm,
      fontWeight: typography.weight.medium,
      fontFamily: typography.family.body,
    }}>
      Founder pricing locked until August 7, 2026 — <span style={{ fontWeight: typography.weight.bold }}>{timeLeft} remaining</span>
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
  const [signupState, setSignupState] = useState<StateAbbrev | ''>('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [kitchenType, setKitchenType] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [emailSent, setEmailSent] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { setMounted(true); }, []);

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
    if (metCount === 0) return { label: '', width: '0%', color: colors.border };
    if (metCount <= 2) return { label: 'Weak', width: '25%', color: colors.danger };
    if (metCount === 3) return { label: 'Fair', width: '50%', color: colors.warning };
    if (metCount === 4) return { label: 'Good', width: '75%', color: colors.info };
    return { label: 'Strong', width: '100%', color: colors.success };
  };

  const strength = getPasswordStrength();
  const validateField = (name: string): string => {
    switch (name) {
      case 'fullName': return fullName.trim().length < 2 ? 'Full name is required (min 2 characters)' : '';
      case 'email': return !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Valid email is required' : '';
      case 'phone': {
        const digits = phone.replace(/\D/g, '');
        return digits.length < 10 ? 'Phone number is required (10 digits)' : '';
      }
      case 'orgName': return orgName.trim().length < 2 ? 'Organization name is required (min 2 characters)' : '';
      case 'signupState': return !signupState ? 'State is required' : '';
      case 'kitchenType': return !kitchenType ? 'Kitchen type is required' : '';
      default: return '';
    }
  };

  const handleBlur = (name: string) => {
    const err = validateField(name);
    setFieldErrors(prev => ({ ...prev, [name]: err }));
  };

  const allFieldsValid = fullName.trim().length >= 2
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    && phone.replace(/\D/g, '').length >= 10
    && orgName.trim().length >= 2
    && !!signupState
    && !!kitchenType
    && allRequirementsMet
    && passwordsMatch
    && termsAccepted;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate all fields
    const errors: Record<string, string> = {};
    for (const name of ['fullName', 'email', 'phone', 'orgName', 'signupState', 'kitchenType']) {
      const err = validateField(name);
      if (err) errors[name] = err;
    }
    if (!allRequirementsMet) errors.password = 'Please meet all password requirements';
    if (!passwordsMatch) errors.confirmPassword = 'Passwords do not match';
    if (!termsAccepted) errors.terms = 'You must accept the Terms of Service and Privacy Policy';
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError('Please fix the errors above');
      return;
    }

    const dbKitchenType = labelToKitchenType(kitchenType);
    if (!dbKitchenType) {
      setError('Invalid kitchen type selected');
      return;
    }

    setLoading(true);
    trackEvent('signup_start', { method: 'email' });

    const { error } = await signUp(email, password, fullName.trim(), phone, orgName.trim(), signupState, dbKitchenType);

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
      <div style={{ minHeight: '100vh', background: colors.cream, display: 'flex', flexDirection: 'column' }}>
        {/* Navy top bar */}
        <div style={{ background: colors.navy, padding: '16px 24px' }}>
          <div style={{ maxWidth: 896, margin: '0 auto', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontFamily: typography.family.logo, fontSize: 20, fontWeight: typography.weight.extrabold }}>
              <span style={{ color: colors.gold }}>E</span>
              <span style={{ color: colors.white }}>vid</span>
              <span style={{ color: colors.gold }}>LY</span>
            </span>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{
            maxWidth: 440,
            width: '100%',
            background: colors.white,
            borderRadius: radius.xl,
            boxShadow: shadows.lg,
            padding: 32,
            textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64,
              background: colors.successSoft,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Check style={{ width: 32, height: 32, color: colors.success }} />
            </div>
            <h2 style={{ fontSize: typography.size.h2, fontWeight: typography.weight.bold, color: colors.navy, marginBottom: 8 }}>
              Check Your Email
            </h2>
            <p style={{ color: colors.textSecondary, marginBottom: 16, fontSize: typography.size.body, lineHeight: 1.6 }}>
              We've sent a confirmation link to <strong style={{ color: colors.navy }}>{email}</strong>. Click the link to verify your email and finish setting up your account.
            </p>
            <p style={{ fontSize: typography.size.sm, color: colors.textMuted }}>
              Didn't receive it? Check your spam folder or{' '}
              <button
                onClick={() => setEmailSent(false)}
                style={{
                  color: colors.navy,
                  fontWeight: typography.weight.medium,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: typography.size.sm,
                }}
              >
                try again
              </button>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.cream, display: 'flex', flexDirection: 'column' }}>
      {/* ── Navy top bar ── */}
      <div style={{ background: colors.navy, padding: '16px 24px' }}>
        <div style={{ maxWidth: 896, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: typography.family.logo, fontSize: 20, fontWeight: typography.weight.extrabold }}>
            <span style={{ color: colors.gold }}>E</span>
            <span style={{ color: colors.white }}>vid</span>
            <span style={{ color: colors.gold }}>LY</span>
          </span>
          <Link to="/login" style={{
            fontSize: typography.size.sm,
            color: 'rgba(255,255,255,0.65)',
            textDecoration: 'none',
            transition: `color ${transitions.fast}`,
          }}>
            Already have an account? <span style={{ fontWeight: typography.weight.semibold, color: colors.white }}>Sign in</span>
          </Link>
        </div>
      </div>

      {/* ── Founder pricing banner ── */}
      <FounderBanner />

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px' }}>
        <div style={{ maxWidth: 520, width: '100%' }}>
          <div style={{
            background: colors.white,
            borderRadius: radius.xl,
            boxShadow: shadows.lg,
            padding: '32px 36px',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(8px)',
            transition: `opacity 500ms ease 100ms, transform 500ms ease 100ms`,
          }}>
            <div style={{ marginBottom: 24 }}>
              <p style={{ textAlign: 'center', fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.gold, marginBottom: 4 }}>
                Answers before you ask.
              </p>
              <h2 style={{ textAlign: 'center', fontSize: typography.size.h2, fontWeight: typography.weight.bold, letterSpacing: '-0.02em', color: colors.navy }}>
                Create your account
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

            <SocialLoginButtons mode="signup" />

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label htmlFor="fullName" style={LABEL_STYLE}>Full Name</label>
                <input
                  id="fullName" name="fullName" type="text" required
                  value={fullName} onChange={(e) => setFullName(e.target.value)}
                  onFocus={focusIn} onBlur={focusOut}
                  style={INPUT_STYLE}
                />
              </div>

              <div>
                <label htmlFor="email" style={LABEL_STYLE}>Email address</label>
                <input
                  id="email" name="email" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  onFocus={focusIn} onBlur={focusOut}
                  style={INPUT_STYLE}
                />
              </div>

              <div>
                <label htmlFor="phone" style={LABEL_STYLE}>Phone <span style={{ color: colors.danger }}>*</span></label>
                <input
                  id="phone" name="phone" type="tel" autoComplete="tel" required
                  value={phone} onChange={handlePhoneChange} placeholder="(555) 555-5555"
                  onFocus={focusIn} onBlur={(e) => { focusOut(e); handleBlur('phone'); }}
                  style={{ ...INPUT_STYLE, ...(fieldErrors.phone ? { borderColor: colors.danger } : {}) }}
                />
                {fieldErrors.phone && <p style={{ marginTop: 4, fontSize: typography.size.xs, color: colors.danger }}>{fieldErrors.phone}</p>}
              </div>

              <div>
                <label htmlFor="orgName" style={LABEL_STYLE}>Organization Name</label>
                <input
                  id="orgName" name="orgName" type="text" required
                  value={orgName} onChange={(e) => setOrgName(e.target.value)}
                  onFocus={focusIn} onBlur={focusOut}
                  style={INPUT_STYLE}
                />
              </div>

              {/* ── State + County / Jurisdiction dropdown ── */}
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <div>
                  <label htmlFor="signupState" style={LABEL_STYLE}>State <span style={{ color: colors.danger }}>*</span></label>
                  <select
                    id="signupState" name="signupState" required
                    value={signupState}
                    onChange={(e) => { setSignupState(e.target.value as StateAbbrev); setJurisdiction(''); }}
                    onFocus={focusIn} onBlur={(e) => { focusOut(e); handleBlur('signupState'); }}
                    style={{ ...INPUT_STYLE, cursor: 'pointer', ...(fieldErrors.signupState ? { borderColor: colors.danger } : {}) }}
                  >
                    <option value="">Select state...</option>
                    {SUPPORTED_STATES.map(s => (
                      <option key={s.abbrev} value={s.abbrev}>{s.name}</option>
                    ))}
                  </select>
                  {fieldErrors.signupState && <p style={{ marginTop: 4, fontSize: typography.size.xs, color: colors.danger }}>{fieldErrors.signupState}</p>}
                </div>
                <div>
                  <label htmlFor="jurisdiction" style={LABEL_STYLE}>County / Jurisdiction</label>
                  <select
                    id="jurisdiction" name="jurisdiction"
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    onFocus={focusIn} onBlur={focusOut}
                    style={{ ...INPUT_STYLE, cursor: 'pointer' }}
                  >
                    <option value="">Select county...</option>
                    <optgroup label={`${SUPPORTED_STATES.find(s => s.abbrev === signupState)?.name} Counties`}>
                      {getCountiesForState(signupState).map((county) => (
                        <option key={county} value={countyToSlug(county, signupState)}>
                          {county} County
                        </option>
                      ))}
                    </optgroup>
                    {getIndependentJurisdictionsForState(signupState).length > 0 && (
                      <optgroup label="Independent Jurisdictions">
                        {getIndependentJurisdictionsForState(signupState).map((j) => (
                          <option key={j.value} value={j.value}>
                            {j.label} ({j.county} Co.)
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <p style={{ marginTop: 4, fontSize: typography.size.xs, color: colors.textMuted }}>
                    Some cities operate independent health departments separate from their county.
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="kitchenType" style={LABEL_STYLE}>Commercial Kitchen Type <span style={{ color: colors.danger }}>*</span></label>
                <select
                  id="kitchenType" name="kitchenType" required
                  value={kitchenType}
                  onChange={(e) => setKitchenType(e.target.value)}
                  onFocus={focusIn} onBlur={(e) => { focusOut(e); handleBlur('kitchenType'); }}
                  style={{ ...INPUT_STYLE, cursor: 'pointer', ...(fieldErrors.kitchenType ? { borderColor: colors.danger } : {}) }}
                >
                  <option value="">Select type...</option>
                  {KITCHEN_TYPES.map((t) => (
                    <option key={t.value} value={t.label}>{t.label}</option>
                  ))}
                </select>
                {fieldErrors.kitchenType && <p style={{ marginTop: 4, fontSize: typography.size.xs, color: colors.danger }}>{fieldErrors.kitchenType}</p>}
              </div>

              <div>
                <label htmlFor="password" style={LABEL_STYLE}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password" name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    onFocus={focusIn} onBlur={focusOut}
                    style={{ ...INPUT_STYLE, paddingRight: 40 }}
                  />
                  <button
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: colors.textMuted,
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {password && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: typography.size.xs, fontWeight: typography.weight.medium, color: colors.textSecondary }}>
                        Password Strength
                      </span>
                      <span style={{ fontSize: typography.size.xs, fontWeight: typography.weight.medium, color: strength.color }}>
                        {strength.label}
                      </span>
                    </div>
                    <div style={{ width: '100%', background: colors.borderLight, borderRadius: radius.full, height: 8 }}>
                      <div style={{
                        background: strength.color, height: 8, borderRadius: radius.full,
                        width: strength.width, transition: `width 300ms ease`,
                      }} />
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {([
                    [passwordRequirements.minLength, 'Minimum 12 characters'],
                    [passwordRequirements.hasUpper, 'At least one uppercase letter'],
                    [passwordRequirements.hasLower, 'At least one lowercase letter'],
                    [passwordRequirements.hasNumber, 'At least one number'],
                    [passwordRequirements.hasSpecial, 'At least one special character'],
                  ] as [boolean, string][]).map(([met, label]) => (
                    <div key={label} style={{
                      display: 'flex', alignItems: 'center',
                      fontSize: typography.size.xs,
                      color: met ? colors.success : colors.textMuted,
                    }}>
                      {met ? <Check style={{ width: 12, height: 12, marginRight: 4 }} /> : <X style={{ width: 12, height: 12, marginRight: 4 }} />}
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" style={LABEL_STYLE}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="confirmPassword" name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password" required
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={focusIn} onBlur={focusOut}
                    style={{ ...INPUT_STYLE, paddingRight: 40 }}
                  />
                  <button
                    type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: colors.textMuted,
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && (
                  <div style={{
                    marginTop: 4, display: 'flex', alignItems: 'center',
                    fontSize: typography.size.xs,
                    color: passwordsMatch ? colors.success : colors.danger,
                  }}>
                    {passwordsMatch ? (
                      <><Check style={{ width: 12, height: 12, marginRight: 4 }} /> Passwords match</>
                    ) : (
                      <><X style={{ width: 12, height: 12, marginRight: 4 }} /> Passwords do not match</>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <input
                  id="terms" name="terms" type="checkbox"
                  checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: colors.gold, marginTop: 2, cursor: 'pointer' }}
                />
                <label htmlFor="terms" style={{ fontSize: typography.size.sm, color: colors.textSecondary, lineHeight: 1.5, cursor: 'pointer' }}>
                  I agree to the{' '}
                  <a href="https://getevidly.com/terms" target="_blank" rel="noopener noreferrer"
                    style={{ fontWeight: typography.weight.medium, color: colors.navy, textDecoration: 'none' }}>
                    Terms of Service
                  </a>
                  {' '}and{' '}
                  <a href="https://getevidly.com/privacy" target="_blank" rel="noopener noreferrer"
                    style={{ fontWeight: typography.weight.medium, color: colors.navy, textDecoration: 'none' }}>
                    Privacy Policy
                  </a>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !allFieldsValid}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'center',
                  padding: '12px 16px', border: 'none', borderRadius: radius.lg,
                  boxShadow: shadows.sm, fontSize: typography.size.body,
                  fontWeight: typography.weight.semibold, fontFamily: typography.family.body,
                  color: colors.white, background: colors.navy,
                  cursor: (loading || !allFieldsValid) ? 'not-allowed' : 'pointer',
                  opacity: (loading || !allFieldsValid) ? 0.5 : 1,
                  transition: `background ${transitions.fast}, box-shadow ${transitions.fast}`,
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.background = colors.navyHover;
                    e.currentTarget.style.boxShadow = shadows.md;
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = colors.navy;
                  e.currentTarget.style.boxShadow = shadows.sm;
                }}
              >
                {loading ? 'Creating account...' : 'Sign up'}
              </button>
            </form>

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <p style={{ fontSize: typography.size.sm, color: colors.textSecondary }}>
                Already have an account?{' '}
                <Link to="/login" style={{ fontWeight: typography.weight.semibold, color: colors.navy, textDecoration: 'none' }}>
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
