const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add an exam title'],
    trim: true
  },
  type: {
    type: String,
    enum: ['quiz', 'sessional', 'semester'],
    required: true
  },
  instructions: {
    type: String,
    trim: true
  },
  duration: {
    type: Number,
    required: true,
    comment: 'Duration in minutes'
  },
  totalMarks: {
    type: Number,
    required: true
  },
  passingMarks: {
    type: Number,
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  units: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit'
  }],
  topics: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic'
  }],
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Optional targeting metadata: publish exams to cohorts instead of individuals
  targetBranch: { type: String, trim: true },
  targetYear: { type: String, trim: true },
  targetSection: { type: String, trim: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'ongoing', 'completed'],
    default: 'draft'
  },
  // Result publication (controls when students can see marks)
  resultsPublished: {
    type: Boolean,
    default: false
  },
  resultsPublishedAt: {
    type: Date
  },
  // Exam Blueprint Configuration
  blueprint: {
    // Marks distribution: { "2": 5, "8": 2 } means 5 questions of 2 marks, 2 questions of 8 marks
    marksDistribution: {
      type: Map,
      of: Number,
      default: {}
    },
    // Overall difficulty ratio
    difficultyRatio: {
      easy: { type: Number, default: 30, min: 0, max: 100 },
      medium: { type: Number, default: 50, min: 0, max: 100 },
      hard: { type: Number, default: 20, min: 0, max: 100 }
    },
    // Difficulty level per topic: { topicId: "easy" | "medium" | "hard" }
    topicDifficultyMap: {
      type: Map,
      of: String,
      default: {}
    },
    // Bloom's taxonomy distribution
    bloomsDistribution: {
      remember: { type: Number, default: 0, min: 0, max: 100 },
      understand: { type: Number, default: 30, min: 0, max: 100 },
      apply: { type: Number, default: 40, min: 0, max: 100 },
      analyze: { type: Number, default: 20, min: 0, max: 100 },
      evaluate: { type: Number, default: 10, min: 0, max: 100 },
      create: { type: Number, default: 0, min: 0, max: 100 }
    },
    // Part structure (for Part A, Part B, etc.)
    examStructure: [{
      partName: String,
      totalMarks: Number,
      questionCount: Number,
      instructions: String
    }],
    includeModelAnswers: { type: Boolean, default: true },
    includeDiagrams: { type: Boolean, default: false },
    // Optional section-wise structure and rules
    sections: [{
      name: { type: String, required: true },
      instructions: { type: String },
      // Which marks are allowed in this section, e.g., [2, 8, 16]
      marksAllowed: [{ type: Number }],
      // Optional per-marks choice rules, e.g., { "8": { selectAny: 1, total: 2, groupLabel: "A" } }
      choiceRules: {
        type: Map,
        of: new mongoose.Schema({
          selectAny: { type: Number, default: 0 },
          total: { type: Number, default: 0 },
          groupLabel: { type: String, default: '' }
        }, { _id: false })
      }
    }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Exam', examSchema);


