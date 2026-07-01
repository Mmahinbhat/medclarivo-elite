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

module.exports = router;
