const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const UserProgress = require('../models/UserProgress');
const Session = require('../models/Session');
const MentorRequest = require('../models/MentorRequest');
const Message = require('../models/Message');
const { examGroupFor } = require('./curriculum');

// ════════════════════════════════════════════════════════════════
// GET /api/mentor/dashboard-data
// Single batch endpoint that replaces 5 separate API calls:
//   /auth/me, /mentor/mentees, /mentor/sessions/upcoming,
//   /mentor/analytics, /mentor/requests, + admin-messages unread
// ════════════════════════════════════════════════════════════════
router.get('/dashboard-data', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    const user = req.user;
    const mentorId = user._id;
    const now = new Date();

    // ── This week's Mon–Sun window ──
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Heatmap range (9 weeks)
    const heatmapWeeks = 9;
    const heatmapStart = new Date(monday);
    heatmapStart.setDate(monday.getDate() - (heatmapWeeks - 1) * 7);

    const mentorFilter = user.role === 'admin' ? {} : { mentor: mentorId };

    // ── Run all independent DB queries in parallel ──
    const [
      students,
      upcomingSessions,
      recentSessions,
      weeklyCount,
      pendingRequests,
      totalRequests,
      respondedRequests,
      rangeSessions,
      totalCompletedSessions,
      adminMessages,
      adminUsers,
    ] = await Promise.all([
      // mentees
      User.find({ mentorId: mentorId, role: 'student' })
        .select('name email avatar onboarding')
        .lean(),
      // upcoming sessions
      Session.find({ ...mentorFilter, startTime: { $gte: now }, status: 'scheduled' })
        .populate('mentee', 'name avatar')
        .populate('mentor', 'name avatar')
        .sort('startTime')
        .limit(user.role === 'admin' ? 20 : undefined)
        .lean(),
      // recent sessions
      Session.find({ ...mentorFilter, status: 'completed' })
        .populate('mentee', 'name avatar')
        .populate('mentor', 'name avatar')
        .sort('-startTime')
        .limit(10)
        .lean(),
      // weekly session count
      Session.countDocuments({ ...mentorFilter, status: 'completed', startTime: { $gte: startOfWeek } }),
      // pending requests
      MentorRequest.find({ mentor: mentorId, status: 'pending' })
        .populate('student', 'name email avatar onboarding')
        .sort('-createdAt')
        .lean(),
      // analytics: response rate
      MentorRequest.countDocuments({ mentor: mentorId }),
      MentorRequest.countDocuments({ mentor: mentorId, status: { $ne: 'pending' } }),
      // analytics: heatmap sessions
      Session.find({ mentor: mentorId, status: 'completed', startTime: { $gte: heatmapStart } })
        .select('startTime')
        .lean(),
      // analytics: total completed
      Session.countDocuments({ mentor: mentorId, status: 'completed' }),
      // admin messages (for unread badge)
      (async () => {
        const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } }).select('_id').lean();
        const adminIds = admins.map(a => a._id);
        return Message.find({
          $or: [
            { sender: mentorId, recipient: { $in: adminIds } },
            { sender: { $in: adminIds }, recipient: mentorId },
          ],
        }).sort('createdAt').lean();
      })(),
      User.find({ role: { $in: ['admin', 'super_admin'] } }).select('name email role').lean(),
    ]);

    // ── 1. Mentees with mastery data ──
    const mentees = await Promise.all(students.map(async (student) => {
      const eg = examGroupFor(student.onboarding);
      const subjs = await Subject.find({ examGroup: eg }).select('_id').lean();
      const chapters = await Chapter.find({ subject: { $in: subjs.map(s => s._id) } }).select('_id').lean();
      const chapterIds = chapters.map(c => c._id);
      const progress = await UserProgress.find({ user: student._id, chapter: { $in: chapterIds } }).lean();
      const totalChapters = chapters.length;
      const completedChapters = progress.filter(p => p.status === 'completed').length;
      const totalPct = progress.reduce((sum, p) => sum + (p.percentComplete || 0), 0);
      const overallMastery = totalChapters ? Math.round(totalPct / totalChapters) : 0;

      return {
        id: student._id,
        name: student.name,
        exam: (student.onboarding && student.onboarding.exam) || null,
        overallMastery,
        completedChapters,
        totalChapters,
      };
    }));

    // ── 2. Sessions ──
    const sessions = {
      upcoming: upcomingSessions,
      recent: recentSessions,
      weeklySessionsCompleted: weeklyCount,
      weeklySessionTarget: (user.mentorProfile && user.mentorProfile.weeklySessionTarget) || 8,
    };

    // ── 3. Analytics ──
    const responseRate = totalRequests > 0 ? Math.round((respondedRequests / totalRequests) * 100) : null;
    const rating = user.mentorProfile ? user.mentorProfile.rating : null;
    const reviewCount = user.mentorProfile ? user.mentorProfile.reviewCount : 0;

    // Daily session counts for this week's bar chart
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dailyCounts = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(monday); dayStart.setDate(monday.getDate() + i);
      const dayEnd = new Date(dayStart); dayEnd.setDate(dayStart.getDate() + 1);
      if (dayStart > now) { dailyCounts.push({ day: dayLabels[i], count: 0 }); continue; }
      const count = await Session.countDocuments({
        mentor: mentorId, status: 'completed',
        startTime: { $gte: dayStart, $lt: dayEnd },
      });
      dailyCounts.push({ day: dayLabels[i], count });
    }

    const weeklySessionsCompleted = dailyCounts.reduce((sum, d) => sum + d.count, 0);

    // Heatmap
    const countByDate = {};
    rangeSessions.forEach(s => {
      const key = new Date(s.startTime).toISOString().slice(0, 10);
      countByDate[key] = (countByDate[key] || 0) + 1;
    });

    function levelFor(count) {
      if (count <= 0) return 0;
      if (count === 1) return 2;
      if (count === 2) return 3;
      return 4;
    }

    const heatmap = [];
    for (let w = 0; w < heatmapWeeks; w++) {
      const ws = new Date(heatmapStart); ws.setDate(heatmapStart.getDate() + w * 7);
      const week = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(ws); day.setDate(ws.getDate() + d);
        const key = day.toISOString().slice(0, 10);
        const c = countByDate[key] || 0;
        week.push({ date: key, count: c, level: levelFor(c) });
      }
      heatmap.push(week);
    }

    // Streak: consecutive weeks with >=1 completed session
    let streakWeeks = 0;
    for (let w = 0; w < 52; w++) {
      const ws = new Date(monday); ws.setDate(monday.getDate() - w * 7);
      const we = new Date(ws); we.setDate(ws.getDate() + 7);
      const count = await Session.countDocuments({
        mentor: mentorId, status: 'completed',
        startTime: { $gte: ws, $lt: we },
      });
      if (count > 0) streakWeeks++;
      else break;
    }

    const milestones = [];
    if (streakWeeks > 0) {
      milestones.push({ type: 'streak', label: `${streakWeeks}-Week Streak`, sub: 'Active every week' });
    }
    if (reviewCount >= 10 && rating >= 4.5) {
      milestones.push({ type: 'top_rated', label: 'Top Rated Mentor', sub: `${rating.toFixed(1)}★ over ${reviewCount} reviews` });
    }
    const sessionMilestones = [100, 50, 25, 10];
    const hitMilestone = sessionMilestones.find(m => totalCompletedSessions >= m);
    if (hitMilestone) {
      milestones.push({ type: 'sessions', label: `${hitMilestone} Sessions`, sub: 'Milestone reached' });
    }

    const analytics = {
      weeklySessionsCompleted,
      weeklySessionTarget: (user.mentorProfile && user.mentorProfile.weeklySessionTarget) || 8,
      dailyCounts,
      responseRate,
      rating,
      reviewCount,
      heatmap,
      totalCompletedSessions,
      streakWeeks,
      milestones,
    };

    // ── 4. Admin messages unread count ──
    const unreadAdminMessages = adminMessages.filter(
      m => String(m.sender) !== String(mentorId) && !m.readAt
    ).length;

    // ── Send everything in one response ──
    res.json({
      success: true,
      user,
      mentees,
      sessions,
      analytics,
      requests: pendingRequests,
      adminMessagesUnread: unreadAdminMessages,
    });
  } catch (err) {
    console.error('Mentor dashboard batch error:', err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard data.' });
  }
});

module.exports = router;
