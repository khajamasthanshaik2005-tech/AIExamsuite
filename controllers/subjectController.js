const asyncHandler = require('../middleware/asyncHandler');
const Subject = require('../models/Subject');
const Unit = require('../models/Unit');
const Topic = require('../models/Topic');
const Question = require('../models/Question');

// @desc    Get all subjects
// @route   GET /api/subjects
// @access  Private
exports.getSubjects = asyncHandler(async (req, res, next) => {
  let query;
  
  // Copy req.query
  const reqQuery = { ...req.query };
  
  // If student, show only enrolled subjects
  if (req.user.role === 'student') {
    return res.status(200).json({
      success: true,
      data: req.user.enrolledSubjects
    });
  }
  
  // For faculty, show all subjects they created
  const subjects = await Subject.find({ createdBy: req.user.id }).populate('createdBy', 'name email');
  
  res.status(200).json({
    success: true,
    count: subjects.length,
    data: subjects
  });
});

// @desc    Get single subject
// @route   GET /api/subjects/:id
// @access  Private
exports.getSubject = asyncHandler(async (req, res, next) => {
  const subject = await Subject.findById(req.params.id)
    .populate('createdBy', 'name email');
  
  if (!subject) {
    return res.status(404).json({
      success: false,
      message: 'Subject not found'
    });
  }
  
  // Manually populate units for better control
  const units = await Unit.find({ subject: subject._id });
  subject.units = units;
  
  res.status(200).json({
    success: true,
    data: subject
  });
});

// @desc    Create new subject
// @route   POST /api/subjects
// @access  Private/Faculty
exports.createSubject = asyncHandler(async (req, res, next) => {
  req.body.createdBy = req.user.id;
  
  const subject = await Subject.create(req.body);
  
  res.status(201).json({
    success: true,
    data: subject
  });
});

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Private/Faculty
exports.updateSubject = asyncHandler(async (req, res, next) => {
  let subject = await Subject.findById(req.params.id);
  
  if (!subject) {
    return res.status(404).json({
      success: false,
      message: 'Subject not found'
    });
  }
  
  // Make sure user is the creator
  if (subject.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this subject'
    });
  }
  
  subject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    data: subject
  });
});

// @desc    Delete subject
// @route   DELETE /api/subjects/:id
// @access  Private/Faculty
exports.deleteSubject = asyncHandler(async (req, res, next) => {
  const subject = await Subject.findById(req.params.id);
  
  if (!subject) {
    return res.status(404).json({
      success: false,
      message: 'Subject not found'
    });
  }
  
  // Make sure user is the creator
  if (subject.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this subject'
    });
  }
  
  // Delete associated units, topics, and questions
  const units = await Unit.find({ subject: subject._id });
  for (const unit of units) {
    const topics = await Topic.find({ unit: unit._id });
    for (const topic of topics) {
      // Delete questions associated with this topic
      await Question.deleteMany({ topic: topic._id });
    }
    await Topic.deleteMany({ unit: unit._id });
  }
  await Unit.deleteMany({ subject: subject._id });
  
  await subject.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Subject and associated data deleted successfully'
  });
});
