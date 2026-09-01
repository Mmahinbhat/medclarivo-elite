const express       = require('express');
const router        = express.Router();
const Subject       = require('../models/Subject');
const Chapter       = require('../models/Chapter');
const UserProgress  = require('../models/UserProgress');
const TestAttempt   = require('../models/TestAttempt');
const { protect }   = require('../middleware/auth');

// ── Map a user's onboarding answers to the right curriculum group ──
function examGroupFor(onboarding) {
  const exam  = (onboarding && onboarding.exam) || 'NEET UG';
  const level = ((onboarding && onboarding.level) || '').toLowerCase();

  if (exam === 'NEET UG') return 'NEET_UG';
  if (exam === 'NEET PG' || exam === 'AIIMS' || exam === 'JIPMER') return 'PG_CLINICAL';
  if (exam === 'USMLE') {
    if (level.includes('step 3') || level.includes('preparing step 3')) return 'USMLE_STEP3';
    if (level.includes('step 2') || level.includes('preparing step 2')) return 'USMLE_STEP2';
    return 'USMLE_STEP1';
  }
  return 'NEET_UG';
}

// ════════════════════════════════════════════════════════════════
// GET /api/curriculum/subjects  (protected)
// Real, complete subject list for the user's OWN exam (auto-derived
// server-side from their onboarding data — no query param needed).
// Each subject includes mastery %, plus a lightweight embedded
// chapter list (id/title/status/percentComplete) so callers like
// study.html don't need N extra round trips per subject.
// ════════════════════════════════════════════════════════════════
router.get('/subjects', protect, async (req, res) => {
  try {
    const examGroup = examGroupFor(req.user.onboarding);
    const subjects = await Subject.find({ examGroup }).sort('order').lean();
    const subjectIds = subjects.map(s => s._id);

    const chapters = await Chapter.find({ subject: { $in: subjectIds } }).sort('order').lean();
    const progress = await UserProgress.find({
      user: req.user._id,
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
      const completedChapters = subjChapters.filter(c => {
        const p = progressByChapter[c._id.toString()];
        return p && p.status === 'completed';
      }).length;

      return {
        id: subj._id,
        name: subj.name,
        color: subj.color,
        mastery,
        chapterCount: subjChapters.length,
        completedChapters,
        chapters: subjChapters.map(c => {
          const p = progressByChapter[c._id.toString()];
          return {
            id: c._id,
            title: c.title,
            status: p ? p.status : 'not_started',
            percentComplete: p ? p.percentComplete : 0,
          };
        }),
      };
    });

    res.json({ success: true, examGroup, subjects: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/curriculum/subjects/:id/chapters  (protected)
// Full chapter list for one subject, with this user's real progress.
// ════════════════════════════════════════════════════════════════
router.get('/subjects/:id/chapters', protect, async (req, res) => {
  try {
    const chapters = await Chapter.find({ subject: req.params.id }).sort('order').lean();
    const progress = await UserProgress.find({
      user: req.user._id,
      chapter: { $in: chapters.map(c => c._id) },
    }).lean();

    const progressByChapter = {};
    progress.forEach(p => { progressByChapter[p.chapter.toString()] = p; });

    const result = chapters.map(c => {
      const p = progressByChapter[c._id.toString()];
      return {
        id: c._id,
        title: c.title,
        totalUnits: c.totalUnits,
        estimatedMinutes: c.estimatedMinutes,
        status: p ? p.status : 'not_started',
        unitsCompleted: p ? p.unitsCompleted : 0,
        percentComplete: p ? p.percentComplete : 0,
      };
    });

    res.json({ success: true, chapters: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/curriculum/continue-learning  (protected)
// User's real in-progress chapters, most recently touched first.
// ════════════════════════════════════════════════════════════════
router.get('/continue-learning', protect, async (req, res) => {
  try {
    const items = await UserProgress.find({ user: req.user._id, status: 'in_progress' })
      .sort('-lastAccessedAt')
      .limit(3)
      .populate({ path: 'chapter', populate: { path: 'subject' } })
      .lean();

    const result = items
      .filter(i => i.chapter && i.chapter.subject)
      .map(i => ({
        progressId: i._id,
        chapterId: i.chapter._id,
        subjectName: i.chapter.subject.name,
        subjectColor: i.chapter.subject.color,
        chapterTitle: i.chapter.title,
        unitsCompleted: i.unitsCompleted,
        totalUnits: i.chapter.totalUnits,
        percentComplete: i.percentComplete,
        estimatedMinutes: i.chapter.estimatedMinutes,
      }));

    res.json({ success: true, items: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════════
// PATCH /api/curriculum/progress/:chapterId  (protected)
// Record real activity on a chapter.
// ════════════════════════════════════════════════════════════════
router.patch('/progress/:chapterId', protect, async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.chapterId);
    if (!chapter) return res.status(404).json({ success: false, message: 'Chapter not found.' });

    let { unitsCompleted, percentComplete, status } = req.body;
    if (percentComplete === undefined && unitsCompleted !== undefined) {
      percentComplete = Math.round((unitsCompleted / chapter.totalUnits) * 100);
    }
    if (!status) {
      status = percentComplete >= 100 ? 'completed' : 'in_progress';
    }

    const update = { status, lastAccessedAt: new Date() };
    if (unitsCompleted !== undefined) update.unitsCompleted = unitsCompleted;
    if (percentComplete !== undefined) update.percentComplete = Math.min(100, Math.max(0, percentComplete));

    const progress = await UserProgress.findOneAndUpdate(
      { user: req.user._id, chapter: chapter._id },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, progress });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});


// ════════════════════════════════════════════════════════════════
// GET /api/curriculum/analytics  (protected)
// Deep performance analytics: per-subject accuracy, study time,
// weak chapters, score trends, and time-vs-mastery comparison.
// ════════════════════════════════════════════════════════════════
router.get('/analytics', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const examGroup = examGroupFor(req.user.onboarding);

    const subjects = await Subject.find({ examGroup }).sort('order').lean();
    const subjectIds = subjects.map(s => s._id);
    const chapters = await Chapter.find({ subject: { $in: subjectIds } }).sort('order').lean();
    const chapterIds = chapters.map(c => c._id);

    const progress = await UserProgress.find({ user: userId, chapter: { $in: chapterIds } }).lean();
    const progByChapter = {};
    progress.forEach(p => { progByChapter[p.chapter.toString()] = p; });

    const attempts = await TestAttempt.find({ user: userId, status: 'submitted' }).sort('submittedAt').lean();

    const subjectStats = {};
    const chapterStats = {};
    const scoreTrend = [];

    const questionIds = [];
    attempts.forEach(a => { a.questions.forEach(q => { if (q.question) questionIds.push(q.question); }); });

    const Question = require('../models/Question');
    const questions = await Question.find({ _id: { $in: questionIds } }).select('subject chapter').lean();
    const qMap = {};
    questions.forEach(q => { qMap[q._id.toString()] = q; });

    attempts.forEach(a => {
      scoreTrend.push({ date: a.submittedAt || a.createdAt, score: a.scorePercent, total: a.totalQuestions, correct: a.correctCount });
      a.questions.forEach(aq => {
        const q = qMap[(aq.question || '').toString()];
        if (!q) return;
        const sid = q.subject.toString();
        if (!subjectStats[sid]) subjectStats[sid] = { total: 0, correct: 0 };
        subjectStats[sid].total++;
        if (aq.isCorrect) subjectStats[sid].correct++;
        if (q.chapter) {
          const cid = q.chapter.toString();
          if (!chapterStats[cid]) chapterStats[cid] = { total: 0, correct: 0 };
          chapterStats[cid].total++;
          if (aq.isCorrect) chapterStats[cid].correct++;
        }
      });
    });

    const StudySession = require('../models/StudySession');
    const sessions = await StudySession.find({ user: userId, chapter: { $in: chapterIds } }).lean();
    const timeByChapter = {};
    const timeBySubject = {};
    const studyTrend = {};
    const chapterToSubject = {};
    chapters.forEach(c => { chapterToSubject[c._id.toString()] = c.subject.toString(); });

    sessions.forEach(s => {
      const cid = s.chapter.toString();
      const sid = chapterToSubject[cid];
      const mins = s.durationMinutes || 0;
      timeByChapter[cid] = (timeByChapter[cid] || 0) + mins;
      if (sid) timeBySubject[sid] = (timeBySubject[sid] || 0) + mins;
      const day = (s.startedAt || s.createdAt).toISOString().slice(0, 10);
      studyTrend[day] = (studyTrend[day] || 0) + mins;
    });

    const subjectAnalytics = subjects.map(subj => {
      const sid = subj._id.toString();
      const subjChapters = chapters.filter(c => c.subject.toString() === sid);
      const totalPct = subjChapters.reduce((sum, c) => { const p = progByChapter[c._id.toString()]; return sum + (p ? p.percentComplete : 0); }, 0);
      const mastery = subjChapters.length ? Math.round(totalPct / subjChapters.length) : 0;
      const stats = subjectStats[sid] || { total: 0, correct: 0 };
      const accuracy = stats.total ? Math.round((stats.correct / stats.total) * 100) : null;
      const studyMinutes = timeBySubject[sid] || 0;

      const weakChapters = subjChapters.map(c => {
        const cid = c._id.toString();
        const cs = chapterStats[cid] || { total: 0, correct: 0 };
        const cAcc = cs.total ? Math.round((cs.correct / cs.total) * 100) : null;
        const p = progByChapter[cid];
        return { id: c._id, title: c.title, accuracy: cAcc, questionsAttempted: cs.total, mastery: p ? p.percentComplete : 0, studyMinutes: timeByChapter[cid] || 0 };
      }).filter(c => c.questionsAttempted >= 3 && c.accuracy !== null && c.accuracy < 50).sort((a, b) => a.accuracy - b.accuracy);

      const chapterAnalytics = subjChapters.map(c => {
        const cid = c._id.toString();
        const cs = chapterStats[cid] || { total: 0, correct: 0 };
        const cAcc = cs.total ? Math.round((cs.correct / cs.total) * 100) : null;
        const p = progByChapter[cid];
        return { id: c._id, title: c.title, status: p ? p.status : 'not_started', mastery: p ? p.percentComplete : 0, accuracy: cAcc, questionsAttempted: cs.total, studyMinutes: timeByChapter[cid] || 0 };
      });

      return { id: subj._id, name: subj.name, color: subj.color, mastery, accuracy, questionsAttempted: stats.total, questionsCorrect: stats.correct, studyMinutes, weakChapterCount: weakChapters.length, weakChapters, chapters: chapterAnalytics };
    });

    const totalQuestions = Object.values(subjectStats).reduce((s, v) => s + v.total, 0);
    const totalCorrect = Object.values(subjectStats).reduce((s, v) => s + v.correct, 0);
    const overallAccuracy = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : null;
    const totalStudyMinutes = Object.values(timeBySubject).reduce((s, v) => s + v, 0);

    const last30 = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); const key = d.toISOString().slice(0, 10); last30.push({ date: key, minutes: studyTrend[key] || 0 }); }

    res.json({ success: true, examGroup, overall: { accuracy: overallAccuracy, questionsAttempted: totalQuestions, questionsCorrect: totalCorrect, totalStudyMinutes, testsCompleted: attempts.length }, scoreTrend: scoreTrend.slice(-20), studyTrend: last30, subjects: subjectAnalytics });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});



// ════════════════════════════════════════════════════════════════
module.exports = router;
module.exports.examGroupFor = examGroupFor;
