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
