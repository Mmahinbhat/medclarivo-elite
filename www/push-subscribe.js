/**
 * push-subscribe.js — browser (website) push notifications.
 * Used by the "Enable notifications" button on the dashboards: enablePush().
 *
 * Inside the iOS/Android app this does nothing — the app uses native push
 * (shared/push-register.js) instead.
 */
(function () {
  var API_BASE = 'https://med-clarivo.onrender.com/api';

  function authToken() { return localStorage.getItem('mc_token'); }
  function isNativeApp() { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(base64);
    return Uint8Array.from(Array.prototype.map.call(raw, function (c) { return c.charCodeAt(0); }));
  }

  window.enablePush = async function () {
    if (isNativeApp()) return true; // native push already handles the app
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      console.warn('[Push] Not supported in this browser');
      return false;
    }
    var token = authToken();
    if (!token) return false;
    try {
      // Relative path so it works on GitHub Pages sub-folders and custom domains alike
      var registration = await navigator.serviceWorker.register('sw.js');
      var permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;

      var keyRes = await fetch(API_BASE + '/push/vapid-public-key');
      if (!keyRes.ok) { console.warn('[Push] Not configured on server'); return false; }
      var key = (await keyRes.json()).key;

      var subscription = await registration.pushManager.getSubscription() ||
        await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });

      var res = await fetch(API_BASE + '/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ subscription: subscription }),
      });
      return res.ok;
    } catch (err) {
      console.error('[Push] Subscription failed:', err);
      return false;
    }
  };

  window.disablePush = async function () {
    try {
      if (!('serviceWorker' in navigator)) return;
      var registration = await navigator.serviceWorker.getRegistration();
      var subscription = registration && await registration.pushManager.getSubscription();
      if (!subscription) return;
      await fetch(API_BASE + '/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + authToken() },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
    } catch (err) {
      console.error('[Push] Unsubscribe failed:', err);
    }
  };
})();
