import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Check, X, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [sessionStatus, setSessionStatus] = useState<'checking' | 'valid' | 'expired'>('checking');
  const navigate = useNavigate();
  const resolvedRef = useRef(false);

  const passwordRequirements = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && !resolvedRef.current) {
        resolvedRef.current = true;
        setSessionStatus('valid');
      }
    });

    // Give Supabase time to process URL hash tokens, then check session
    const timer = setTimeout(async () => {
      if (resolvedRef.current) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!resolvedRef.current) {
        resolvedRef.current = true;
        setSessionStatus(session ? 'valid' : 'expired');
      }
    }, 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allRequirementsMet) {
      setError('Please meet all password requirements');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      if (error.message.toLowerCase().includes('session') || error.message.toLowerCase().includes('not authenticated') || error.message.toLowerCase().includes('jwt')) {
        setError('Your reset link has expired. Please request a new one.');
        setSessionStatus('expired');
      } else {
        setError(error.message);
      }
    } else {
      setSuccess(true);
      // Sign out recovery session so user logs in fresh with new password
      await supabase.auth.signOut();
      setTimeout(() => navigate('/login'), 3000);
    }
    setLoading(false);
  };

  // Loading state while Supabase processes the recovery token
  if (sessionStatus === 'checking') {
    return (
      <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <Loader2 className="h-12 w-12 text-[#1e4d6b] mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Verifying your reset link...</p>
        </div>
      </div>
    );
  }

  // Expired or invalid link
  if (sessionStatus === 'expired' && !error) {
    return (
      <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center">
              <div className="w-12 h-14">
                <svg viewBox="0 0 56 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <path d="M28 0L56 10V28C56 47.33 44.12 58.17 28 65C11.88 58.17 0 47.33 0 28V10L28 0Z" fill="#d4af37"/>
                  <path d="M28 6L50 14V28C50 43.5 40.5 52.5 28 58C15.5 52.5 6 43.5 6 28V14L28 6Z" fill="#1e4d6b"/>
                  <path d="M22 32L26 36L34 26" stroke="#d4af37" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="ml-3 text-3xl font-bold">
                <span className="text-[#1e4d6b]">Evid</span>
                <span className="text-[#d4af37]">LY</span>
              </span>
            </div>
          </div>
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Reset Link Expired</h2>
          <p className="text-gray-600 mb-6">
            This password reset link has expired or is invalid. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block px-6 py-3 bg-[#1e4d6b] text-white rounded-md font-medium hover:bg-[#2a6a8f] transition-colors no-underline"
          >
            Request New Link
          </Link>
          <div className="mt-4">
            <Link to="/login" className="text-sm font-medium text-[#1e4d6b] hover:text-[#2a6a8f]">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center">
              <div className="w-12 h-14">
                <svg viewBox="0 0 56 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <path d="M28 0L56 10V28C56 47.33 44.12 58.17 28 65C11.88 58.17 0 47.33 0 28V10L28 0Z" fill="#d4af37"/>
                  <path d="M28 6L50 14V28C50 43.5 40.5 52.5 28 58C15.5 52.5 6 43.5 6 28V14L28 6Z" fill="#1e4d6b"/>
                  <path d="M22 32L26 36L34 26" stroke="#d4af37" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="ml-3 text-3xl font-bold">
                <span className="text-[#1e4d6b]">Evid</span>
                <span className="text-[#d4af37]">LY</span>
              </span>
            </div>
          </div>
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Password Updated!</h2>
          <p className="text-gray-600">Your password has been changed successfully. Redirecting you to sign in...</p>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex justify-center mb-2">
            <div className="flex items-center">
              <div className="w-12 h-14">
                <svg viewBox="0 0 56 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <path d="M28 0L56 10V28C56 47.33 44.12 58.17 28 65C11.88 58.17 0 47.33 0 28V10L28 0Z" fill="#d4af37"/>
                  <path d="M28 6L50 14V28C50 43.5 40.5 52.5 28 58C15.5 52.5 6 43.5 6 28V14L28 6Z" fill="#1e4d6b"/>
                  <path d="M22 32L26 36L34 26" stroke="#d4af37" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="ml-3 text-3xl font-bold">
                <span className="text-[#1e4d6b]">Evid</span>
                <span className="text-[#d4af37]">LY</span>
              </span>
            </div>
          </div>
          <h2 className="text-center text-xl font-bold text-gray-900 mb-2 mt-4">Set New Password</h2>
          <p className="text-center text-sm text-gray-600 mb-6">
            Choose a strong password for your account.
          </p>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
              {sessionStatus === 'expired' && (
                <div className="mt-2">
                  <Link to="/forgot-password" className="font-medium text-red-700 underline hover:text-red-800">
                    Request a new reset link
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700">New Password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#d4af37] focus:border-[#d4af37]"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {Object.entries(passwordRequirements).map(([key, met]) => (
                  <div key={key} className={`flex items-center text-xs ${met ? 'text-green-600' : 'text-gray-500'}`}>
                    {met ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                    {key === 'minLength' && 'Minimum 8 characters'}
                    {key === 'hasUpper' && 'At least one uppercase letter'}
                    {key === 'hasLower' && 'At least one lowercase letter'}
                    {key === 'hasNumber' && 'At least one number'}
                    {key === 'hasSpecial' && 'At least one special character'}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#d4af37] focus:border-[#d4af37]"
              />
              {confirmPassword && (
                <div className={`mt-1 flex items-center text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordsMatch ? <><Check className="h-3 w-3 mr-1" />Passwords match</> : <><X className="h-3 w-3 mr-1" />Passwords do not match</>}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !allRequirementsMet || !passwordsMatch}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1e4d6b] hover:bg-[#2a6a8f] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
