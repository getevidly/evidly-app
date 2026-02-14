import { Calendar } from 'lucide-react';
import { CALENDLY_URL } from '../../lib/config';
import { trackEvent } from '../../utils/analytics';

declare global {
  interface Window {
    Calendly?: {
      initPopupWidget(opts: { url: string }): void;
    };
  }
}

interface CalendlyButtonProps {
  text?: string;
  variant?: 'primary' | 'secondary' | 'gold';
  className?: string;
}

export default function CalendlyButton({
  text = 'Book Free Walkthrough',
  variant = 'gold',
  className = '',
}: CalendlyButtonProps) {
  function openCalendly() {
    trackEvent('calendly_click', { source: 'button', text: text || 'Book Free Walkthrough' });
    if (window.Calendly) {
      window.Calendly.initPopupWidget({ url: CALENDLY_URL });
    } else {
      window.open(CALENDLY_URL, '_blank', 'noopener,noreferrer');
    }
  }

  const baseClasses = 'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-base transition-all hover:-translate-y-0.5 hover:shadow-lg min-h-[44px] cursor-pointer border-none';

  const variantStyles: Record<string, React.CSSProperties> = {
    gold: { backgroundColor: '#d4af37', color: '#1e4d6b' },
    primary: { backgroundColor: '#1e4d6b', color: '#fff' },
    secondary: { backgroundColor: '#fff', color: '#1e4d6b', border: '2px solid #1e4d6b' },
  };

  return (
    <button
      onClick={openCalendly}
      className={`${baseClasses} ${className}`}
      style={variantStyles[variant]}
    >
      <Calendar className="w-5 h-5" />
      {text}
    </button>
  );
}
