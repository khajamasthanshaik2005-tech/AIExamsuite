const express = require('express');
const router = express.Router();
const path = require('path');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Unit = require('../models/Unit');
const Topic = require('../models/Topic');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, authorize } = require('../middleware/auth');

// @desc    Enroll in subject
// @route   POST /api/students/enroll/:subjectId
// @access  Private/Student
router.post('/enroll/:subjectId', protect, authorize('student'), asyncHandler(async (req, res) => {
  const student = await User.findById(req.user.id);
  const subject = await Subject.findById(req.params.subjectId);
  
  if (!subject) {
    return res.status(404).json({
      success: false,
      message: 'Subject not found'
    });
  }
  
  if (!student.enrolledSubjects.includes(subject._id)) {
    student.enrolledSubjects.push(subject._id);
    await student.save();
  }
  
  res.status(200).json({
    success: true,
    message: 'Enrolled in subject successfully',
    data: student
  });
}));

// @desc    Unenroll from subject
// @route   DELETE /api/students/enroll/:subjectId
// @access  Private/Student
router.delete('/enroll/:subjectId', protect, authorize('student'), asyncHandler(async (req, res) => {
  const student = await User.findById(req.user.id);
  student.enrolledSubjects = student.enrolledSubjects.filter(
    id => id.toString() !== req.params.subjectId
  );
  await student.save();
  
  res.status(200).json({
    success: true,
    message: 'Unenrolled from subject successfully'
  });
}));

// @desc    Get enrolled subjects
// @route   GET /api/students/my-subjects
// @access  Private/Student
router.get('/my-subjects', protect, authorize('student'), asyncHandler(async (req, res) => {
  const student = await User.findById(req.user.id).populate({
    path: 'enrolledSubjects',
    populate: {
      path: 'units',
      populate: 'topics'
    }
  });
  
  res.status(200).json({
    success: true,
    data: student.enrolledSubjects
  });
}));

// @desc    Student overview: enrolled subjects with counts and materials
// @route   GET /api/students/overview
// @access  Private/Student
router.get('/overview', protect, authorize('student'), asyncHandler(async (req, res) => {
  const student = await User.findById(req.user.id).select('enrolledSubjects branch year department');
  // Build cohort criteria: prefer branch+year, else department+year
  // Eligibility: prefer branch match; include subjects where branch is equal or not set, and year equal or not set;
  // also accept department match as fallback when branch is not set on subject
  const branchCond = student.branch ? { $or: [ { branch: student.branch }, { branch: { $exists: false } }, { branch: null } ] } : {};
  const deptCond = (!student.branch && student.department) ? { $or: [ { department: student.department }, { department: { $exists: false } }, { department: null } ] } : {};
  const yearCond = student.year ? { $or: [ { year: student.year }, { year: { $exists: false } }, { year: null } ] } : {};
  const criteria = { ...branchCond, ...deptCond, ...yearCond };

  // Subjects visible to this student: union of enrolled and cohort-matched
  const cohortSubjects = await Subject.find(criteria).select('name code department branch year semester');
  const enrolledSubjects = await Subject.find({ _id: { $in: student.enrolledSubjects } }).select('name code department branch year semester');

  const map = new Map();
  [...cohortSubjects, ...enrolledSubjects].forEach(s => { map.set(String(s._id), s); });
  const subjects = Array.from(map.values());

  const result = [];
  for (const subj of subjects) {
    const units = await Unit.find({ subject: subj._id }).select('title studyMaterials');
    const unitIds = units.map(u => u._id);
    const topics = await Topic.find({ unit: { $in: unitIds } }).select('title unit studyMaterials');

    const unitCount = units.length;
    const topicCount = topics.length;

    const materials = [];
    const unitEntries = [];
    const topicEntries = [];

    for (const u of units) {
      const files = (u.studyMaterials || []).map(m => ({ filename: m.filename, originalName: m.originalName }));
      unitEntries.push({ title: u.title, materials: files });
      files.forEach(m => materials.push({ scope: 'unit', scopeTitle: u.title, filename: m.filename, originalName: m.originalName }));
    }
    for (const t of topics) {
      const files = (t.studyMaterials || []).map(m => ({ filename: m.filename, originalName: m.originalName }));
      topicEntries.push({ title: t.title, materials: files });
      files.forEach(m => materials.push({ scope: 'topic', scopeTitle: t.title, filename: m.filename, originalName: m.originalName }));
    }

    result.push({
      subject: {
        id: subj._id,
        name: subj.name,
        code: subj.code,
        department: subj.department,
        semester: subj.semester
      },
      counts: {
        units: unitCount,
        topics: topicCount,
        materials: materials.length
      },
      materials,
      units: unitEntries,
      topics: topicEntries
    });
  }

  res.status(200).json({ success: true, data: result });
}));

// @desc    List subjects eligible for the student's cohort (not yet enrolled)
// @route   GET /api/students/eligible-subjects
// @access  Private/Student
router.get('/eligible-subjects', protect, authorize('student'), asyncHandler(async (req, res) => {
  const student = await User.findById(req.user.id).select('branch year department enrolledSubjects');
  // Prefer matching on branch+year if branch is set; otherwise fallback to department+year; ignore section by design
  const criteria = {};
  if (student.branch) criteria.branch = student.branch;
  else if (student.department) criteria.department = student.department;
  if (student.year) criteria.year = student.year;

  const enrolledSet = new Set((student.enrolledSubjects || []).map(id => id.toString()));
  const subjects = await Subject.find(criteria).select('name code department branch year semester');
  const notEnrolled = subjects.filter(s => !enrolledSet.has(s._id.toString()));

  res.status(200).json({ success: true, data: notEnrolled });
}));

// @desc    Enroll student in all eligible subjects
// @route   POST /api/students/enroll/auto
// @access  Private/Student
router.post('/enroll/auto', protect, authorize('student'), asyncHandler(async (req, res) => {
  const student = await User.findById(req.user.id).select('branch year department enrolledSubjects');
  const criteria = {};
  if (student.branch) criteria.branch = student.branch;
  else if (student.department) criteria.department = student.department;
  if (student.year) criteria.year = student.year;

  const subjects = await Subject.find(criteria).select('_id');
  const current = new Set((student.enrolledSubjects || []).map(id => id.toString()));
  const additions = subjects.filter(s => !current.has(s._id.toString())).map(s => s._id);
  if (additions.length > 0) {
    student.enrolledSubjects.push(...additions);
    await student.save();
  }
  res.status(200).json({ success: true, message: 'Auto-enrollment completed', added: additions.length });
}));

// @desc    Download reference material
// @route   GET /api/students/download/:filename
// @access  Private/Student
router.get('/download/:filename', protect, authorize('student'), asyncHandler(async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads', filename);
  
  res.download(filePath, (err) => {
    if (err) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
  });
}));

module.exports = router;
