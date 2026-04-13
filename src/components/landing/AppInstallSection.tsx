import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Download, Play, Check } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function AppInstallSection() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Show manual install instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);

      if (isIOS) {
        toast.info('Tap the Share button, then "Add to Home Screen"');
      } else if (isAndroid) {
        toast.info('Tap the menu, then "Install app" or "Add to Home Screen"');
      } else {
        toast.info('Look for the install icon in your browser address bar');
      }
    }
  }

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl p-8 sm:p-12" style={{ backgroundColor: '#eef4f8', border: '2px solid #b8d4e8' }}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: '#1e4d6b' }}
              >
                <Smartphone className="w-10 h-10 text-white" />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h2 className="font-['Outfit'] text-2xl sm:text-3xl font-bold mb-3" style={{ color: '#1e4d6b' }}>
                Take Compliance With You
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6 max-w-xl">
                Log temperatures, complete checklists, and snap photos right from your kitchen.
                Works on iPhone, Android, and desktop &mdash; install in seconds, no app store required.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                {isInstalled ? (
                  <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm" style={{ color: '#166534', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <Check className="w-5 h-5" /> App installed!
                  </span>
                ) : (
                  <button
                    onClick={handleInstall}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-base text-white transition-all hover:-translate-y-0.5 hover:shadow-lg min-h-[44px]"
                    style={{ backgroundColor: '#1e4d6b' }}
                  >
                    <Download className="w-5 h-5" />
                    Install App
                  </button>
                )}
                <button
                  onClick={() => navigate('/demo')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-base transition-all hover:-translate-y-0.5 border-2 min-h-[44px] bg-white"
                  style={{ color: '#1e4d6b', borderColor: '#1e4d6b' }}
                >
                  <Play className="w-5 h-5" />
                  Watch Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
