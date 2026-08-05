const express = require('express');
const router = express.Router();

// ⚠️ Same adjustment as routes/notifications.js — match to your real middleware.
const { protect } = require('../middleware/auth');

const PushSubscription = require('../models/PushSubscription');

// GET /api/push/vapid-public-key  -- frontend needs this to call pushManager.subscribe()
router.get('/vapid-public-key', (req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) {
    return res.status(503).json({ error: 'Push not configured on this server' });
  }
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe  -- called after the browser grants permission
router.post('/subscribe', protect, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { endpoint, keys } = req.body.subscription || req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { user: userId, endpoint, keys, userAgent: req.headers['user-agent'] || '' },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// POST /api/push/unsubscribe  -- called when the user disables notifications or logs out
router.post('/unsubscribe', protect, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
    await PushSubscription.deleteOne({ endpoint });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove subscription' });
  }
});

module.exports = router;
