import { useState, useEffect } from 'react';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('evidly-cookie-consent');
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem('evidly-cookie-consent', 'accepted');
    setVisible(false);
  }

  function decline() {
    localStorage.setItem('evidly-cookie-consent', 'declined');
    setVisible(false);
    // Disable GA4 tracking
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
      });
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
      <p className="text-sm text-gray-600">
        We use cookies to improve your experience and analyze site traffic.{' '}
        <a href="/privacy" className="text-[#1E2D4D] underline">Privacy Policy</a>
      </p>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={decline}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Decline
        </button>
        <button
          onClick={accept}
          className="px-4 py-2 text-sm text-white bg-[#1E2D4D] hover:bg-[#162340] rounded-lg transition-colors"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
