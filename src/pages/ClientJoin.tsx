import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-client-invite`;

interface Invite {
  business_name: string;
  contact_name: string;
  email: string;
  status: string;
  expires_at: string;
}

export function ClientJoin() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [zip, setZip] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) { setLoadError('Missing invite link.'); setLoading(false); return; }
      const { data, error } = await supabase
        .from('evidly_client_invites')
        .select('business_name, contact_name, email, status, expires_at')
        .eq('token', token)
        .maybeSingle();
      if (error || !data) { setLoadError('This invite link is invalid.'); setLoading(false); return; }
      if (data.status === 'accepted') { setLoadError('This invite has already been used. Please sign in.'); setLoading(false); return; }
      if (data.status !== 'pending') { setLoadError(`This invite is ${data.status}.`); setLoading(false); return; }
      if (new Date(data.expires_at) < new Date()) { setLoadError('This invite has expired.'); setLoading(false); return; }
      setInvite(data as Invite);
      setLoading(false);
    })();
  }, [token]);

  const reqs = {
    len: password.length >= 12,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    num: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const pwValid = Object.values(reqs).every(Boolean);
  const canSubmit = pwValid && password === confirm && !submitting;

  async function handleSubmit() {
    if (!canSubmit || !invite) return;
    setSubmitting(true);
    try {
      const res = await fetch(FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ token, password, address, city, state: stateVal, zip }),
      });
      const out = await res.json();
      if (!res.ok) { toast.error(out.error || 'Could not complete signup.'); setSubmitting(false); return; }

      const { error: signInErr } = await signIn(invite.email, password);
      if (signInErr) {
        toast.success('Account created. Please sign in.');
        navigate('/login');
        return;
      }
      toast.success('Welcome to EvidLY!');
      navigate('/dashboard');
    } catch {
      toast.error('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  const Req = ({ ok, label }: { ok: boolean; label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: ok ? '#0F6E56' : '#94a3b8' }}>
      {ok ? <Check size={13} /> : <X size={13} />}{label}
    </div>
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF7F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: NAVY }}>Loading…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF7F0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ maxWidth: 420, width: '100%', background: '#fff', borderRadius: 12, border: `0.5px solid ${NAVY}1A`, padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
            <span style={{ color: GOLD }}>E</span><span style={{ color: NAVY }}>vid</span><span style={{ color: GOLD }}>LY</span>
          </div>
          <p style={{ color: NAVY, fontSize: 15 }}>{loadError}</p>
          <button onClick={() => navigate('/login')} style={{ marginTop: 16, background: NAVY, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, cursor: 'pointer' }}>
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 0.5 }}>
            <span style={{ color: GOLD }}>E</span><span style={{ color: NAVY }}>vid</span><span style={{ color: GOLD }}>LY</span>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: `0.5px solid ${NAVY}1A`, padding: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: GOLD, letterSpacing: 0.6, margin: '0 0 6px' }}>YOU'RE INVITED</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: NAVY, margin: '0 0 4px' }}>
            Cleaning Pros Plus set up an account for {invite!.business_name}
          </p>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 18px', lineHeight: 1.6 }}>
            Set a password and confirm your kitchen's details. Your hood-cleaning records flow in automatically.
          </p>

          <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Email</label>
          <input value={invite!.email} disabled style={{ width: '100%', padding: '9px 11px', marginBottom: 12, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', boxSizing: 'border-box' }} />

          <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Create a password</label>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '9px 36px 9px 11px', borderRadius: 8, border: '1px solid #e2e8f0', boxSizing: 'border-box' }} />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px', marginBottom: 12 }}>
            <Req ok={reqs.len} label="12+ characters" />
            <Req ok={reqs.upper} label="Uppercase" />
            <Req ok={reqs.lower} label="Lowercase" />
            <Req ok={reqs.num} label="Number" />
            <Req ok={reqs.special} label="Special char" />
          </div>

          <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Confirm password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} style={{ width: '100%', padding: '9px 11px', marginBottom: confirm && confirm !== password ? 4 : 12, borderRadius: 8, border: '1px solid #e2e8f0', boxSizing: 'border-box' }} />
          {confirm && confirm !== password && <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 12px' }}>Passwords don't match</p>}

          <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Kitchen address</label>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="1420 Fulton St" style={{ width: '100%', padding: '9px 11px', marginBottom: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxSizing: 'border-box' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px', gap: 10, marginBottom: 18 }}>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>City</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Fresno" style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #e2e8f0', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>State</label>
              <input value={stateVal} onChange={e => setStateVal(e.target.value)} placeholder="CA" maxLength={2} style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #e2e8f0', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>ZIP</label>
              <input value={zip} onChange={e => setZip(e.target.value)} placeholder="93721" style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #e2e8f0', boxSizing: 'border-box' }} />
            </div>
          </div>

          <button onClick={handleSubmit} disabled={!canSubmit} style={{ width: '100%', background: canSubmit ? NAVY : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
            {submitting ? 'Creating your account…' : 'Create my account'}
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: '14px 6px 0' }}>
          Invited by Cleaning Pros Plus · EvidLY Founder rollout
        </p>
      </div>
    </div>
  );
}
