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
  subjects: [subjectSchema],
  sgpa: { type: Number, required: true }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  registerNo: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    uppercase: true
  },
  section: { type: String, required: true },
  totalSemesters: { 
    type: Number, 
    required: true,
    min: 1,
    max: 8 
  },
  semesters: [semesterSchema],
  cgpa: { type: Number }
}, { timestamps: true });

// Pre-save hook to calculate CGPA
userSchema.pre('save', function(next) {
  if (this.semesters && this.semesters.length > 0) {
    const totalCredits = this.semesters.reduce((sum, sem) => {
      return sum + sem.subjects.reduce((s, subj) => s + subj.credits, 0);
    }, 0);
    
    const weightedSum = this.semesters.reduce((sum, sem) => {
      const semCredits = sem.subjects.reduce((s, subj) => s + subj.credits, 0);
      return sum + (sem.sgpa * semCredits);
    }, 0);
    
    this.cgpa = parseFloat((weightedSum / totalCredits).toFixed(2));
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
