const asyncHandler = require('../middleware/asyncHandler');
const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');
const Answer = require('../models/Answer');
const User = require('../models/User');

// @desc    Get all submissions for an exam (with filtering)
// @route   GET /api/evaluations/exam/:examId
// @access  Private/Faculty
exports.getExamSubmissions = asyncHandler(async (req, res, next) => {
  const { examId } = req.params;
  const { branch, year, section } = req.query;

  // Verify exam exists and user is the creator
  const exam = await Exam.findById(examId);
  if (!exam) {
    return res.status(404).json({
      success: false,
      message: 'Exam not found'
    });
  }

  if (String(exam.createdBy) !== String(req.user.id)) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view submissions for this exam'
    });
  }

  const filter = { exam: examId, status: { $in: ['submitted', 'completed'] } };

  if (branch && String(branch).trim()) {
    filter.branch = { $regex: new RegExp(`^${String(branch).trim()}$`, 'i') };
  }
  if (year && String(year).trim()) {
    filter.year = { $regex: new RegExp(`^${String(year).trim()}$`, 'i') };
  }
  if (section && String(section).trim()) {
    filter.section = { $regex: new RegExp(`^${String(section).trim()}$`, 'i') };
  }

  const attempts = await ExamAttempt.find(filter)
    .populate('student', 'name email studentId')
    .sort('-submittedAt');

  res.status(200).json({
    success: true,
    count: attempts.length,
    data: attempts
  });
});

// @desc    Get single submission with answers
// @route   GET /api/evaluations/submission/:attemptId
// @access  Private/Faculty
exports.getSubmission = asyncHandler(async (req, res, next) => {
  const { attemptId } = req.params;

  const attempt = await ExamAttempt.findById(attemptId)
    .populate('student', 'name email studentId branch year section')
    .populate('exam', 'title type totalMarks passingMarks');

  if (!attempt) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found'
    });
  }

  const exam = await Exam.findById(attempt.exam._id).populate('questions');
  if (String(exam.createdBy) !== String(req.user.id)) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this submission'
    });
  }

  const answers = await Answer.find({
    exam: attempt.exam._id,
    student: attempt.student._id
  }).populate('question');

  // Sort answers by exam question order
  const questionOrder = (exam.questions || []).map(q => String(q._id));
  const sortedAnswers = answers.slice().sort((a, b) => {
    const aId = String(a.question?._id || a.question);
    const bId = String(b.question?._id || b.question);
    const aIdx = questionOrder.indexOf(aId);
    const bIdx = questionOrder.indexOf(bId);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  res.status(200).json({
    success: true,
    data: {
      attempt,
      answers: sortedAnswers
    }
  });
});

// @desc    Update marks for answers
// @route   PUT /api/evaluations/answers/:answerId
// @access  Private/Faculty
exports.updateAnswerMarks = asyncHandler(async (req, res, next) => {
  const { answerId } = req.params;
  const { score, feedback } = req.body;

  if (score === undefined || score === null) {
    return res.status(400).json({
      success: false,
      message: 'Score is required'
    });
  }

  const answer = await Answer.findById(answerId).populate('exam');
  if (!answer) {
    return res.status(404).json({
      success: false,
      message: 'Answer not found'
    });
  }

  // Verify exam creator
  const exam = await Exam.findById(answer.exam._id);
  if (String(exam.createdBy) !== String(req.user.id)) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to evaluate this answer'
    });
  }

  // Update answer
  answer.score = score;
  answer.facultyReview = {
    score: score,
    feedback: feedback || '',
    reviewedAt: new Date()
  };
  answer.isReviewed = true;
  await answer.save();

  // Recalculate total score for the attempt
  const attempt = await ExamAttempt.findOne({
    exam: answer.exam._id,
    student: answer.student
  });

  if (attempt) {
    const allAnswers = await Answer.find({
      exam: answer.exam._id,
      student: answer.student
    });
    const totalScore = allAnswers.reduce((sum, ans) => sum + (ans.score || 0), 0);
    attempt.totalScore = totalScore;
    attempt.passed = totalScore >= exam.passingMarks;
    await attempt.save();
  }

  res.status(200).json({
    success: true,
    message: 'Marks updated successfully',
    data: answer
  });
});

// @desc    Bulk update marks for multiple answers
// @route   PUT /api/evaluations/submission/:attemptId/marks
// @access  Private/Faculty
exports.bulkUpdateMarks = asyncHandler(async (req, res, next) => {
  const { attemptId } = req.params;
  const { marks } = req.body; // { questionId: score, questionId2: score2, ... }

  if (!marks || typeof marks !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'Marks object is required'
    });
  }

  const attempt = await ExamAttempt.findById(attemptId).populate('exam');
  if (!attempt) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found'
    });
  }

  // Verify exam creator
  const exam = await Exam.findById(attempt.exam._id);
  if (String(exam.createdBy) !== String(req.user.id)) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to evaluate this submission'
    });
  }

  // Update all answers
  const updates = [];
  for (const [questionId, score] of Object.entries(marks)) {
    if (score === null || score === undefined) continue;

    const answer = await Answer.findOne({
      exam: attempt.exam._id,
      student: attempt.student,
      question: questionId
    });

    if (answer) {
      answer.score = score;
      answer.facultyReview = {
        score: score,
        feedback: '',
        reviewedAt: new Date()
      };
      answer.isReviewed = true;
      updates.push(answer.save());
    }
  }

  await Promise.all(updates);

  // Recalculate total score
  const allAnswers = await Answer.find({
    exam: attempt.exam._id,
    student: attempt.student
  });
  const totalScore = allAnswers.reduce((sum, ans) => sum + (ans.score || 0), 0);
  attempt.totalScore = totalScore;
  attempt.passed = totalScore >= exam.passingMarks;
  await attempt.save();

  res.status(200).json({
    success: true,
    message: 'Marks updated successfully',
    data: {
      attempt,
      totalScore
    }
  });
});

// @desc    Get unique branches, years, sections for filtering
// @route   GET /api/evaluations/exam/:examId/filters
// @access  Private/Faculty
exports.getFilterOptions = asyncHandler(async (req, res, next) => {
  const { examId } = req.params;

  const exam = await Exam.findById(examId);
  if (!exam) {
    return res.status(404).json({
      success: false,
      message: 'Exam not found'
    });
  }

  if (String(exam.createdBy) !== String(req.user.id)) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized'
    });
  }

  const attempts = await ExamAttempt.find({
    exam: examId,
    status: { $in: ['submitted', 'completed'] }
  }).select('branch year section');

  const branches = [...new Set(attempts.map(a => a.branch).filter(Boolean))].sort();
  const years = [...new Set(attempts.map(a => a.year).filter(Boolean))].sort();
  const sections = [...new Set(attempts.map(a => a.section).filter(Boolean))].sort();

  res.status(200).json({
    success: true,
    data: {
      branches,
      years,
      sections
    }
  });
});

// @desc    Auto-evaluate a single submission
// @route   POST /api/evaluations/submission/:attemptId/auto-evaluate
// @access  Private/Faculty
exports.autoEvaluateSubmission = asyncHandler(async (req, res, next) => {
  const { attemptId } = req.params;

  const attempt = await ExamAttempt.findById(attemptId).populate('exam');
  if (!attempt) {
    return res.status(404).json({
      success: false,
      message: 'Submission not found'
    });
  }

  // Verify exam creator
  const exam = await Exam.findById(attempt.exam._id);
  if (String(exam.createdBy) !== String(req.user.id)) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to evaluate this submission'
    });
  }

  try {
    const { evaluateSubmission } = require('../services/autoEvaluationService');
    const result = await evaluateSubmission(attemptId);

    res.status(200).json({
      success: true,
      message: 'Submission auto-evaluated successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to auto-evaluate submission'
    });
  }
});

// @desc    Bulk auto-evaluate submissions for an exam
// @route   POST /api/evaluations/exam/:examId/bulk-auto-evaluate
// @query   branch, year, section - optional, filter to this cohort only (class-wise)
// @access  Private/Faculty
exports.bulkAutoEvaluate = asyncHandler(async (req, res, next) => {
  const { examId } = req.params;
  const { branch, year, section } = req.query;

  const exam = await Exam.findById(examId);
  if (!exam) {
    return res.status(404).json({ success: false, message: 'Exam not found' });
  }
  if (String(exam.createdBy) !== String(req.user.id)) {
    return res.status(403).json({ success: false, message: 'Not authorized to evaluate this exam' });
  }

  try {
    const { bulkEvaluateExam } = require('../services/autoEvaluationService');
    const filter = {};
    if (branch && String(branch).trim()) filter.branch = { $regex: new RegExp(`^${String(branch).trim()}$`, 'i') };
    if (year && String(year).trim()) filter.year = { $regex: new RegExp(`^${String(year).trim()}$`, 'i') };
    if (section && String(section).trim()) filter.section = { $regex: new RegExp(`^${String(section).trim()}$`, 'i') };
    const result = await bulkEvaluateExam(examId, filter);

    res.status(200).json({
      success: true,
      message: `Bulk evaluation completed: ${result.evaluated} evaluated, ${result.errors} errors`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to bulk evaluate exam'
    });
  }
});

