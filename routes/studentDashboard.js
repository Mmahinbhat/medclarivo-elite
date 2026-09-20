const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const UserProgress = require('../models/UserProgress');
const StudySession = require('../models/StudySession');
const DailyMission = require('../models/DailyMission');
const Evaluation = require('../models/Evaluation');
const { examGroupFor } = require('./curriculum');

// ════════════════════════════════════════════════════════════════
// GET /api/student/dashboard-data
// Single batch endpoint that replaces 7 separate API calls:
//   /auth/me, /curriculum/subjects, /study/stats, /auth/my-mentor,
//   /study/missions, /study/analytics, /achievements
// ════════════════════════════════════════════════════════════════

function parseDailyTargetMinutes(hoursStr) {
  const DEFAULT_MINUTES = 240;
  if (!hoursStr) return DEFAULT_MINUTES;
  const str = String(hoursStr).trim();
  if (str.endsWith('+')) {
    const n = parseFloat(str);
    return isNaN(n) ? DEFAULT_MINUTES : n * 60;
  }
  const parts = str.split('-').map(s => parseFloat(s));
  if (parts.length === 2 && !parts.some(isNaN)) {
    return ((parts[0] + parts[1]) / 2) * 60;
  }
  const n = parseFloat(str);
  return isNaN(n) ? DEFAULT_MINUTES : n * 60;
}

function todayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

router.get('/dashboard-data', protect, async (req, res) => {
  try {
    const user = req.user;
    const userId = user._id;
    const now = new Date();
    const period = req.query.period === 'month' ? 'month' : 'week';
    const dailyTargetMinutes = parseDailyTargetMinutes(user.onboarding && user.onboarding.hours);

    // ── Run all independent DB queries in parallel ──
    const examGroup = examGroupFor(user.onboarding);
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - 6); startOfWeek.setHours(0, 0, 0, 0);
    const date = todayDateString();

    // Heatmap range (always 9 weeks)
    const heatmapDays = 63;
    const heatStart = new Date(now); heatStart.setDate(now.getDate() - (heatmapDays - 1)); heatStart.setHours(0, 0, 0, 0);

    const [
      higherCount,
      totalUsers,
      todaySessions,
      weekSessions,
      subjects,
      mission,
      rangeSessions,
      allSessions,
      mentorDoc,
      progress,
    ] = await Promise.all([
      // stats: rank
      User.countDocuments({ xp: { $gt: user.xp || 0 } }),
      User.countDocuments({}),
      // stats: today minutes
      StudySession.find({ user: userId, completedAt: { $gte: startOfToday } }).select('durationMinutes').lean(),
      // stats: week minutes
      StudySession.find({ user: userId, completedAt: { $gte: startOfWeek } }).select('durationMinutes').lean(),
      // subjects
      Subject.find({ examGroup }).sort('order').lean(),
      // missions
      DailyMission.findOne({ user: userId, date }),
      // analytics: heatmap + chart data
      StudySession.find({ user: userId, completedAt: { $gte: heatStart } }).select('durationMinutes completedAt').lean(),
      // analytics: avg session (all time)
      StudySession.find({ user: userId }).select('durationMinutes').lean(),
      // mentor
      user.role === 'student' && user.mentorId
        ? User.findById(user.mentorId).select('name avatar mentorProfile email').lean()
        : null,
      // progress (for subjects + achievements)
      (async () => {
        const subjs = await Subject.find({ examGroup }).select('_id').lean();
        const chapters = await Chapter.find({ subject: { $in: subjs.map(s => s._id) } }).select('_id subject order title totalUnits estimatedMinutes').lean();
        const prog = await UserProgress.find({
          user: userId,
          chapter: { $in: chapters.map(c => c._id) },
        }).lean();
        return { chapters, progress: prog };
      })(),
    ]);

    // ── 1. Stats ──
    const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const weekMinutes = weekSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const weeklyTargetMinutes = dailyTargetMinutes * 7;
    const stats = {
      xp: user.xp || 0,
      level: user.level || 1,
      xpPerLevel: user.xpPerLevel || 1000,
      streak: user.streak || 0,
      totalStudyMinutes: user.totalStudyMinutes || 0,
      rank: higherCount + 1,
      totalUsers,
      todayMinutes,
      dailyTargetMinutes,
      goalPct: dailyTargetMinutes > 0 ? Math.min(100, Math.round((todayMinutes / dailyTargetMinutes) * 100)) : 0,
      weekMinutes,
      weeklyTargetMinutes,
      weeklyPct: weeklyTargetMinutes > 0 ? Math.min(100, Math.round((weekMinutes / weeklyTargetMinutes) * 100)) : 0,
    };

    // ── 2. Subjects with chapters & progress ──
    const { chapters, progress: progressArr } = progress;
    const progressByChapter = {};
    progressArr.forEach(p => { progressByChapter[p.chapter.toString()] = p; });

    const subjectsResult = subjects.map(subj => {
      const subjChapters = chapters.filter(c => c.subject.toString() === subj._id.toString());
      const totalPct = subjChapters.reduce((sum, c) => {
        const p = progressByChapter[c._id.toString()];
        return sum + (p ? p.percentComplete : 0);
      }, 0);
      const mastery = subjChapters.length ? Math.round(totalPct / subjChapters.length) : 0;
      const completedChapters = subjChapters.filter(c => {
        const p = progressByChapter[c._id.toString()];
        return p && p.status === 'completed';
      }).length;

      return {
        id: subj._id, name: subj.name, color: subj.color, mastery,
        chapterCount: subjChapters.length, completedChapters,
        chapters: subjChapters.map(c => {
          const p = progressByChapter[c._id.toString()];
          return { id: c._id, title: c.title, status: p ? p.status : 'not_started', percentComplete: p ? p.percentComplete : 0 };
        }),
      };
    });

    // ── 3. Missions ──
    const missions = {
      date,
      tasks: mission ? mission.tasks : [],
      completedTaskIds: mission ? mission.completedTaskIds : [],
      assigned: !!(mission && mission.tasks && mission.tasks.length),
    };

    // ── 4. Analytics (heatmap + chart) ──
    const minutesByDate = {};
    rangeSessions.forEach(s => {
      const key = new Date(s.completedAt).toISOString().slice(0, 10);
      minutesByDate[key] = (minutesByDate[key] || 0) + (s.durationMinutes || 0);
    });

    function levelFor(minutes) {
      if (minutes <= 0) return 0;
      if (minutes < 30) return 1;
      if (minutes < 60) return 2;
      if (minutes < 120) return 3;
      return 4;
    }

    const heatmap = [];
    for (let i = 0; i < heatmapDays; i++) {
      const d = new Date(heatStart); d.setDate(heatStart.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const minutes = minutesByDate[key] || 0;
      heatmap.push({ date: key, minutes, level: levelFor(minutes) });
    }

    let analytics;
    if (period === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysElapsedThisMonth = now.getDate();
      const monthSessions = await StudySession.find({ user: userId, completedAt: { $gte: monthStart } }).select('durationMinutes completedAt').lean();
      const minutesByDayOfMonth = {};
      monthSessions.forEach(s => {
        const dom = new Date(s.completedAt).getDate();
        minutesByDayOfMonth[dom] = (minutesByDayOfMonth[dom] || 0) + (s.durationMinutes || 0);
      });
      const bucketCount = Math.ceil(daysInMonth / 7);
      const weeklyBuckets = [];
      for (let b = 0; b < bucketCount; b++) {
        const startDay = b * 7 + 1;
        const endDay = Math.min(startDay + 6, daysInMonth);
        let bucketMinutes = 0;
        for (let d = startDay; d <= endDay; d++) { bucketMinutes += minutesByDayOfMonth[d] || 0; }
        weeklyBuckets.push({ label: `Wk ${b + 1}`, minutes: bucketMinutes });
      }
      const monthMinutesTotal = Object.values(minutesByDayOfMonth).reduce((sum, m) => sum + m, 0);
      const daysStudiedThisMonth = Object.keys(minutesByDayOfMonth).filter(d => minutesByDayOfMonth[d] > 0).length;
      const avgSessionMinutes = monthSessions.length
        ? Math.round(monthSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / monthSessions.length)
        : 0;

      analytics = {
        period: 'month',
        monthlyHours: Math.round((monthMinutesTotal / 60) * 10) / 10,
        monthlyTargetHours: Math.round((dailyTargetMinutes * daysInMonth / 60) * 10) / 10,
        consistencyPct: daysElapsedThisMonth > 0 ? Math.round((daysStudiedThisMonth / daysElapsedThisMonth) * 100) : 0,
        avgSessionMinutes, weeklyBuckets, dailyTargetMinutes, heatmap,
      };
    } else {
      // week (default)
      const dayOfWeek = now.getDay();
      const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
      const monday = new Date(now); monday.setDate(now.getDate() + diffToMonday); monday.setHours(0, 0, 0, 0);
      const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dailyMinutes = [];
      for (let i = 0; i < 7; i++) {
        const dayStart = new Date(monday); dayStart.setDate(monday.getDate() + i);
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayStart.getDate() + 1);
        if (dayStart > now) { dailyMinutes.push({ day: dayLabels[i], minutes: 0 }); continue; }
        const daySessions = await StudySession.find({ user: userId, completedAt: { $gte: dayStart, $lt: dayEnd } }).lean();
        const minutes = daySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
        dailyMinutes.push({ day: dayLabels[i], minutes });
      }
      const weekMinutesTotal = dailyMinutes.reduce((sum, d) => sum + d.minutes, 0);
      const daysElapsedThisWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
      const daysStudied = dailyMinutes.slice(0, daysElapsedThisWeek).filter(d => d.minutes > 0).length;
      const avgSessionMinutes = allSessions.length
        ? Math.round(allSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / allSessions.length)
        : 0;

      analytics = {
        period: 'week',
        weeklyHours: Math.round((weekMinutesTotal / 60) * 10) / 10,
        weeklyTargetHours: Math.round((dailyTargetMinutes * 7 / 60) * 10) / 10,
        consistencyPct: daysElapsedThisWeek > 0 ? Math.round((daysStudied / daysElapsedThisWeek) * 100) : 0,
        avgSessionMinutes, dailyMinutes, dailyTargetMinutes, heatmap,
      };
    }

    // ── 5. Mentor ──
    const mentor = mentorDoc
      ? { mentorAssigned: true, mentor: mentorDoc }
      : { mentorAssigned: false, mentor: null };

    // ── 6. Achievements ──
    const chaptersCompleted = progressArr.filter(p => p.status === 'completed').length;
    const subjectTotals = {};
    for (const p of progressArr) {
      const ch = chapters.find(c => c._id.toString() === p.chapter.toString());
      if (!ch) continue;
      const sid = String(ch.subject);
      if (!subjectTotals[sid]) subjectTotals[sid] = { done: 0, total: 0 };
      subjectTotals[sid].done += p.unitsCompleted || 0;
      subjectTotals[sid].total += ch.totalUnits || 1;
    }
    let bestMastery = 0;
    for (const sid in subjectTotals) {
      const t = subjectTotals[sid];
      const pct = t.total > 0 ? (t.done / t.total) * 100 : 0;
      if (pct > bestMastery) bestMastery = pct;
    }
    const totalMinutes = allSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

    const latestEval = await Evaluation.findOne({ student: userId, status: 'published' })
      .sort({ publishedAt: -1 }).lean();
    const diagnosticRating = latestEval
      ? Math.round(((latestEval.academicScore || 0) + (latestEval.behaviourScore || 0) + (latestEval.attendanceScore || 0) + (latestEval.communicationScore || 0)) / 4)
      : null;

    const streak = user.streak || 0;
    const level = user.level || 1;
    const xp = user.xp || 0;

    const achievementDefs = [
      { id: 'streak_2',   title: '2-Day Streak',        description: 'Studied 2 days in a row',        icon: 'flame',      color: 'gold',   unlocked: streak >= 2 },
      { id: 'streak_7',   title: '7-Day Streak',        description: 'Studied 7 days in a row',        icon: 'flame',      color: 'gold',   unlocked: streak >= 7 },
      { id: 'streak_30',  title: '30-Day Streak',       description: 'Studied 30 days in a row',       icon: 'flame',      color: 'gold',   unlocked: streak >= 30 },
      { id: 'level_2',    title: 'Level 2',             description: 'Reached Level 2',                icon: 'trending-up', color: 'teal',   unlocked: level >= 2 },
      { id: 'level_5',    title: 'Level 5',             description: 'Reached Level 5',                icon: 'trending-up', color: 'teal',   unlocked: level >= 5 },
      { id: 'xp_500',     title: 'XP Grinder',          description: 'Earned 500 XP',                  icon: 'zap',        color: 'teal',   unlocked: xp >= 500 },
      { id: 'chapter_1',  title: 'First Chapter',       description: 'Completed your first chapter',   icon: 'book-check', color: 'teal',   unlocked: chaptersCompleted >= 1 },
      { id: 'chapter_10', title: 'Chapter Crusher',     description: 'Completed 10 chapters',          icon: 'book-check', color: 'teal',   unlocked: chaptersCompleted >= 10 },
      { id: 'mastery_25', title: 'Subject Explorer',    description: 'Reached 25% mastery in a subject', icon: 'compass',  color: 'purple', unlocked: bestMastery >= 25 },
      { id: 'mastery_50', title: 'Subject Specialist',  description: 'Reached 50% mastery in a subject', icon: 'sparkles', color: 'purple', unlocked: bestMastery >= 50 },
      { id: 'mastery_90', title: 'Subject Expert',      description: 'Reached 90% mastery in a subject', icon: 'sparkles', color: 'purple', unlocked: bestMastery >= 90 },
      { id: 'hours_1',    title: 'First Hour',          description: 'Logged 1 hour of study',         icon: 'clock',      color: 'blue',   unlocked: totalMinutes >= 60 },
      { id: 'hours_10',   title: 'Dedicated Learner',   description: 'Logged 10 hours of study',       icon: 'clock',      color: 'blue',   unlocked: totalMinutes >= 600 },
      { id: 'top_performer', title: 'Top Performer',    description: 'Scored 85+ on a mentor evaluation', icon: 'medal',  color: 'green',  unlocked: diagnosticRating !== null && diagnosticRating >= 85 },
    ];

    const achievements = {
      achievements: achievementDefs,
      unlockedCount: achievementDefs.filter(d => d.unlocked).length,
      total: achievementDefs.length,
    };

    // ── Send everything in one response ──
    res.json({
      success: true,
      user,
      stats,
      subjects: subjectsResult,
      examGroup,
      missions,
      analytics,
      mentor,
      achievements,
    });
  } catch (err) {
    console.error('Student dashboard batch error:', err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard data.' });
  }
});

module.exports = router;
