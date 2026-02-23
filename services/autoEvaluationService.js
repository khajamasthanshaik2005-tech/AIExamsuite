const Answer = require('../models/Answer');
const ExamAttempt = require('../models/ExamAttempt');
const AnswerKey = require('../models/AnswerKey');
const Exam = require('../models/Exam');
const { evaluateAnswer } = require('./aiService');

/**
 * Strip HTML to get plain text for emptiness check
 */
function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

/**
 * Auto-evaluate a single answer using answer key
 * @param {Object} answer - Answer document with populated question
 * @param {Object} answerKey - AnswerKey document
 * @param {Map} questionIndexMap - Map of questionId (string) -> index (0-based) in exam order
 * @returns {Promise<Object>} - Evaluation result
 */
async function evaluateSingleAnswer(answer, answerKey, questionIndexMap) {
  try {
    const qId = String(answer.question?._id || answer.question);
    const questionIndex = questionIndexMap?.get(qId);

    // Match answer key by: 1) questionNumber on Question, 2) index in exam order
    let expectedAnswerData = null;
    const questions = answerKey.extractedContent?.questions || [];

    if (questionIndex != null && questions[questionIndex]) {
      expectedAnswerData = questions[questionIndex];
    } else {
      const qNum = answer.question?.questionNumber;
      if (qNum != null) {
        expectedAnswerData = questions.find(
          q => q.questionNumber === qNum || String(q.questionNumber) === String(qNum)
        );
      }
    }

    if (!expectedAnswerData) {
      return {
        score: 0,
        feedback: 'Expected answer not found in answer key',
        evaluated: false,
        keywordsFound: [],
        keywordsMissing: [],
        keywordMatchPercentage: 1
      };
    }

    const expectedAnswer = expectedAnswerData.expectedAnswer || '';
    const keywords = Array.isArray(expectedAnswerData.keywords) ? expectedAnswerData.keywords : [];
    const maxMarks = expectedAnswerData.marks || answer.maxScore || 0;
    const questionType = answer.question?.type || 'long_answer';

    const rawText = answer.answerText || '';
    const plainText = stripHtml(rawText);

    // Unanswered: 0 score, clear feedback
    if (!plainText) {
      return {
        score: 0,
        feedback: 'No answer provided.',
        keywordsFound: [],
        keywordsMissing: keywords,
        keywordMatchPercentage: 0,
        similarity: 0,
        completeness: 0,
        grammarScore: 0,
        evaluated: true
      };
    }

    const evaluation = await evaluateAnswer(
      rawText,
      expectedAnswer,
      questionType,
      maxMarks
    );

    const keywordMatch = checkKeywords(plainText, keywords);
    let finalScore = evaluation.suggestedScore ?? 0;

    if (keywordMatch.foundPercentage < 0.5 && finalScore > maxMarks * 0.5) {
      finalScore = finalScore * 0.8;
    }

    finalScore = Math.min(Math.max(finalScore, 0), maxMarks);
    finalScore = Math.round(finalScore * 10) / 10;

    return {
      score: finalScore,
      suggestedScore: finalScore,
      feedback: evaluation.feedback || 'Auto-evaluated',
      keywordsFound: keywordMatch.found,
      keywordsMissing: keywordMatch.missing,
      keywordMatchPercentage: keywordMatch.foundPercentage,
      similarity: evaluation.contentRelevance || 0,
      completeness: evaluation.completeness || 0,
      grammarScore: evaluation.grammarScore || 0,
      evaluated: true
    };
  } catch (error) {
    console.error('Error evaluating answer:', error);
    return {
      score: 0,
      feedback: 'Evaluation failed: ' + error.message,
      evaluated: false,
      keywordsFound: [],
      keywordsMissing: [],
      keywordMatchPercentage: 0
    };
  }
}

/**
 * Check keyword presence in answer
 * @param {string} answerText - Student answer text
 * @param {Array} keywords - Array of keywords to check
 * @returns {Object} - Keyword match results
 */
function checkKeywords(answerText, keywords) {
  if (!keywords || keywords.length === 0) {
    return {
      found: [],
      missing: [],
      foundPercentage: 1.0
    };
  }

  const answerLower = (answerText || '').toLowerCase();
  const found = [];
  const missing = [];

  keywords.forEach(keyword => {
    const keywordLower = keyword.toLowerCase();
    // Check for exact match or word boundary match
    const regex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(answerLower)) {
      found.push(keyword);
    } else {
      missing.push(keyword);
    }
  });

  return {
    found,
    missing,
    foundPercentage: found.length / keywords.length
  };
}

/**
 * Find best matching answer key for a cohort (branch, year, section)
 */
async function findAnswerKeyForCohort(examId, branch, year, section) {
  const allKeys = await AnswerKey.find({ exam: examId });
  if (allKeys.length === 0) return null;
  const sb = (branch || '').trim().toLowerCase();
  const sy = (year || '').trim().toLowerCase();
  const ss = (section || '').trim().toLowerCase();

  let best = null;
  let bestScore = -1;
  for (const k of allKeys) {
    const tb = (k.targetBranch || '').trim().toLowerCase();
    const ty = (k.targetYear || '').trim().toLowerCase();
    const ts = (k.targetSection || '').trim().toLowerCase();
    const matchB = !tb || tb === sb;
    const matchY = !ty || ty === sy;
    const matchS = !ts || ts === ss;
    if (matchB && matchY && matchS) {
      const score = (tb ? 4 : 0) + (ty ? 2 : 0) + (ts ? 1 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = k;
      }
    }
  }
  return best || allKeys.find(k => !k.targetBranch && !k.targetYear && !k.targetSection) || allKeys[0];
}

/**
 * Auto-evaluate all answers for a submission
 * @param {string} attemptId - ExamAttempt ID
 * @returns {Promise<Object>} - Evaluation results
 */
async function evaluateSubmission(attemptId) {
  try {
    const attempt = await ExamAttempt.findById(attemptId)
      .populate('exam')
      .populate('student');

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const answerKey = await findAnswerKeyForCohort(
      attempt.exam._id,
      attempt.branch || attempt.student?.branch,
      attempt.year || attempt.student?.year,
      attempt.section || attempt.student?.section
    );
    if (!answerKey) {
      throw new Error('Answer key not found for this exam. Upload an answer key for Branch/Year/Section.');
    }

    const Exam = require('../models/Exam');
    const populatedExam = await Exam.findById(attempt.exam._id).populate('questions');
    const orderedQuestionIds = (populatedExam?.questions || []).map(q => String(q._id));
    const questionIndexMap = new Map();
    orderedQuestionIds.forEach((id, idx) => questionIndexMap.set(id, idx));

    const answers = await Answer.find({
      exam: attempt.exam._id,
      student: attempt.student._id
    }).populate('question');

    if (answers.length === 0) {
      throw new Error('No answers found for this submission');
    }

    const evaluationResults = [];
    let totalScore = 0;

    for (const answer of answers) {
      const result = await evaluateSingleAnswer(answer, answerKey, questionIndexMap);

      answer.score = result.score;
      answer.aiEvaluation = {
        suggestedScore: result.suggestedScore ?? result.score,
        grammarScore: result.grammarScore,
        contentRelevance: result.similarity,
        completeness: result.completeness,
        coveragePercentage: result.similarity,
        bloomsLevel: 'N/A',
        feedback: result.feedback,
        evaluatedAt: new Date(),
        keywordsFound: result.keywordsFound || [],
        keywordsMissing: result.keywordsMissing || [],
        keywordMatchPercentage: result.keywordMatchPercentage
      };
      answer.isReviewed = false;
      await answer.save();

      totalScore += result.score;
      evaluationResults.push({
        answerId: answer._id,
        questionId: answer.question?._id,
        score: result.score,
        maxScore: answer.maxScore,
        evaluated: result.evaluated
      });
    }

    const maxScore = attempt.maxScore ?? attempt.exam?.totalMarks ?? 0;
    attempt.totalScore = totalScore;
    attempt.passed = totalScore >= (attempt.exam?.passingMarks ?? 0);
    await attempt.save();

    return {
      success: true,
      attemptId: attempt._id,
      totalScore,
      maxScore,
      passed: attempt.passed,
      evaluatedAnswers: evaluationResults.length,
      results: evaluationResults
    };
  } catch (error) {
    console.error('Error in evaluateSubmission:', error);
    throw error;
  }
}

/**
 * Bulk evaluate submissions for an exam
 * @param {string} examId - Exam ID
 * @param {Object} cohortFilter - Optional { branch, year, section } to limit to specific cohort
 * @returns {Promise<Object>} - Bulk evaluation results
 */
async function bulkEvaluateExam(examId, cohortFilter = {}) {
  try {
    const exam = await Exam.findById(examId);
    if (!exam) {
      throw new Error('Exam not found');
    }

    const attemptsQuery = { exam: examId, status: { $in: ['submitted', 'completed'] } };
    if (Object.keys(cohortFilter).length > 0) {
      Object.assign(attemptsQuery, cohortFilter);
    }
    const attempts = await ExamAttempt.find(attemptsQuery);

    if (attempts.length === 0) {
      return {
        success: true,
        message: 'No submissions found',
        evaluated: 0,
        total: 0
      };
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const attempt of attempts) {
      try {
        const result = await evaluateSubmission(attempt._id);
        results.push({
          attemptId: attempt._id,
          studentId: attempt.student,
          success: true,
          totalScore: result.totalScore
        });
        successCount++;
      } catch (error) {
        console.error(`Error evaluating attempt ${attempt._id}:`, error);
        results.push({
          attemptId: attempt._id,
          studentId: attempt.student,
          success: false,
          error: error.message
        });
        errorCount++;
      }
    }

    return {
      success: true,
      evaluated: successCount,
      errors: errorCount,
      total: attempts.length,
      results
    };
  } catch (error) {
    console.error('Error in bulkEvaluateExam:', error);
    throw error;
  }
}

module.exports = {
  evaluateSingleAnswer,
  evaluateSubmission,
  bulkEvaluateExam,
  checkKeywords
};




