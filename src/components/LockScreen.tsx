import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, LogOut } from 'lucide-react';
import { toast } from 'sonner';

const MAX_ATTEMPTS = 5;

interface LockScreenProps {
  userEmail: string;
  userName: string;
  onUnlock: () => void;
  onSwitchUser: () => void;
  onMaxAttempts: () => void;
}

export function LockScreen({ userEmail, userName, onUnlock, onSwitchUser, onMaxAttempts }: LockScreenProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    });

    if (error) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPassword('');

      if (newAttempts >= MAX_ATTEMPTS) {
        onMaxAttempts();
        return;
      }

      setError(`Incorrect password (${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''} remaining)`);
      toast.error('Incorrect password');
    } else {
      onUnlock();
    }
    setLoading(false);
  };

  const displayName = userName || userEmail.split('@')[0];

  return (
    <div className="fixed inset-0 z-[100000] bg-[#faf8f3] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          {/* EvidLY Logo */}
          <div className="flex justify-center mb-2">
            <div className="flex items-center">
              <div className="w-12 h-14">
                <svg viewBox="0 0 56 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <path d="M28 0L56 10V28C56 47.33 44.12 58.17 28 65C11.88 58.17 0 47.33 0 28V10L28 0Z" fill="#d4af37"/>
                  <path d="M28 6L50 14V28C50 43.5 40.5 52.5 28 58C15.5 52.5 6 43.5 6 28V14L28 6Z" fill="#1e4d6b"/>
                  <path d="M22 32L26 36L34 26" stroke="#d4af37" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="ml-3 text-2xl font-bold">
                <span className="text-[#1e4d6b]">Evid</span>
                <span className="text-[#d4af37]">LY</span>
              </span>
            </div>
          </div>

          {/* Lock icon and message */}
          <div className="text-center mt-6 mb-6">
            <div className="w-16 h-16 bg-[#1e4d6b]/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-8 h-8 text-[#1e4d6b]" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Session Locked</h2>
            <p className="text-sm text-gray-500 mt-1">
              Locked due to inactivity
            </p>
            <p className="text-sm font-medium text-[#1e4d6b] mt-2">
              {displayName}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm text-center">
              {error}
            </div>
          )}

          {/* Password form */}
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoFocus
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37]"
            />
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full mt-3 py-3 bg-[#1e4d6b] text-white font-semibold rounded-lg hover:bg-[#2a6a8f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verifying...' : 'Unlock'}
            </button>
          </form>

          {/* Switch user link */}
          <div className="mt-6 text-center">
            <button
              onClick={onSwitchUser}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e4d6b] transition-colors bg-transparent border-none cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Switch User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
