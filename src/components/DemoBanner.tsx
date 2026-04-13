import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useDemo } from '../contexts/DemoContext';

export function DemoBanner() {
  const { isDemoMode, isAuthenticatedDemo, presenterMode, demoExpiresAt } = useDemo();
  const navigate = useNavigate();

  // Hide in presenter mode — clean presentation without upgrade prompts
  if (presenterMode) return null;

  // Anonymous demo: original behavior
  if (isDemoMode) {
    return (
      <div
        className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 py-2 text-sm font-medium"
        style={{ backgroundColor: '#C49A2B', color: '#1a1a1a', minHeight: '36px' }}
      >
        <span className="hidden sm:inline">You're viewing sample data to preview the interface. Sign in to access your actual data.</span>
        <span className="sm:hidden text-xs font-semibold">Demo Mode</span>
        <button
          onClick={() => navigate('/signup')}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs sm:text-sm font-bold transition-colors hover:bg-[#1E2D4D]/5"
          style={{ backgroundColor: 'white', color: '#1E2D4D' }}
        >
          Start Free Trial
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // Authenticated demo: show days remaining
  if (isAuthenticatedDemo) {
    const daysLeft = demoExpiresAt
      ? Math.max(0, Math.ceil((demoExpiresAt.getTime() - Date.now()) / 86400000))
      : null;

    return (
      <div
        className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 py-2 text-sm font-medium"
        style={{ backgroundColor: '#fef3c7', color: '#92400e', minHeight: '36px' }}
      >
        <span className="hidden sm:inline">
          You're on a {daysLeft !== null ? `${daysLeft}-day` : ''} demo trial. Your profile data is real and will carry over when you upgrade.
        </span>
        <span className="sm:hidden text-xs font-semibold">Demo Trial</span>
        <button
          onClick={() => navigate('/pricing')}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs sm:text-sm font-bold transition-colors hover:bg-[#1E2D4D]/5"
          style={{ backgroundColor: 'white', color: '#1E2D4D' }}
        >
          Upgrade to Full Account
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return null;
}
