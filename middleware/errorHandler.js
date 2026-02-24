const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  console.log(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key (e.g. unique email or studentId)
  if (err.code === 11000) {
    const duplicateFields = err.keyValue || {};
    const fieldName = Object.keys(duplicateFields)[0] || 'field';

    let message;
    if (fieldName === 'email') {
      message = 'Email is already registered. Please sign in instead.';
    } else if (fieldName === 'studentId') {
      message = 'Student ID is already registered.';
    } else {
      message = `Duplicate value for ${fieldName}. Please use a different value.`;
    }

    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error'
  });
};

module.exports = errorHandler;


