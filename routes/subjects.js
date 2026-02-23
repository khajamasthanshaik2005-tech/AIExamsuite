const express = require('express');
const router = express.Router();
const {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject
} = require('../controllers/subjectController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getSubjects)
  .post(protect, authorize('faculty'), createSubject);

router.route('/:id')
  .get(protect, getSubject)
  .put(protect, authorize('faculty'), updateSubject)
  .delete(protect, authorize('faculty'), deleteSubject);

module.exports = router;


