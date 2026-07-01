import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X, Flame, Leaf, Radar, Phone, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-client-invite`;
const CALENDLY_URL = import.meta.env.VITE_FOUNDER_CALENDLY || 'https://calendly.com/arthur-getevidly/evidly';
const FOUNDER_PHONE = import.meta.env.VITE_FOUNDER_PHONE || '';

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
    const id = 'calendly-widget-js';
    if (!document.getElementById(id)) {
      const s = document.createElement('script');
      s.id = id;
      s.src = 'https://assets.calendly.com/assets/external/widget.js';
      s.async = true;
      document.body.appendChild(s);
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://assets.calendly.com/assets/external/widget.css';
      document.head.appendChild(l);
    }
  }, []);

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

  function openCalendly() {
    const w = window as unknown as { Calendly?: { initPopupWidget: (o: { url: string }) => void } };
    if (w.Calendly) { w.Calendly.initPopupWidget({ url: CALENDLY_URL }); }
    else { window.open(CALENDLY_URL, '_blank'); }
  }

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
        headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ token, password, address, city, state: stateVal, zip }),
      });
      const out = await res.json();
      if (!res.ok) { toast.error(out.error || 'Could not complete signup.'); setSubmitting(false); return; }
      const { error: signInErr } = await signIn(invite.email, password);
      if (signInErr) { toast.success('Account created. Please sign in.'); navigate('/login'); return; }
      toast.success('Welcome to EvidLY!');
      navigate('/dashboard');
    } catch {
      toast.error('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  const styles = `
    .cj-wrap { min-height:100vh; background:#FAF7F0; display:flex; align-items:center; justify-content:center; padding:20px; }
    .cj-card { width:100%; max-width:760px; background:#fff; border-radius:14px; overflow:hidden; border:1px solid #E7E2D6; display:grid; grid-template-columns:300px 1fr; }
    .cj-panel { background:#1E2D4D; padding:28px 24px; color:#fff; display:flex; flex-direction:column; }
    .cj-form { padding:28px; }
    .cj-mark { font-size:21px; font-weight:700; letter-spacing:0.5px; margin-bottom:20px; }
    .cj-badge { display:flex; align-items:center; gap:11px; padding:12px; background:rgba(160,140,90,0.10); border:1px solid rgba(160,140,90,0.35); border-radius:12px; margin-bottom:18px; }
    .cj-av { flex:none; width:40px; height:40px; border-radius:50%; background:#A08C5A; color:#1E2D4D; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; }
    .cj-feat { display:flex; align-items:flex-start; gap:11px; }
    .cj-fic { flex:none; width:22px; height:22px; border-radius:50%; background:#A08C5A; display:flex; align-items:center; justify-content:center; margin-top:1px; color:#1E2D4D; }
    .cj-inp { width:100%; padding:10px 12px; border-radius:9px; border:1px solid #E2E8F0; font-size:13.5px; box-sizing:border-box; outline:none; }
    .cj-inp:focus { border-color:#A08C5A; box-shadow:0 0 0 3px rgba(160,140,90,0.12); }
    .cj-inp:disabled { background:#F8FAFB; color:#64748b; }
    .cj-btn { width:100%; background:#1E2D4D; color:#fff; border:none; border-radius:9px; padding:13px; font-size:14.5px; font-weight:600; cursor:pointer; transition:opacity .15s; }
    .cj-btn:disabled { opacity:0.4; cursor:not-allowed; }
    .cj-lbl { font-size:11.5px; color:#64748b; display:block; margin-bottom:4px; font-weight:500; }
    .cj-contact { flex:1; display:flex; align-items:center; justify-content:center; gap:7px; text-decoration:none; border:1px solid #E2E8F0; border-radius:9px; padding:9px; font-size:12.5px; color:#1E2D4D; font-weight:500; background:none; cursor:pointer; }
    @media (max-width:720px) { .cj-card { grid-template-columns:1fr; max-width:440px; } }
  `;

  const Req = ({ ok, label }: { ok: boolean; label: string }) => (
    <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, color: ok ? '#0F6E56' : '#94a3b8' }}>
      {ok ? <Check size={13} /> : <X size={13} />}{label}
    </span>
  );

  if (loading) {
    return <div className="cj-wrap"><style>{styles}</style><div style={{ color:'#1E2D4D' }}>Loading…</div></div>;
  }

  if (loadError) {
    return (
      <div className="cj-wrap">
        <style>{styles}</style>
        <div style={{ maxWidth:420, width:'100%', background:'#fff', borderRadius:12, border:'1px solid #E7E2D6', padding:28, textAlign:'center' }}>
          <div style={{ fontSize:22, fontWeight:700, marginBottom:12 }}>
            <span style={{ color:'#A08C5A' }}>E</span><span style={{ color:'#1E2D4D' }}>vid</span><span style={{ color:'#A08C5A' }}>LY</span>
          </div>
          <p style={{ color:'#1E2D4D', fontSize:15 }}>{loadError}</p>
          <button onClick={() => navigate('/login')} className="cj-btn" style={{ marginTop:16, width:'auto', padding:'10px 20px' }}>Go to sign in</button>
        </div>
      </div>
    );
  }

  return (
    <div className="cj-wrap">
      <style>{styles}</style>
      <div className="cj-card">

        <div className="cj-panel">
          <div className="cj-mark"><span style={{ color:'#A08C5A' }}>E</span><span style={{ color:'#FFFFFF' }}>vid</span><span style={{ color:'#A08C5A' }}>LY</span></div>

          <div className="cj-badge">
            <span className="cj-av">AH</span>
            <div style={{ minWidth:0 }}>
              <p style={{ fontSize:14, fontWeight:600, color:'#fff', margin:0, lineHeight:1.25 }}>Arthur Haggerty</p>
              <p style={{ fontSize:11.5, color:'#D9C79E', margin:'1px 0 0', lineHeight:1.3 }}>Founder &amp; CEO, Cleaning Pros Plus</p>
              <p style={{ fontSize:10.5, color:'#8A94AB', margin:'2px 0 0', lineHeight:1.3 }}>An EvidLY-affiliated company</p>
            </div>
          </div>

          <p style={{ fontSize:16.5, fontWeight:500, lineHeight:1.35, margin:'0 0 6px', color:'#fff' }}>Everything's ready for {invite!.business_name}</p>
          <p style={{ fontSize:12.5, color:'#AEB8CC', lineHeight:1.55, margin:'0 0 20px' }}>Your account is set up. Here's what EvidLY keeps for your kitchen.</p>

          <div style={{ display:'flex', flexDirection:'column', gap:15, marginBottom:22 }}>
            <div className="cj-feat">
              <span className="cj-fic"><Flame size={12} /></span>
              <div><p style={{ fontSize:13.5, fontWeight:500, margin:0, color:'#fff' }}>Fire safety</p><p style={{ fontSize:11, color:'#8A94AB', margin:'1px 0 0', lineHeight:1.4 }}>Hood cleaning, fire suppression, sprinkler, alarm, and fire marshal inspection records, and more</p></div>
            </div>
            <div className="cj-feat">
              <span className="cj-fic"><Leaf size={12} /></span>
              <div><p style={{ fontSize:13.5, fontWeight:500, margin:0, color:'#fff' }}>Food safety</p><p style={{ fontSize:11, color:'#8A94AB', margin:'1px 0 0', lineHeight:1.4 }}>Daily temperature readings, HACCP plans, pest control, grease trap, health inspection records, continuous operations monitoring, and more</p></div>
            </div>
            <div className="cj-feat">
              <span className="cj-fic"><Radar size={12} /></span>
              <div><p style={{ fontSize:13.5, fontWeight:500, margin:0, color:'#fff' }}>Intelligence</p><p style={{ fontSize:11, color:'#8A94AB', margin:'1px 0 0', lineHeight:1.4 }}>Identifies what's expiring and what's missing before it costs you</p></div>
            </div>
          </div>

          <div style={{ marginTop:'auto', paddingTop:18, borderTop:'1px solid rgba(255,255,255,0.12)', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            <div><p style={{ fontSize:12, fontWeight:600, color:'#A08C5A', margin:0 }}>Predict</p><p style={{ fontSize:10, color:'#8A94AB', margin:'2px 0 0', lineHeight:1.3 }}>what's expiring</p></div>
            <div><p style={{ fontSize:12, fontWeight:600, color:'#A08C5A', margin:0 }}>Reduce</p><p style={{ fontSize:10, color:'#8A94AB', margin:'2px 0 0', lineHeight:1.3 }}>citation risk</p></div>
            <div><p style={{ fontSize:12, fontWeight:600, color:'#A08C5A', margin:0 }}>Prove</p><p style={{ fontSize:10, color:'#8A94AB', margin:'2px 0 0', lineHeight:1.3 }}>on demand</p></div>
          </div>
        </div>

        <div className="cj-form">
          <p style={{ fontSize:18, fontWeight:600, color:'#1E2D4D', margin:'0 0 3px' }}>Create your account</p>
          <p style={{ fontSize:12.5, color:'#64748b', margin:'0 0 18px' }}>Set a password and confirm your kitchen's details.</p>

          <label className="cj-lbl">Email</label>
          <input value={invite!.email} disabled className="cj-inp" style={{ marginBottom:14 }} />

          <label className="cj-lbl">Create a password</label>
          <div style={{ position:'relative', marginBottom:8 }}>
            <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="cj-inp" style={{ paddingRight:36 }} />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }} aria-label="Toggle password visibility">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'3px 14px', marginBottom:14 }}>
            <Req ok={reqs.len} label="12+ characters" /><Req ok={reqs.upper} label="Uppercase" /><Req ok={reqs.lower} label="Lowercase" /><Req ok={reqs.num} label="Number" /><Req ok={reqs.special} label="Special character" />
          </div>

          <label className="cj-lbl">Confirm password</label>
          <div style={{ position:'relative', marginBottom: confirm && confirm !== password ? 4 : 12 }}>
            <input type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} className="cj-inp" style={{ paddingRight:36 }} />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }} aria-label="Toggle password visibility">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {confirm && confirm !== password && <p style={{ fontSize:12, color:'#dc2626', margin:'0 0 12px' }}>Passwords don't match</p>}

          <label className="cj-lbl">Kitchen address</label>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="1420 Fulton St" className="cj-inp" style={{ marginBottom:12 }} />

          <div style={{ display:'grid', gridTemplateColumns:'1fr 64px 84px', gap:10, marginBottom:20 }}>
            <div><label className="cj-lbl">City</label><input value={city} onChange={e => setCity(e.target.value)} placeholder="Fresno" className="cj-inp" /></div>
            <div><label className="cj-lbl">State</label><input value={stateVal} onChange={e => setStateVal(e.target.value)} placeholder="CA" maxLength={2} className="cj-inp" /></div>
            <div><label className="cj-lbl">ZIP</label><input value={zip} onChange={e => setZip(e.target.value)} placeholder="93721" className="cj-inp" /></div>
          </div>

          <button onClick={handleSubmit} disabled={!canSubmit} className="cj-btn">{submitting ? 'Creating your account…' : 'Create my account'}</button>
          <p style={{ textAlign:'center', fontSize:11.5, color:'#94a3b8', margin:'12px 0 16px' }}>Takes two minutes. Your records are waiting inside.</p>

          <div style={{ borderTop:'1px solid #EEF0F3', paddingTop:14 }}>
            <p style={{ fontSize:11.5, color:'#64748b', textAlign:'center', margin:'0 0 10px' }}>Questions? Talk to Arthur directly.</p>
            <div style={{ display:'flex', gap:10 }}>
              {FOUNDER_PHONE && (
                <a href={`tel:${FOUNDER_PHONE}`} className="cj-contact"><Phone size={15} color="#A08C5A" />{FOUNDER_PHONE}</a>
              )}
              <button onClick={openCalendly} className="cj-contact"><Calendar size={15} color="#A08C5A" />Book a time</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
