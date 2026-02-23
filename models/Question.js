const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Please add question text'],
    trim: true
  },
  type: {
    type: String,
    enum: ['multiple_choice', 'short_answer', 'long_answer'],
    required: true
  },
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  correctAnswer: {
    type: String,
    required: true
  },
  marks: {
    type: Number,
    required: true,
    min: 1
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard', 'easy', 'medium', 'hard'],
    default: 'medium'
  },
  bloomLevel: {
    type: String,
    enum: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'],
    default: 'Understand'
  },
  modelAnswer: {
    type: String,
    trim: true
  },
  keyPoints: [{
    type: String
  }],
  suggestedDiagram: {
    type: String,
    trim: true
  },
  aiJustification: {
    type: String,
    trim: true
  },
  questionNumber: {
    type: Number
  },
  choiceGroup: {
    type: String,
    trim: true,
    comment: 'For grouped questions with choices (e.g., "Answer any 3 out of 5") - Groups questions by letter (A, B, etc.)'
  },
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
  },
  exams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isAI_generated: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Question', questionSchema);


