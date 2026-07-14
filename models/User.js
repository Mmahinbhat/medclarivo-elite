const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const { ROLE_LIST, ROLES } = require('../utils/rbacConstants');

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
    enum: ROLE_LIST, // <- defined in utils/rbacConstants.js; add new roles there only
    default: ROLES.STUDENT,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  lastLogin: { type: Date },

  // RBAC — dormant multi-tenancy field. Unused today (every user is
  // effectively in one implicit organization). If multi-tenancy is turned
  // on later, start populating this and the permission engine already
  // knows how to scope by it — no migration of this field's *type* needed.
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },

  // Bumped on every role/permission-affecting change (role edit, suspension,
  // permission override). Embedded in the JWT at login; if it doesn't match
  // the live DB value on a request, the token is treated as stale and the
  // user must log in again — this is how role changes take effect quickly
  // without a server-side session store.
  permissionVersion: { type: Number, default: 1 },

  isActive: { type: Boolean, default: true }, // suspension flag
  suspendedAt: { type: Date, default: null },
  suspendedReason: { type: String, default: null },

  // Password reset — store only a hash of the token (like a password),
  // never the raw token, so a DB read alone can't be used to reset an
  // account. Raw token is emailed to the user and never persisted.
  resetPasswordTokenHash: { type: String, default: null, select: false },
  resetPasswordExpires:   { type: Date, default: null, select: false },

  // Basic brute-force throttle on top of the IP rate limiter — locks
  // the *account* after repeated bad passwords, independent of which
  // IP the attempts came from.
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil:           { type: Date, default: null },

  // Mentorship — meaning depends on role:
  //   role: 'student'   -> the mentor this student is assigned to
  //   role: 'assistant' -> the mentor this assistant is delegated from
  // (kept as one field to match your existing schema/usage rather than
  // introducing a second, near-duplicate field)
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // Parent-only link -- the student this parent account can view.
  // Set manually by staff (scripts/assignChild.js), same pattern as mentorId.
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // Mentor-only profile fields (ignored for students)
 mentorProfile: {
    title:               { type: String },  // e.g. "AIIMS Delhi '19 · AIR 7"
    bio:                 { type: String },
    specialty:           { type: String },
    rating:              { type: Number, default: 5.0 },
    reviewCount:         { type: Number, default: 0 },
    weeklySessionTarget: { type: Number, default: 8 },
    availabilityType:    { type: String, enum: ['full_time', 'part_time'], default: 'full_time' },
  },
  // Study stats (used by Study Mode / dashboard)
  totalStudyMinutes: { type: Number, default: 0 },
  streak:            { type: Number, default: 0 },
  lastStudyDate:     { type: Date },
  level:             { type: Number, default: 1 },
  xp:                { type: Number, default: 0 },
  xpPerLevel:        { type: Number, default: 1000 },
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

// Enforce role-specific requirements at the schema level (second line of
// defense after the service layer).
UserSchema.pre('validate', function (next) {
  if (this.role === ROLES.ASSISTANT && !this.mentorId) {
    return next(new Error('Assistant must be linked to a mentorId.'));
  }
  next();
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

UserSchema.methods.bumpPermissionVersion = function () {
  this.permissionVersion += 1;
  return this.save();
};

// ── Login lockout ──────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 10;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

UserSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

UserSchema.methods.registerFailedLogin = function () {
  // If a previous lock already expired, start counting fresh.
  if (this.lockUntil && this.lockUntil <= Date.now()) {
    this.failedLoginAttempts = 0;
    this.lockUntil = null;
  }
  this.failedLoginAttempts += 1;
  if (this.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    this.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
  }
  return this.save();
};

UserSchema.methods.registerSuccessfulLogin = function () {
  this.failedLoginAttempts = 0;
  this.lockUntil = null;
  this.lastLogin = new Date();
  return this.save();
};

// Strip sensitive fields from JSON output
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
