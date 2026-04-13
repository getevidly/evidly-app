import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, Loader } from 'lucide-react';

export function EmailConfirmed() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase handles token exchange from the confirmation URL automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setStatus('success');
        setTimeout(() => navigate('/signup/locations'), 2000);
      }
    });

    // Fallback: if already signed in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatus('success');
        setTimeout(() => navigate('/signup/locations'), 2000);
      }
    });

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      if (status === 'verifying') setStatus('error');
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-[#1E2D4D]/10 p-8 text-center">
        <div className="flex justify-center mb-4">
          <span className="text-3xl font-bold tracking-tight">
            <span className="text-[#1E2D4D]">Evid</span>
            <span className="text-[#A08C5A]">LY</span>
          </span>
        </div>

        {status === 'verifying' && (
          <>
            <Loader className="h-12 w-12 text-[#1E2D4D] animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#1E2D4D] mb-2">Verifying your email...</h2>
            <p className="text-[#1E2D4D]/70">Just a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#1E2D4D] mb-2">Email Confirmed!</h2>
            <p className="text-[#1E2D4D]/70">Redirecting you to finish setup...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h2 className="text-xl font-bold text-[#1E2D4D] mb-2">Verification Issue</h2>
            <p className="text-[#1E2D4D]/70 mb-4">
              The link may have expired. Please try signing in — if your email was already confirmed, you'll be able to log in normally.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2 bg-[#1E2D4D] text-white rounded-md hover:bg-[#162340]"
            >
              Go to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
}
