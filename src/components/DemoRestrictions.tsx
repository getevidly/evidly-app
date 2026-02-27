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

    // Block focus on locked inputs (catches keyboard Tab navigation)
    function handleFocusCapture(e: FocusEvent) {
      const el = e.target;
      if (
        (el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement) &&
        !el.hasAttribute('data-demo-allow') &&
        !el.closest('[data-demo-allow]')
      ) {
        e.preventDefault();
        el.blur();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focus', handleFocusCapture, true);

    return () => {
      document.body.classList.remove('demo-mode');
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focus', handleFocusCapture, true);
    };
  }, [isDemoMode, presenterMode, t]);

  // Inject demo restriction styles (print blocking + input locking)
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

      /* ── Demo Input Lock ─────────────────────────────── */
      body.demo-mode input:not([data-demo-allow]):not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
      body.demo-mode textarea:not([data-demo-allow]),
      body.demo-mode select:not([data-demo-allow]) {
        pointer-events: none !important;
        opacity: 0.55 !important;
        cursor: not-allowed !important;
      }

      /* Lock icon on text inputs and textareas */
      body.demo-mode input:not([data-demo-allow]):not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([type="color"]),
      body.demo-mode textarea:not([data-demo-allow]) {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236B7F96' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='11' width='18' height='11' rx='2' ry='2'%3E%3C/rect%3E%3Cpath d='M7 11V7a5 5 0 0 1 10 0v4'%3E%3C/path%3E%3C/svg%3E") !important;
        background-repeat: no-repeat !important;
        background-position: right 8px center !important;
        background-size: 14px 14px !important;
        padding-right: 28px !important;
      }

      /* Checkboxes and radio buttons — dim but pointer-events blocked */
      body.demo-mode input[type="checkbox"]:not([data-demo-allow]),
      body.demo-mode input[type="radio"]:not([data-demo-allow]) {
        pointer-events: none !important;
        opacity: 0.5 !important;
      }

      /* Elements inside a data-demo-allow container are exempt */
      body.demo-mode [data-demo-allow] input,
      body.demo-mode [data-demo-allow] textarea,
      body.demo-mode [data-demo-allow] select {
        pointer-events: auto !important;
        opacity: 1 !important;
        cursor: auto !important;
        background-image: none !important;
        padding-right: unset !important;
      }

      /* File inputs */
      body.demo-mode input[type="file"]:not([data-demo-allow]) {
        pointer-events: none !important;
        opacity: 0.4 !important;
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
