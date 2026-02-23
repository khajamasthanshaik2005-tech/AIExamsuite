const mongoose = require('mongoose');

const examAttemptSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  duration: {
    type: Number,
    comment: 'Duration in seconds'
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'submitted', 'abandoned'],
    default: 'in_progress'
  },
  answers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer'
  }],
  totalScore: {
    type: Number,
    default: 0
  },
  maxScore: {
    type: Number,
    required: true
  },
  finalGrade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']
  },
  passed: {
    type: Boolean,
    default: false
  },
  submittedAt: Date,
  abandonedAt: Date,
  lastAutoSave: Date,
  // Snapshot metadata for evaluation grouping
  studentName: String,
  studentIdentifier: String,
  college: String,
  branch: String,
  year: String,
  section: String,
  // PDF answer script path
  answerScriptPath: String,
  // Result release per attempt (for branch/year/section-wise publishing)
  resultsReleased: {
    type: Boolean,
    default: false
  },
  resultsReleasedAt: Date
}, {
  timestamps: true
});

// Index for faster queries
examAttemptSchema.index({ student: 1, exam: 1 }, { unique: true });

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);


