const mongoose = require('mongoose');

// A student's request to switch to a different mentor. Reviewed by an admin.
const MentorChangeRequestSchema = new mongoose.Schema({
  student:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  currentMentor:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  preferredMentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason:          { type: String, trim: true, required: true, maxlength: 1000 },
  status:          { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending', index: true },
  newMentor:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adminNote:       { type: String, trim: true, maxlength: 1000 },
  resolvedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt:      { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('MentorChangeRequest', MentorChangeRequestSchema);
