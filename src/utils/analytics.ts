// ════════════════════════════════════════════════
// EvidLY Analytics Utility
// GA4 + ZoomInfo tracking helpers
// ════════════════════════════════════════════════

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const isDev = () => import.meta.env.DEV;
const hasConsent = () => localStorage.getItem('evidly-cookie-consent') === 'accepted';

// ── Page View ──────────────────────────────────
export function trackPageView(path: string, title?: string) {
  if (isDev() || !hasConsent()) return;
  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title || document.title,
    });
  }
}

// ── Custom Events ──────────────────────────────
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (isDev() || !hasConsent()) return;
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
}

// ── Conversion Events ──────────────────────────
export function trackConversion(conversionType: string, value?: number) {
  trackEvent('conversion', {
    conversion_type: conversionType,
    value: value || 0,
    currency: 'USD',
  });
}

// ── User Properties ────────────────────────────
export function setUserProperties(properties: Record<string, string | number>) {
  if (isDev() || !hasConsent()) return;
  if (window.gtag) {
    window.gtag('set', 'user_properties', properties);
  }
}
