const mongoose = require('mongoose');

const FlashcardSchema = new mongoose.Schema({
  subject:   { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  chapter:   { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
  examGroup: { type: String, required: true, index: true },
  front:     { type: String, required: true, trim: true },
  back:      { type: String, required: true, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Flashcard', FlashcardSchema);
