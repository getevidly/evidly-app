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
        <div className="bg-white rounded-lg shadow-lg p-8">
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

          {sent ? (
            <div className="text-center py-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Check Your Email</h2>
              <p className="text-gray-600 mb-6">
                We've sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Didn't receive it? Check your spam folder or try again in a few minutes.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="text-sm font-medium text-[#1e4d6b] hover:text-[#1e4d6b]"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-center text-xl font-bold text-gray-900 mb-2 mt-4">Reset Your Password</h2>
              <p className="text-center text-sm text-gray-600 mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#d4af37] focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1e4d6b] hover:bg-[#2a6a8f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e4d6b] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="flex items-center justify-center text-sm font-medium text-[#1e4d6b] hover:text-[#1e4d6b]">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
