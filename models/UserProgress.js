const mongoose = require('mongoose');

const UserProgressSchema = new mongoose.Schema({
  user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  chapter:         { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true },
  status:          { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
  unitsCompleted:  { type: Number, default: 0 },
  percentComplete: { type: Number, default: 0 },
  lastAccessedAt:  { type: Date },
}, { timestamps: true });

// One progress row per user per chapter
UserProgressSchema.index({ user: 1, chapter: 1 }, { unique: true });

module.exports = mongoose.model('UserProgress', UserProgressSchema);
