const asyncHandler = require('../middleware/asyncHandler');
const multer = require('multer');
const path = require('path');

// Handle file upload errors
exports.handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large'
      });
    }
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// Upload files middleware
exports.uploadFiles = asyncHandler(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }
  
  // Process uploaded files
  req.uploadedFiles = req.files.map(file => ({
    filename: file.filename,
    originalName: file.originalname,
    path: file.path,
    fileType: path.extname(file.originalname).substring(1).toUpperCase()
  }));
  
  next();
});


