// Service worker SiTepat: menerima push dan membuka aplikasi saat notifikasi diklik
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Handler kosong: syarat installable di sebagian browser, request tetap lewat jaringan biasa
self.addEventListener('fetch', () => {});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data && event.data.text() }; }

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title || 'SiTepat', {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.tag || 'sitepat',
        renotify: true,
        requireInteraction: true, // tetap tampil sampai ditutup (di komputer)
        actions: [{ action: 'buka', title: 'Buka data' }],
        vibrate: [200, 100, 200],
        data: { url: data.url || '/dashboard/pegawai' },
      });

      // Kalau SiTepat masih terbuka di tab mana pun, minta halamannya memutar suara kustom
      const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of list) c.postMessage({ type: 'bunyi' });
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) { c.navigate(url); return c.focus(); }
      }
      return self.clients.openWindow(url);
    })
  );
});