import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useDemo } from '../contexts/DemoContext';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

interface Props {
  mode: 'login' | 'signup';
}

export function SocialLoginButtons({ mode }: Props) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const { isDemoMode } = useDemo();

  const label = mode === 'login' ? 'Continue' : 'Sign up';

  const handleGoogleAuth = async () => {
    if (isDemoMode) {
      toast.info('Social login available after signup. Try the demo first!');
      return;
    }
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) {
        toast.error('Google sign-in failed. Please try again.');
        setGoogleLoading(false);
      }
    } catch {
      toast.error('Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-3 mb-6">
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-[#1E2D4D]/15 rounded-xl bg-white text-[#1E2D4D]/90 font-medium text-sm hover:bg-[#FAF7F0] focus-visible:outline-none focus-visible:ring-2 focus:ring-offset-2 focus:ring-[#A08C5A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {googleLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-[#1E2D4D]/50" />
        ) : (
          <GoogleIcon />
        )}
        {label} with Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-2">
        <div className="flex-1 h-px bg-[#1E2D4D]/8" />
        <span className="text-sm text-[#1E2D4D]/50">or</span>
        <div className="flex-1 h-px bg-[#1E2D4D]/8" />
      </div>
    </div>
  );
}
