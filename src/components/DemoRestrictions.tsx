import { useEffect } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { toast } from 'sonner';
import { useTranslation } from '../contexts/LanguageContext';

export function DemoRestrictions() {
  const { isDemoMode, presenterMode } = useDemo();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isDemoMode || presenterMode) {
      document.body.classList.remove('demo-mode');
      return;
    }

    document.body.classList.add('demo-mode');

    // Intercept Ctrl+P / Cmd+P
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        toast.info(t('demo.printAvailableOnPaid'));
      }
    }
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('demo-mode');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDemoMode, presenterMode, t]);

  // Inject print-blocking styles
  useEffect(() => {
    if (!isDemoMode || presenterMode) return;

    const style = document.createElement('style');
    style.id = 'demo-restrictions-style';
    style.textContent = `
      @media print {
        body.demo-mode * { display: none !important; }
        body.demo-mode::after {
          content: 'Printing is available on the paid plan. Start your free trial at evidly.com';
          display: block !important;
          padding: 40px;
          font-size: 18px;
          text-align: center;
        }
      }
      body.demo-mode .main-content {
        -webkit-user-select: none;
        user-select: none;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const el = document.getElementById('demo-restrictions-style');
      if (el) el.remove();
    };
  }, [isDemoMode, presenterMode]);

  return null;
}
