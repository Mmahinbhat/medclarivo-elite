const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// Call this once at server startup (see WIRING.md)
function init() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('Web Push: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — push notifications disabled');
    return;
  }
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL || 'admin@medclarivo.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Send a push notification to every device a user has subscribed on.
 * Silently drops dead subscriptions (410/404 responses) so the table
 * doesn't fill up with stale entries.
 */
async function sendPushToUser(userId, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return; // not configured, no-op

  const subs = await PushSubscription.find({ user: userId });
  if (!subs.length) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          body
        );
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
        // other errors (network blips etc.) are just swallowed — push is best-effort
      }
    })
  );
}

/** Send to literally everyone with a subscription — used for broadcasts. */
async function sendPushToAll(payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return;

  const subs = await PushSubscription.find({});
  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    })
  );
}

module.exports = { init, sendPushToUser, sendPushToAll };
