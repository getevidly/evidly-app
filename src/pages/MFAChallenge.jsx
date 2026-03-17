/**
 * E2E-FIX-01 — MFA Challenge Screen
 *
 * Shown after login when user has TOTP factor enrolled.
 * Verifies the 6-digit TOTP code before granting access.
 * Route: /mfa-challenge
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Shield, AlertTriangle } from 'lucide-react';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';

export function MFAChallenge() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.redirectTo || '/dashboard';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [factorId, setFactorId] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Get the enrolled TOTP factor
  useEffect(() => {
    const getFactors = async () => {
      const { data, error: err } = await supabase.auth.mfa.listFactors();
      if (err || !data?.totp?.length) {
        // No factors — shouldn't be on this page
        navigate(redirectTo, { replace: true });
        return;
      }
      setFactorId(data.totp[0].id);
    };
    getFactors();
  }, [navigate, redirectTo]);

  const handleVerify = async () => {
    if (!factorId || code.length !== 6) return;
    setLoading(true);
    setError('');

    try {
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeErr) throw challengeErr;

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyErr) throw verifyErr;

      navigate(redirectTo, { replace: true });
    } catch (e) {
      setError('Invalid code. Try again.');
      setCode('');
      inputRef.current?.focus();
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleVerify();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: NAVY,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        maxWidth: 400,
        width: '100%',
        background: '#FFFFFF',
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}>
        {/* Gold accent strip */}
        <div style={{ height: 4, background: GOLD }} />

        <div style={{ padding: '32px 28px' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" width="48" height="48" style={{ margin: '0 auto 12px' }}>
              <rect width="48" height="48" rx="10.5" fill={NAVY} />
              <circle cx="24" cy="24" r="3" fill="white" />
              <circle cx="24" cy="13" r="3" fill={GOLD} />
              <circle cx="34.5" cy="19" r="3" fill={GOLD} />
              <circle cx="30.5" cy="31" r="3" fill={GOLD} />
              <circle cx="17.5" cy="31" r="3" fill={GOLD} />
              <circle cx="13.5" cy="19" r="3" fill={GOLD} />
            </svg>
          </div>

          {/* Icon */}
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: `${GOLD}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Shield size={22} color={GOLD} />
          </div>

          <h1 style={{ fontSize: 20, fontWeight: 700, color: NAVY, textAlign: 'center', marginBottom: 6 }}>
            Two-Factor Authentication
          </h1>
          <p style={{ fontSize: 13, color: TEXT_SEC, textAlign: 'center', lineHeight: 1.5, marginBottom: 24 }}>
            Enter the 6-digit code from your authenticator app
          </p>

          {/* Code input */}
          <div style={{ marginBottom: 16 }}>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={handleKeyDown}
              placeholder="000000"
              autoComplete="one-time-code"
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: 24,
                fontFamily: 'monospace',
                letterSpacing: '0.3em',
                textAlign: 'center',
                border: `1px solid ${error ? '#DC2626' : '#D1D5DB'}`,
                borderRadius: 8,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', background: '#FEF2F2',
              borderRadius: 8, marginBottom: 16,
            }}>
              <AlertTriangle size={16} color="#DC2626" />
              <span style={{ fontSize: 13, color: '#991B1B' }}>{error}</span>
            </div>
          )}

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={code.length !== 6 || loading || !factorId}
            style={{
              width: '100%',
              padding: '12px 0',
              borderRadius: 8,
              border: 'none',
              background: code.length === 6 ? GOLD : '#D1D5DB',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 600,
              cursor: code.length === 6 ? 'pointer' : 'not-allowed',
              opacity: loading ? 0.6 : 1,
              marginBottom: 16,
            }}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>

          {/* Help text */}
          <p style={{ fontSize: 11, color: TEXT_SEC, textAlign: 'center', lineHeight: 1.5 }}>
            Having trouble?{' '}
            <a href="mailto:founders@getevidly.com" style={{ color: GOLD, textDecoration: 'underline' }}>
              Contact founders@getevidly.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
