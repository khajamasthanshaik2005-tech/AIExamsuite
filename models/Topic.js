const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a topic title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  depthLevel: {
    type: Number,
    enum: [1, 2, 3],
    required: true,
    default: 1,
    comment: '1=Basic, 2=Intermediate, 3=Advanced'
  },
  keywords: [{
    type: String,
    trim: true
  }],
  teachingHours: {
    type: Number,
    required: true,
    min: 1
  },
  studyMaterials: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
  },
  aiAnalysis: {
    suggestedSubtopics: [String],
    bloomsLevel: String,
    coverageEstimation: Number,
    analyzedAt: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Topic', topicSchema);

