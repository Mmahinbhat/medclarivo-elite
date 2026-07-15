const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  mentee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: { type: String, default: '1:1' },
  // Calendar category shown in the admin Calendar UI. Separate from `type`
  // (which describes 1:1 vs group format) — this describes session intent.
  category: {
    type: String,
    enum: ['academic', 'behavioral', 'doubt', 'exam'],
    default: 'academic',
  },
  topic: { type: String, trim: true },
  startTime: { type: Date, required: true },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  meetingLink: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Session', SessionSchema);
