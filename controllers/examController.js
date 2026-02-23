const asyncHandler = require('../middleware/asyncHandler');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const ExamAttempt = require('../models/ExamAttempt');
const Subject = require('../models/Subject');
const { generateQuestions } = require('../services/aiService');
const Topic = require('../models/Topic');
const Answer = require('../models/Answer');

// @desc    Get all exams
// @route   GET /api/exams
// @access  Private
exports.getExams = asyncHandler(async (req, res, next) => {
  let query;
  
  if (req.user.role === 'student') {
    // Students see exams explicitly assigned or cohort-published to their branch/year/section
    const u = req.user;
    const cohortConds = [ { status: { $regex: /^(published|ongoing)$/i } } ];

    const esc = (s) => (s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sb = (u.branch || '').trim();
    const sy = (u.year || '').trim();
    const ss = (u.section || '').trim();
    if (sb) cohortConds.push({ $or: [
      { targetBranch: { $regex: '^[\\s]*' + esc(sb) + '[\\s]*$', $options: 'i' } },
      { targetBranch: { $exists: false } },
      { targetBranch: null },
      { targetBranch: '' }
    ] });
    if (sy) cohortConds.push({ $or: [
      { targetYear: { $regex: '^[\\s]*' + esc(sy) + '[\\s]*$', $options: 'i' } },
      { targetYear: { $exists: false } },
      { targetYear: null },
      { targetYear: '' }
    ] });
    if (ss) cohortConds.push({ $or: [
      { targetSection: { $regex: '^[\\s]*' + esc(ss) + '[\\s]*$', $options: 'i' } },
      { targetSection: { $exists: false } },
      { targetSection: null },
      { targetSection: '' }
    ] });
    query = { $or: [ { assignedTo: req.user.id }, { $and: cohortConds } ] };
  } else {
    query = { createdBy: req.user.id };
  }
  
  const exams = await Exam.find(query)
    .populate('subject', 'code name')
    .populate('topics', 'title')
    .populate('questions')
    .sort('-createdAt');
  
  res.status(200).json({
    success: true,
    count: exams.length,
    data: exams
  });
});

// @desc    Get single exam
// @route   GET /api/exams/:id
// @access  Private
exports.getExam = asyncHandler(async (req, res, next) => {
  const exam = await Exam.findById(req.params.id)
    .populate('subject')
    .populate('units')
    .populate('topics')
    .populate('questions')
    .populate('createdBy', 'name email');
  
  if (!exam) {
    return res.status(404).json({
      success: false,
      message: 'Exam not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: exam
  });
});

// @desc    Create exam
// @route   POST /api/exams
// @access  Private/Faculty
exports.createExam = asyncHandler(async (req, res, next) => {
  req.body.createdBy = req.user.id;
  
  // Validate subject
  const subject = await Subject.findById(req.body.subject);
  if (!subject) {
    return res.status(404).json({
      success: false,
      message: 'Subject not found'
    });
  }
  
  // Process blueprint data - convert objects to Maps if needed
  if (req.body.blueprint) {
    if (req.body.blueprint.marksDistribution) {
      req.body.blueprint.marksDistribution = new Map(Object.entries(req.body.blueprint.marksDistribution));
    }
    if (req.body.blueprint.topicDifficultyMap) {
      req.body.blueprint.topicDifficultyMap = new Map(Object.entries(req.body.blueprint.topicDifficultyMap));
    }
  }
  
  const exam = await Exam.create(req.body);
  
  res.status(201).json({
    success: true,
    data: exam
  });
});

// @desc    Generate questions using AI
// @route   POST /api/exams/:id/generate-questions
// @access  Private/Faculty
exports.generateQuestions = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { 
    count = 10,
    marksDistribution = {},
    difficultyRatio = { easy: 30, medium: 50, hard: 20 },
    topicDifficultyMap = {},
    bloomsDistribution = {},
    examStructure = [],
    includeDiagrams = false,
    includeModelAnswers = true,
    sections = []
  } = req.body;
  
  console.log(`Generating questions for exam ${id}`);
  
  const exam = await Exam.findById(id)
    .populate('subject', 'name code')
    .populate('units', 'title')
    .populate('topics', 'title description unit');
    
  if (!exam) {
    console.log('Exam not found:', id);
    return res.status(404).json({
      success: false,
      message: 'Exam not found'
    });
  }
  
  console.log('Exam found:', exam.title);
  console.log('Exam subject:', exam.subject?.name);
  console.log('Exam topics:', exam.topics.length);
  console.log('Exam units:', exam.units.length);
  
  // Use blueprint from exam if not provided in request
  const blueprint = exam.blueprint || {};
  let finalMarksDistribution = marksDistribution && Object.keys(marksDistribution).length > 0 
    ? marksDistribution 
    : (blueprint.marksDistribution && blueprint.marksDistribution.size > 0 ? Object.fromEntries(blueprint.marksDistribution) : {});
  const finalDifficultyRatio = difficultyRatio && difficultyRatio.easy !== undefined
    ? difficultyRatio
    : (blueprint.difficultyRatio || { easy: 30, medium: 50, hard: 20 });
  let finalTopicDifficultyMap = topicDifficultyMap && Object.keys(topicDifficultyMap).length > 0
    ? topicDifficultyMap
    : (blueprint.topicDifficultyMap && blueprint.topicDifficultyMap.size > 0 ? Object.fromEntries(blueprint.topicDifficultyMap) : {});
  const finalBloomsDistribution = bloomsDistribution && Object.keys(bloomsDistribution).length > 0
    ? bloomsDistribution
    : (blueprint.bloomsDistribution || {});
  const finalExamStructure = examStructure && examStructure.length > 0
    ? examStructure
    : (blueprint.examStructure || []);
  const finalIncludeDiagrams = includeDiagrams !== undefined ? includeDiagrams : (blueprint.includeDiagrams !== undefined ? blueprint.includeDiagrams : false);
  const finalIncludeModelAnswers = includeModelAnswers !== undefined ? includeModelAnswers : (blueprint.includeModelAnswers !== undefined ? blueprint.includeModelAnswers : true);
  const finalSections = sections && sections.length > 0 ? sections : (blueprint.sections || []);
  const allowedMarks = finalSections.length > 0
    ? Array.from(new Set(finalSections.flatMap(s => Array.isArray(s.marksAllowed) ? s.marksAllowed : [])))
    : Object.keys(finalMarksDistribution).map(m => parseInt(m));
  
  // Get full topic details with unit populated
  const topics = await Topic.find({ _id: { $in: exam.topics } }).populate('unit', 'title');
  console.log('Found topics:', topics.length);
  
  if (topics.length === 0) {
    console.log('No topics found for exam');
    return res.status(400).json({
      success: false,
      message: 'No topics selected for this exam'
    });
  }
  
  // Get units
  const Unit = require('../models/Unit');
  const units = await Unit.find({ _id: { $in: exam.units } });
  const unitNumbers = exam.units.map((u, idx) => idx + 1);
  
  // Prepare marks distribution if not provided
  if (Object.keys(finalMarksDistribution).length === 0) {
    // Auto-distribute based on total marks and count
    const avgMarks = Math.floor(exam.totalMarks / count);
    finalMarksDistribution = { [avgMarks]: count };
  }
  
  try {
    // Generate questions using Groq AI
    console.log('Calling Groq AI service...');
    console.log('Blueprint data:', {
      marksDistribution: finalMarksDistribution,
      difficultyRatio: finalDifficultyRatio,
      topicDifficultyMap: finalTopicDifficultyMap,
      bloomsDistribution: finalBloomsDistribution,
      examStructure: finalExamStructure,
      sections: finalSections,
      allowedMarks
    });
    
    const aiQuestions = await generateQuestions({
      topics,
      examType: exam.type,
      subjectName: exam.subject?.name || 'General',
      unitNumbers,
      totalMarks: exam.totalMarks,
      marksDistribution: finalMarksDistribution,
      difficultyRatio: finalDifficultyRatio,
      topicDifficultyMap: finalTopicDifficultyMap,
      bloomsDistribution: finalBloomsDistribution,
      examStructure: finalExamStructure,
      includeDiagrams: finalIncludeDiagrams,
      includeModelAnswers: finalIncludeModelAnswers,
      units,
      allowedMarks,
      sections: finalSections
    });
    
    console.log('AI generated questions:', aiQuestions.length);
    
    if (aiQuestions.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate questions. Please check your Groq API key and try again.'
      });
    }
    
    // Save generated questions (apply choice group rules if configured)
    const savedQuestions = [];
    for (const qData of aiQuestions) {
      try {
        // Use the topic and unit IDs from the question data
        const topicId = qData.topic || (topics[0]?._id);
        const unitId = qData.unit || (units[0]?._id) || (exam.units[0]);
        
        const questionPayload = {
          text: qData.text,
          type: qData.type,
          marks: qData.marks,
          difficulty: qData.difficulty,
          bloomLevel: qData.bloomLevel,
          modelAnswer: qData.modelAnswer,
          keyPoints: qData.keyPoints,
          suggestedDiagram: qData.suggestedDiagram,
          aiJustification: qData.aiJustification,
          questionNumber: qData.questionNumber,
          options: qData.options,
          correctAnswer: qData.correctAnswer,
          topic: topicId,
          unit: unitId,
          createdBy: req.user.id,
          isAI_generated: true
        };

        // Determine section-based choice grouping
        if (finalSections && finalSections.length > 0) {
          const sectionForMarks = finalSections.find(s => Array.isArray(s.marksAllowed) && s.marksAllowed.includes(parseInt(qData.marks)));
          if (sectionForMarks && sectionForMarks.choiceRules && sectionForMarks.choiceRules.size > 0) {
            const rule = sectionForMarks.choiceRules.get(String(qData.marks)) || sectionForMarks.choiceRules.get(parseInt(qData.marks));
            if (rule && rule.groupLabel) {
              questionPayload.choiceGroup = rule.groupLabel;
            }
          }
        }

        const question = await Question.create(questionPayload);
        savedQuestions.push(question._id);
      } catch (qError) {
        console.error('Error saving individual question:', qError);
        // Continue with other questions
      }
    }
    
    console.log('Saved questions:', savedQuestions.length);
    
    // Add questions to exam
    exam.questions = [...(exam.questions || []), ...savedQuestions];
    await exam.save();
    
    console.log('Exam updated with questions');
    
    res.status(200).json({
      success: true,
      message: `Generated ${savedQuestions.length} questions successfully`,
      data: {
        questionIds: savedQuestions,
        exam: exam
      }
    });
  } catch (error) {
    console.error('Error in generateQuestions:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating questions: ' + error.message
    });
  }
});

// @desc    Update exam
// @route   PUT /api/exams/:id
// @access  Private/Faculty
exports.updateExam = asyncHandler(async (req, res, next) => {
  let exam = await Exam.findById(req.params.id);
  
  if (!exam) {
    return res.status(404).json({
      success: false,
      message: 'Exam not found'
    });
  }
  
  // Make sure user is the creator
  if (exam.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this exam'
    });
  }
  
  // Normalize blueprint maps if present
  if (req.body.blueprint) {
    if (req.body.blueprint.marksDistribution && !(req.body.blueprint.marksDistribution instanceof Map)) {
      req.body.blueprint.marksDistribution = new Map(Object.entries(req.body.blueprint.marksDistribution));
    }
    if (req.body.blueprint.topicDifficultyMap && !(req.body.blueprint.topicDifficultyMap instanceof Map)) {
      req.body.blueprint.topicDifficultyMap = new Map(Object.entries(req.body.blueprint.topicDifficultyMap));
    }
    // sections.choiceRules can remain plain objects; Mongoose will cast into Map with sub-schema
  }

  exam = await Exam.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    data: exam
  });
});

// @desc    Assign exam to students
// @route   PUT /api/exams/:id/assign
// @access  Private/Faculty
exports.assignExam = asyncHandler(async (req, res, next) => {
  const { assignedTo } = req.body;
  const exam = await Exam.findById(req.params.id);
  
  if (!exam) {
    return res.status(404).json({
      success: false,
      message: 'Exam not found'
    });
  }
  
  exam.assignedTo = assignedTo;
  exam.status = 'published';
  await exam.save();
  
  res.status(200).json({
    success: true,
    data: exam
  });
});

// @desc    Delete exam
// @route   DELETE /api/exams/:id
// @access  Private/Faculty
exports.deleteExam = asyncHandler(async (req, res, next) => {
  const exam = await Exam.findById(req.params.id);
  
  if (!exam) {
    return res.status(404).json({
      success: false,
      message: 'Exam not found'
    });
  }
  
  // Make sure user is the creator
  if (exam.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this exam'
    });
  }
  
  await exam.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Exam deleted successfully'
  });
});

// @desc    Start exam attempt
// @route   POST /api/exams/:id/start
// @access  Private/Student
exports.startExam = asyncHandler(async (req, res, next) => {
  const exam = await Exam.findById(req.params.id);
  
  if (!exam) {
    return res.status(404).json({
      success: false,
      message: 'Exam not found'
    });
  }
  
  // Check if exam is assigned or cohort-targeted to student
  const isExplicit = (exam.assignedTo || []).map(id => String(id)).includes(String(req.user.id));
  const isCohort = (
    (!exam.targetBranch || exam.targetBranch === req.user.branch) &&
    (!exam.targetYear || exam.targetYear === req.user.year) &&
    (!exam.targetSection || exam.targetSection === req.user.section)
  );
  if (!isExplicit && !isCohort) {
    return res.status(403).json({ success: false, message: 'This exam is not assigned to you' });
  }

  // Enforce time window to attempt
  const now = new Date();
  if (exam.startTime && now < new Date(exam.startTime)) {
    return res.status(403).json({ success: false, message: 'Exam has not started yet' });
  }
  if (exam.endTime && now > new Date(exam.endTime)) {
    return res.status(403).json({ success: false, message: 'Exam time window has ended' });
  }
  
  // Check if already attempted
  let attempt = await ExamAttempt.findOne({ exam: exam._id, student: req.user.id });
  
  if (attempt && (attempt.status === 'completed' || attempt.status === 'submitted' || attempt.status === 'abandoned')) {
    return res.status(400).json({
      success: false,
      message: 'Exam already submitted. You cannot attempt it again.',
      attempt: attempt
    });
  }
  
  if (!attempt) {
    const meta = req.body?.meta || {}
    attempt = await ExamAttempt.create({
      student: req.user.id,
      exam: exam._id,
      maxScore: exam.totalMarks,
      startTime: new Date(),
      studentName: meta.studentName || req.user.name,
      studentIdentifier: meta.studentId || req.user.studentId,
      college: meta.college || '',
      branch: meta.branch || req.user.branch,
      year: meta.year || req.user.year,
      section: meta.section || req.user.section
    });
  }
  
  res.status(200).json({
    success: true,
    data: attempt
  });
});

// @desc    Abandon exam attempt (when student navigates away)
// @route   PUT /api/exams/:id/abandon
// @access  Private/Student
exports.abandonExam = asyncHandler(async (req, res, next) => {
  const attempt = await ExamAttempt.findOne({ 
    exam: req.params.id, 
    student: req.user.id 
  });
  
  if (!attempt) {
    return res.status(404).json({
      success: false,
      message: 'Attempt not found'
    });
  }
  
  if (attempt.status === 'submitted' || attempt.status === 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Exam already submitted'
    });
  }
  
  attempt.status = 'abandoned';
  attempt.abandonedAt = new Date();
  await attempt.save();
  
  res.status(200).json({
    success: true,
    message: 'Exam attempt abandoned',
    data: attempt
  });
});

// @desc    Final submit exam (locks the exam)
// @route   POST /api/exams/:id/submit
// @access  Private/Student
exports.finalSubmitExam = asyncHandler(async (req, res, next) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) {
    return res.status(404).json({
      success: false,
      message: 'Exam not found'
    });
  }
  
  const attempt = await ExamAttempt.findOne({ 
    exam: exam._id, 
    student: req.user.id 
  });
  
  if (!attempt) {
    return res.status(404).json({
      success: false,
      message: 'Attempt not found. Please start the exam first.'
    });
  }
  
  if (attempt.status === 'submitted' || attempt.status === 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Exam already submitted'
    });
  }
  
  // Calculate total score for quiz type
  const Answer = require('../models/Answer');
  const answers = await Answer.find({ 
    exam: exam._id, 
    student: req.user.id 
  }).populate('question');
  
  let totalScore = 0;
  if (exam.type === 'quiz') {
    totalScore = answers.reduce((sum, ans) => sum + (ans.score || 0), 0);
  }
  
  attempt.status = 'submitted';
  attempt.submittedAt = new Date();
  attempt.endTime = new Date();
  attempt.totalScore = totalScore;
  attempt.passed = totalScore >= exam.passingMarks;

  // For quizzes: auto-release results so they appear in My Progress immediately (no faculty publish needed)
  if (exam.type === 'quiz') {
    attempt.resultsReleased = true;
    attempt.resultsReleasedAt = new Date();
  }

  // Generate PDF answer script
  try {
    const { generateAnswerScript } = require('../services/pdfService');
    const Subject = require('../models/Subject');
    const populatedExam = await Exam.findById(exam._id)
      .populate('subject')
      .populate('questions');
    
    const pdfPath = await generateAnswerScript(attempt, populatedExam, answers);
    attempt.answerScriptPath = pdfPath;
  } catch (pdfError) {
    console.error('Error generating PDF:', pdfError);
    // Don't fail the submission if PDF generation fails
  }
  
  await attempt.save();
  
  res.status(200).json({
    success: true,
    message: 'Exam submitted successfully',
    data: {
      attempt,
      score: totalScore,
      maxScore: exam.totalMarks,
      passed: attempt.passed
    }
  });
});

// @desc    Get attempt status for an exam
// @route   GET /api/exams/:id/attempt-status
// @access  Private/Student
exports.getAttemptStatus = asyncHandler(async (req, res, next) => {
  const exam = await Exam.findById(req.params.id).select('totalMarks passingMarks resultsPublished resultsPublishedAt subject title type');
  const attempt = await ExamAttempt.findOne({
    exam: req.params.id,
    student: req.user.id
  });

  const resultsReleased = attempt
    ? !!exam?.resultsPublished || !!attempt.resultsReleased
    : false;
  const releasedAt = attempt?.resultsReleasedAt || exam?.resultsPublishedAt;

  res.status(200).json({
    success: true,
    data: attempt ? {
      status: attempt.status,
      submittedAt: attempt.submittedAt,
      abandonedAt: attempt.abandonedAt,
      startTime: attempt.startTime,
      totalScore: attempt.totalScore,
      passed: attempt.passed,
      resultsPublished: resultsReleased,
      resultsPublishedAt: releasedAt,
      totalMarks: exam?.totalMarks,
      passingMarks: exam?.passingMarks
    } : null
  });
});

// @desc    Publish results for an exam (optionally limited to a cohort)
// @route   POST /api/exams/:id/release-results
// @access  Private/Faculty
exports.releaseResults = asyncHandler(async (req, res, next) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) {
    return res.status(404).json({ success: false, message: 'Exam not found' });
  }
  if (String(exam.createdBy) !== String(req.user.id)) {
    return res.status(403).json({ success: false, message: 'Not authorized to release results for this exam' });
  }

  const { branch, year, section } = req.query;

  // If no cohort filters: publish exam-wide
  if (!branch && !year && !section) {
    exam.resultsPublished = true;
    exam.resultsPublishedAt = new Date();
    await exam.save();

    // Optionally also mark all attempts as released
    await ExamAttempt.updateMany(
      { exam: exam._id, status: { $in: ['submitted', 'completed'] } },
      { $set: { resultsReleased: true, resultsReleasedAt: exam.resultsPublishedAt } }
    );

    return res.status(200).json({
      success: true,
      message: 'Results released to all students for this exam',
      data: exam
    });
  }

  // Cohort-wise release: branch/year/section filters
  const filter = { exam: exam._id, status: { $in: ['submitted', 'completed'] } };
  if (branch) filter.branch = branch;
  if (year) filter.year = year;
  if (section) filter.section = section;

  const releaseTime = new Date();
  const result = await ExamAttempt.updateMany(
    filter,
    { $set: { resultsReleased: true, resultsReleasedAt: releaseTime } }
  );

  res.status(200).json({
    success: true,
    message: `Results released to ${result.modifiedCount} attempt(s) for the selected cohort`,
    data: { modified: result.modifiedCount }
  });
});

// @desc    Get current student's result for an exam (after results are published)
// @route   GET /api/exams/:id/my-result
// @access  Private/Student
exports.getMyResult = asyncHandler(async (req, res, next) => {
  const exam = await Exam.findById(req.params.id)
    .populate('subject', 'name code department');

  if (!exam) {
    return res.status(404).json({ success: false, message: 'Exam not found' });
  }

  const attempt = await ExamAttempt.findOne({
    exam: exam._id,
    student: req.user.id
  });

  if (!attempt || (attempt.status !== 'submitted' && attempt.status !== 'completed')) {
    return res.status(400).json({
      success: false,
      message: 'You have not submitted this exam yet'
    });
  }

  const resultsReleased = !!exam.resultsPublished || !!attempt.resultsReleased;
  if (!resultsReleased) {
    return res.status(403).json({
      success: false,
      message: 'Results have not been published yet'
    });
  }

  const answers = await Answer.find({
    exam: exam._id,
    student: req.user.id
  }).populate('question');

  res.status(200).json({
    success: true,
    data: {
      exam: {
        id: exam._id,
        title: exam.title,
        type: exam.type,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
        subject: exam.subject
      },
      attempt: {
        id: attempt._id,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore || exam.totalMarks,
        passed: attempt.passed,
        submittedAt: attempt.submittedAt,
        answerScriptPath: attempt.answerScriptPath
      },
      answers
    }
  });
});