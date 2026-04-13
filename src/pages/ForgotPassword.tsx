import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      // Sanitize error messages for user-friendliness
      if (error.message.toLowerCase().includes('rate') || error.message.toLowerCase().includes('limit')) {
        setError('Too many requests. Please wait a few minutes before trying again.');
      } else if (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('fetch')) {
        setError('Unable to connect. Please check your internet connection and try again.');
      } else {
        setError(error.message);
      }
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-8">
          <div className="flex justify-center mb-2">
            <div className="flex items-center">
              <div className="w-12 h-14">
                <svg viewBox="0 0 56 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <path d="M28 0L56 10V28C56 47.33 44.12 58.17 28 65C11.88 58.17 0 47.33 0 28V10L28 0Z" fill="#A08C5A"/>
                  <path d="M28 6L50 14V28C50 43.5 40.5 52.5 28 58C15.5 52.5 6 43.5 6 28V14L28 6Z" fill="#1E2D4D"/>
                  <path d="M22 32L26 36L34 26" stroke="#A08C5A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="ml-3 text-3xl font-bold tracking-tight">
                <span className="text-[#1E2D4D]">Evid</span>
                <span className="text-[#A08C5A]">LY</span>
              </span>
            </div>
          </div>

          {sent ? (
            <div className="text-center py-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-[#1E2D4D] mb-2">Check Your Email</h2>
              <p className="text-[#1E2D4D]/70 mb-6">
                We've sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.
              </p>
              <p className="text-sm text-[#1E2D4D]/50 mb-6">
                Didn't receive it? Check your spam folder or try again in a few minutes.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="text-sm font-medium text-[#1E2D4D] hover:text-[#1E2D4D]"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-center text-xl font-bold text-[#1E2D4D] mb-2 mt-4">Reset Your Password</h2>
              <p className="text-center text-sm text-[#1E2D4D]/70 mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#1E2D4D]/80">
                    Email address
                  </label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#1E2D4D]/30" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="block w-full pl-10 pr-3 py-2 border border-[#1E2D4D]/15 rounded-md shadow-sm focus:outline-none focus:ring-[#A08C5A] focus:border-[#A08C5A]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1E2D4D] hover:bg-[#162340] focus-visible:outline-none focus-visible:ring-2 focus:ring-offset-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="flex items-center justify-center text-sm font-medium text-[#1E2D4D] hover:text-[#1E2D4D]">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
