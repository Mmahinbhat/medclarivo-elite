// ═══════════════════════════════════════════════════════════════
// AUTO UPLOAD — Parse a PDF of MCQs and upload to MedClarivo DB
// ═══════════════════════════════════════════════════════════════
// Usage:
//   node auto_upload.js <pdf_path> <chapter_id> [subject_id]
//   node auto_upload.js --list                  (show all chapters)
//
// Subject IDs:
//   Physics:    6a442b81e9ff273d4cdbf469
//   Chemistry:  6a442b81e9ff273d4cdbf479
//   Biology:    6a442b81e9ff273d4cdbf485

const mongoose = require('mongoose');
require('dotenv').config();
const Question = require('./models/Question');
const { execSync } = require('child_process');
const path = require('path');

const EXAM_GROUP = 'NEET_UG';
const pdfPath = process.argv[2];
const CHAPTER_ID = process.argv[3];
const SUBJECT_ID = process.argv[4] || null;

if (!pdfPath) {
  console.log('Usage: node auto_upload.js <pdf_path> <chapter_id> [subject_id]');
  console.log('       node auto_upload.js --list');
  process.exit(1);
}

if (pdfPath === '--list') {
  (async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const Subject = require('./models/Subject');
    const Chapter = require('./models/Chapter');
    const subjects = await Subject.find({ examGroup: EXAM_GROUP }).sort('order').lean();
    let total = 0;
    for (const s of subjects) {
      const chapters = await Chapter.find({ subject: s._id }).sort('order').lean();
      console.log('\n' + s.name + ' [' + s._id + '] (' + chapters.length + ' chapters)');
      for (const c of chapters) {
        const qCount = await Question.countDocuments({ chapter: c._id });
        total++;
        console.log('  ' + (qCount > 0 ? '✅' : '⬜') + ' ' + c.title + ' — ' + qCount + 'q [' + c._id + ']');
      }
    }
    console.log('\nTotal: ' + total + ' chapters');
    process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
} else {
  if (!CHAPTER_ID) {
    console.log('Error: chapter_id required. Run: node auto_upload.js --list');
    process.exit(1);
  }

  // Extract text from PDF
  let text;
  try {
    text = execSync('pdftotext "' + path.resolve(pdfPath) + '" -', { maxBuffer: 10 * 1024 * 1024 }).toString();
  } catch (e) {
    try {
      text = execSync("python3 -c \"from pdfminer.high_level import extract_text; print(extract_text('" + path.resolve(pdfPath).replace(/'/g, "\\'") + "'))\"", { maxBuffer: 10 * 1024 * 1024 }).toString();
    } catch (e2) {
      console.error('Cannot extract PDF. Install poppler: brew install poppler');
      process.exit(1);
    }
  }

  // Parse MCQs
  text = text.replace(/Page \d+/g, '').replace(/\f/g, '\n');
  const blocks = text.split(/\n(?=\d+\.\s)/);
  const questions = [];

  for (const block of blocks) {
    const m = block.match(/^(\d+)\.\s+([\s\S]*)/);
    if (!m) continue;
    const rest = m[2].trim();
    const aIdx = rest.indexOf('(a)');
    if (aIdx < 0) continue;

    let qText = rest.substring(0, aIdx).trim().replace(/\[.*?\]/g, '').replace(/\s+/g, ' ');
    const optPart = rest.substring(aIdx);
    const optMatch = optPart.match(/\(a\)\s*([\s\S]*?)\s*\(b\)\s*([\s\S]*?)\s*\(c\)\s*([\s\S]*?)\s*\(d\)\s*([\s\S]*)/);
    if (!optMatch) continue;

    const optA = optMatch[1].trim().replace(/\s+/g, ' ');
    const optB = optMatch[2].trim().replace(/\s+/g, ' ');
    const optC = optMatch[3].trim().replace(/\s+/g, ' ');
    const optDAndAnswer = optMatch[4].trim();

    const lines = optDAndAnswer.split('\n').map(l => l.trim()).filter(Boolean);
    let answer = null;
    const optDLines = [];
    for (let i = lines.length - 1; i >= 0; i--) {
      const am = lines[i].match(/^\(([abcd])\)$/);
      if (am && !answer) {
        answer = am[1].toUpperCase();
      } else {
        optDLines.unshift(lines[i]);
      }
    }
    const optD = optDLines.join(' ').trim().replace(/\s+/g, ' ');

    if (!answer || qText.length < 5) continue;
    if (!optA || !optB || !optC || !optD) continue;

    questions.push({
      text: qText,
      options: [
        { key: 'A', text: optA },
        { key: 'B', text: optB },
        { key: 'C', text: optC },
        { key: 'D', text: optD },
      ],
      correctKey: answer,
      explanation: '',
      difficulty: 'medium',
    });
  }

  console.log('Parsed ' + questions.length + ' questions from ' + path.basename(pdfPath));

  if (!questions.length) {
    console.log('No questions found. PDF may not be in expected format.');
    console.log('Expected format: numbered questions with (a)(b)(c)(d) options and answer as standalone (x) on its own line.');
    process.exit(1);
  }

  (async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const Chapter = require('./models/Chapter');
    const chapter = await Chapter.findById(CHAPTER_ID).lean();
    if (!chapter) { console.error('Chapter ID not found!'); process.exit(1); }

    const subjectId = SUBJECT_ID || chapter.subject.toString();
    const existing = await Question.countDocuments({ chapter: CHAPTER_ID });
    console.log('Chapter: ' + chapter.title);
    console.log('Existing questions: ' + existing);

    const docs = questions.map(q => ({
      subject: subjectId,
      chapter: CHAPTER_ID,
      examGroup: EXAM_GROUP,
      ...q,
    }));

    const result = await Question.insertMany(docs);
    console.log('✅ Inserted ' + result.length + ' questions');
    const total = await Question.countDocuments({ chapter: CHAPTER_ID });
    console.log('Total questions now: ' + total);
    process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
}
