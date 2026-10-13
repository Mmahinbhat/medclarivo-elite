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

// GET /api/calls/ice-servers — STUN/TURN servers for WebRTC.
// Credentials come from Metered's API using METERED_API_KEY (kept on the
// server), so they never appear in the public app code. Cached for 10 min.
let iceCache = { at: 0, servers: null };
router.get('/ice-servers', protect, async (req, res) => {
  try {
    if (iceCache.servers && Date.now() - iceCache.at < 10 * 60 * 1000) {
      return res.json({ success: true, iceServers: iceCache.servers });
    }
    const key = process.env.METERED_API_KEY;
    const domain = process.env.METERED_DOMAIN || 'medclarivo.metered.live';
    if (!key) return res.status(503).json({ success: false, message: 'Calling is not configured (METERED_API_KEY missing).' });
    const r = await fetch(`https://${domain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(key)}`);
    const servers = await r.json().catch(() => null);
    if (!r.ok || !Array.isArray(servers) || !servers.length) {
      console.error('[ICE] Metered returned', r.status);
      return res.status(502).json({ success: false, message: 'Could not get call relay servers.' });
    }
    iceCache = { at: Date.now(), servers };
    res.json({ success: true, iceServers: servers });
  } catch (err) {
    console.error('GET /api/calls/ice-servers error:', err.message);
    res.status(502).json({ success: false, message: 'Could not get call relay servers.' });
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

    const me = String(req.user._id);
    const isParticipant =
      String(call.caller?._id || call.caller) === me ||
      String(call.receiver?._id || call.receiver) === me;
    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    res.json({ success: true, call });
  } catch (err) {
    console.error('GET /api/calls/:id error:', err);
    res.status(500).json({ success: false, message: 'Failed to load call' });
  }
});

// ════════════════════════════════════════════════════════════════
// Call recording upload (every call is recorded for quality & safety).
// The server picks ONE participant to record (see notifySocket call:accept);
// that phone uploads audio in ~15 s parts while the call runs.
// ════════════════════════════════════════════════════════════════
const CallRecording = require('../models/CallRecording');
const storage = require('../utils/recordingStorage');

const RETENTION_DAYS = () => parseInt(process.env.RECORDING_RETENTION_DAYS || '90', 10);
const MAX_PARTS = 2000;                   // ~8 h at 15 s per part
const MAX_CALL_AGE_MS = 6 * 60 * 60 * 1000; // stop accepting parts 6 h after the call started
const MIME_OK = /^audio\/(webm|mp4|ogg|aac|mpeg)(;.*)?$/i;

async function loadRecordableCall(req, res) {
  if (!storage.isConfigured()) {
    res.status(503).json({ success: false, recordingDisabled: true, message: 'Recording storage is not configured.' });
    return null;
  }
  const call = await Call.findById(req.params.id).lean();
  const me = String(req.user._id);
  if (!call || (String(call.caller) !== me && String(call.receiver) !== me)) {
    res.status(404).json({ success: false, message: 'Call not found' });
    return null;
  }
  if (call.recordedBy && String(call.recordedBy) !== me) {
    res.status(409).json({ success: false, message: 'The other participant is recording this call.' });
    return null;
  }
  const started = call.startedAt || call.createdAt;
  if (!['ongoing', 'ended'].includes(call.status) || Date.now() - new Date(started).getTime() > MAX_CALL_AGE_MS) {
    res.status(409).json({ success: false, message: 'This call is not being recorded.' });
    return null;
  }
  return call;
}

// POST /api/calls/:id/recording/chunk?seq=0  — raw audio bytes in the body
router.post('/:id/recording/chunk', protect,
  express.raw({ type: () => true, limit: '5mb' }),
  async (req, res) => {
    try {
      const call = await loadRecordableCall(req, res);
      if (!call) return;

      const seq = Number(req.query.seq);
      if (!Number.isInteger(seq) || seq < 0 || seq >= MAX_PARTS) {
        return res.status(400).json({ success: false, message: 'Invalid part number.' });
      }
      if (!Buffer.isBuffer(req.body) || !req.body.length) {
        return res.status(400).json({ success: false, message: 'Empty audio part.' });
      }
      const rawType = String(req.get('X-Recording-Type') || 'audio/webm');
      const mimeType = MIME_OK.test(rawType) ? rawType.split(';')[0].toLowerCase() : 'audio/webm';

      const key = `recordings/${call._id}/${String(seq).padStart(5, '0')}.part`;
      await storage.putObject(key, req.body, mimeType); // same key on retry = overwrite, no duplicates

      const now = new Date();
      await CallRecording.updateOne(
        { call: call._id },
        {
          $setOnInsert: {
            recordedBy: req.user._id,
            participants: [call.caller, call.receiver],
            mimeType,
            startedAt: now,
            expiresAt: new Date(now.getTime() + RETENTION_DAYS() * 86400000),
          },
        },
        { upsert: true }
      );
      // Add the part once (a retried part keeps its original entry)
      await CallRecording.updateOne(
        { call: call._id, 'parts.seq': { $ne: seq } },
        { $push: { parts: { seq, key, bytes: req.body.length } }, $inc: { totalBytes: req.body.length } }
      );
      res.json({ success: true });
    } catch (err) {
      console.error('POST /api/calls/:id/recording/chunk error:', err.message);
      res.status(500).json({ success: false, message: 'Could not save this part of the recording.' });
    }
  });

// POST /api/calls/:id/recording/finish  { durationSeconds }
router.post('/:id/recording/finish', protect, async (req, res) => {
  try {
    const call = await loadRecordableCall(req, res);
    if (!call) return;
    const durationSeconds = Math.max(0, Math.min(8 * 3600, Math.round(Number(req.body?.durationSeconds) || 0)));
    await CallRecording.updateOne(
      { call: call._id, recordedBy: req.user._id },
      { $set: { status: 'complete', endedAt: new Date(), durationSeconds } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/calls/:id/recording/finish error:', err.message);
    res.status(500).json({ success: false, message: 'Could not finish the recording.' });
  }
});

module.exports = router;
