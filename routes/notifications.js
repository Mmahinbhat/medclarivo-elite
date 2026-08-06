const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/auth');
const Session    = require('../models/Session');
const Doubt      = require('../models/Doubt');
const Evaluation = require('../models/Evaluation');
const Ticket     = require('../models/Ticket');
const Notification     = require('../models/Notification');
const NotificationRead = require('../models/NotificationRead');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

// GET /api/notifications
// Aggregates real events for the logged-in student into a unified feed.
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    const notifications = [];
    const now = new Date();

    // ── 1. UPCOMING SESSIONS (next 7 days) ──────────────────────────────
    const upcoming = await Session.find({
      mentee: userId,
      startTime: { $gte: now, $lte: new Date(now.getTime() + 7 * 86400000) },
    })
      .populate('mentor', 'name')
      .sort({ startTime: 1 })
      .limit(3)
      .lean();

    upcoming.forEach(s => {
      const hoursUntil = Math.round((new Date(s.startTime) - now) / 3600000);
      const label = hoursUntil < 24
        ? `in ${hoursUntil}h`
        : `on ${new Date(s.startTime).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`;
      notifications.push({
        id: `session-${s._id}`,
        type: 'session',
        icon: '📅',
        title: 'Upcoming Session',
        desc: `${s.subject || 'Session'} with ${s.mentor?.name || 'your mentor'} — ${label}`,
        time: new Date(s.startTime),
        read: false,
      });
    });

    // ── 2. RECENT PAST SESSIONS (last 3 days, attended) ─────────────────
    const recent = await Session.find({
      mentee: userId,
      startTime: { $gte: new Date(now.getTime() - 3 * 86400000), $lt: now },
      status: { $in: ['completed', 'done'] },
    })
      .populate('mentor', 'name')
      .sort({ startTime: -1 })
      .limit(2)
      .lean();

    recent.forEach(s => {
      notifications.push({
        id: `session-done-${s._id}`,
        type: 'session',
        icon: '✅',
        title: 'Session Completed',
        desc: `Your session on ${s.subject || 'today'} with ${s.mentor?.name || 'your mentor'} is done. Notes saved.`,
        time: new Date(s.startTime),
        read: true,
      });
    });

    // ── 3. UNANSWERED DOUBTS (raised by student, no reply yet) ──────────
    const openDoubts = await Doubt.find({
      student: userId,
      status: 'open',
    })
      .sort({ createdAt: -1 })
      .limit(2)
      .lean();

    openDoubts.forEach(d => {
      notifications.push({
        id: `doubt-open-${d._id}`,
        type: 'doubt',
        icon: '❓',
        title: 'Doubt Awaiting Answer',
        desc: `"${(d.question || '').slice(0, 60)}${d.question?.length > 60 ? '…' : ''}" — your mentor will reply soon`,
        time: new Date(d.createdAt),
        read: false,
      });
    });

    // ── 4. ANSWERED DOUBTS (replied in last 7 days) ──────────────────────
    const answeredDoubts = await Doubt.find({
      student: userId,
      status: 'answered',
      updatedAt: { $gte: new Date(now.getTime() - 7 * 86400000) },
    })
      .sort({ updatedAt: -1 })
      .limit(2)
      .lean();

    answeredDoubts.forEach(d => {
      notifications.push({
        id: `doubt-ans-${d._id}`,
        type: 'doubt',
        icon: '💬',
        title: 'Doubt Answered',
        desc: `Your mentor replied to: "${(d.question || '').slice(0, 50)}${d.question?.length > 50 ? '…' : ''}"`,
        time: new Date(d.updatedAt),
        read: false,
      });
    });

    // ── 5. EVALUATIONS (published in last 30 days) ───────────────────────
    const evals = await Evaluation.find({
      student: userId,
      status: 'published',
      publishedAt: { $gte: new Date(now.getTime() - 30 * 86400000) },
    })
      .sort({ publishedAt: -1 })
      .limit(2)
      .lean();

    evals.forEach(e => {
      notifications.push({
        id: `eval-${e._id}`,
        type: 'evaluation',
        icon: '📝',
        title: 'Evaluation Published',
        desc: `Your term evaluation has been published by your mentor. Tap to view.`,
        time: new Date(e.publishedAt || e.updatedAt),
        read: false,
      });
    });

    // ── 6. SUPPORT TICKETS (updated in last 7 days) ──────────────────────
    const tickets = await Ticket.find({
      raisedBy: userId,
      updatedAt: { $gte: new Date(now.getTime() - 7 * 86400000) },
      status: { $in: ['resolved', 'in-progress'] },
    })
      .sort({ updatedAt: -1 })
      .limit(2)
      .lean();

    tickets.forEach(t => {
      notifications.push({
        id: `ticket-${t._id}`,
        type: 'ticket',
        icon: t.status === 'resolved' ? '🛡️' : '⏳',
        title: t.status === 'resolved' ? 'Ticket Resolved' : 'Ticket In Progress',
        desc: `Your support request "${(t.subject || '').slice(0, 50)}" has been ${t.status === 'resolved' ? 'resolved' : 'picked up by our team'}.`,
        time: new Date(t.updatedAt),
        read: t.status === 'resolved',
      });
    });

    // ── 7. MESSAGES & ANNOUNCEMENTS (new — persisted, real-time-capable) ─
    const [personalNotifs, broadcasts, dismissedIds] = await Promise.all([
      Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Notification.find({ isBroadcast: true })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      NotificationRead.find({ user: userId }).distinct('notification'),
    ]);

    const dismissedSet = new Set(dismissedIds.map(String));
    const iconMap = { message: '💬', system: '⚙️', feature: '✨', mention: '📣' };

    [...personalNotifs, ...broadcasts.map(n => ({
      ...n,
      read: dismissedSet.has(String(n._id)),
    }))].forEach(n => {
      notifications.push({
        id: `notif-${n._id}`,
        type: n.type,
        icon: iconMap[n.type] || '🔔',
        title: n.title,
        desc: n.body || '',
        link: n.link || null,
        time: new Date(n.createdAt),
        read: n.read,
      });
    });

    // ── Sort by time descending, cap at 15 ──────────────────────────────
    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));
    const final = notifications.slice(0, 15).map(n => ({
      ...n,
      timeAgo: timeAgo(n.time),
    }));

    const unreadCount = final.filter(n => !n.read).length;

    res.json({ success: true, notifications: final, unreadCount });
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ success: false, message: 'Failed to load notifications.' });
  }
});

// POST /api/notifications/mark-read  — mark all as read
router.post('/mark-read', async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany({ recipient: userId, read: false }, { $set: { read: true } });

    const allBroadcasts = await Notification.find({ isBroadcast: true }).select('_id').lean();
    const alreadyRead = await NotificationRead.find({ user: userId }).distinct('notification');
    const alreadyReadSet = new Set(alreadyRead.map(String));
    const toInsert = allBroadcasts
      .filter(n => !alreadyReadSet.has(String(n._id)))
      .map(n => ({ user: userId, notification: n._id }));

    if (toInsert.length) {
      await NotificationRead.insertMany(toInsert, { ordered: false }).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Mark-read error:', err);
    res.status(500).json({ success: false, message: 'Failed to mark as read.' });
  }
});

// POST /api/notifications/broadcast  — admin/mentor sends a system/feature announcement to everyone
// POST /api/notifications/broadcast  — admin sends a system/feature announcement to everyone
router.post('/broadcast', restrictTo('admin', 'super_admin'), async (req, res) => {
  try {
    // ⚠️ Gate this to admins once role checks are confirmed, e.g.:
    // const { restrictTo } = require('../middleware/auth');
    // router.post('/broadcast', restrictTo('admin'), async (req, res) => { ... })

    const { title, body, link, type = 'feature' } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title is required' });

    const { notify } = require('../utils/notifySocket');
    const notification = await notify({
      isBroadcast: true,
      type,
      title,
      body,
      link,
      sender: req.user._id,
    });

    res.status(201).json({ success: true, notification });
  } catch (err) {
    console.error('Broadcast error:', err);
    res.status(500).json({ success: false, message: 'Failed to send broadcast.' });
  }
});

// ── Helper ───────────────────────────────────────────────────────────────────
function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7)   return `${days} days ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

module.exports = router;
