import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Eye, EyeOff, Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';

interface AuthModalProps {
  mode: 'login' | 'signup';
  onClose: () => void;
  onSwitchMode: (mode: 'login' | 'signup') => void;
}

export default function AuthModal({ mode, onClose, onSwitchMode }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const { enterDemo } = useDemo();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: authError } = await signIn(email, password);
      if (authError) { setError(authError.message); }
      else { onClose(); navigate('/dashboard'); }
    } catch (err: any) { setError(err.message || 'Sign in failed'); }
    finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
Set-Content -Path src\components\AuthModal.tsx -Value @'
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Eye, EyeOff, Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';

interface AuthModalProps {
  mode: 'login' | 'signup';
  onClose: () => void;
  onSwitchMode: (mode: 'login' | 'signup') => void;
}

export default function AuthModal({ mode, onClose, onSwitchMode }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const { enterDemo } = useDemo();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: authError } = await signIn(email, password);
      if (authError) { setError(authError.message); }
      else { onClose(); navigate('/dashboard'); }
    } catch (err: any) { setError(err.message || 'Sign in failed'); }
    finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const { error: authError } = await signUp(email, password, { full_name: fullName, org_name: orgName });
      if (authError) { setError(authError.message); }
      else { setSuccess(true); }
    } catch (err: any) { setError(err.message || 'Sign up failed'); }
    finally { setLoading(false); }
  };

  const handleTryDemo = () => { onClose(); enterDemo(); navigate('/dashboard'); };
  const handleBackdrop = (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div onClick={handleBackdrop} style={{ position:'fixed',inset:'0',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px',backgroundColor:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)' }}>
      <div style={{ position:'relative',width:'100%',maxWidth:'420px',background:'white',borderRadius:'16px',boxShadow:'0 25px 50px rgba(0,0,0,0.25)',overflow:'hidden' }}>
        <button onClick={onClose} style={{ position:'absolute',top:'16px',right:'16px',background:'none',border:'none',cursor:'pointer',padding:'6px',borderRadius:'50%' }}>
          <X size={20} color="#9ca3af" />
        </button>
        <div style={{ padding:'32px 32px 16px',textAlign:'center' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',marginBottom:'16px' }}>
            <svg viewBox="0 0 56 65" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width:'32px',height:'36px' }}>
              <path d="M28 0L56 10V28C56 47.33 44.12 58.17 28 65C11.88 58.17 0 47.33 0 28V10L28 0Z" fill="#d4af37"/>
              <path d="M28 6L50 14V28C50 43.5 40.5 52.5 28 58C15.5 52.5 6 43.5 6 28V14L28 6Z" fill="#1e4d6b"/>
              <path d="M22 32L26 36L34 26" stroke="#d4af37" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontWeight:'bold',fontSize:'20px' }}>
              <span style={{ color:'#d4af37' }}>Evid</span><span style={{ color:'#1b4965' }}>LY</span>
            </span>
          </div>
          <h2 style={{ fontSize:'24px',fontWeight:'bold',color:'#111',margin:'0' }}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p style={{ fontSize:'14px',color:'#6b7280',marginTop:'4px' }}>{mode === 'login' ? 'Sign in to your compliance dashboard' : 'Start your free trial'}</p>
        </div>
        {success && mode === 'signup' ? (
          <div style={{ padding:'0 32px 32px' }}>
            <div style={{ background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'12px',padding:'24px',textAlign:'center' }}>
              <div style={{ fontSize:'28px',marginBottom:'12px' }}>Check your email</div>
              <p style={{ fontSize:'14px',color:'#15803d' }}>We sent a confirmation link to <strong>{email}</strong>.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={mode === 'login' ? handleLogin : handleSignup} style={{ padding:'0 32px 24px' }}>
            {error && <div style={{ marginBottom:'16px',padding:'12px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',fontSize:'14px',color:'#b91c1c' }}>{error}</div>}
            {mode === 'signup' && (<>
              <div style={{ marginBottom:'16px' }}>
                <label style={{ display:'block',fontSize:'14px',fontWeight:'500',color:'#374151',marginBottom:'6px' }}>Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Smith" required style={{ width:'100%',padding:'12px 16px',border:'1px solid #d1d5db',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box' }} />
              </div>
              <div style={{ marginBottom:'16px' }}>
                <label style={{ display:'block',fontSize:'14px',fontWeight:'500',color:'#374151',marginBottom:'6px' }}>Organization</label>
                <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Pacific Coast Dining" required style={{ width:'100%',padding:'12px 16px',border:'1px solid #d1d5db',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box' }} />
              </div>
            </>)}
            <div style={{ marginBottom:'16px' }}>
              <label style={{ display:'block',fontSize:'14px',fontWeight:'500',color:'#374151',marginBottom:'6px' }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required style={{ width:'100%',padding:'12px 16px',border:'1px solid #d1d5db',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box' }} />
            </div>
            <div style={{ marginBottom:'16px' }}>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'6px' }}>
                <label style={{ fontSize:'14px',fontWeight:'500',color:'#374151' }}>Password</label>
                {mode === 'login' && <a href="/forgot-password" onClick={() => onClose()} style={{ fontSize:'12px',color:'#1b4965',textDecoration:'none' }}>Forgot password?</a>}
              </div>
              <div style={{ position:'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width:'100%',padding:'12px 16px',border:'1px solid #d1d5db',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box',paddingRight:'48px' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer' }}>
                  {showPassword ? <EyeOff size={20} color="#9ca3af" /> : <Eye size={20} color="#9ca3af" />}
                </button>
              </div>
            </div>
            {mode === 'signup' && (
              <div style={{ marginBottom:'16px' }}>
                <label style={{ display:'block',fontSize:'14px',fontWeight:'500',color:'#374151',marginBottom:'6px' }}>Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={{ width:'100%',padding:'12px 16px',border:'1px solid #d1d5db',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box' }} />
              </div>
            )}
            <button type="submit" disabled={loading} style={{ width:'100%',padding:'12px',marginTop:'8px',fontWeight:'600',color:'white',background:'#1b4965',border:'none',borderRadius:'8px',fontSize:'14px',cursor:'pointer' }}>
              {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
            <p style={{ fontSize:'14px',textAlign:'center',color:'#6b7280',marginTop:'16px' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button type="button" onClick={() => onSwitchMode(mode === 'login' ? 'signup' : 'login')} style={{ background:'none',border:'none',color:'#1b4965',fontWeight:'600',cursor:'pointer',fontSize:'14px' }}>
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
            <div style={{ marginTop:'20px',paddingTop:'20px',borderTop:'1px solid #e5e7eb' }}>
              <button type="button" onClick={handleTryDemo} style={{ width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',padding:'12px',fontSize:'14px',fontWeight:'600',color:'#1e4d6b',background:'rgba(212,175,55,0.1)',border:'2px solid rgba(212,175,55,0.3)',borderRadius:'8px',cursor:'pointer' }}>
                <Play size={16} /> Try Interactive Demo
              </button>
              <p style={{ fontSize:'12px',textAlign:'center',color:'#9ca3af',marginTop:'8px' }}>No account needed</p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
