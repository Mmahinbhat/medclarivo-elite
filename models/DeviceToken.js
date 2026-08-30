const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token:     { type: String, required: true, unique: true },
  platform:  { type: String, enum: ['ios', 'android', 'web'], default: 'ios' },
  userAgent: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);
