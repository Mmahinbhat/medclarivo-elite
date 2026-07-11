const mongoose = require('mongoose');

// One document per mentor. `slots` is a simple list of open windows,
// each tied to a day of the week (0 = Sunday ... 6 = Saturday).
const AvailabilitySlotSchema = new mongoose.Schema({
  day: { type: Number, min: 0, max: 6, required: true },
  startTime: { type: String, required: true }, // "HH:MM", 24-hour, e.g. "14:00"
  endTime: { type: String, required: true },   // "HH:MM", 24-hour, e.g. "18:00"
}, { _id: false });

const MentorAvailabilitySchema = new mongoose.Schema({
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  slots: {
    type: [AvailabilitySlotSchema],
    default: [],
  },
}, { timestamps: true });

module.exports = mongoose.model('MentorAvailability', MentorAvailabilitySchema);
