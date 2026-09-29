const mongoose = require('mongoose');

// One document per user who still has to confirm their email.
// The code itself is never stored — only a SHA-256 hash of it.
// The whole document is deleted automatically 24h after the last send.
const emailVerificationSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  codeHash:      { type: String, required: true },
  codeExpiresAt: { type: Date, required: true },
  attempts:      { type: Number, default: 0 },
  sends:         [Date],
  expireAt:      { type: Date, required: true, index: { expires: 0 } },
});

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);
