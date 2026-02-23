const asyncHandler = require('../middleware/asyncHandler');
const path = require('path');
const Unit = require('../models/Unit');
const Topic = require('../models/Topic');
const Subject = require('../models/Subject');

// @desc    Get all units for a subject
// @route   GET /api/subjects/:subjectId/units
// @access  Private
exports.getUnits = asyncHandler(async (req, res, next) => {
  const { subjectId } = req.params;
  
  const units = await Unit.find({ subject: subjectId }).populate('subject', 'code name');
  
  res.status(200).json({
    success: true,
    count: units.length,
    data: units
  });
});

// @desc    Get single unit
// @route   GET /api/units/:id
// @access  Private
exports.getUnit = asyncHandler(async (req, res, next) => {
  const unit = await Unit.findById(req.params.id)
    .populate('subject', 'code name')
    .populate('createdBy', 'name email');
  
  if (!unit) {
    return res.status(404).json({
      success: false,
      message: 'Unit not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: unit
  });
});

// @desc    Create unit
// @route   POST /api/units
// @access  Private/Faculty
exports.createUnit = asyncHandler(async (req, res, next) => {
  const { subjectId } = req.body;
  
  // Check if subject exists
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    return res.status(404).json({
      success: false,
      message: 'Subject not found'
    });
  }
  
  req.body.subject = subjectId;
  req.body.createdBy = req.user.id;
  
  // Handle uploaded files
  if (req.files && req.files.length > 0) {
    req.body.referenceMaterials = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      uploadedAt: new Date()
    }));
  }
  
  const unit = await Unit.create(req.body);
  
  res.status(201).json({
    success: true,
    data: unit
  });
});

// @desc    Update unit
// @route   PUT /api/units/:id
// @access  Private/Faculty
exports.updateUnit = asyncHandler(async (req, res, next) => {
  let unit = await Unit.findById(req.params.id);
  
  if (!unit) {
    return res.status(404).json({
      success: false,
      message: 'Unit not found'
    });
  }
  
  // Make sure user is the creator
  if (unit.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this unit'
    });
  }
  
  unit = await Unit.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    data: unit
  });
});

// @desc    Delete unit
// @route   DELETE /api/units/:id
// @access  Private/Faculty
exports.deleteUnit = asyncHandler(async (req, res, next) => {
  const unit = await Unit.findById(req.params.id);
  
  if (!unit) {
    return res.status(404).json({
      success: false,
      message: 'Unit not found'
    });
  }
  
  // Make sure user is the creator
  if (unit.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this unit'
    });
  }
  
  // Delete associated topics
  await Topic.deleteMany({ unit: unit._id });
  
  await unit.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Unit and associated topics deleted'
  });
});
