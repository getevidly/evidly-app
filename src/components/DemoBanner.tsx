import { useNavigate } from 'react-router-dom';
import { useDemo } from '../contexts/DemoContext';
import { Sparkles, X } from 'lucide-react';

export function DemoBanner() {
  const { isDemoMode, exitDemo } = useDemo();
  const navigate = useNavigate();

  if (!isDemoMode) return null;

  const handleSignUp = () => {
    exitDemo();
    navigate('/signup');
  };

  return (
    <div className="bg-gradient-to-r from-[#1e4d6b] to-[#2a6a8f] text-white px-4 py-2.5 flex items-center justify-center gap-3 text-sm relative z-50">
      <Sparkles className="h-4 w-4 text-[#d4af37] flex-shrink-0" />
      <span className="text-center">
        You're exploring the <strong>EvidLY demo</strong> — 
        <button
          onClick={handleSignUp}
          className="ml-1 underline font-semibold hover:text-[#d4af37] transition-colors"
        >
          Sign up free
        </button>
        {' '}to start your own compliance dashboard
      </span>
      <button
        onClick={() => { exitDemo(); navigate('/'); }}
        className="absolute right-3 p-1 hover:bg-white/20 rounded transition-colors"
        title="Exit demo"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
