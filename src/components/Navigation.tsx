import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import AuthModal from './AuthModal';
import { EvidlyIcon } from './ui/EvidlyIcon';
import { EvidlyLogo } from './ui/EvidlyLogo';

export default function Navigation() {
  const navigate = useNavigate();
  const [authModal, setAuthModal] = useState<'login' | 'signup' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleTryDemo = () => {
    navigate('/demo');
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur-[20px] border-b border-[var(--color-gray-200)]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 sm:gap-3 no-underline">
            <EvidlyIcon size={42} />
            <EvidlyLogo width={160} showTagline={true} />
          </a>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="no-underline text-[var(--color-text-light)] font-medium text-[0.95rem] transition-colors hover:text-[var(--color-blue)]">Features</a>
            <a href="#pricing" className="no-underline text-[var(--color-text-light)] font-medium text-[0.95rem] transition-colors hover:text-[var(--color-blue)]">Pricing</a>
            <a href="mailto:launch@getevidly.com" className="no-underline text-[var(--color-text-light)] font-medium text-[0.95rem] transition-colors hover:text-[var(--color-blue)]">Contact</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={handleTryDemo} className="hidden sm:inline-flex items-center justify-center px-4 py-2.5 rounded-[10px] font-semibold text-[0.85rem] text-[var(--color-gold-dark)] border-2 border-[var(--color-gold)] bg-[var(--color-gold-bg)] transition-all hover:bg-[var(--color-gold)] hover:text-white cursor-pointer">
              Try Demo
            </button>
            <button onClick={() => setAuthModal('login')} className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 rounded-[10px] font-semibold text-[0.95rem] text-[var(--color-blue)] border-2 border-[var(--color-blue)] bg-transparent transition-all hover:bg-[var(--color-blue)] hover:text-white cursor-pointer">
              Sign In
            </button>
            <button onClick={() => setAuthModal('signup')} className="hidden sm:inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[10px] font-semibold text-[0.95rem] bg-[var(--color-blue)] text-white transition-all hover:bg-[var(--color-blue-light)] border-none cursor-pointer">
              Get Started
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-[var(--color-blue)] hover:bg-gray-100 transition-colors border-none bg-transparent cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-[var(--color-gray-200)] bg-white px-4 pb-4">
            <div className="flex flex-col gap-1 py-3">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="no-underline text-[var(--color-text-light)] font-medium text-base min-h-[44px] flex items-center px-3 rounded-lg hover:bg-gray-50 transition-colors">Features</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="no-underline text-[var(--color-text-light)] font-medium text-base min-h-[44px] flex items-center px-3 rounded-lg hover:bg-gray-50 transition-colors">Pricing</a>
              <a href="mailto:launch@getevidly.com" onClick={() => setMobileMenuOpen(false)} className="no-underline text-[var(--color-text-light)] font-medium text-base min-h-[44px] flex items-center px-3 rounded-lg hover:bg-gray-50 transition-colors">Contact</a>
            </div>
            <div className="flex flex-col gap-2 pt-3 border-t border-[var(--color-gray-200)]">
              <button onClick={handleTryDemo} className="w-full min-h-[44px] flex items-center justify-center px-4 py-3 rounded-[10px] font-semibold text-[0.95rem] text-[var(--color-gold-dark)] border-2 border-[var(--color-gold)] bg-[var(--color-gold-bg)] transition-all hover:bg-[var(--color-gold)] hover:text-white cursor-pointer">
                Try Demo
              </button>
              <button onClick={() => { setAuthModal('login'); setMobileMenuOpen(false); }} className="w-full min-h-[44px] flex items-center justify-center px-5 py-3 rounded-[10px] font-semibold text-[0.95rem] text-[var(--color-blue)] border-2 border-[var(--color-blue)] bg-transparent transition-all hover:bg-[var(--color-blue)] hover:text-white cursor-pointer">
                Sign In
              </button>
              <button onClick={() => { setAuthModal('signup'); setMobileMenuOpen(false); }} className="w-full min-h-[44px] flex items-center justify-center gap-2 px-6 py-3 rounded-[10px] font-semibold text-[0.95rem] bg-[var(--color-blue)] text-white transition-all hover:bg-[var(--color-blue-light)] border-none cursor-pointer">
                Get Started
              </button>
            </div>
          </div>
        )}
      </nav>
      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSwitchMode={(m) => setAuthModal(m)}
        />
      )}
    </>
  );
}
