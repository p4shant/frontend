// ─── KAMN Enterprises – Service Worker ───────────────────────────────────
// Handles Web Push notifications for PWA.
// This file must be placed at /public/sw.js so it is served from the root.

self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (_) {
        data = { title: 'New Notification', body: event.data ? event.data.text() : '' };
    }

    const title = data.title || 'KAMN Enterprises';
    const options = {
        body: data.body || 'You have a new notification.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: data.data || {},
        vibrate: [200, 100, 200],
        requireInteraction: false,
        tag: 'kamn-notification',         // replaces previous if same tag
        renotify: true
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If app window is already open, focus it
            for (const client of clientList) {
                if ('focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
