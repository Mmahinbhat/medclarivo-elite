// Deletes call recordings (audio + database entry) once they pass their
// expiresAt date (default 90 days, RECORDING_RETENTION_DAYS). Runs at startup
// and then every 6 hours.
const CallRecording = require('../models/CallRecording');
const storage = require('./recordingStorage');

async function deleteRecordings(filter) {
  const recs = await CallRecording.find(filter).select('parts.key').lean();
  if (!recs.length) return 0;
  if (storage.isConfigured()) {
    await storage.deleteObjects(recs.flatMap((r) => (r.parts || []).map((p) => p.key)));
  }
  await CallRecording.deleteMany({ _id: { $in: recs.map((r) => r._id) } });
  return recs.length;
}

async function runCleanup() {
  try {
    const n = await deleteRecordings({ expiresAt: { $lte: new Date() } });
    if (n) console.log(`[Recordings] deleted ${n} expired recording(s)`);
  } catch (err) {
    console.error('[Recordings] cleanup failed:', err.message);
  }
}

function startRecordingCleanup() {
  setTimeout(runCleanup, 60 * 1000);                    // shortly after boot
  setInterval(runCleanup, 6 * 60 * 60 * 1000).unref();  // then every 6 h
}

module.exports = { startRecordingCleanup, runCleanup, deleteRecordings };
