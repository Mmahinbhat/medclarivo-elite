const mongoose = require('mongoose');

const MentorRequestSchema = new mongoose.Schema({
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: { type: String, trim: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending',
  },
  respondedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('MentorRequest', MentorRequestSchema);
