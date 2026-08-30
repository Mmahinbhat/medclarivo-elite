const admin = require('firebase-admin');
const DeviceToken = require('../models/DeviceToken');

let initialized = false;

function init() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.warn('FCM Push: FIREBASE_SERVICE_ACCOUNT not set — native push disabled');
    return;
  }
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
    console.log('FCM Push: initialized successfully');
  } catch (err) {
    console.error('FCM Push: failed to initialize —', err.message);
  }
}

async function sendFcmToUser(userId, payload) {
  if (!initialized) return;
  const tokens = await DeviceToken.find({ user: userId });
  if (!tokens.length) return;

  await Promise.all(
    tokens.map(async (doc) => {
      try {
        await admin.messaging().send({
          token: doc.token,
          notification: {
            title: payload.title || 'MedClarivo',
            body: payload.body || '',
          },
          data: {
            type: payload.type || 'system',
            link: payload.link || '',
            notificationId: String(payload._id || ''),
          },
          apns: {
            payload: { aps: { sound: 'default', badge: 1 } },
          },
          android: {
            priority: 'high',
            notification: { sound: 'default', channelId: 'medclarivo_default' },
          },
        });
      } catch (err) {
        const code = err.code || '';
        if (code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token') {
          await DeviceToken.deleteOne({ _id: doc._id });
        }
      }
    })
  );
}

async function sendFcmToAll(payload) {
  if (!initialized) return;
  const tokens = await DeviceToken.find({});
  if (!tokens.length) return;

  await Promise.all(
    tokens.map(async (doc) => {
      try {
        await admin.messaging().send({
          token: doc.token,
          notification: {
            title: payload.title || 'MedClarivo',
            body: payload.body || '',
          },
          data: {
            type: payload.type || 'system',
            link: payload.link || '',
            notificationId: String(payload._id || ''),
          },
          apns: {
            payload: { aps: { sound: 'default', badge: 1 } },
          },
          android: {
            priority: 'high',
            notification: { sound: 'default', channelId: 'medclarivo_default' },
          },
        });
      } catch (err) {
        const code = err.code || '';
        if (code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token') {
          await DeviceToken.deleteOne({ _id: doc._id });
        }
      }
    })
  );
}

module.exports = { init, sendFcmToUser, sendFcmToAll };
