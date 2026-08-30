/**
 * push-register.js — Capacitor native push notification setup (FCM)
 * Include on any page that loads after login (dashboards).
 * Does nothing on web (non-native) — web push is handled separately.
 */
(function initPushNotifications() {
  // Only run on native (iOS/Android), not in the browser
  if (!window.Capacitor || !window.Capacitor.isNativePlatform()) return;

  const PushNotifications = window.Capacitor.Plugins.PushNotifications;
  if (!PushNotifications) return;

  const API_BASE = 'https://med-clarivo.onrender.com/api';
  const token = localStorage.getItem('mc_token');
  if (!token) return; // not logged in

  // Request permission and register
  PushNotifications.requestPermissions().then(result => {
    if (result.receive === 'granted') {
      PushNotifications.register();
    } else {
      console.warn('Push permission denied');
    }
  });

  // Got FCM token — send to backend
  PushNotifications.addListener('registration', async (fcmToken) => {
    const storedFcmToken = localStorage.getItem('mc_fcm_token');
    if (storedFcmToken === fcmToken.value) return; // already registered

    try {
      const platform = window.Capacitor.getPlatform(); // 'ios' or 'android'
      const res = await fetch(`${API_BASE}/push/register-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ token: fcmToken.value, platform }),
      });
      if (res.ok) {
        localStorage.setItem('mc_fcm_token', fcmToken.value);
        console.log('FCM token registered');
      }
    } catch (err) {
      console.error('Failed to register FCM token:', err);
    }
  });

  // Registration failed
  PushNotifications.addListener('registrationError', (err) => {
    console.error('Push registration failed:', err);
  });

  // Notification received while app is in foreground
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received (foreground):', notification);
    // Could show an in-app toast here if desired
  });

  // User tapped a notification
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = action.notification.data;
    if (data?.link) {
      window.location.href = data.link;
    }
  });
})();
