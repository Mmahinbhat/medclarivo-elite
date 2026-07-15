const mongoose = require('mongoose');

const SessionNoteSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    unique: true,
  },
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
  privateNotes: { type: String, trim: true, default: '' },
  sharedNotes: { type: String, trim: true, default: '' },
  recordings: [{
    label: { type: String, trim: true },
    durationSeconds: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  }],
  attachments: [{
    filename: { type: String, trim: true },
    url: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now },
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('SessionNote', SessionNoteSchema);
