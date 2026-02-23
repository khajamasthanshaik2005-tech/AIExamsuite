const express = require('express');
const router = express.Router();
const {
  getQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion
} = require('../controllers/questionController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getQuestions)
  .post(protect, authorize('faculty'), createQuestion);

router.route('/:id')
  .get(protect, getQuestion)
  .put(protect, authorize('faculty'), updateQuestion)
  .delete(protect, authorize('faculty'), deleteQuestion);

module.exports = router;


