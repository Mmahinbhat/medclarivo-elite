// Service worker for website push notifications (registered by push-subscribe.js).
self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { title: 'MedClarivo', body: event.data ? event.data.text() : '' }; }

  event.waitUntil(self.registration.showNotification(data.title || 'MedClarivo Elite', {
    body: data.body || '',
    data: { link: data.link || './dashboard.html' },
    tag: data._id || undefined,
  }));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var link = new URL((event.notification.data && event.notification.data.link) || './dashboard.html', self.registration.scope).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf(self.registration.scope) === 0 && 'focus' in list[i]) {
          list[i].navigate(link);
          return list[i].focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(link);
    })
  );
});
