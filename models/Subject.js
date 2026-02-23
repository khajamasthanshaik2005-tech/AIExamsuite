const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please add a subject code'],
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Please add a subject name'],
    trim: true
  },
  semester: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  // Optional cohort targeting for auto-enrollment and visibility
  branch: {
    type: String,
    trim: true
  },
  year: {
    type: String,
    trim: true
  },
  section: {
    type: String,
    trim: true
  },
  collegeId: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
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

module.exports = mongoose.model('Subject', subjectSchema);


