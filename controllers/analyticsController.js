const asyncHandler = require('../middleware/asyncHandler');
const Exam = require('../models/Exam');
const Answer = require('../models/Answer');
const ExamAttempt = require('../models/ExamAttempt');
const Question = require('../models/Question');
const Topic = require('../models/Topic');

// @desc    Get faculty analytics
// @route   GET /api/analytics/faculty
// @access  Private/Faculty
exports.getFacultyAnalytics = asyncHandler(async (req, res, next) => {
  const exams = await Exam.find({ createdBy: req.user.id })
    .populate('subject', 'code name')
    .populate('questions');
  
  const analytics = {
    totalExams: exams.length,
    publishedExams: exams.filter(e => e.status === 'published').length,
    totalQuestions: 0,
    examPerformance: []
  };
  
  for (const exam of exams) {
    if (exam.questions.length > 0) {
      analytics.totalQuestions += exam.questions.length;
      
      const attempts = await ExamAttempt.find({ exam: exam._id });
      const answers = await Answer.find({ exam: exam._id });
      
      analytics.examPerformance.push({
        examId: exam._id,
        examTitle: exam.title,
        subject: exam.subject.code,
        totalAttempts: attempts.length,
        avgScore: attempts.length > 0
          ? attempts.reduce((sum, a) => sum + (a.totalScore || 0), 0) / attempts.length
          : 0,
        completionRate: attempts.filter(a => a.status === 'completed').length,
        questionAnalytics: await getQuestionAnalytics(exam._id)
      });
    }
  }
  
  res.status(200).json({
    success: true,
    data: analytics
  });
});

// @desc    Get student analytics
// @route   GET /api/analytics/student
// @access  Private/Student
exports.getStudentAnalytics = asyncHandler(async (req, res, next) => {
  const attempts = await ExamAttempt.find({ student: req.user.id })
    .populate('exam', 'title type totalMarks')
    .populate('exam.subject', 'code name');
  
  const analytics = {
    totalExams: attempts.length,
    completedExams: attempts.filter(a => a.status === 'completed').length,
    avgScore: attempts.length > 0
      ? attempts.reduce((sum, a) => sum + (a.totalScore || 0), 0) / attempts.length
      : 0,
    examHistory: [],
    topicCoverage: await getStudentTopicCoverage(req.user.id)
  };
  
  for (const attempt of attempts) {
    analytics.examHistory.push({
      examTitle: attempt.exam.title,
      subject: attempt.exam.subject.code,
      score: attempt.totalScore,
      maxScore: attempt.maxScore,
      grade: attempt.finalGrade,
      passed: attempt.passed,
      submittedAt: attempt.submittedAt
    });
  }
  
  res.status(200).json({
    success: true,
    data: analytics
  });
});

// Helper: Get question-level analytics
const getQuestionAnalytics = async (examId) => {
  const answers = await Answer.find({ exam: examId }).populate('question');
  
  const questionStats = {};
  
  answers.forEach(answer => {
    const qId = answer.question._id.toString();
    if (!questionStats[qId]) {
      questionStats[qId] = {
        questionId: qId,
        questionText: answer.question.text,
        totalAttempts: 0,
        correctAttempts: 0,
        avgScore: 0,
        topic: answer.question.topic
      };
    }
    
    questionStats[qId].totalAttempts++;
    if (answer.score > 0) {
      questionStats[qId].correctAttempts++;
    }
    questionStats[qId].avgScore += answer.score;
  });
  
  // Calculate averages
  Object.keys(questionStats).forEach(qId => {
    questionStats[qId].avgScore /= questionStats[qId].totalAttempts;
  });
  
  return Object.values(questionStats);
};

// Helper: Get student topic coverage
const getStudentTopicCoverage = async (studentId) => {
  const answers = await Answer.find({ student: studentId })
    .populate('question', 'topic')
    .populate({
      path: 'question.topic',
      select: 'title depthLevel aiAnalysis'
    });
  
  const topicStats = {};
  
  answers.forEach(answer => {
    if (answer.question.topic) {
      const topicId = answer.question.topic._id.toString();
      if (!topicStats[topicId]) {
        topicStats[topicId] = {
          topicId,
          topicTitle: answer.question.topic.title,
          depthLevel: answer.question.topic.depthLevel,
          totalQuestions: 0,
          avgScore: 0,
          coveragePercentage: 0
        };
      }
      
      topicStats[topicId].totalQuestions++;
      topicStats[topicId].avgScore += answer.score || 0;
    }
  });
  
  // Calculate coverage
  Object.keys(topicStats).forEach(topicId => {
    const stats = topicStats[topicId];
    stats.avgScore /= stats.totalQuestions;
    stats.coveragePercentage = stats.avgScore / stats.totalQuestions * 100;
  });
  
  return Object.values(topicStats);
};
