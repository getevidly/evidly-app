import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Modal } from './ui/Modal';
import { EvidlyLogo } from './ui/EvidlyLogo';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FONT } from '../design/tokens';

const NAVY = '#1E2D4D';
const EMBER = '#B24A2E';
const CREAM = '#F7F1E6';
const MUTED = '#5F6875';

interface WelcomeModalProps {
  /** Passed by Dashboard; the approved copy is name-free, so it is intentionally unused. */
  firstName?: string;
  onDismiss: () => void;
}

const STEPS: { title: string; sub: string }[] = [
  {
    title: 'Your record wall',
    sub: 'Every fire, food, and vendor record for each kitchen, in one place.',
  },
  {
    title: "What's on file, what's in motion",
    sub: "We track what's collected and chase what's still coming — you just watch it fill.",
  },
  {
    title: 'Hand it to anyone in seconds',
    sub: 'Inspector, insurer, landlord — a ready report whenever someone asks.',
  },
];

export function WelcomeModal({ onDismiss }: WelcomeModalProps) {
  const [visible, setVisible] = useState(false);
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleClose = async () => {
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
    <Modal
      isOpen={visible}
      onClose={handleClose}
      size="md"
      closeOnBackdrop={false}
      className="overflow-hidden"
    >
      <div data-testid="welcome-modal">
        {/* Navy header */}
        <div className="relative px-6 pt-6 pb-6" style={{ backgroundColor: NAVY }}>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            <X className="h-5 w-5" />
          </button>

          <EvidlyLogo onDark showTagline={false} />

          <h2
            className="mt-4 text-[22px] leading-[1.25] text-white"
            style={{ fontFamily: FONT.display, fontWeight: 600 }}
          >
            Your account is ready. We set it up for you.
          </h2>
          <p
            className="mt-2 text-[13px] leading-[1.5]"
            style={{ color: 'rgba(255,255,255,0.72)' }}
          >
            Your locations, your required records, and your vendors are already configured — nothing to build.
          </p>
        </div>

        {/* Three numbered rows */}
        <div className="px-6 py-5 space-y-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex items-start gap-3.5">
              <span
                className="flex-shrink-0 flex items-center justify-center rounded-full"
                style={{
                  width: 26,
                  height: 26,
                  backgroundColor: CREAM,
                  color: EMBER,
                  fontFamily: FONT.mono,
                  fontSize: 12,
                  fontWeight: 600,
                  lineHeight: 1,
                  marginTop: 1,
                }}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-snug" style={{ color: NAVY }}>
                  {step.title}
                </div>
                <div className="text-[12.5px] leading-[1.45] mt-0.5" style={{ color: MUTED }}>
                  {step.sub}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Ember CTA + skip */}
        <div className="px-6 pb-5">
          <button
            onClick={handleClose}
            className="w-full rounded-xl text-white text-[15px] font-semibold transition-colors hover:brightness-95"
            style={{ backgroundColor: EMBER, minHeight: 48 }}
          >
            Show me my kitchen
          </button>

          <button
            onClick={handleClose}
            className="w-full mt-1 text-[13px] underline underline-offset-2 transition-colors hover:opacity-80"
            style={{ color: MUTED, minHeight: 44 }}
          >
            I'll look around myself
          </button>
        </div>
      </div>
    </Modal>
  );
}
