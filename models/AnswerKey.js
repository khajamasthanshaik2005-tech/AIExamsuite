const mongoose = require('mongoose');

const answerKeySchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  // Cohort targeting: answer key applies to this Branch/Year/Section (empty = applies to all)
  targetBranch: { type: String, trim: true, default: '' },
  targetYear: { type: String, trim: true, default: '' },
  targetSection: { type: String, trim: true, default: '' },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number
  },
  // Extracted and structured content from PDF
  extractedContent: {
    // Raw text extracted from PDF
    rawText: String,
    // Structured questions with expected answers
    questions: [{
      questionNumber: Number,
      questionText: String,
      expectedAnswer: String,
      keywords: [String],
      marks: Number,
      rubric: {
        // Structured rubric for scoring
        sections: [{
          section: String,
          marks: Number,
          description: String
        }]
      }
    }]
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

answerKeySchema.index({ exam: 1 });
answerKeySchema.index({ exam: 1, targetBranch: 1, targetYear: 1, targetSection: 1 });

module.exports = mongoose.model('AnswerKey', answerKeySchema);




