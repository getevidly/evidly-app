/**
 * Minimal service worker — push notifications only, zero caching.
 *
 * Replaces the old Workbox precaching SW that shipped stale HTML/assets.
 * When the browser detects this file is byte-different from the old sw.js,
 * it installs this version, which immediately activates, purges every
 * cache the old SW left behind, and reloads all open tabs so they fetch
 * fresh assets from the network.
 */

// ── Lifecycle ───────────────────────────────────────────────────────

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((c) => c.navigate(c.url));
        })
      )
  );
});

// ── Push notifications ──────────────────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const { title, body, url, icon } = data;

  event.waitUntil(
    self.registration.showNotification(title || 'EvidLY', {
      body: body || '',
      icon: icon || '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: url || '/dashboard' },
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
