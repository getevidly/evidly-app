import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../contexts/DemoContext';
import { Menu, X } from 'lucide-react';
import AuthModal from './AuthModal';

export default function Navigation() {
  const navigate = useNavigate();
  const { enterDemo } = useDemo();
  const [authModal, setAuthModal] = useState<'login' | 'signup' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleTryDemo = () => {
    enterDemo();
    navigate('/dashboard');
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur-[20px] border-b border-[var(--color-gray-200)]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 sm:gap-3 no-underline">
            <div className="w-9 h-[42px] sm:w-11 sm:h-[50px] relative">
              <svg viewBox="0 0 56 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M28 0L56 10V28C56 47.33 44.12 58.17 28 65C11.88 58.17 0 47.33 0 28V10L28 0Z" fill="#d4af37"/>
                <path d="M28 6L50 14V28C50 43.5 40.5 52.5 28 58C15.5 52.5 6 43.5 6 28V14L28 6Z" fill="#1e4d6b"/>
                <path d="M22 32L26 36L34 26" stroke="#d4af37" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-['Outfit'] text-[1.5rem] sm:text-[1.75rem] font-bold tracking-tight">
              <span className="text-[var(--color-gold)]">Evid</span>
              <span className="text-[var(--color-blue)]">LY</span>
            </span>
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
