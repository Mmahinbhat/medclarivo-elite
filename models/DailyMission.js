const mongoose = require('mongoose');

const dailyMissionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  completedTaskIds: { type: [String], default: [] },
}, { timestamps: true });

dailyMissionSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyMission', dailyMissionSchema);
