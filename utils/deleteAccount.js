// Permanently deletes a user and everything that belongs to them.
// Used by POST /api/auth/delete-account (self-service, App Store / Play requirement).
//
// Kept on purpose (safety / legal records, no longer linked to a live account):
//   • Ticket   — "Report a Concern" safety reports
//   • AuditLog — admin action history
const { getAuth: getAdminAuth } = require('firebase-admin/auth');
const User = require('../models/User');
const { revokeAppleToken } = require('./appleRevoke');

const m = (name) => require('../models/' + name);

// Roles allowed to delete themselves from the app. Mentors, assistants and
// admins are staff accounts created by the team — they go through support.
const SELF_DELETE_ROLES = ['student', 'parent'];

async function deleteFirebasePhoneUser(phone) {
  if (!phone) return;
  const digits = String(phone).replace(/[^\d+]/g, '');
  const e164 = digits.startsWith('+') ? digits : '+91' + digits.replace(/^0+/, '').slice(-10);
  try {
    const fbUser = await getAdminAuth().getUserByPhoneNumber(e164);
    await getAdminAuth().deleteUser(fbUser.uid);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') console.warn('[Delete account] Firebase phone user:', err.message);
  }
}

async function deleteUserAndData(userId) {
  const user = await User.findById(userId).select('+appleRefreshToken');
  if (!user) return { deleted: false, reason: 'not_found' };
  const id = user._id;

  // 1. Everything that belongs to the user. If any of these fail we stop
  //    before removing the User document, so the request can simply be retried.
  await Promise.all([
    m('UserProgress').deleteMany({ user: id }),
    m('TestAttempt').deleteMany({ user: id }),
    m('StudySession').deleteMany({ user: id }),
    m('FlashcardProgress').deleteMany({ user: id }),
    m('DailyMission').deleteMany({ user: id }),
    m('DeviceToken').deleteMany({ user: id }),
    m('PushSubscription').deleteMany({ user: id }),
    m('NotificationRead').deleteMany({ user: id }),
    m('Notification').deleteMany({ recipient: id }),
    m('EmailVerification').deleteMany({ user: id }),
    m('Doubt').deleteMany({ student: id }),
    m('Doubt').updateMany({ 'replies.author': id }, { $pull: { replies: { author: id } } }),
    m('MentorRequest').deleteMany({ student: id }),
    m('MentorChangeRequest').deleteMany({ student: id }),
    m('Message').deleteMany({ $or: [{ sender: id }, { recipient: id }] }),
    m('Call').deleteMany({ $or: [{ caller: id }, { receiver: id }] }),
    m('Session').deleteMany({ mentee: id }),
    m('SessionNote').deleteMany({ student: id }),
    m('Evaluation').deleteMany({ student: id }),
    user.phone ? m('OtpRequest').deleteMany({ phone: user.phone }) : null,
    // A parent linked to this student keeps their account, just unlinked.
    User.updateMany({ childId: id }, { $set: { childId: null } }),
  ].filter(Boolean));

  // Call recordings this user took part in (audio in storage + entries)
  await require('./recordingCleanup').deleteRecordings({ participants: id });

  // 2. Outside services (best effort — never block the deletion).
  await Promise.all([
    revokeAppleToken(user.appleRefreshToken),
    deleteFirebasePhoneUser(user.phone),
  ]);

  // 3. The account itself.
  await User.deleteOne({ _id: id });
  console.log(`[Delete account] user ${id} (${user.role}) deleted`);
  return { deleted: true };
}

module.exports = { deleteUserAndData, SELF_DELETE_ROLES };
