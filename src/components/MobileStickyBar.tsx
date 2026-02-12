import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MobileStickyBar() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-[999] bg-white/95 backdrop-blur-[10px] border-t border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
      <div className="text-sm font-semibold text-[var(--color-blue)] truncate">
        $99/mo — Founder pricing
      </div>
      <button
        onClick={() => navigate('/signup')}
        className="flex-shrink-0 min-h-[44px] px-6 py-2.5 bg-[var(--color-blue)] text-white font-bold rounded-[10px] border-none cursor-pointer text-sm whitespace-nowrap hover:bg-[#2a6a8f] transition-colors"
      >
        Get Started
      </button>
    </div>
  );
}
