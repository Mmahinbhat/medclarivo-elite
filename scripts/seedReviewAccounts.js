/**
 * Creates (or resets) the demo accounts for Apple / Google app review.
 *
 *   node scripts/seedReviewAccounts.js
 *
 * Safe to run again at any time — e.g. if a reviewer tests "Delete account".
 * It (re)creates:
 *   • a demo STUDENT (email-verified, onboarding done, mentor assigned)
 *   • a demo MENTOR linked to that student
 *   • a welcome message from the mentor, so Messages isn't empty
 * and prints fresh passwords for both. Paste them into App Store Connect →
 * TestFlight → Test Information → Beta App Review Information.
 *
 * Needs MONGO_URI in .env (run from the project root).
 */
require('dotenv').config();
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');

const STUDENT_EMAIL = 'review.student@medclarivo.com';
const MENTOR_EMAIL  = 'review.mentor@medclarivo.com';

// Readable but strong: e.g. "Review-7Kq2-xT9m"
const makePassword = () => {
  const s = crypto.randomBytes(6).toString('base64').replace(/[^A-Za-z0-9]/g, 'x');
  return `Review-${s.slice(0, 4)}-${s.slice(4, 8)}`;
};

async function upsertUser(email, fields, password) {
  let user = await User.findOne({ email });
  if (!user) user = new User({ email });
  Object.assign(user, fields);
  user.passwordHash = password;          // hashed by the User pre-save hook
  user.isVerified = true;                 // skips the email-code screen
  user.isActive = true;
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.permissionVersion = (user.permissionVersion || 1) + 1; // sign out old sessions
  await user.save();
  return user;
}

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI not set. Run from the project root where .env lives.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);

  const mentorPassword = makePassword();
  const studentPassword = makePassword();

  const mentor = await upsertUser(MENTOR_EMAIL, {
    name: 'Dr. Review Mentor',
    role: 'mentor',
    onboardingComplete: true,
    mentorProfile: { title: 'Demo mentor account for App Review', specialty: 'Biology & Chemistry' },
  }, mentorPassword);

  const student = await upsertUser(STUDENT_EMAIL, {
    name: 'Review Student',
    role: 'student',
    onboardingComplete: true,
    onboarding: { exam: 'NEET UG', level: 'Class 12', institution: 'Demo School', hours: '4-6', prevScore: 480, targetScore: 650 },
    mentorId: mentor._id,
    xp: 350, level: 1, streak: 3, totalStudyMinutes: 240,
  }, studentPassword);

  const hasChat = await Message.exists({ sender: mentor._id, recipient: student._id });
  if (!hasChat) {
    await Message.create({
      sender: mentor._id,
      recipient: student._id,
      content: 'Welcome to MedClarivo! I\'m your mentor. Send me any doubt here, or tap the call button to talk.',
    });
  }

  console.log('\n✅ Review accounts ready.\n');
  console.log('  STUDENT  (use this in "User Name / Password")');
  console.log(`    email:    ${STUDENT_EMAIL}`);
  console.log(`    password: ${studentPassword}\n`);
  console.log('  MENTOR   (mention this in the "Notes" box)');
  console.log(`    email:    ${MENTOR_EMAIL}`);
  console.log(`    password: ${mentorPassword}\n`);
  console.log('  Running this again creates new passwords — update App Store Connect if you do.\n');
  await mongoose.disconnect();
}

run().catch((err) => { console.error('❌ Error:', err.message); process.exit(1); });
