const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  credits: { type: Number, required: true },
  grade: { type: String, required: true },
  gradePoint: { type: Number, required: true }
});

const semesterSchema = new mongoose.Schema({
  semesterNo: { type: Number, required: true },
  sgpa: { type: Number, required: true },
  subjects: [subjectSchema]
});

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  registerNo: { type: String, required: true, unique: true },
  section: { type: String, required: true },
  totalSemesters: { type: Number, required: true },
  semesters: [semesterSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Student', studentSchema);
