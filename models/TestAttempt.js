const mongoose = require('mongoose');

const TestAttemptSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  examGroup:  { type: String, required: true },
  subjects:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  questions: [{
    question:    { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedKey: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
    correctKey:  { type: String, required: true },
    isCorrect:   { type: Boolean, default: false },
  }],
  totalQuestions: { type: Number, required: true },
  correctCount:   { type: Number, default: 0 },
  scorePercent:   { type: Number, default: 0 },
  status:         { type: String, enum: ['in_progress', 'submitted'], default: 'in_progress' },
  startedAt:      { type: Date, default: Date.now },
  submittedAt:    { type: Date },
  durationSeconds: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('TestAttempt', TestAttemptSchema);
