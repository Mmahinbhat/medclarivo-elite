// Must be served from the site root (or at least a path that covers everything
// you want it to control) — e.g. https://yourdomain.com/sw.js

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'MedClarivo', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'MedClarivo Elite';
  const options = {
    body: data.body || '',
    icon: '/icons/notification-icon.png', // swap for your actual icon path, or remove this line
    badge: '/icons/notification-badge.png', // small monochrome icon, Android only — remove if you don't have one
    data: { link: data.link || '/' },
    tag: data._id || undefined, // same tag replaces an existing notification instead of stacking
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clicking the notification focuses an existing tab if one's open, else opens a new one
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(link);
    })
  );
});
