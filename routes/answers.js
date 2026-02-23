const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Answer = require('../models/Answer');
const { evaluateAnswer } = require('../services/aiService');
const { submitAnswer } = require('../controllers/answerController');

// @desc    Get pending evaluations
// @route   GET /api/answers/pending-evaluations
// @access  Private/Faculty
router.get('/pending-evaluations', protect, authorize('faculty'), async (req, res, next) => {
  try {
    const answers = await Answer.find({ 
      status: 'submitted',
      evaluatedAt: null 
    })
    .populate('question', 'text type marks')
    .populate('student', 'name email')
    .populate('exam', 'title')
    .sort('-submittedAt');

    res.status(200).json({
      success: true,
      count: answers.length,
      data: answers
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Submit/Update answer (autosave or final)
// @route   POST /api/answers
// @access  Private/Student
router.post('/', protect, authorize('student'), submitAnswer);

// @desc    Evaluate answer using AI
// @route   POST /api/answers/:id/evaluate
// @access  Private/Faculty
router.post('/:id/evaluate', protect, authorize('faculty'), async (req, res, next) => {
  try {
    const answer = await Answer.findById(req.params.id)
      .populate('question');

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    if (answer.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Answer is not in submitted status'
      });
    }

    // Use AI to evaluate the answer
    const evaluation = await evaluateAnswer(
      answer.answerText,
      answer.question.correctAnswer,
      answer.question.type,
      answer.question.marks
    );

    // Update answer with evaluation
    answer.score = evaluation.suggestedScore || 0;
    answer.feedback = evaluation.feedback;
    answer.evaluationDetails = {
      grammarScore: evaluation.grammarScore,
      contentRelevance: evaluation.contentRelevance,
      completeness: evaluation.completeness,
      coveragePercentage: evaluation.coveragePercentage,
      bloomsLevel: evaluation.bloomsLevel
    };
    answer.status = 'evaluated';
    answer.evaluatedAt = new Date();
    answer.evaluatedBy = req.user.id;

    await answer.save();

    res.status(200).json({
      success: true,
      message: 'Answer evaluated successfully',
      data: {
        score: answer.score,
        feedback: answer.feedback,
        evaluationDetails: answer.evaluationDetails
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get answer details
// @route   GET /api/answers/:id
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const answer = await Answer.findById(req.params.id)
      .populate('question', 'text type marks correctAnswer')
      .populate('student', 'name email')
      .populate('exam', 'title');

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    // Check if user has access to this answer
    if (req.user.role === 'student' && answer.student._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this answer'
      });
    }

    res.status(200).json({
      success: true,
      data: answer
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update answer evaluation (manual override)
// @route   PUT /api/answers/:id/evaluation
// @access  Private/Faculty
router.put('/:id/evaluation', protect, authorize('faculty'), async (req, res, next) => {
  try {
    const { score, feedback } = req.body;

    const answer = await Answer.findById(req.params.id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    answer.score = score;
    answer.feedback = feedback;
    answer.status = 'evaluated';
    answer.evaluatedAt = new Date();
    answer.evaluatedBy = req.user.id;

    await answer.save();

    res.status(200).json({
      success: true,
      message: 'Answer evaluation updated successfully',
      data: answer
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;