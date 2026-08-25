import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { EvidlyLogo } from './ui/EvidlyLogo';

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
    <div className="fixed inset-0 z-[100000] bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-8">
          {/* EvidLY Logo */}
          <div className="flex justify-center mb-2">
            <EvidlyLogo onDark={false} showTagline={false} />
          </div>

          {/* Lock icon and message */}
          <div className="text-center mt-6 mb-6">
            <div className="w-16 h-16 bg-[#1E2D4D]/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-8 h-8 text-[#1E2D4D]" />
            </div>
            <h2 className="text-lg font-bold text-[#1E2D4D]">Session Locked</h2>
            <p className="text-sm text-[#1E2D4D]/50 mt-1">
              Locked due to inactivity
            </p>
            <p className="text-sm font-medium text-[#1E2D4D] mt-2">
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
              className="w-full px-4 py-3 border border-[#1E2D4D]/15 rounded-xl text-base focus-visible:outline-none focus-visible:ring-2 focus:ring-[#B24A2E] focus:border-[#B24A2E]"
            />
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full mt-3 py-3 bg-[#1E2D4D] text-white font-semibold rounded-lg hover:bg-[#162340] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98]"
            >
              {loading ? 'Verifying...' : 'Unlock'}
            </button>
          </form>

          {/* Switch user link */}
          <div className="mt-6 text-center">
            <button
              onClick={onSwitchUser}
              className="inline-flex items-center gap-1.5 text-sm text-[#1E2D4D]/50 hover:text-[#1E2D4D] transition-colors bg-transparent border-none cursor-pointer"
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
