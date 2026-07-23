const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:   { type: String, required: true, trim: true, maxlength: 2000 },
  isAnswer:  { type: Boolean, default: false }, // marked as accepted answer
}, { timestamps: true });

const doubtSchema = new mongoose.Schema({
  student:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject:   { type: String, required: true, trim: true },
  topic:     { type: String, trim: true },
  question:  { type: String, required: true, trim: true, maxlength: 3000 },
  tags:      [{ type: String, trim: true }],
  status:    { type: String, enum: ['open', 'answered', 'closed'], default: 'open' },
  priority:  { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  replies:   [replySchema],
  views:     { type: Number, default: 0 },
}, { timestamps: true });

doubtSchema.index({ student: 1, createdAt: -1 });
doubtSchema.index({ status: 1 });
doubtSchema.index({ subject: 1 });

module.exports = mongoose.model('Doubt', doubtSchema);
