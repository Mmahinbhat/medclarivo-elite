const mongoose = require('mongoose');

const EvaluationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  academicScore: { type: Number, min: 0, max: 100, default: 0 },
  behaviourScore: { type: Number, min: 0, max: 100, default: 0 },
  attendanceScore: { type: Number, min: 0, max: 100, default: 0 },
  communicationScore: { type: Number, min: 0, max: 100, default: 0 },
  qualitativeComments: { type: String, trim: true, default: '' },
  improvementAreas: { type: String, trim: true, default: '' },
  milestones: { type: String, trim: true, default: '' },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
  },
  publishedAt: { type: Date, default: null },
  guardianStatus: {
    type: String,
    enum: ['pending', 'notified', 'endorsed'],
    default: 'pending',
  },
  guardianReply: { type: String, trim: true, default: '' },
  guardianRespondedAt: { type: Date, default: null },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

EvaluationSchema.virtual('diagnosticRating').get(function () {
  const total = this.academicScore + this.behaviourScore + this.attendanceScore + this.communicationScore;
  return Math.round(total / 4);
});

EvaluationSchema.set('toJSON', { virtuals: true });
EvaluationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Evaluation', EvaluationSchema);
