const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Chapter = require('../models/Chapter');
const StudySession = require('../models/StudySession');
const UserProgress = require('../models/UserProgress');

// ════════════════════════════════════════════════════════════════
// GET /api/study/in-progress
// Get chapters currently in progress for the logged-in user
// ════════════════════════════════════════════════════════════════
router.get('/in-progress', protect, async (req, res) => {
  try {
    const progresses = await UserProgress.find({
      user: req.user._id,
      status: 'in_progress',
    })
      .populate('chapter')
      .populate({
        path: 'chapter',
        populate: { path: 'subject' },
      })
      .limit(5);

    const chapters = progresses.map(p => ({
      _id: p.chapter._id,
      title: p.chapter.title,
      subject: p.chapter.subject,
      progress: p,
    }));

    res.json({ success: true, chapters });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch in-progress chapters' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/study/sessions
// Save a completed study session and update user stats
// ════════════════════════════════════════════════════════════════
router.post('/sessions', protect, async (req, res) => {
  try {
    const { chapterId, durationMinutes } = req.body;

    if (!chapterId || !durationMinutes || durationMinutes <= 0) {
      return res.status(400).json({
        success: false,
        message: 'chapterId and durationMinutes (> 0) are required',
      });
    }

    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, message: 'Chapter not found' });
    }

    // Calculate XP: 10 XP per 5 minutes (2 XP per minute)
    const xpEarned = Math.max(10, Math.floor(durationMinutes * 2));

    // Create study session
    const session = new StudySession({
      user: req.user._id,
      chapter: chapterId,
      durationMinutes,
      xpEarned,
      completedAt: new Date(),
    });
    await session.save();

    // Update user stats
    const user = await User.findById(req.user._id);
    user.totalStudyMinutes = (user.totalStudyMinutes || 0) + durationMinutes;
    user.xp = (user.xp || 0) + xpEarned;

    // Update level if XP threshold crossed
    const xpForCurrentLevel = (user.level - 1) * user.xpPerLevel;
    const xpIntoCurrentLevel = user.xp - xpForCurrentLevel;
    if (xpIntoCurrentLevel >= user.xpPerLevel) {
      user.level += 1;
    }

    // Update streak
    const today = new Date().toDateString();
    const lastStudyDateString = user.lastStudyDate ? new Date(user.lastStudyDate).toDateString() : null;
    
    if (lastStudyDateString !== today) {
      // It's a new day, or first session ever
      if (lastStudyDateString) {
        // Check if it was yesterday (streak continues)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (new Date(user.lastStudyDate).toDateString() === yesterday.toDateString()) {
          user.streak += 1;
        } else {
          // Streak broken, reset
          user.streak = 1;
        }
      } else {
        // First study session ever
        user.streak = 1;
      }
      user.lastStudyDate = new Date();
    }

    await user.save();

    // Update chapter progress (mark as in-progress if not already)
    const progress = await UserProgress.findOneAndUpdate(
      { user: req.user._id, chapter: chapterId },
      {
        $set: { status: 'in_progress', lastAccessedAt: new Date() },
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      session,
      userStats: {
        xpEarned,
        totalXp: user.xp,
        level: user.level,
        streak: user.streak,
        totalStudyMinutes: user.totalStudyMinutes,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to save study session' });
  }
});

// ── Parse onboarding's "hours per day" range (e.g. "4-6", "8+") into a target in minutes ──
function parseDailyTargetMinutes(hoursStr) {
  const DEFAULT_MINUTES = 240; // 4 hrs/day fallback if the user never set this
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

// ════════════════════════════════════════════════════════════════
// GET /api/study/stats  (protected)
// Real numbers for the dashboard header: XP/level/streak (from the
// user doc), rank (computed live against every other real user by
// XP), and today's/this week's study-goal progress (computed from
// real StudySession records, target derived from onboarding.hours).
// ════════════════════════════════════════════════════════════════
router.get('/stats', protect, async (req, res) => {
  try {
    const user = req.user;

    // Rank: how many real users have strictly more XP, +1
    const higherCount = await User.countDocuments({ xp: { $gt: user.xp || 0 } });
    const totalUsers = await User.countDocuments({});
    const rank = higherCount + 1;

    // Today's real study minutes
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todaySessions = await StudySession.find({ user: user._id, completedAt: { $gte: startOfToday } }).lean();
    const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

    // This week's (last 7 days incl. today) real study minutes
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);
    const weekSessions = await StudySession.find({ user: user._id, completedAt: { $gte: startOfWeek } }).lean();
    const weekMinutes = weekSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

    const dailyTargetMinutes = parseDailyTargetMinutes(user.onboarding && user.onboarding.hours);
    const weeklyTargetMinutes = dailyTargetMinutes * 7;
    const goalPct = dailyTargetMinutes > 0 ? Math.min(100, Math.round((todayMinutes / dailyTargetMinutes) * 100)) : 0;
    const weeklyPct = weeklyTargetMinutes > 0 ? Math.min(100, Math.round((weekMinutes / weeklyTargetMinutes) * 100)) : 0;

    res.json({
      success: true,
      stats: {
        xp: user.xp || 0,
        level: user.level || 1,
        xpPerLevel: user.xpPerLevel || 1000,
        streak: user.streak || 0,
        totalStudyMinutes: user.totalStudyMinutes || 0,
        rank,
        totalUsers,
        todayMinutes,
        dailyTargetMinutes,
        goalPct,
        weekMinutes,
        weeklyTargetMinutes,
        weeklyPct,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
