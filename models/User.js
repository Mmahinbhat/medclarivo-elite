const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  passwordHash: {
    type: String, // null for OAuth-only users
  },
  // OAuth
  googleId:  { type: String },
  appleId:   { type: String },
  avatar:    { type: String },
  // Meta
  role: {
    type: String,
    enum: ['student', 'mentor', 'admin'],
    default: 'student',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  lastLogin: { type: Date },
  // Onboarding
  onboardingComplete: {
    type: Boolean,
    default: false,
  },
  onboarding: {
    exam:        { type: String },
    level:       { type: String },
    institution: { type: String },
    hours:       { type: String },
    prevScore:   { type: Number },
    targetScore: { type: Number },
  },
}, {
  timestamps: true,
});

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// Compare password
UserSchema.methods.comparePassword = async function (candidate) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidate, this.passwordHash);
};

// Strip sensitive fields from JSON output
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
