const mongoose = require('mongoose');

const StudySessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  chapter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true,
  },
  durationMinutes: {
    type: Number,
    required: true, // How long they studied
  },
  xpEarned: {
    type: Number,
    default: 0, // Calculated based on duration
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
  // Set only when an Assistant logged this session on the student's
  // behalf (see routes/assistant.js). Null for sessions the student
  // logged themselves.
  loggedByAssistant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('StudySession', StudySessionSchema);
