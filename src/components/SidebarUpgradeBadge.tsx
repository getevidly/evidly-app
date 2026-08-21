import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useDemo } from '../contexts/DemoContext';

export function SidebarUpgradeBadge() {
  const { isDemoMode, presenterMode } = useDemo();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  // Show after 60 seconds in demo mode
  useEffect(() => {
    if (!isDemoMode) return;
    const timer = setTimeout(() => setVisible(true), 60000);
    return () => clearTimeout(timer);
  }, [isDemoMode]);

  // Hide in presenter mode — no upgrade prompts during live demos
  if (!isDemoMode || !visible || presenterMode) return null;

  const handleClick = () => {
    navigate('/signup');
  };

  return (
    <div className="mx-3 mb-3 p-3 rounded-xl border border-[#B24A2E]/40 bg-[#B24A2E]/10">
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles className="h-4 w-4 text-[#B24A2E]" />
        <span className="text-sm font-bold text-white">Ready to start?</span>
      </div>
      <p className="text-xs text-[#1E2D4D]/30 mb-2.5">
        Founder Pricing<br />
        <span className="text-[#1E2D4D] font-bold text-sm">$99/month</span>
      </p>
      <button
        onClick={handleClick}
        className="w-full py-2 px-3 rounded-md text-xs font-bold transition-colors hover:brightness-110"
        style={{ backgroundColor: '#B24A2E', color: '#1E2D4D' }}
      >
        Get Founder Pricing
      </button>
      <p className="text-xs text-[#1E2D4D]/30 text-center mt-1.5">Limited time offer</p>
    </div>
  );
}
