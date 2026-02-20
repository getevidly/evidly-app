import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface MobileStickyBarProps {
  /** When true, uses demo-mode behavior (delayed show). When false, uses scroll-based behavior. */
  demoMode?: boolean;
}

export default function MobileStickyBar({ demoMode = false }: MobileStickyBarProps) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (demoMode) {
      // In demo mode inside the app: show after 30 seconds
      const timer = setTimeout(() => setVisible(true), 30000);
      return () => clearTimeout(timer);
    } else {
      // On landing page: show after scrolling past 600px
      const handleScroll = () => setVisible(window.scrollY > 600);
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [demoMode]);

  if (!visible) return null;

  const handleClick = () => {
    navigate('/signup');
  };

  if (demoMode) {
    // Demo mode: gold bar above the mobile tab bar
    return (
      <div
        className="fixed bottom-16 left-0 right-0 z-30 md:hidden flex items-center justify-center px-4"
        style={{ backgroundColor: '#C49A2B', height: '52px' }}
      >
        <button
          onClick={handleClick}
          className="w-full max-w-sm py-2.5 rounded-lg font-bold text-sm transition-colors hover:bg-gray-100"
          style={{ backgroundColor: 'white', color: '#1e4d6b' }}
        >
          Start Free Trial — $99/mo
        </button>
      </div>
    );
  }

  // Landing page: bottom sticky bar
  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-[999] bg-white/95 backdrop-blur-[10px] border-t border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
      <div className="text-sm font-semibold text-[#1e4d6b] truncate">
        $99/mo — Founder pricing
      </div>
      <button
        onClick={handleClick}
        className="flex-shrink-0 min-h-[44px] px-6 py-2.5 bg-[#1e4d6b] text-white font-bold rounded-[10px] border-none cursor-pointer text-sm whitespace-nowrap hover:bg-[#2a6a8f] transition-colors"
      >
        Get Started
      </button>
    </div>
  );
}
