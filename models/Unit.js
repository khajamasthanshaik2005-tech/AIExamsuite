const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a unit title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  estimatedHours: {
    type: Number,
    required: true,
    min: 1
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
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

module.exports = mongoose.model('Unit', unitSchema);

