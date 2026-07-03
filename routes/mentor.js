const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const UserProgress = require('../models/UserProgress');
const { examGroupFor } = require('./curriculum');
const MentorRequest = require('../models/MentorRequest');
const Session = require('../models/Session');
const { draftReply } = require('../services/anthropic.service');

// ════════════════════════════════════════════════════════════════
// GET /api/mentor/mentees  (mentor/admin only)
// Every student manually assigned to the logged-in mentor (mentorId),
// with real overall mastery + chapter counts computed from their
// actual curriculum progress — same source of truth as the student's
// own Subject Performance panel.
// ════════════════════════════════════════════════════════════════
router.get('/mentees', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    const students = await User.find({ mentorId: req.user._id, role: 'student' })
      .select('name email avatar onboarding')
      .lean();

    const mentees = await Promise.all(students.map(async (student) => {
      const examGroup = examGroupFor(student.onboarding);
      const subjects = await Subject.find({ examGroup }).select('_id').lean();
      const subjectIds = subjects.map(s => s._id);
      const chapters = await Chapter.find({ subject: { $in: subjectIds } }).select('_id').lean();
      const chapterIds = chapters.map(c => c._id);

      const progress = await UserProgress.find({
        user: student._id,
        chapter: { $in: chapterIds },
      }).lean();

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

    res.json({ success: true, count: mentees.length, mentees });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch mentees.' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/mentor/mentees/:id/subjects  (mentor/admin only)
// Per-subject mastery breakdown for one assigned mentee — verifies
// the mentee actually belongs to this mentor before returning anything.
// ════════════════════════════════════════════════════════════════
router.get('/mentees/:id/subjects', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, mentorId: req.user._id, role: 'student' })
      .select('onboarding')
      .lean();

    if (!student) {
      return res.status(404).json({ success: false, message: 'Mentee not found or not assigned to you.' });
    }

    const examGroup = examGroupFor(student.onboarding);
    const subjects = await Subject.find({ examGroup }).sort('order').lean();
    const subjectIds = subjects.map(s => s._id);
    const chapters = await Chapter.find({ subject: { $in: subjectIds } }).lean();
    const progress = await UserProgress.find({
      user: student._id,
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
    res.status(500).json({ success: false, message: 'Failed to fetch mentee subjects.' });
  }
});
// ════════════════════════════════════════════════════════════════
// GET /api/mentor/requests
// ════════════════════════════════════════════════════════════════
router.get('/requests', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    const requests = await MentorRequest.find({ mentor: req.user._id, status: 'pending' })
      .populate('student', 'name email avatar onboarding')
      .sort('-createdAt')
      .lean();
    res.json({ success: true, requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch requests.' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/mentor/requests/:requestId/:action  (accept | decline)
// ════════════════════════════════════════════════════════════════
router.post('/requests/:requestId/:action', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    const { requestId, action } = req.params;
    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action.' });
    }

    const request = await MentorRequest.findOne({ _id: requestId, mentor: req.user._id });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    request.status = action === 'accept' ? 'accepted' : 'declined';
    request.respondedAt = new Date();
    await request.save();

    if (action === 'accept') {
      await User.findByIdAndUpdate(request.student, { mentorId: req.user._id });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update request.' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/mentor/sessions/upcoming
// ════════════════════════════════════════════════════════════════
router.get('/sessions/upcoming', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const upcoming = await Session.find({ mentor: req.user._id, startTime: { $gte: now }, status: 'scheduled' })
      .populate('mentee', 'name avatar')
      .sort('startTime')
      .lean();

    const recent = await Session.find({ mentor: req.user._id, status: 'completed' })
      .populate('mentee', 'name avatar')
      .sort('-startTime')
      .limit(10)
      .lean();

    const weeklyCount = await Session.countDocuments({
      mentor: req.user._id,
      status: 'completed',
      startTime: { $gte: startOfWeek },
    });

    res.json({
      success: true,
      upcoming,
      recent,
      weeklySessionsCompleted: weeklyCount,
      weeklySessionTarget: (req.user.mentorProfile && req.user.mentorProfile.weeklySessionTarget) || 8,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch sessions.' });
  }
});

// ════════════════════════════════════════════════════════════════
// PATCH /api/mentor/sessions/:sessionId/complete
// ════════════════════════════════════════════════════════════════
router.patch('/sessions/:sessionId/complete', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.sessionId, mentor: req.user._id });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    session.status = 'completed';
    await session.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update session.' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/mentor/ai/draft-reply
// ════════════════════════════════════════════════════════════════
router.post('/ai/draft-reply', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    const { question, menteeName, subject } = req.body;
    if (!question || question.length > 2000) {
      return res.status(400).json({ success: false, message: 'Question is required and must be under 2000 characters.' });
    }
    const draft = await draftReply({ question, menteeName, subject });
    res.json({ success: true, draft });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to generate draft reply.' });
  }
});
module.exports = router;
