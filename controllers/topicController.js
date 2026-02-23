const asyncHandler = require('../middleware/asyncHandler');
const Topic = require('../models/Topic');
const Unit = require('../models/Unit');
const path = require('path');
const { analyzeTopicMaterials } = require('../services/aiService');

// @desc    Get all topics for a unit
// @route   GET /api/units/:unitId/topics
// @access  Private
exports.getTopics = asyncHandler(async (req, res, next) => {
  const { unitId } = req.params;
  
  const topics = await Topic.find({ unit: unitId }).populate('unit', 'title');
  
  res.status(200).json({
    success: true,
    count: topics.length,
    data: topics
  });
});

// @desc    Get single topic
// @route   GET /api/topics/:id
// @access  Private
exports.getTopic = asyncHandler(async (req, res, next) => {
  const topic = await Topic.findById(req.params.id)
    .populate('unit')
    .populate('createdBy', 'name email');
  
  if (!topic) {
    return res.status(404).json({
      success: false,
      message: 'Topic not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: topic
  });
});

// @desc    Create topic (with AI analysis)
// @route   POST /api/topics
// @access  Private/Faculty
exports.createTopic = asyncHandler(async (req, res, next) => {
  const { unitId } = req.body;
  
  // Check if unit exists
  const unit = await Unit.findById(unitId);
  if (!unit) {
    return res.status(404).json({
      success: false,
      message: 'Unit not found'
    });
  }
  
  req.body.unit = unitId;
  req.body.createdBy = req.user.id;
  
  // Parse keywords if string
  if (typeof req.body.keywords === 'string') {
    req.body.keywords = req.body.keywords.split(',').map(k => k.trim());
  }
  
  // Handle uploaded files
  if (req.files && req.files.length > 0) {
    req.body.referenceFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      fileType: path.extname(file.originalname).substring(1).toUpperCase(),
      uploadedAt: new Date()
    }));
  }
  
  const topic = await Topic.create(req.body);
  
  // AI Analysis (async - don't block response)
  analyzeTopicMaterials(topic.toObject())
    .then(analysis => {
      return Topic.findByIdAndUpdate(topic._id, { aiAnalysis: analysis }, { new: true });
    })
    .catch(err => console.error('AI Analysis failed:', err));
  
  res.status(201).json({
    success: true,
    data: topic
  });
});

// @desc    Update topic
// @route   PUT /api/topics/:id
// @access  Private/Faculty
exports.updateTopic = asyncHandler(async (req, res, next) => {
  let topic = await Topic.findById(req.params.id);
  
  if (!topic) {
    return res.status(404).json({
      success: false,
      message: 'Topic not found'
    });
  }
  
  // Make sure user is the creator
  if (topic.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this topic'
    });
  }
  
  // Parse keywords if string
  if (req.body.keywords && typeof req.body.keywords === 'string') {
    req.body.keywords = req.body.keywords.split(',').map(k => k.trim());
  }
  
  // Handle uploaded files
  if (req.files && req.files.length > 0) {
    req.body.referenceFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      fileType: path.extname(file.originalname).substring(1).toUpperCase(),
      uploadedAt: new Date()
    }));
  }
  
  topic = await Topic.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    data: topic
  });
});

// @desc    Delete topic
// @route   DELETE /api/topics/:id
// @access  Private/Faculty
exports.deleteTopic = asyncHandler(async (req, res, next) => {
  const topic = await Topic.findById(req.params.id);
  
  if (!topic) {
    return res.status(404).json({
      success: false,
      message: 'Topic not found'
    });
  }
  
  // Make sure user is the creator
  if (topic.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this topic'
    });
  }
  
  await topic.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Topic deleted successfully'
  });
});
