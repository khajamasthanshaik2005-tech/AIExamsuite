const asyncHandler = require('../middleware/asyncHandler');
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');
const { evaluateAnswer } = require('../services/aiService');

// @desc    Submit/Update answer
// @route   POST /api/answers
// @access  Private/Student
exports.submitAnswer = asyncHandler(async (req, res, next) => {
  const { examId, questionId, answerText, autoSaved = false, attachmentDataUrl } = req.body;
  
  // Validate required fields
  if (!examId || !questionId) {
    return res.status(400).json({
      success: false,
      message: 'Exam ID and Question ID are required'
    });
  }
  
  // Ensure answerText is a string (allow empty strings for unanswered questions)
  const answerTextValue = answerText !== null && answerText !== undefined ? String(answerText) : '';
  
  const question = await Question.findById(questionId);
  if (!question) {
    return res.status(404).json({
      success: false,
      message: 'Question not found'
    });
  }
  
  // Find or create answer
  let answer = await Answer.findOne({
    student: req.user.id,
    exam: examId,
    question: questionId
  });
  
  if (answer) {
    answer.answerText = answerTextValue;
    answer.autoSaved = autoSaved;
    answer.submittedAt = new Date();
    await answer.save();
  } else {
    answer = await Answer.create({
      student: req.user.id,
      exam: examId,
      question: questionId,
      answerText: answerTextValue,
      maxScore: question.marks,
      autoSaved
    });
  }
  // Optional attachment (e.g., drawing canvas)
  if (attachmentDataUrl && typeof attachmentDataUrl === 'string' && attachmentDataUrl.startsWith('data:image/')) {
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(__dirname, '..', 'uploads', 'answer-attachments');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const matches = attachmentDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (matches && matches[2]) {
      const mime = matches[1] || 'image/png';
      const ext = mime.split('/')[1] || 'png';
      const filename = `ans-${Date.now()}-${Math.round(Math.random()*1e9)}.${ext}`;
      const filePath = path.join(dir, filename);
      const buffer = Buffer.from(matches[2], 'base64');
      fs.writeFileSync(filePath, buffer);
      answer.attachments = answer.attachments || [];
      answer.attachments.push({ filename, path: `uploads/answer-attachments/${filename}`, fileType: mime });
      await answer.save();
    }
  }
  
  // Auto-grade MCQ
  if (question.type === 'multiple_choice') {
    const correctOption = question.options.find(opt => opt.isCorrect);
    if (correctOption && answerText.toLowerCase().trim() === correctOption.text.toLowerCase().trim()) {
      answer.score = question.marks;
      answer.isReviewed = true;
      await answer.save();
    } else {
      answer.score = 0;
      await answer.save();
    }
  }
  
  // AI Evaluation for theory questions
  if (question.type === 'short_answer' || question.type === 'long_answer') {
    if (!autoSaved) {
      const aiEvaluation = await evaluateAnswer(
        answerText,
        question.correctAnswer,
        question.type,
        question.marks
      );
      
      answer.aiEvaluation = aiEvaluation;
      answer.score = aiEvaluation.suggestedScore || 0;
      await answer.save();
    }
  }
  
  res.status(200).json({
    success: true,
    data: answer
  });
});

// @desc    Faculty review answer
// @route   PUT /api/answers/:id/review
// @access  Private/Faculty
exports.reviewAnswer = asyncHandler(async (req, res, next) => {
  const { score, feedback } = req.body;
  
  let answer = await Answer.findById(req.params.id);
  
  if (!answer) {
    return res.status(404).json({
      success: false,
      message: 'Answer not found'
    });
  }
  
  answer.score = score;
  answer.facultyReview.feedback = feedback;
  answer.facultyReview.reviewedAt = new Date();
  answer.isReviewed = true;
  
  await answer.save();
  
  res.status(200).json({
    success: true,
    data: answer
  });
});

// @desc    Get answers for an exam
// @route   GET /api/exams/:examId/answers
// @access  Private
exports.getExamAnswers = asyncHandler(async (req, res, next) => {
  const { examId } = req.params;
  
  let query = { exam: examId };
  
  if (req.user.role === 'student') {
    query.student = req.user.id;
  }
  
  const answers = await Answer.find(query)
    .populate('question')
    .populate('student', 'name email studentId');
  
  res.status(200).json({
    success: true,
    count: answers.length,
    data: answers
  });
});


