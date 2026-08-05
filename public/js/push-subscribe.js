/**
 * Enables Web Push for the current logged-in user.
 *
 * Add to any page after login (dashboard.html, study.html, etc.):
 *   <script src="/js/push-subscribe.js"></script>
 *
 * Call enablePush() from a button click (permission prompts must be
 * triggered by a user gesture — don't call this automatically on page load):
 *   <button onclick="enablePush()">Enable notifications</button>
 */

function getToken() {
  // ⚠️ Match this to however the app stores the JWT (same as notifications-widget.js)
  return localStorage.getItem('token');
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function enablePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push not supported in this browser');
    return false;
  }

  const token = getToken();
  if (!token) {
    console.warn('Not logged in, cannot subscribe to push');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const keyRes = await fetch('/api/push/vapid-public-key');
    if (!keyRes.ok) {
      console.warn('Push not configured on server');
      return false;
    }
    const { key } = await keyRes.json();

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ subscription }),
    });

    return true;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return false;
  }
}

async function disablePush() {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    const token = getToken();
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });

    await subscription.unsubscribe();
  } catch (err) {
    console.error('Push unsubscribe failed:', err);
  }
}
