const express  = require('express');
const crypto   = require('crypto');
const router   = express.Router();
const { body, validationResult } = require('express-validator');
const passport = require('../config/passport');
const User     = require('../models/User');
const { signToken } = require('../utils/jwt');
const { protect }   = require('../middleware/auth');
const { sendPasswordResetEmail, sendVerificationCodeEmail } = require('../services/email.service');
const { getAuth: getAdminAuth } = require('firebase-admin/auth');

// ── Helper: send token response ───────────────────────────────
const sendToken = (res, user, statusCode = 200) => {
  const token = signToken(user);
  res.status(statusCode).json({
    success: true,
    token,
    user,
  });
};

// ── EMAIL_OTP_V1: 6-digit email code at signup ────────────────
const EmailVerification = require('../models/EmailVerification');
const EMAIL_CODE_TTL_MS         = 10 * 60 * 1000; // code valid 10 min
const EMAIL_CODE_MAX_ATTEMPTS   = 5;              // wrong tries per code
const EMAIL_RESEND_COOLDOWN_MS  = 60 * 1000;      // 1 send per minute
const EMAIL_MAX_SENDS_PER_HOUR  = 5;

const hashEmailCode = (userId, code) =>
  crypto.createHash('sha256').update(`${userId}:${code}`).digest('hex');

// Password accounts that never confirmed their email can't log in yet.
const needsEmailVerification = (user) => !user.isVerified && !!user.passwordHash;

const emailQuery = (raw) => {
  const e = String(raw || '').trim();
  return { email: { $in: [...new Set([e, e.toLowerCase()])] } };
};

async function issueEmailCode(user) {
  const now = Date.now();
  let rec = await EmailVerification.findOne({ user: user._id });
  if (!rec) rec = new EmailVerification({ user: user._id, sends: [] });

  const recent = (rec.sends || []).filter((t) => now - new Date(t).getTime() < 60 * 60 * 1000);
  const last = recent.length ? new Date(recent[recent.length - 1]).getTime() : 0;
  if (last && now - last < EMAIL_RESEND_COOLDOWN_MS) {
    return { sent: false, retryAfter: Math.ceil((EMAIL_RESEND_COOLDOWN_MS - (now - last)) / 1000) };
  }
  if (recent.length >= EMAIL_MAX_SENDS_PER_HOUR) return { sent: false, limited: true };

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  rec.codeHash = hashEmailCode(user._id, code);
  rec.codeExpiresAt = new Date(now + EMAIL_CODE_TTL_MS);
  rec.attempts = 0;
  rec.sends = [...recent, new Date(now)];
  rec.expireAt = new Date(now + 24 * 60 * 60 * 1000);
  await rec.save();
  // Send in the background so signup isn't kept waiting on Gmail (code is already saved)
  sendVerificationCodeEmail(user, code).catch((e) => console.error('[Email OTP] send failed:', e.message));
  return { sent: true };
}

// ── Helper: redirect with token (OAuth flows) ─────────────────
const redirectWithToken = (res, user, state) => {
  const token = signToken(user);
  // Native app requests pass state=native through the OAuth flow (see /google route
  // below) so we can redirect back into the app via its custom URL scheme instead
  // of a regular web URL.
  if (state === 'native') {
    return res.redirect(`medclarivo://auth?token=${token}`);
  }
  const clientUrl = process.env.CLIENT_REDIRECT_URL || process.env.CLIENT_URL || 'http://localhost:3000';
  res.redirect(`${clientUrl}?token=${token}`);
};

// ════════════════════════════════════════════════════════════════
// POST /api/auth/register
// ════════════════════════════════════════════════════════════════
router.post('/register', [
  body('email').isEmail().withMessage('Valid email required.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('name').notEmpty().withMessage('Name is required.'),
  body('phone').optional({ checkFalsy: true }).isMobilePhone('any').withMessage('Valid phone number required.'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, email, password, phone } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      // Signed up before but never entered the code? Same password -> send a fresh code.
      if (needsEmailVerification(existing) && await existing.comparePassword(password)) {
        await issueEmailCode(existing).catch((e) => console.error('[Email OTP] send failed:', e.message));
        return res.json({ success: true, needsVerification: true, email: existing.email,
          message: 'We sent a 6-digit code to your email.' });
      }
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({
      name,
      email,
      phone,
      phoneVerified: false,
      passwordHash: password, // hashed by pre-save hook
    });

    // No login token yet — the account must confirm its email first.
    try { await issueEmailCode(user); } catch (e) { console.error('[Email OTP] send failed:', e.message); }
    res.status(201).json({ success: true, needsVerification: true, email: user.email,
      message: 'We sent a 6-digit code to your email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/auth/login
// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// POST /api/auth/verify-email  { email, code } — confirm signup code, then log in
// ════════════════════════════════════════════════════════════════
router.post('/verify-email', [
  body('email').isEmail().withMessage('Valid email required.'),
  body('code').matches(/^\d{6}$/).withMessage('Enter the 6-digit code.'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  const invalid = () => res.status(400).json({ success: false, message: 'This code is invalid or has expired. Tap "Resend code".' });

  try {
    const user = await User.findOne(emailQuery(req.body.email));
    const rec = user ? await EmailVerification.findOne({ user: user._id }) : null;
    if (!user || !rec) return invalid();

    if (user.isVerified) {
      await rec.deleteOne();
      return res.status(400).json({ success: false, message: 'This email is already verified. Please log in.' });
    }
    if (rec.codeExpiresAt < new Date()) return invalid();
    if (rec.attempts >= EMAIL_CODE_MAX_ATTEMPTS) {
      return res.status(429).json({ success: false, message: 'Too many wrong tries. Tap "Resend code" to get a new one.' });
    }

    const given = Buffer.from(hashEmailCode(user._id, req.body.code), 'hex');
    const stored = Buffer.from(rec.codeHash, 'hex');
    if (given.length !== stored.length || !crypto.timingSafeEqual(given, stored)) {
      rec.attempts += 1;
      await rec.save();
      const left = EMAIL_CODE_MAX_ATTEMPTS - rec.attempts;
      return res.status(400).json({
        success: false,
        message: left > 0 ? `Incorrect code. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong tries. Tap "Resend code" to get a new one.',
      });
    }

    user.isVerified = true;
    await user.save();
    await rec.deleteOne();

    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: 'This account has been suspended.' });
    }
    await user.registerSuccessfulLogin();
    sendToken(res, user);
  } catch (err) {
    console.error('[Verify Email Error]', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/auth/resend-verification  { email }
// ════════════════════════════════════════════════════════════════
router.post('/resend-verification', [
  body('email').isEmail().withMessage('Valid email required.'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  const generic = { success: true, message: 'If that account still needs verifying, a new code has been sent.' };
  try {
    const user = await User.findOne(emailQuery(req.body.email));
    if (!user || !needsEmailVerification(user)) return res.json(generic);

    const r = await issueEmailCode(user);
    if (r.retryAfter) {
      return res.status(429).json({ success: false, retryAfter: r.retryAfter,
        message: `Please wait ${r.retryAfter}s before asking for another code.` });
    }
    if (r.limited) {
      return res.status(429).json({ success: false, retryAfter: 3600,
        message: 'Too many codes requested. Please try again in an hour.' });
    }
    res.json(generic);
  } catch (err) {
    console.error('[Resend Verification Error]', err.message);
    res.status(500).json({ success: false, message: 'Could not send a new code. Please try again.' });
  }
});

router.post('/login', [
  body('identifier').notEmpty().withMessage('Email or phone required.'),
  body('password').notEmpty().withMessage('Password required.'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    const { identifier, password } = req.body;

    // Find by email or phone
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
    });

    // Same "invalid credentials" message whether the account is locked-out-and-
    // guessed-right or just doesn't exist / wrong password — avoids leaking
    // which accounts exist or are currently locked.
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Too many failed attempts on this account. Try again in a few minutes.',
      });
    }

    if (!(await user.comparePassword(password))) {
      await user.registerFailedLogin();
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'This account has been suspended.' + (user.suspendedReason ? ` Reason: ${user.suspendedReason}` : ''),
      });
    }

    if (needsEmailVerification(user)) {
      const r = await issueEmailCode(user).catch((e) => { console.error('[Email OTP] send failed:', e.message); return {}; });
      return res.status(403).json({
        success: false, needsVerification: true, email: user.email,
        message: r.sent ? 'Please verify your email — we sent you a new 6-digit code.'
                        : 'Please verify your email with the code we sent you.',
      });
    }

    await user.registerSuccessfulLogin();

    sendToken(res, user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/auth/me  (protected)
// ════════════════════════════════════════════════════════════════
router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});
// ════════════════════════════════════════════════════════════════
// GET /api/auth/my-mentor  (protected) — the logged-in student's
// assigned mentor, or mentorAssigned: false if none yet.
// ════════════════════════════════════════════════════════════════
router.get('/my-mentor', protect, async (req, res) => {
  try {
    // Only students have an assigned mentor in the "My Mentor" sense. If a
    // non-student account (e.g. a mentor whose own mentorId field is
    // unexpectedly set) hits this, don't look anything up — otherwise a
    // mentor could see themselves (or another mentor) rendered as "their
    // mentor" on the student dashboard.
    if (req.user.role !== 'student') {
      return res.json({ success: true, mentorAssigned: false, mentor: null });
    }

    if (!req.user.mentorId) {
      return res.json({ success: true, mentorAssigned: false, mentor: null });
    }

    const mentor = await User.findById(req.user.mentorId)
      .select('name avatar mentorProfile email');

    if (!mentor) {
      return res.json({ success: true, mentorAssigned: false, mentor: null });
    }

    res.json({ success: true, mentorAssigned: true, mentor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════════
// PATCH /api/auth/onboarding  (protected) — save onboarding answers
// ════════════════════════════════════════════════════════════════
router.patch('/onboarding', protect, async (req, res) => {
  try {
    const { exam, level, institution, hours, prevScore, targetScore } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.onboarding = { exam, level, institution, hours, prevScore, targetScore };
    user.onboardingComplete = true;
    await user.save();

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});
// ════════════════════════════════════════════════════════════════
// GOOGLE OAuth
// ════════════════════════════════════════════════════════════════
router.get('/google', (req, res, next) => {
  const state = req.query.native === '1' ? 'native' : 'web';
  passport.authenticate('google', { scope: ['profile', 'email'], session: false, state, prompt: 'select_account' })(req, res, next);
});

router.get('/google/callback',
  (req, res, next) => passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}?error=google_failed` })(req, res, next),
  (req, res) => redirectWithToken(res, req.user, req.query.state)
);

// ════════════════════════════════════════════════════════════════
// APPLE Sign-In
// ════════════════════════════════════════════════════════════════
router.get('/apple', (req, res, next) => {
  const state = req.query.native === '1' ? 'native' : 'web';
  passport.authenticate('apple', { session: false, state })(req, res, next);
});

router.post('/apple/callback',
  passport.authenticate('apple', { session: false, failureRedirect: `${process.env.CLIENT_URL}?error=apple_failed` }),
  (req, res) => redirectWithToken(res, req.user, req.body.state)
);

// ════════════════════════════════════════════════════════════════
// POST /api/auth/phone-login  — Firebase Phone Auth (OTP)
// Client sends a Firebase ID token after phone verification;
// backend verifies it, finds or creates the user, returns JWT.
// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// POST /api/auth/otp-request — ask permission BEFORE sending an SMS.
// Limits: 5 OTPs per phone number and 20 per network, per rolling 24h.
// ════════════════════════════════════════════════════════════════
const OtpRequest = require('../models/OtpRequest');
const OTP_PER_PHONE_PER_DAY = 5;
const OTP_PER_IP_PER_DAY = 20;

router.post('/otp-request', [
  body('phone').matches(/^\+[1-9]\d{7,14}$/).withMessage('Phone must be in +91XXXXXXXXXX format.'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  try {
    const phone = req.body.phone;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [byPhone, byIp] = await Promise.all([
      OtpRequest.countDocuments({ phone, createdAt: { $gte: since } }),
      OtpRequest.countDocuments({ ip: req.ip, createdAt: { $gte: since } }),
    ]);
    if (byPhone >= OTP_PER_PHONE_PER_DAY) {
      return res.status(429).json({ success: false, message: "You've reached the limit of 5 OTPs for this number today. Please try again tomorrow." });
    }
    if (byIp >= OTP_PER_IP_PER_DAY) {
      return res.status(429).json({ success: false, message: 'Too many OTP requests from this network today. Please try again tomorrow.' });
    }
    await OtpRequest.create({ phone, ip: req.ip });
    res.json({ success: true, remainingToday: OTP_PER_PHONE_PER_DAY - byPhone - 1 });
  } catch (err) {
    console.error('[OTP Request Error]', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/auth/link-phone  (logged in) — verify a phone via Firebase OTP
// and link it to the CURRENT account (Settings → Verify phone).
// ════════════════════════════════════════════════════════════════
router.post('/link-phone', protect, [
  body('firebaseIdToken').notEmpty().withMessage('Firebase ID token required.'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(req.body.firebaseIdToken);
    const phoneNumber = decoded.phone_number;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'No phone number in token.' });
    }
    const variants = [phoneNumber, phoneNumber.replace(/^\+/, '')];

    const taken = await User.findOne({
      _id: { $ne: req.user._id }, phone: { $in: variants }, phoneVerified: true,
    }).select('_id').lean();
    if (taken) {
      return res.status(409).json({ success: false, message: 'This number is already linked to another account.' });
    }

    await User.updateMany(
      { _id: { $ne: req.user._id }, phone: { $in: variants }, phoneVerified: { $ne: true } },
      { $unset: { phone: 1 } }
    );

    const me = await User.findById(req.user._id);
    me.phone = phoneNumber;
    me.phoneVerified = true;
    await me.save();

    res.json({ success: true, phone: phoneNumber, phoneVerified: true });
  } catch (err) {
    console.error('[Link Phone Error]', err.message);
    if (typeof err.code === 'string' && err.code.startsWith('auth/')) {
      return res.status(401).json({ success: false, message: 'Invalid verification. Please try again.' });
    }
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.post('/phone-login', [
  body('firebaseIdToken').notEmpty().withMessage('Firebase ID token required.'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    // Verify the Firebase ID token
    const decodedToken = await getAdminAuth().verifyIdToken(req.body.firebaseIdToken);
    const phoneNumber = decodedToken.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'No phone number in token.' });
    }

    // Normalize phone — strip leading + for DB lookup, try with and without
    const phoneVariants = [phoneNumber, phoneNumber.replace(/^\+/, '')];

    // Find existing user by phone
    // Only trust numbers already verified by OTP. An unverified number (typed in at
    // email signup) is released, so nobody can claim someone else's phone.
    await User.updateMany(
      { phone: { $in: phoneVariants }, phoneVerified: { $ne: true } },
      { $unset: { phone: 1 } }
    );
    let user = await User.findOne({ phone: { $in: phoneVariants }, phoneVerified: true });

    if (user) {
      // Mark phone as verified
      if (!user.phoneVerified) {
        user.phoneVerified = true;
        await user.save();
      }

      if (user.isActive === false) {
        return res.status(403).json({
          success: false,
          message: 'This account has been suspended.' + (user.suspendedReason ? ` Reason: ${user.suspendedReason}` : ''),
        });
      }

      await user.registerSuccessfulLogin();
      return sendToken(res, user);
    }

    // No user found with this phone — create a new account
    // Email is required+unique in the User model, so generate a placeholder
    // that the user can update later in settings.
    const placeholderEmail = `phone_${phoneNumber.replace(/\D/g, '')}@medclarivo.local`;
    user = await User.create({
      name: 'User',
      email: placeholderEmail,
      phone: phoneNumber,
      phoneVerified: true,
    });

    sendToken(res, user, 201);
  } catch (err) {
    console.error('[Phone Login Error]', err.message);
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ success: false, message: 'OTP session expired. Please try again.' });
    }
    if (typeof err.code === 'string' && err.code.startsWith('auth/')) {
      return res.status(401).json({ success: false, message: 'Invalid verification. Please try again.' });
    }
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/auth/logout  (client just discards token; this is informational)
// ════════════════════════════════════════════════════════════════
router.post('/logout', protect, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

// POST /api/auth/logout-all — invalidate every existing login token for this user
router.post('/logout-all', protect, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $set: { permissionVersion: (req.user.permissionVersion || 1) + 1 } }
    );
    res.json({ success: true, message: 'Logged out of all devices.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});


// ════════════════════════════════════════════════════════════════
// PATCH /api/auth/profile  (protected) — update own name/avatar
// ════════════════════════════════════════════════════════════════
router.patch('/profile', protect, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (name !== undefined) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    await user.save();

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/auth/forgot-password
// Always returns success (even for unknown emails / OAuth-only
// accounts) so the response can't be used to enumerate registered
// addresses. The real work only happens if a matching, password-based
// account exists.
// ════════════════════════════════════════════════════════════════
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email required.'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  const genericResponse = {
    success: true,
    message: 'If an account with that email exists, a reset link has been sent.',
  };

  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    // Don't reveal whether the account exists, and don't offer a
    // password reset for OAuth-only accounts (no passwordHash to reset).
    if (!user || !user.passwordHash) {
      return res.json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    await user.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const resetUrl = `${clientUrl}/reset-password.html?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    // Send in the background — the response is the same either way
    sendPasswordResetEmail(user, resetUrl).catch((e) => console.error('[Reset email] send failed:', e.message));

    res.json(genericResponse);
  } catch (err) {
    console.error(err);
    // Still return the generic message — don't leak internal errors
    // through a difference in response shape.
    res.json(genericResponse);
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/auth/reset-password
// Body: { email, token, newPassword }
// ════════════════════════════════════════════════════════════════
router.post('/reset-password', [
  body('email').isEmail().withMessage('Valid email required.'),
  body('token').notEmpty().withMessage('Reset token required.'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    const { email, token, newPassword } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordTokenHash +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ success: false, message: 'This reset link is invalid or has expired.' });
    }

    user.passwordHash = newPassword; // re-hashed by the pre-save hook
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpires = null;
    user.permissionVersion += 1; // invalidate any existing JWTs
    user.isVerified = true; // the reset link proved they own this inbox
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    res.json({ success: true, message: 'Password reset. Please log in with your new password.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════════
// PATCH /api/auth/change-password  (protected)
// ════════════════════════════════════════════════════════════════
router.patch('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const valid = await user.comparePassword(currentPassword);
    if (!valid) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    user.passwordHash = newPassword;
    user.permissionVersion += 1;
    await user.save();

    res.json({ success: true, message: 'Password updated. Please log in again.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});
module.exports = router;
