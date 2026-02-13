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
    <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="flex justify-center mb-4">
          <span className="text-3xl font-bold">
            <span className="text-[#1e4d6b]">Evid</span>
            <span className="text-[#d4af37]">LY</span>
          </span>
        </div>

        {status === 'verifying' && (
          <>
            <Loader className="h-12 w-12 text-[#1e4d6b] animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying your email...</h2>
            <p className="text-gray-600">Just a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Email Confirmed!</h2>
            <p className="text-gray-600">Redirecting you to finish setup...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Issue</h2>
            <p className="text-gray-600 mb-4">
              The link may have expired. Please try signing in — if your email was already confirmed, you'll be able to log in normally.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2 bg-[#1e4d6b] text-white rounded-md hover:bg-[#2a6a8f]"
            >
              Go to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
}
