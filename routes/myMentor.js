// routes/myMentor.js
//
// Mount this in server.js with:
//   const myMentorRoutes = require('./routes/myMentor');
//   app.use('/api/mentor', myMentorRoutes);
//
// ASSUMPTIONS (adjust field names below if your schema differs):
//   - User model has: role ('student' | 'mentor' | ...), assignedMentor (ObjectId ref -> User),
//     name, credentials, bio, specialties (array), avatarUrl
//   - Session model has: student (ref User), mentor (ref User), scheduledAt (Date),
//     durationMinutes (Number), topic (String), status ('upcoming'|'completed'|'missed'),
//     joinLink (String), notesLink (String)
//   - You already have auth middleware that sets req.user (e.g. middleware/auth.js)
//
// If your actual field names differ, just rename them in the .lean()/select() calls
// and the mapping functions below — the response shape sent to the frontend stays the same.

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // adjust path/name if different
const User = require('../models/User');
const Session = require('../models/Session');

router.get('/my-mentor', auth, async (req, res) => {
  try {
    const studentId = req.user.id || req.user._id;

    const student = await User.findById(studentId)
      .select('assignedMentor')
      .populate('assignedMentor', 'name credentials bio specialties avatarUrl')
      .lean();

    if (!student || !student.assignedMentor) {
      return res.status(404).json({ message: 'No mentor assigned yet' });
    }

    const mentor = student.assignedMentor;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allSessions, upcomingSessionsRaw, historyRaw, openDoubtsCount] = await Promise.all([
      Session.find({ student: studentId, mentor: mentor._id }).lean(),
      Session.find({
        student: studentId,
        mentor: mentor._id,
        scheduledAt: { $gte: now },
        status: 'upcoming',
      }).sort({ scheduledAt: 1 }).limit(5).lean(),
      Session.find({
        student: studentId,
        mentor: mentor._id,
        status: { $in: ['completed', 'missed'] },
      }).sort({ scheduledAt: -1 }).limit(10).lean(),
      // Adjust this if you track doubts elsewhere (e.g. a Ticket or Doubt model)
      Promise.resolve(0),
    ]);

    const sessionsThisMonth = allSessions.filter(
      (s) => new Date(s.scheduledAt) >= startOfMonth
    ).length;

    const completedDurations = allSessions
      .filter((s) => s.status === 'completed' && s.durationMinutes)
      .map((s) => s.durationMinutes);
    const avgSessionLength = completedDurations.length
      ? `${Math.round(
          completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length
        )} min`
      : '—';

    const formatDate = (d) =>
      new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const formatTime = (d) =>
      new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    res.json({
      mentor: {
        id: mentor._id,
        name: mentor.name,
        credentials: mentor.credentials || '',
        bio: mentor.bio || '',
        specialties: mentor.specialties || [],
        joinLink: `/session/join/${mentor._id}`, // adjust to your real join-session route
      },
      stats: {
        totalSessions: allSessions.length,
        sessionsThisMonth,
        avgSessionLength,
        openDoubts: openDoubtsCount,
      },
      upcomingSessions: upcomingSessionsRaw.map((s) => ({
        date: formatDate(s.scheduledAt),
        time: formatTime(s.scheduledAt),
        topic: s.topic || '',
      })),
      sessionHistory: historyRaw.map((s) => ({
        date: formatDate(s.scheduledAt),
        topic: s.topic || '',
        duration: s.durationMinutes ? `${s.durationMinutes} min` : '—',
        notesLink: s.notesLink || null,
        status: s.status,
      })),
    });
  } catch (err) {
    console.error('GET /api/mentor/my-mentor error:', err);
    res.status(500).json({ message: 'Failed to load mentor details' });
  }
});

module.exports = router;
