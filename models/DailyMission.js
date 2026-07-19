const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  id:            { type: String, required: true }, // short client-side id, stable within a day's task list
  subject:       { type: String, required: true, trim: true },   // e.g. "Biology", "Revision"
  title:         { type: String, required: true, trim: true },   // e.g. "Revision: Plant Kingdom"
  durationLabel: { type: String, default: '' },                   // e.g. "45 min", "1.5 hrs"
  priority:      { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
}, { _id: false });

const dailyMissionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  completedTaskIds: { type: [String], default: [] },
  // The actual mission content. Empty until a mentor assigns it for the day.
  tasks: { type: [taskSchema], default: [] },
  // Who set this mission (mentor or admin) -- null if never set.
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

dailyMissionSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyMission', dailyMissionSchema);
