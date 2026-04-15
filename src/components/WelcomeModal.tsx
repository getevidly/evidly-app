import { useState, useEffect } from 'react';
import { Mail, Phone, X } from 'lucide-react';
import { FOUNDER } from '../lib/founderConfig';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { supabase } from '../lib/supabase';
import { WELCOME_SUBTEXT } from '../config/emotionalCopy';

interface WelcomeModalProps {
  firstName: string;
  onDismiss: () => void;
}

export function WelcomeModal({ firstName, onDismiss }: WelcomeModalProps) {
  const [visible, setVisible] = useState(false);
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const { userRole } = useRole();
  const roleSubtext = WELCOME_SUBTEXT[userRole] || WELCOME_SUBTEXT.owner_operator;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleGetStarted = async () => {
    setVisible(false);
    localStorage.setItem('evidly_welcome_seen', 'true');

    if (!isDemoMode && profile?.id) {
      await supabase
        .from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('id', profile.id);
    }

    setTimeout(onDismiss, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div data-testid="welcome-modal" className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto modal-content-enter">
        <button
          onClick={handleGetStarted}
          className="absolute top-4 right-4 p-1 text-[#1E2D4D]/30 hover:text-[#1E2D4D]/70 transition-colors z-10"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header with logo */}
        <div className="text-center pt-8 pb-4 px-6 sm:px-10">
          <div className="w-16 h-[74px] mx-auto mb-4">
            <svg viewBox="0 0 56 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M28 0L56 10V28C56 47.33 44.12 58.17 28 65C11.88 58.17 0 47.33 0 28V10L28 0Z" fill="#A08C5A"/>
              <path d="M28 6L50 14V28C50 43.5 40.5 52.5 28 58C15.5 52.5 6 43.5 6 28V14L28 6Z" fill="#1E2D4D"/>
              <path d="M22 32L26 36L34 26" stroke="#A08C5A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-2xl sm:text-[28px] font-bold text-[#1E2D4D] leading-tight">
            Your kitchen. Your standards.<br />Always protected.
          </h2>
          <p className="text-sm text-[#1E2D4D]/70 mt-2 leading-relaxed">
            {roleSubtext}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 sm:px-10 pb-6 text-sm leading-relaxed text-[#1E2D4D]/80">
          <p className="mb-4">
            I'm {FOUNDER.name}, the founder of EvidLY. I built EvidLY because I've spent 3 years
            servicing over 90 commercial kitchens and saw the same problem everywhere: compliance runs on
            paper, spreadsheets, and hope.
          </p>
          <p className="mb-5 font-medium text-[#1E2D4D]">Not anymore.</p>
          <p className="mb-6">
            EvidLY gives you one place to manage fire safety, food safety, and vendor compliance — with
            real-time scoring, photo evidence, and reports you can hand to any inspector in 10 seconds.
          </p>

          {/* Quick-start steps */}
          <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
            <h3 className="text-sm font-bold text-[#1E2D4D] uppercase tracking-wider mb-3">
              Here's how to get started:
            </h3>
            <div className="space-y-2.5">
              {[
                'Add your equipment (coolers, hoods, fryers)',
                'Upload your existing compliance documents',
                'Start logging daily temperatures',
                'Complete your first daily checklist',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1E2D4D] text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-[#1E2D4D]/80">{step}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-[#1E2D4D]/70 mt-3">
              You'll see your compliance score climb in real time.
            </p>
          </div>

          {/* Founder's contact */}
          <p className="mb-3 text-sm">
            If you need anything — and I mean anything — reach out directly:
          </p>
          <div className="flex flex-wrap gap-4 mb-5">
            <a href={`mailto:${FOUNDER.email}`} className="flex items-center gap-2 text-sm text-[#1E2D4D] hover:text-[#2A3F6B] transition-colors">
              <Mail className="w-4 h-4" />
              {FOUNDER.email}
            </a>
            <a href={`tel:${FOUNDER.phone.replace(/\D/g, '')}`} className="flex items-center gap-2 text-sm text-[#1E2D4D] hover:text-[#2A3F6B] transition-colors">
              <Phone className="w-4 h-4" />
              {FOUNDER.phone}
            </a>
          </div>

          <p className="text-sm text-[#1E2D4D]/70 mb-1">
            Welcome aboard. Let's simplify compliance together.
          </p>
          <p className="text-sm font-semibold text-[#1E2D4D]">
            — {FOUNDER.name}
          </p>
          <p className="text-xs text-[#1E2D4D]/50">
            {FOUNDER.title}
          </p>
        </div>

        {/* CTA */}
        <div className="px-6 sm:px-10 pb-8">
          <button
            onClick={handleGetStarted}
            className="w-full py-3.5 px-6 rounded-xl font-semibold text-base transition-all bg-[#1E2D4D] text-white hover:bg-[#162340] shadow-sm hover:shadow-lg transform hover:-translate-y-0.5"
          >
            Let's build your kitchen's foundation
          </button>
        </div>
      </div>
    </div>
  );
}
