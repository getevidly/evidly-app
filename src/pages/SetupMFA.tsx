/**
 * AUDIT-FIX-02 — MFA Enrollment Page
 *
 * Shown to users whose role requires MFA but haven't enrolled yet.
 * Uses Supabase auth.mfa.enroll() + auth.mfa.verify() for TOTP.
 * On success: updates user_mfa_config, redirects to dashboard.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, Copy, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const BG = '#F4F6FA';

export function SetupMFA() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [factorId, setFactorId] = useState('');
  const [qrUri, setQrUri] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(true);
  const [error, setError] = useState('');

  // Enroll TOTP factor
  useEffect(() => {
    const enroll = async () => {
      try {
        const { data, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'EvidLY Authenticator',
        });
        if (enrollError) throw enrollError;
        if (data) {
          setFactorId(data.id);
          setQrUri(data.totp.uri);
          setSecret(data.totp.secret);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to start MFA enrollment');
      }
      setEnrolling(false);
    };
    enroll();
  }, []);

  const handleVerify = useCallback(async () => {
    if (!factorId || verifyCode.length !== 6) return;
    setLoading(true);
    setError('');

    try {
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeErr) throw challengeErr;

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });
      if (verifyErr) throw verifyErr;

      // Update user_mfa_config
      if (user?.id) {
        await supabase.from('user_mfa_config').upsert({
          user_id: user.id,
          mfa_enabled: true,
          mfa_method: 'totp',
          enrolled_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }

      toast.success('MFA enabled successfully');
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      setError(e.message || 'Invalid code. Please try again.');
    }
    setLoading(false);
  }, [factorId, verifyCode, user?.id, navigate]);

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast.success('Secret copied to clipboard');
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 440, width: '100%', background: '#FFFFFF', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {/* Header strip */}
        <div style={{ height: 4, background: GOLD }} />

        <div style={{ padding: '32px 28px' }}>
          {/* Icon */}
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${GOLD}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Shield size={22} color={GOLD} />
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 6 }}>
            Set Up Two-Factor Authentication
          </h1>
          <p style={{ fontSize: 14, color: TEXT_SEC, lineHeight: 1.5, marginBottom: 24 }}>
            Your role ({profile?.role?.replace(/_/g, ' ') || 'admin'}) requires MFA. Scan the QR code with your authenticator app to continue.
          </p>

          {enrolling ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: GOLD }} />
              <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 12 }}>Setting up authenticator...</p>
            </div>
          ) : (
            <>
              {/* QR Code */}
              {qrUri && (
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`}
                    alt="MFA QR Code"
                    loading="lazy"
                    style={{ width: 200, height: 200, margin: '0 auto', borderRadius: 8, border: '1px solid #E5E7EB' }}
                  />
                </div>
              )}

              {/* Manual secret */}
              {secret && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: TEXT_SEC, marginBottom: 4 }}>Manual entry key:</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F9FAFB', borderRadius: 6, border: '1px solid #E5E7EB' }}>
                    <code style={{ fontSize: 13, fontFamily: 'monospace', flex: 1, wordBreak: 'break-all', color: NAVY }}>{secret}</code>
                    <button onClick={copySecret} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <Copy size={14} color={TEXT_SEC} />
                    </button>
                  </div>
                </div>
              )}

              {/* Verify code input */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 6 }}>
                  Enter 6-digit code from your app
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: 18,
                    fontFamily: 'monospace',
                    letterSpacing: '0.2em',
                    textAlign: 'center',
                    border: '1px solid #D1D5DB',
                    borderRadius: 8,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') handleVerify(); }}
                />
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FEF2F2', borderRadius: 8, marginBottom: 16 }}>
                  <AlertTriangle size={16} color="#DC2626" />
                  <span style={{ fontSize: 13, color: '#991B1B' }}>{error}</span>
                </div>
              )}

              <button
                onClick={handleVerify}
                disabled={verifyCode.length !== 6 || loading}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  borderRadius: 8,
                  border: 'none',
                  background: verifyCode.length === 6 ? NAVY : '#D1D5DB',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: verifyCode.length === 6 ? 'pointer' : 'not-allowed',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Verifying...' : 'Enable MFA'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
