const express = require('express');
const router = express.Router();

// ⚠️ Adjust this import to match your actual auth middleware file/export name.
// It should decode the JWT and set req.user = { id: ... } (or req.userId).
const { protect } = require('../middleware/auth');

const Notification = require('../models/Notification');
const NotificationRead = require('../models/NotificationRead');

// GET /api/notifications?limit=20&before=<ISO date>  -- paginated feed (personal + broadcasts)
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const before = req.query.before ? new Date(req.query.before) : new Date();

    const [personal, broadcasts, dismissedIds] = await Promise.all([
      Notification.find({ recipient: userId, createdAt: { $lt: before } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.find({ isBroadcast: true, createdAt: { $lt: before } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      NotificationRead.find({ user: userId }).distinct('notification'),
    ]);

    const dismissedSet = new Set(dismissedIds.map(String));
    const broadcastsWithReadState = broadcasts.map((n) => ({
      ...n,
      read: dismissedSet.has(String(n._id)),
    }));

    const combined = [...personal, ...broadcastsWithReadState]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    res.json({ notifications: combined });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', protect, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const [unreadPersonal, allBroadcastIds, readBroadcastIds] = await Promise.all([
      Notification.countDocuments({ recipient: userId, read: false }),
      Notification.find({ isBroadcast: true }).distinct('_id'),
      NotificationRead.find({ user: userId }).distinct('notification'),
    ]);

    const readSet = new Set(readBroadcastIds.map(String));
    const unreadBroadcasts = allBroadcastIds.filter((id) => !readSet.has(String(id))).length;

    res.json({ count: unreadPersonal + unreadBroadcasts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// PATCH /api/notifications/:id/read  -- mark one as read (personal or broadcast)
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ error: 'Not found' });

    if (notification.isBroadcast) {
      await NotificationRead.updateOne(
        { user: userId, notification: notification._id },
        { $setOnInsert: { user: userId, notification: notification._id } },
        { upsert: true }
      );
    } else {
      if (String(notification.recipient) !== String(userId)) {
        return res.status(403).json({ error: 'Not your notification' });
      }
      notification.read = true;
      await notification.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', protect, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    await Notification.updateMany({ recipient: userId, read: false }, { $set: { read: true } });

    const unreadBroadcasts = await Notification.find({ isBroadcast: true }).select('_id').lean();
    const alreadyRead = await NotificationRead.find({ user: userId }).distinct('notification');
    const alreadyReadSet = new Set(alreadyRead.map(String));
    const toInsert = unreadBroadcasts
      .filter((n) => !alreadyReadSet.has(String(n._id)))
      .map((n) => ({ user: userId, notification: n._id }));

    if (toInsert.length) {
      await NotificationRead.insertMany(toInsert, { ordered: false }).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// POST /api/notifications/broadcast  -- admin/mentor sends a system/feature announcement to everyone
router.post('/broadcast', protect, async (req, res) => {
  try {
    // ⚠️ Gate this to admins/mentors once you have role checks wired in, e.g.:
    // if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });

    const { title, body, link, type = 'feature' } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const { notify } = require('../utils/notifySocket');
    const notification = await notify({
      isBroadcast: true,
      type,
      title,
      body,
      link,
      sender: req.user.id || req.user._id,
    });

    res.status(201).json({ notification });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

module.exports = router;
