const mongoose = require('mongoose');

const CallSchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['ringing', 'ongoing', 'ended', 'missed', 'rejected'],
    default: 'ringing',
  },
  startedAt: { type: Date },
  endedAt:   { type: Date },
  duration:  { type: Number, default: 0 }, // seconds
  recordingUrl: { type: String, default: null },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Call', CallSchema);
