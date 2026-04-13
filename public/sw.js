// TW Custom Service Worker
// Handles push notifications + offline caching via Workbox (injected by vite-plugin-pwa)

// --- Workbox precache manifest injected here by vite-plugin-pwa ---
self.__WB_MANIFEST;

// --- Push notification handler ---
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'TW Reminder', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'TW – Post Reminder';
  const options = {
    body: data.body || 'Time to post your content!',
    icon: data.icon || '/pwa-192.png',
    badge: data.badge || '/pwa-192.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// --- Notification click: open/focus the app ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
