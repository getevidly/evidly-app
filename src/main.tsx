import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { initSentry } from './lib/sentry';
import App from './App.tsx';
import './index.css';

initSentry();

// Register minimal service worker (push notifications only, no caching).
// This replaces the old Workbox precaching SW — the new sw.js purges stale
// caches and reloads open clients on activate, so returning users self-heal.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// Handle chunk loading errors after deploys (stale JS bundles)
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
