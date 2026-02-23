const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/study-materials';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|ppt|pptx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, PPT, PPTX, and TXT files are allowed'));
    }
  }
});

// @desc    Upload study material for unit
// @route   POST /api/uploads/units
// @access  Private/Faculty
router.post('/units', protect, authorize('faculty'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const Unit = require('../models/Unit');
    const unit = await Unit.findById(req.body.unit);
    
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

    // Add file reference to unit
    if (!unit.studyMaterials) {
      unit.studyMaterials = [];
    }
    
    unit.studyMaterials.push({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      uploadedAt: new Date(),
      uploadedBy: req.user.id
    });

    await unit.save();

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    List study materials for unit
// @route   GET /api/uploads/units/:unitId
// @access  Private
router.get('/units/:unitId', protect, async (req, res, next) => {
  try {
    const Unit = require('../models/Unit');
    const unit = await Unit.findById(req.params.unitId).select('studyMaterials title');
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }
    res.status(200).json({ success: true, data: unit.studyMaterials || [] });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete a unit study material
// @route   DELETE /api/uploads/units/:unitId/:materialId
// @access  Private/Faculty
router.delete('/units/:unitId/:materialId', protect, authorize('faculty'), async (req, res, next) => {
  try {
    const Unit = require('../models/Unit');
    const unit = await Unit.findById(req.params.unitId);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }
    unit.studyMaterials = (unit.studyMaterials || []).filter(m => m._id.toString() !== req.params.materialId);
    await unit.save();
    res.status(200).json({ success: true, message: 'Material deleted' });
  } catch (error) {
    next(error);
  }
});

// @desc    Upload study material for topic
// @route   POST /api/uploads/topics
// @access  Private/Faculty
router.post('/topics', protect, authorize('faculty'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const Topic = require('../models/Topic');
    const topic = await Topic.findById(req.body.topic);
    
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found'
      });
    }

    // Add file reference to topic
    if (!topic.studyMaterials) {
      topic.studyMaterials = [];
    }
    
    topic.studyMaterials.push({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      uploadedAt: new Date(),
      uploadedBy: req.user.id
    });

    await topic.save();

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    List study materials for topic
// @route   GET /api/uploads/topics/:topicId
// @access  Private
router.get('/topics/:topicId', protect, async (req, res, next) => {
  try {
    const Topic = require('../models/Topic');
    const topic = await Topic.findById(req.params.topicId).select('studyMaterials title');
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }
    res.status(200).json({ success: true, data: topic.studyMaterials || [] });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete a topic study material
// @route   DELETE /api/uploads/topics/:topicId/:materialId
// @access  Private/Faculty
router.delete('/topics/:topicId/:materialId', protect, authorize('faculty'), async (req, res, next) => {
  try {
    const Topic = require('../models/Topic');
    const topic = await Topic.findById(req.params.topicId);
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }
    topic.studyMaterials = (topic.studyMaterials || []).filter(m => m._id.toString() !== req.params.materialId);
    await topic.save();
    res.status(200).json({ success: true, message: 'Material deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

