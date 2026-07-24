const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  subject:    { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  chapter:    { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
  examGroup:  { type: String, required: true, index: true }, // denormalized from Subject for fast filtering
  text:       { type: String, required: true, trim: true },
  options: [{
    key:  { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    text: { type: String, required: true, trim: true },
  }],
  correctKey:  { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
  explanation: { type: String, trim: true, default: '' },
  difficulty:  { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
}, { timestamps: true });

module.exports = mongoose.model('Question', QuestionSchema);
