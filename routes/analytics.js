const express = require('express');
const router = express.Router();
const {
  getFacultyAnalytics,
  getStudentAnalytics
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/faculty', protect, authorize('faculty'), getFacultyAnalytics);
router.get('/student', protect, authorize('student'), getStudentAnalytics);

module.exports = router;


