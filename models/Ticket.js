const mongoose = require('mongoose');

const TICKET_CATEGORIES = [
  'asked_personal_contact',
  'inappropriate_behavior',
  'inappropriate_language',
  'other',
];

const TICKET_STATUSES = ['open', 'reviewing', 'resolved'];

const ticketSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mentor:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  category: { type: String, enum: TICKET_CATEGORIES, required: true },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: TICKET_STATUSES, default: 'open' },
  adminNotes: { type: String, default: null },
  contactedAt: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

ticketSchema.index({ student: 1, createdAt: -1 });
ticketSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);
module.exports.TICKET_CATEGORIES = TICKET_CATEGORIES;
module.exports.TICKET_STATUSES = TICKET_STATUSES;
