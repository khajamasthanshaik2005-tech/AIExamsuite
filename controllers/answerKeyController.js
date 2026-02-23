const asyncHandler = require('../middleware/asyncHandler');
const AnswerKey = require('../models/AnswerKey');
const Exam = require('../models/Exam');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { extractTextFromPDF, structureAnswerKey } = require('../services/pdfExtractionService');

// Configure multer for answer key uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'answer-keys');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `answer-key-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
}).single('answerKey');

// @desc    Upload answer key for an exam
// @route   POST /api/answer-keys/exam/:examId
// @access  Private/Faculty
exports.uploadAnswerKey = asyncHandler(async (req, res, next) => {
  const { examId } = req.params;

  // Verify exam exists and user is the creator
  const exam = await Exam.findById(examId).populate('questions');
  if (!exam) {
    return res.status(404).json({
      success: false,
      message: 'Exam not found'
    });
  }

  if (String(exam.createdBy) !== String(req.user.id)) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to upload answer key for this exam'
    });
  }

  // Handle file upload
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PDF file'
      });
    }

    try {
      console.log('Processing answer key upload...');
      console.log('File path:', req.file.path);
      console.log('File size:', req.file.size);
      console.log('File mimetype:', req.file.mimetype);
      console.log('File exists?', fs.existsSync(req.file.path));
      
      // Verify file exists
      if (!fs.existsSync(req.file.path)) {
        throw new Error(`Uploaded file not found at: ${req.file.path}`);
      }

      // Extract text from PDF
      let rawText;
      try {
        rawText = await extractTextFromPDF(req.file.path);
        console.log('Extracted text length:', rawText ? rawText.length : 0);
        
        if (!rawText || rawText.trim().length === 0) {
          throw new Error('No text could be extracted from the PDF. Please ensure the PDF contains selectable text (not just images).');
        }
      } catch (extractError) {
        console.error('PDF extraction error:', extractError);
        throw extractError;
      }

      // Structure the answer key using AI
      let structuredContent;
      try {
        structuredContent = await structureAnswerKey(rawText, exam.questions || []);
        console.log('Structured content:', structuredContent.questions?.length || 0, 'questions');
      } catch (structureError) {
        console.error('Answer key structuring error:', structureError);
        // Continue with fallback structure
        structuredContent = {
          questions: (exam.questions || []).map((q, i) => ({
            questionNumber: i + 1,
            questionText: q.text,
            expectedAnswer: 'Please review and update manually',
            keywords: [],
            marks: q.marks,
            rubric: { sections: [] }
          }))
        };
      }

      const targetBranch = (req.body.targetBranch || '').trim();
      const targetYear = (req.body.targetYear || '').trim();
      const targetSection = (req.body.targetSection || '').trim();

      let answerKey = await AnswerKey.findOne({
        exam: examId,
        targetBranch: targetBranch || '',
        targetYear: targetYear || '',
        targetSection: targetSection || ''
      });

      if (answerKey) {
        answerKey.filename = req.file.filename;
        answerKey.path = `uploads/answer-keys/${req.file.filename}`;
        answerKey.fileSize = req.file.size;
        answerKey.extractedContent = { rawText, questions: structuredContent.questions };
        answerKey.uploadedBy = req.user.id;
        await answerKey.save();
      } else {
        answerKey = await AnswerKey.create({
          exam: examId,
          targetBranch: targetBranch || '',
          targetYear: targetYear || '',
          targetSection: targetSection || '',
          uploadedBy: req.user.id,
          filename: req.file.filename,
          path: `uploads/answer-keys/${req.file.filename}`,
          fileSize: req.file.size,
          extractedContent: { rawText, questions: structuredContent.questions }
        });
      }

      res.status(200).json({
        success: true,
        message: 'Answer key uploaded and processed successfully',
        data: answerKey
      });
    } catch (error) {
      console.error('Error processing answer key:', error);
      // Delete uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to process answer key: ' + error.message
      });
    }
  });
});

// @desc    Get answer key(s) for an exam
// @route   GET /api/answer-keys/exam/:examId
// @query   branch, year, section - optional, for cohort-specific lookup
// @access  Private/Faculty
// Returns: single answer key if cohort params given, else array of all answer keys
exports.getAnswerKey = asyncHandler(async (req, res, next) => {
  const { examId } = req.params;
  const { branch, year, section } = req.query;

  const exam = await Exam.findById(examId);
  if (!exam) {
    return res.status(404).json({ success: false, message: 'Exam not found' });
  }
  if (String(exam.createdBy) !== String(req.user.id)) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const sb = (branch || '').trim();
  const sy = (year || '').trim();
  const ss = (section || '').trim();

  if (sb || sy || ss) {
    // Find best matching answer key for this cohort
    const allKeys = await AnswerKey.find({ exam: examId });
    let best = null;
    let bestScore = -1;
    for (const k of allKeys) {
      const tb = (k.targetBranch || '').trim();
      const ty = (k.targetYear || '').trim();
      const ts = (k.targetSection || '').trim();
      const matchB = !tb || tb.toLowerCase() === sb.toLowerCase();
      const matchY = !ty || ty.toLowerCase() === sy.toLowerCase();
      const matchS = !ts || ts.toLowerCase() === ss.toLowerCase();
      const score = (matchB ? 4 : 0) + (matchY ? 2 : 0) + (matchS ? 1 : 0);
      if (matchB && matchY && matchS && score > bestScore) {
        bestScore = score;
        best = k;
      }
    }
    if (!best && allKeys.length > 0) {
      best = allKeys.find(k => !k.targetBranch && !k.targetYear && !k.targetSection) || allKeys[0];
    }
    if (!best) {
      return res.status(404).json({ success: false, message: 'Answer key not found for this cohort' });
    }
    return res.status(200).json({ success: true, data: best });
  }

  const answerKeys = await AnswerKey.find({ exam: examId }).sort('targetBranch targetYear targetSection');
  res.status(200).json({ success: true, data: answerKeys });
});

// @desc    Delete answer key
// @route   DELETE /api/answer-keys/:id
// @access  Private/Faculty
exports.deleteAnswerKey = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const answerKey = await AnswerKey.findById(id).populate('exam');
  if (!answerKey) {
    return res.status(404).json({
      success: false,
      message: 'Answer key not found'
    });
  }

  if (String(answerKey.exam.createdBy) !== String(req.user.id)) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized'
    });
  }

  // Delete file
  if (answerKey.path && fs.existsSync(answerKey.path)) {
    fs.unlinkSync(answerKey.path);
  }

  await answerKey.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Answer key deleted successfully'
  });
});

