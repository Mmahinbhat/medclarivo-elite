const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const UserProgress = require('../models/UserProgress');
const { examGroupFor } = require('./curriculum');
const Message = require('../models/Message');

// Shared helper: load the parent's linked child, or null with a clear reason.
async function getLinkedChild(req) {
  if (!req.user.childId) return null;
  const child = await User.findOne({ _id: req.user.childId, role: 'student' })
    .select('name email avatar onboarding mentorId totalStudyMinutes streak level xp xpPerLevel')
    .lean();
  return child || null;
}

// ════════════════════════════════════════════════════════════════
// GET /api/parent/child  (parent only)
// Overall report: name, streak/XP/level, overall mastery %, mentor info.
// ════════════════════════════════════════════════════════════════
router.get('/child', protect, restrictTo('parent'), async (req, res) => {
  try {
    const child = await getLinkedChild(req);
    if (!child) {
      return res.json({ success: true, linked: false, child: null });
    }

    const examGroup = examGroupFor(child.onboarding);
    const subjects = await Subject.find({ examGroup }).select('_id').lean();
    const subjectIds = subjects.map(s => s._id);
    const chapters = await Chapter.find({ subject: { $in: subjectIds } }).select('_id').lean();
    const chapterIds = chapters.map(c => c._id);

    const progress = await UserProgress.find({
      user: child._id,
      chapter: { $in: chapterIds },
    }).lean();

    const totalChapters = chapters.length;
    const completedChapters = progress.filter(p => p.status === 'completed').length;
    const totalPct = progress.reduce((sum, p) => sum + (p.percentComplete || 0), 0);
    const overallMastery = totalChapters ? Math.round(totalPct / totalChapters) : 0;

    let mentor = null;
    if (child.mentorId) {
      mentor = await User.findById(child.mentorId).select('name avatar mentorProfile').lean();
    }

    res.json({
      success: true,
      linked: true,
      child: {
        id: child._id,
        name: child.name,
        exam: (child.onboarding && child.onboarding.exam) || null,
        streak: child.streak || 0,
        level: child.level || 1,
        xp: child.xp || 0,
        xpPerLevel: child.xpPerLevel || 1000,
        totalStudyMinutes: child.totalStudyMinutes || 0,
        overallMastery,
        completedChapters,
        totalChapters,
      },
      mentor: mentor ? { id: mentor._id, name: mentor.name, avatar: mentor.avatar, title: mentor.mentorProfile && mentor.mentorProfile.title } : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch child report.' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/parent/child/subjects  (parent only)
// Per-subject mastery breakdown, same shape as the mentor's view.
// ════════════════════════════════════════════════════════════════
router.get('/child/subjects', protect, restrictTo('parent'), async (req, res) => {
  try {
    const child = await getLinkedChild(req);
    if (!child) {
      return res.status(404).json({ success: false, message: 'No child linked to this account yet.' });
    }

    const examGroup = examGroupFor(child.onboarding);
    const subjects = await Subject.find({ examGroup }).sort('order').lean();
    const subjectIds = subjects.map(s => s._id);
    const chapters = await Chapter.find({ subject: { $in: subjectIds } }).lean();
    const progress = await UserProgress.find({
      user: child._id,
      chapter: { $in: chapters.map(c => c._id) },
    }).lean();

    const progressByChapter = {};
    progress.forEach(p => { progressByChapter[p.chapter.toString()] = p; });

    const result = subjects.map(subj => {
      const subjChapters = chapters.filter(c => c.subject.toString() === subj._id.toString());
      const totalPct = subjChapters.reduce((sum, c) => {
        const p = progressByChapter[c._id.toString()];
        return sum + (p ? p.percentComplete : 0);
      }, 0);
      const mastery = subjChapters.length ? Math.round(totalPct / subjChapters.length) : 0;
      return { id: subj._id, name: subj.name, mastery };
    });

    res.json({ success: true, subjects: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch subject breakdown.' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/parent/messages  (parent only) — chat with the child's mentor
// ════════════════════════════════════════════════════════════════
router.get('/messages', protect, restrictTo('parent'), async (req, res) => {
  try {
    const child = await getLinkedChild(req);
    if (!child || !child.mentorId) {
      return res.json({ success: true, messages: [], mentorLinked: false });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: child.mentorId },
        { sender: child.mentorId, recipient: req.user._id },
      ],
    }).sort('createdAt').lean();

    res.json({ success: true, messages, mentorLinked: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch messages.' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/parent/messages  (parent only)
// ════════════════════════════════════════════════════════════════
router.post('/messages', protect, restrictTo('parent'), async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'content is required.' });
    }
    if (content.length > 2000) {
      return res.status(400).json({ success: false, message: 'Message is too long.' });
    }

    const child = await getLinkedChild(req);
    if (!child || !child.mentorId) {
      return res.status(400).json({ success: false, message: 'No mentor linked to your child yet.' });
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient: child.mentorId,
      content: content.trim(),
    });

    res.status(201).json({ success: true, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
});

module.exports = router;
