const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Call = require('../models/Call');

// GET /api/calls/history — call history for logged-in user
router.get('/history', protect, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const calls = await Call.find({
      $or: [{ caller: userId }, { receiver: userId }],
      status: { $in: ['ended', 'missed', 'rejected'] },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('caller', 'name avatar role')
      .populate('receiver', 'name avatar role')
      .lean();

    res.json({ success: true, calls });
  } catch (err) {
    console.error('GET /api/calls/history error:', err);
    res.status(500).json({ success: false, message: 'Failed to load call history' });
  }
});

// GET /api/calls/:id — single call details
router.get('/:id', protect, async (req, res) => {
  try {
    const call = await Call.findById(req.params.id)
      .populate('caller', 'name avatar role')
      .populate('receiver', 'name avatar role')
      .lean();

    if (!call) return res.status(404).json({ success: false, message: 'Call not found' });

    res.json({ success: true, call });
  } catch (err) {
    console.error('GET /api/calls/:id error:', err);
    res.status(500).json({ success: false, message: 'Failed to load call' });
  }
});

module.exports = router;
