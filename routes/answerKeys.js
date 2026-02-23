const express = require('express');
const router = express.Router();
const {
  uploadAnswerKey,
  getAnswerKey,
  deleteAnswerKey
} = require('../controllers/answerKeyController');
const { protect, authorize } = require('../middleware/auth');

router.post('/exam/:examId', protect, authorize('faculty'), uploadAnswerKey);
router.get('/exam/:examId', protect, authorize('faculty'), getAnswerKey);
router.delete('/:id', protect, authorize('faculty'), deleteAnswerKey);

module.exports = router;




