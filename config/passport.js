const passport      = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const AppleStrategy  = require('passport-apple');
const User           = require('../models/User');

// ── Google (only initialize if credentials are provided) ───────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email  = profile.emails?.[0]?.value;
      const avatar = profile.photos?.[0]?.value;

      let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });

      if (user) {
        // Link Google ID if signing in via email account for first time
        if (!user.googleId) { user.googleId = profile.id; await user.save(); }
      } else {
        user = await User.create({
          googleId:   profile.id,
          name:       profile.displayName,
          email,
          avatar,
          isVerified: true,
        });
      }

      user.lastLogin = new Date();
      await user.save();
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));
} else {
  console.log('⚠️  Google OAuth not configured — skipping Google strategy.');
}

// ── Apple (only initialize if credentials are provided) ─────────
if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
  passport.use(new AppleStrategy({
    clientID:    process.env.APPLE_CLIENT_ID,
    teamID:      process.env.APPLE_TEAM_ID,
    keyID:       process.env.APPLE_KEY_ID,
    privateKeyString: process.env.APPLE_PRIVATE_KEY,
    callbackURL: process.env.APPLE_CALLBACK_URL,
    passReqToCallback: true,
  }, async (req, accessToken, refreshToken, idToken, profile, done) => {
    try {
      const appleId = idToken.sub;
      const email   = idToken.email || req.body?.user
        ? JSON.parse(req.body.user || '{}').email
        : null;
      const nameObj = req.body?.user
        ? JSON.parse(req.body.user || '{}').name
        : null;
      const name = nameObj
        ? `${nameObj.firstName || ''} ${nameObj.lastName || ''}`.trim()
        : null;

      let user = await User.findOne({ $or: [{ appleId }, ...(email ? [{ email }] : [])] });

      if (user) {
        if (!user.appleId) { user.appleId = appleId; await user.save(); }
      } else {
        user = await User.create({
          appleId,
          name:       name || 'Apple User',
          email,
          isVerified: true,
        });
      }

      user.lastLogin = new Date();
      await user.save();
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));
} else {
  console.log('⚠️  Apple Sign-In not configured — skipping Apple strategy.');
}

module.exports = passport;
