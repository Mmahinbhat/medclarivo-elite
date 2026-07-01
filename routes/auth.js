const express  = require('express');
const router   = express.Router();
const { body, validationResult } = require('express-validator');
const passport = require('../config/passport');
const User     = require('../models/User');
const { signToken } = require('../utils/jwt');
const { protect }   = require('../middleware/auth');

// ── Helper: send token response ───────────────────────────────
const sendToken = (res, user, statusCode = 200) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user,
  });
};

// ── Helper: redirect with token (OAuth flows) ─────────────────
const redirectWithToken = (res, user) => {
  const token    = signToken(user._id);
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
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, email, password, phone } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({
      name,
      email,
      phone,
      passwordHash: password, // hashed by pre-save hook
    });

    sendToken(res, user, 201);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/auth/login
// ════════════════════════════════════════════════════════════════
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

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    user.lastLogin = new Date();
    await user.save();

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
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}?error=google_failed` }),
  (req, res) => redirectWithToken(res, req.user)
);

// ════════════════════════════════════════════════════════════════
// APPLE Sign-In
// ════════════════════════════════════════════════════════════════
router.get('/apple',
  passport.authenticate('apple', { session: false })
);

router.post('/apple/callback',
  passport.authenticate('apple', { session: false, failureRedirect: `${process.env.CLIENT_URL}?error=apple_failed` }),
  (req, res) => redirectWithToken(res, req.user)
);

// ════════════════════════════════════════════════════════════════
// POST /api/auth/logout  (client just discards token; this is informational)
// ════════════════════════════════════════════════════════════════
router.post('/logout', protect, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

module.exports = router;
