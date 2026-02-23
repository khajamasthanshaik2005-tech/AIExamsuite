const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
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
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  answerText: {
    type: String,
    default: '',
    // Allow empty strings for unanswered questions
    // Not using required: true because Mongoose treats empty strings as invalid for required fields
  },
  attachments: [{
    filename: String,
    path: String,
    fileType: String
  }],
  score: {
    type: Number,
    default: 0
  },
  maxScore: {
    type: Number,
    required: true
  },
  aiEvaluation: {
    suggestedScore: Number,
    grammarScore: Number,
    contentRelevance: Number,
    completeness: Number,
    coveragePercentage: Number,
    bloomsLevel: String,
    feedback: String,
    evaluatedAt: Date,
    keywordsFound: [String],
    keywordsMissing: [String],
    keywordMatchPercentage: Number
  },
  facultyReview: {
    score: Number,
    feedback: String,
    reviewedAt: Date
  },
  isReviewed: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  autoSaved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
answerSchema.index({ student: 1, exam: 1, question: 1 }, { unique: true });

module.exports = mongoose.model('Answer', answerSchema);


