const mongoose = require('mongoose');

// One row per (user, broadcast notification) once they've read/dismissed it.
// Personal notifications (messages, mentions) just use Notification.read instead —
// this collection only exists because broadcasts are shared rows, not per-user copies.
const notificationReadSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    notification: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification',
      required: true,
    },
  },
  { timestamps: true }
);

notificationReadSchema.index({ user: 1, notification: 1 }, { unique: true });

module.exports = mongoose.model('NotificationRead', notificationReadSchema);
