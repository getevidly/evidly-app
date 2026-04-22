import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { initSentry } from './lib/sentry';
import App from './App.tsx';
import './index.css';

initSentry();

// Unregister all service workers — prevents stale cache serving
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    if (registrations.length > 0) {
      registrations.forEach(registration => registration.unregister());
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames
            .filter(name => name.startsWith('workbox-') || name.startsWith('sw-'))
            .forEach(cacheName => caches.delete(cacheName));
        });
      }
    }
  });
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
