import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function MobileInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Only show on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const dismissed = sessionStorage.getItem('install-banner-dismissed');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (!isMobile || dismissed || isStandalone) return;

    // Show after 3 seconds
    const timer = setTimeout(() => setVisible(true), 3000);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    sessionStorage.setItem('install-banner-dismissed', 'true');
  }

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        dismiss();
      }
      setDeferredPrompt(null);
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        toast.info('Tap the Share button, then "Add to Home Screen"');
      } else {
        toast.info('Tap the menu, then "Install app"');
      }
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] sm:hidden" style={{ backgroundColor: '#1e4d6b' }}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Download className="w-5 h-5 text-white flex-shrink-0" />
          <span className="text-sm text-white font-medium truncate">
            EvidLY works best as an app
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="px-4 py-1.5 rounded-lg text-sm font-bold transition-colors min-h-[36px]"
            style={{ backgroundColor: '#d4af37', color: '#1e4d6b' }}
          >
            Install
          </button>
          <button
            onClick={dismiss}
            className="p-1.5 text-white/70 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
