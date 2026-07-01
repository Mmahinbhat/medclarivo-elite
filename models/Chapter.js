const mongoose = require('mongoose');

const ChapterSchema = new mongoose.Schema({
  subject:          { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  title:            { type: String, required: true },
  order:            { type: Number, default: 0 },
  totalUnits:       { type: Number, default: 1 },
  estimatedMinutes: { type: Number, default: 45 },
}, { timestamps: true });

module.exports = mongoose.model('Chapter', ChapterSchema);
