const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Who this notification belongs to. null = broadcast to everyone (system/feature announcements)
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    // true for announcements meant for all users (feature updates, system notices)
    isBroadcast: {
      type: Boolean,
      default: false,
      index: true,
    },
    type: {
      type: String,
      enum: ['message', 'system', 'feature', 'mention'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    body: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    // Optional relative link, e.g. "/study.html?thread=123"
    link: {
      type: String,
      default: null,
    },
    // Who triggered it (for messages), null for system/feature announcements
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Fast lookups for "my unread notifications" and "unread broadcasts I haven't dismissed"
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ isBroadcast: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
