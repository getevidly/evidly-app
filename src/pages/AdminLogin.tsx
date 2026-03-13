import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Admin Login | EvidLY';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const user = data.user;
    const isAdmin = user?.email?.endsWith('@getevidly.com') || user?.user_metadata?.user_type === 'platform_admin';

    if (!isAdmin) {
      setError('Admin access required');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    navigate('/admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#0B1628' }}>
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center">
              <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" width="56" height="56">
                <rect width="48" height="48" rx="10.5" fill="#1E2D4D"/>
                <circle cx="24" cy="24" r="3" fill="white"/>
                <circle cx="24" cy="13" r="3" fill="#A08C5A"/>
                <circle cx="34.5" cy="19" r="3" fill="#A08C5A"/>
                <circle cx="30.5" cy="31" r="3" fill="#A08C5A"/>
                <circle cx="17.5" cy="31" r="3" fill="#A08C5A"/>
                <circle cx="13.5" cy="19" r="3" fill="#A08C5A"/>
              </svg>
              <span className="ml-3 text-3xl font-bold">
                <span style={{ color: '#A08C5A' }}>E</span>
                <span style={{ color: '#1E2D4D' }}>vid</span>
                <span style={{ color: '#A08C5A' }}>LY</span>
              </span>
            </div>
            <div style={{ fontSize: '10px', letterSpacing: '0.15em', color: '#A08C5A', fontWeight: 600, marginTop: '4px' }}>
              LEAD WITH CONFIDENCE
            </div>
            <span className="mt-3 inline-block px-3 py-1 text-xs font-semibold rounded-full" style={{ backgroundColor: '#d4af37', color: '#1E2D4D' }}>
              Admin Access
            </span>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#1E2D4D] focus:border-[#1E2D4D]"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#1E2D4D] focus:border-[#1E2D4D]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E2D4D]"
              style={{ backgroundColor: '#1E2D4D' }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
