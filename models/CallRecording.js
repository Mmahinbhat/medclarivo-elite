const mongoose = require('mongoose');

// One recording per call. The audio lives in object storage as numbered parts
// (recordings/<callId>/<seq>.part) which, joined in order, form one playable file.
const callRecordingSchema = new mongoose.Schema({
  call:         { type: mongoose.Schema.Types.ObjectId, ref: 'Call', required: true, unique: true },
  recordedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  mimeType:     { type: String, default: 'audio/webm' },
  parts:        [{ seq: Number, key: String, bytes: Number }],
  totalBytes:   { type: Number, default: 0 },
  status:       { type: String, enum: ['recording', 'complete'], default: 'recording' },
  startedAt:    { type: Date, default: Date.now },
  endedAt:      { type: Date },
  durationSeconds: { type: Number, default: 0 },
  // Auto-deleted (audio + this document) after this date — see utils/recordingCleanup.js
  expiresAt:    { type: Date, required: true, index: true },
}, { timestamps: true });

callRecordingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CallRecording', callRecordingSchema);
