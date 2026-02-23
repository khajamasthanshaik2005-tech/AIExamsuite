const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const {
  getUnits,
  getUnit,
  createUnit,
  updateUnit,
  deleteUnit
} = require('../controllers/unitController');
const { protect, authorize } = require('../middleware/auth');

// Get units for a specific subject
router.get('/subject/:subjectId', protect, getUnits);

// Create unit with subject ID in body
router.post('/', protect, authorize('faculty'), upload.array('referenceMaterials'), createUnit);

router.route('/:id')
  .get(protect, getUnit)
  .put(protect, authorize('faculty'), updateUnit)
  .delete(protect, authorize('faculty'), deleteUnit);

module.exports = router;
