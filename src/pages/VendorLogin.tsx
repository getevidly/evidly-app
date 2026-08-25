import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ReCAPTCHA from 'react-google-recaptcha';
import { EvidlyLogo } from '../components/ui/EvidlyLogo';

export function VendorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  useEffect(() => {
    if (user) {
      const userType = user.user_metadata?.user_type;
      if (userType === 'vendor') {
        navigate('/vendor/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  const captchaEnabled = recaptchaKey && recaptchaKey !== '6Le_...your-site-key';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (captchaEnabled && !captchaToken) {
      setError('Please complete the CAPTCHA verification');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const userType = user?.user_metadata?.user_type;

      if (userType === 'vendor') {
        navigate('/vendor/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-8">
          <div className="flex justify-center mb-2">
            <EvidlyLogo onDark={false} showTagline={false} />
          </div>

          <p className="text-center text-lg font-semibold tracking-tight text-[#1E2D4D] mb-2">Answers before you ask.</p>
          <h2 className="text-center text-xl font-bold text-[#1E2D4D] mb-6">Vendor Marketplace - Sign in</h2>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                className="mt-1 block w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-md shadow-sm focus:outline-none focus:ring-[#B24A2E] focus:border-[#B24A2E]"
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
                  className="block w-full px-3 py-2 pr-10 border border-[#1E2D4D]/15 rounded-md shadow-sm focus:outline-none focus:ring-[#B24A2E] focus:border-[#B24A2E]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-[#1E2D4D]/30 hover:text-[#1E2D4D]/70" />
                  ) : (
                    <Eye className="h-5 w-5 text-[#1E2D4D]/30 hover:text-[#1E2D4D]/70" />
                  )}
                </button>
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
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1E2D4D] hover:bg-[#162340] focus-visible:outline-none focus-visible:ring-2 focus:ring-offset-2 focus-visible:ring-[#B24A2E]/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-[#1E2D4D]/70">
              Don't have an account?{' '}
              <Link to="/vendor/register" className="font-medium text-[#1E2D4D] hover:text-[#1E2D4D]">
                Register here
              </Link>
            </p>
            <p className="text-sm text-[#1E2D4D]/70">
              Are you a restaurant?{' '}
              <Link to="/login" className="font-medium text-[#1E2D4D] hover:text-[#1E2D4D]">
                Sign in here →
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-[#1E2D4D]/10">
            <p className="text-xs text-center text-[#1E2D4D]/50">
              Enterprise-grade security • Data encrypted at rest and in transit
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
