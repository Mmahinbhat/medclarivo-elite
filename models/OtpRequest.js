const mongoose = require('mongoose');

// One document per OTP send request. MongoDB deletes each one 24h after it
// was created (TTL index), giving a rolling 24-hour window for daily limits.
const otpRequestSchema = new mongoose.Schema({
  phone:     { type: String, required: true, index: true },
  ip:        { type: String, index: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});

module.exports = mongoose.model('OtpRequest', otpRequestSchema);
