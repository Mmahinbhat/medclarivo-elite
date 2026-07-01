const mongoose = require('mongoose');

// examGroup groups exams that share the same subject list:
//   'NEET_UG'      → NEET UG aspirants
//   'PG_CLINICAL'  → NEET PG, AIIMS PG, JIPMER PG (all sit broad clinical PG exams / INI-CET)
//   'USMLE_STEP1' / 'USMLE_STEP2' / 'USMLE_STEP3'
const SubjectSchema = new mongoose.Schema({
  examGroup: { type: String, required: true, index: true },
  name:      { type: String, required: true },
  order:     { type: Number, default: 0 },
  color:     { type: String, default: '#2563EB' },
}, { timestamps: true });

SubjectSchema.index({ examGroup: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Subject', SubjectSchema);
