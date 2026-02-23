const express = require('express');
const router = express.Router();
const {
  getExams,
  getExam,
  createExam,
  generateQuestions,
  updateExam,
  assignExam,
  deleteExam,
  startExam,
  abandonExam,
  finalSubmitExam,
  getAttemptStatus,
  releaseResults,
  getMyResult
} = require('../controllers/examController');
const {
  getExamAnswers
} = require('../controllers/answerController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getExams)
  .post(protect, authorize('faculty'), createExam);

// Specific routes must come before generic /:id route
router.post('/:id/generate-questions', protect, authorize('faculty'), generateQuestions);
router.put('/:id/assign', protect, authorize('faculty'), assignExam);
router.post('/:id/start', protect, authorize('student'), startExam);
router.put('/:id/abandon', protect, authorize('student'), abandonExam);
router.post('/:id/submit', protect, authorize('student'), finalSubmitExam);
router.get('/:id/attempt-status', protect, authorize('student'), getAttemptStatus);
router.post('/:id/release-results', protect, authorize('faculty'), releaseResults);
router.get('/:id/my-result', protect, authorize('student'), getMyResult);
router.get('/:examId/answers', protect, getExamAnswers);

// Generic /:id route comes last
router.route('/:id')
  .get(protect, getExam)
  .put(protect, authorize('faculty'), updateExam)
  .delete(protect, authorize('faculty'), deleteExam);

module.exports = router;


