import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useDemo } from '../contexts/DemoContext';

export function DemoBanner() {
  const { isDemoMode, presenterMode } = useDemo();
  const navigate = useNavigate();

  // Hide in presenter mode — clean presentation without upgrade prompts
  if (!isDemoMode || presenterMode) return null;

  const handleClick = () => {
    navigate('/signup');
  };

  return (
    <div
      className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 py-2 text-sm font-medium"
      style={{ backgroundColor: '#C49A2B', color: '#1a1a1a', minHeight: '36px' }}
    >
      <span className="hidden sm:inline">You're exploring EvidLY in demo mode.</span>
      <span className="sm:hidden text-xs font-semibold">Demo Mode</span>
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs sm:text-sm font-bold transition-colors hover:bg-gray-100"
        style={{ backgroundColor: 'white', color: '#1e4d6b' }}
      >
        Start Free Trial
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
