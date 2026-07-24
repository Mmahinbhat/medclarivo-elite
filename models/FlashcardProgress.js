const mongoose = require('mongoose');

const FlashcardProgressSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  flashcard: { type: mongoose.Schema.Types.ObjectId, ref: 'Flashcard', required: true },
  status:    { type: String, enum: ['new', 'known', 'review'], default: 'new' },
  timesReviewed:  { type: Number, default: 0 },
  lastReviewedAt: { type: Date },
}, { timestamps: true });

FlashcardProgressSchema.index({ user: 1, flashcard: 1 }, { unique: true });

module.exports = mongoose.model('FlashcardProgress', FlashcardProgressSchema);
