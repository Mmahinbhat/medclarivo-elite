// Admin-only access to call recordings (quality review).
// Every play and delete is written to the audit log.
const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const CallRecording = require('../models/CallRecording');
const AuditLog = require('../models/AuditLog');
const storage = require('../utils/recordingStorage');

router.use(protect, restrictTo('admin', 'super_admin'));

function audit(req, action, rec) {
  return AuditLog.create({
    actorId: req.user._id,
    actorRole: req.user.role,
    organizationId: req.user.organizationId || null,
    action,
    module: 'call_recordings',
    targetType: 'CallRecording',
    targetId: rec._id,
    after: { call: rec.call, participants: rec.participants },
    ip: req.ip,
    userAgent: req.get('user-agent') || null,
  }).catch((e) => console.warn('[Recordings] audit log failed:', e.message));
}

// GET /api/admin/recordings?page=1&limit=20
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const [items, total] = await Promise.all([
      CallRecording.find({})
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('participants', 'name role')
        .populate('recordedBy', 'name role')
        .select('-parts')
        .lean(),
      CallRecording.countDocuments({}),
    ]);
    res.json({ success: true, storageConfigured: storage.isConfigured(), recordings: items, total, page, limit });
  } catch (err) {
    console.error('GET /api/admin/recordings error:', err);
    res.status(500).json({ success: false, message: 'Failed to load recordings.' });
  }
});

// GET /api/admin/recordings/:id/audio — streams the parts joined in order
router.get('/:id/audio', async (req, res) => {
  try {
    const rec = await CallRecording.findById(req.params.id).lean();
    if (!rec || !rec.parts?.length) return res.status(404).json({ success: false, message: 'Recording not found.' });
    audit(req, 'recording.play', rec);

    const parts = [...rec.parts].sort((a, b) => a.seq - b.seq);
    const ext = rec.mimeType === 'audio/mp4' ? 'm4a' : rec.mimeType === 'audio/ogg' ? 'ogg' : 'webm';
    res.setHeader('Content-Type', rec.mimeType || 'audio/webm');
    res.setHeader('Content-Length', parts.reduce((n, p) => n + (p.bytes || 0), 0));
    res.setHeader('Content-Disposition', `inline; filename="call-${rec.call}.${ext}"`);
    res.setHeader('Cache-Control', 'no-store');

    for (const p of parts) {
      const stream = await storage.getObjectStream(p.key);
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('end', resolve);
        stream.pipe(res, { end: false });
      });
    }
    res.end();
  } catch (err) {
    console.error('GET /api/admin/recordings/:id/audio error:', err.message);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Could not load the audio.' });
    else res.destroy(err);
  }
});

// DELETE /api/admin/recordings/:id
router.delete('/:id', async (req, res) => {
  try {
    const rec = await CallRecording.findById(req.params.id).lean();
    if (!rec) return res.status(404).json({ success: false, message: 'Recording not found.' });
    await storage.deleteObjects((rec.parts || []).map((p) => p.key));
    await CallRecording.deleteOne({ _id: rec._id });
    audit(req, 'recording.delete', rec);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/recordings/:id error:', err.message);
    res.status(500).json({ success: false, message: 'Could not delete the recording.' });
  }
});

module.exports = router;
