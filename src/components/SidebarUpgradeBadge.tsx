import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useDemo } from '../contexts/DemoContext';

export function SidebarUpgradeBadge() {
  const { isDemoMode } = useDemo();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  // Show after 60 seconds in demo mode
  useEffect(() => {
    if (!isDemoMode) return;
    const timer = setTimeout(() => setVisible(true), 60000);
    return () => clearTimeout(timer);
  }, [isDemoMode]);

  if (!isDemoMode || !visible) return null;

  const handleClick = () => {
    console.log('[CTA] Upgrade clicked from: sidebar-badge');
    navigate('/signup');
  };

  return (
    <div className="mx-3 mb-3 p-3 rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10">
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles className="h-4 w-4 text-[#d4af37]" />
        <span className="text-sm font-bold text-white">Ready to start?</span>
      </div>
      <p className="text-xs text-gray-300 mb-2.5">
        Founder Pricing<br />
        <span className="text-[#d4af37] font-bold text-sm">$99/month</span>
      </p>
      <button
        onClick={handleClick}
        className="w-full py-2 px-3 rounded-md text-xs font-bold transition-colors hover:brightness-110"
        style={{ backgroundColor: '#d4af37', color: '#1e4d6b' }}
      >
        Start Free Trial
      </button>
      <p className="text-[10px] text-gray-400 text-center mt-1.5">Limited time offer</p>
    </div>
  );
}
