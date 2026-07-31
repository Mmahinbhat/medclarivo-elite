const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/auth');
const Session    = require('../models/Session');
const Doubt      = require('../models/Doubt');
const Evaluation = require('../models/Evaluation');
const Ticket     = require('../models/Ticket');

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

// POST /api/notifications/mark-read  — mark all as read (future: store read state per user)
router.post('/mark-read', async (req, res) => {
  // For now returns success — persisting read state requires a Notification model
  // which can be added in a future migration without breaking this endpoint.
  res.json({ success: true });
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
