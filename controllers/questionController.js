const asyncHandler = require('../middleware/asyncHandler');
const Question = require('../models/Question');
const Exam = require('../models/Exam');

// @desc    Get all questions
// @route   GET /api/questions
// @access  Private
exports.getQuestions = asyncHandler(async (req, res, next) => {
  let query = {};
  
  if (req.query.examId) {
    query.exams = req.query.examId;
  }
  
  if (req.query.topicId) {
    query.topic = req.query.topicId;
  }
  
  const questions = await Question.find(query)
    .populate('topic', 'title')
    .populate('unit', 'title');
  
  res.status(200).json({
    success: true,
    count: questions.length,
    data: questions
  });
});

// @desc    Get single question
// @route   GET /api/questions/:id
// @access  Private
exports.getQuestion = asyncHandler(async (req, res, next) => {
  const question = await Question.findById(req.params.id)
    .populate('topic')
    .populate('unit');
  
  if (!question) {
    return res.status(404).json({
      success: false,
      message: 'Question not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: question
  });
});

// @desc    Create question
// @route   POST /api/questions
// @access  Private/Faculty
exports.createQuestion = asyncHandler(async (req, res, next) => {
  req.body.createdBy = req.user.id;
  
  const question = await Question.create(req.body);
  
  // Add to exam if examId provided
  if (req.body.examId) {
    const exam = await Exam.findById(req.body.examId);
    if (exam) {
      exam.questions.push(question._id);
      await exam.save();
    }
  }
  
  res.status(201).json({
    success: true,
    data: question
  });
});

// @desc    Update question
// @route   PUT /api/questions/:id
// @access  Private/Faculty
exports.updateQuestion = asyncHandler(async (req, res, next) => {
  let question = await Question.findById(req.params.id);
  
  if (!question) {
    return res.status(404).json({
      success: false,
      message: 'Question not found'
    });
  }
  
  // Make sure user is the creator
  if (question.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this question'
    });
  }
  
  question = await Question.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    data: question
  });
});

// @desc    Delete question
// @route   DELETE /api/questions/:id
// @access  Private/Faculty
exports.deleteQuestion = asyncHandler(async (req, res, next) => {
  const question = await Question.findById(req.params.id);
  
  if (!question) {
    return res.status(404).json({
      success: false,
      message: 'Question not found'
    });
  }
  
  // Make sure user is the creator
  if (question.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this question'
    });
  }
  
  // Remove from exams
  await Exam.updateMany(
    { questions: question._id },
    { $pull: { questions: question._id } }
  );
  
  await question.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Question deleted successfully'
  });
});


