const mongoose = require('mongoose');

// Browser Web Push subscription (the website, not the native app — that uses DeviceToken).
// Saved by POST /api/push/subscribe, read by utils/webPush.js.
const pushSubscriptionSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth:   { type: String, required: true },
  },
  userAgent: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
