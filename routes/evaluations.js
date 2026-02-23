const express = require('express');
const router = express.Router();
const {
  getExamSubmissions,
  getSubmission,
  updateAnswerMarks,
  bulkUpdateMarks,
  getFilterOptions,
  autoEvaluateSubmission,
  bulkAutoEvaluate
} = require('../controllers/evaluationController');
const { protect, authorize } = require('../middleware/auth');

// All routes require faculty authorization
router.get('/exam/:examId', protect, authorize('faculty'), getExamSubmissions);
router.get('/exam/:examId/filters', protect, authorize('faculty'), getFilterOptions);
router.get('/submission/:attemptId', protect, authorize('faculty'), getSubmission);
router.put('/answers/:answerId', protect, authorize('faculty'), updateAnswerMarks);
router.put('/submission/:attemptId/marks', protect, authorize('faculty'), bulkUpdateMarks);
router.post('/submission/:attemptId/auto-evaluate', protect, authorize('faculty'), autoEvaluateSubmission);
router.post('/exam/:examId/bulk-auto-evaluate', protect, authorize('faculty'), bulkAutoEvaluate);

module.exports = router;

