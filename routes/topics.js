const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const {
  getTopics,
  getTopic,
  createTopic,
  updateTopic,
  deleteTopic
} = require('../controllers/topicController');
const { protect, authorize } = require('../middleware/auth');

// Get topics for a specific unit
router.get('/unit/:unitId', protect, getTopics);

// Create topic with unit ID in body
router.post('/', protect, authorize('faculty'), upload.array('referenceFiles'), createTopic);

router.route('/:id')
  .get(protect, getTopic)
  .put(protect, authorize('faculty'), upload.array('referenceFiles'), updateTopic)
  .delete(protect, authorize('faculty'), deleteTopic);

module.exports = router;
