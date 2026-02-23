# Answer Evaluation System - Implementation Approach

## Overview
This document outlines the approach for implementing:
1. Single attempt enforcement for students
2. Auto-save answers to database
3. Faculty evaluation system with answer key comparison

---

## 1. Single Attempt Enforcement

### Database Changes
- **ExamAttempt Model**: Already has `status` field (in_progress, completed, submitted)
- **Enhancement**: Add `abandonedAt` timestamp and `isAbandoned` flag

### Implementation Strategy

#### A. Start Exam Flow
```
1. Student clicks "Take Exam"
2. Check if attempt exists:
   - If exists and status = "submitted" → Show "Already Submitted" message
   - If exists and status = "in_progress" → Resume (load saved answers)
   - If not exists → Create new attempt with status="in_progress"
3. Enter fullscreen mode
4. Start timer
```

#### B. Navigation Away Detection
```javascript
// Use beforeunload event to detect page close/refresh
window.addEventListener('beforeunload', (e) => {
  if (attempt && attempt.status === 'in_progress') {
    // Mark as abandoned
    api.put(`/exams/${id}/abandon`, { attemptId: attempt._id })
  }
})

// Also handle route changes in React Router
useEffect(() => {
  return () => {
    if (attempt && attempt.status === 'in_progress') {
      abandonAttempt()
    }
  }
}, [])
```

#### C. Backend Endpoint
```javascript
// PUT /api/exams/:id/abandon
// Marks attempt as abandoned/submitted
// Prevents further access
```

#### D. My Exams List
- Show status badge: "Submitted", "In Progress", "Not Started"
- Disable "Take Exam" button if status = "submitted"

---

## 2. Auto-Save Answers

### Current Implementation
- Already has debounced autosave (800ms delay)
- Saves to Answer model with `autoSaved: true`

### Enhancements Needed

#### A. Real-time Save Indicator
```javascript
// Show "Saving..." / "Saved" indicator in UI
const [saveStatus, setSaveStatus] = useState('saved')
```

#### B. Preview Before Submit
```javascript
// After attempting all questions, show preview page
// List all questions with answers
// "Edit" button to go back to specific question
// "Submit Final" button to lock exam
```

#### C. Final Submission Lock
```javascript
// On final submit:
// 1. Save all answers with autoSaved: false
// 2. Update ExamAttempt status to "submitted"
// 3. Set submittedAt timestamp
// 4. Calculate initial score (for MCQ)
// 5. Lock exam (prevent further access)
```

---

## 3. Faculty Evaluation System

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│           Faculty Evaluation Module              │
├─────────────────────────────────────────────────┤
│                                                   │
│  1. Upload Answer Key/Rubric (PDF)               │
│     - Store in uploads/answer-keys/             │
│     - Link to Exam model                         │
│                                                   │
│  2. View Submissions (Section-wise)              │
│     - Filter by: Branch, Year, Section           │
│     - List students with attempt status          │
│                                                   │
│  3. Auto-Evaluation (AI-powered)                │
│     - Extract answer key from PDF                │
│     - Compare student answers with key            │
│     - Assign marks based on rubric               │
│     - Generate evaluation report                 │
│                                                   │
│  4. Manual Review & Override                     │
│     - Preview student answer script (PDF)        │
│     - Side-by-side: Student answer + Key         │
│     - Manual mark adjustment                    │
│     - Save evaluation                            │
│                                                   │
│  5. Export & Reports                             │
│     - Generate PDF of student answer scripts     │
│     - Export evaluation results (CSV/Excel)      │
│                                                   │
└─────────────────────────────────────────────────┘
```

### Database Schema Changes

#### A. AnswerKey Model (New)
```javascript
{
  exam: ObjectId (ref: Exam),
  uploadedBy: ObjectId (ref: User),
  filename: String,
  path: String,
  extractedContent: {
    questions: [{
      questionNumber: Number,
      expectedAnswer: String,
      marks: Number,
      keywords: [String],
      rubric: String
    }]
  },
  uploadedAt: Date
}
```

#### B. Evaluation Model (New)
```javascript
{
  exam: ObjectId (ref: Exam),
  student: ObjectId (ref: User),
  attempt: ObjectId (ref: ExamAttempt),
  evaluatedBy: ObjectId (ref: User),
  answers: [{
    question: ObjectId (ref: Question),
    studentAnswer: String,
    expectedAnswer: String,
    aiScore: Number,
    manualScore: Number,
    finalScore: Number,
    feedback: String,
    comparison: {
      similarity: Number,
      keywordsMatched: [String],
      missingKeywords: [String]
    }
  }],
  totalScore: Number,
  status: String, // 'auto', 'manual', 'final'
  evaluatedAt: Date
}
```

#### C. Exam Model Enhancement
```javascript
// Add to existing Exam model:
answerKey: {
  type: ObjectId,
  ref: 'AnswerKey'
}
```

### Implementation Steps

#### Step 1: Answer Key Upload
```javascript
// Route: POST /api/exams/:id/answer-key
// Upload PDF, extract text using PDF parser
// Use AI to structure: Question → Expected Answer → Marks → Keywords
// Store in AnswerKey model
```

#### Step 2: Answer Script PDF Generation
```javascript
// When student submits, generate PDF:
// - Student details (name, ID, section)
// - Question paper
// - Student answers (text + diagrams)
// - Store in uploads/answer-scripts/
// - Link to ExamAttempt model
```

#### Step 3: Auto-Evaluation Engine
```javascript
// Service: services/evaluationService.js

async function autoEvaluate(attemptId, answerKeyId) {
  // 1. Get student answers
  // 2. Get answer key
  // 3. For each question:
  //    - Compare student answer with expected answer
  //    - Use AI to:
  //      * Calculate semantic similarity
  //      * Check keyword presence
  //      * Assess completeness
  //      * Assign score based on rubric
  // 4. Generate evaluation report
  // 5. Save to Evaluation model
}
```

#### Step 4: Faculty Evaluation UI

**Page Structure:**
```
/evaluations
  ├── Exam Selection
  ├── Section Filter (Branch/Year/Section)
  ├── Student List
  │   ├── Student Name, ID, Section
  │   ├── Status (Auto-evaluated / Pending)
  │   ├── Score Preview
  │   └── Actions (Review / Download PDF)
  └── Evaluation Panel
      ├── Student Answer Script (PDF viewer)
      ├── Answer Key (PDF viewer)
      ├── Side-by-side comparison
      ├── Mark adjustment per question
      └── Save Evaluation
```

#### Step 5: PDF Generation Libraries

**Backend (Node.js):**
- `pdfkit` or `puppeteer` for PDF generation
- `pdf-parse` for extracting text from uploaded answer keys

**Frontend:**
- `react-pdf` or `pdfjs-dist` for PDF viewing

### AI Evaluation Approach

#### Option 1: Groq AI (Current System)
```javascript
// Use existing Groq integration
// Prompt: "Compare student answer with expected answer.
//          Check for keywords: [keywords]
//          Assign marks out of [totalMarks]
//          Provide feedback."
```

#### Option 2: Hybrid Approach
```javascript
// 1. Keyword matching (exact + fuzzy)
// 2. Semantic similarity (AI embedding)
// 3. Length/completeness check
// 4. AI final scoring with rubric
```

### File Structure

```
uploads/
  ├── answer-keys/
  │   └── exam-{examId}-key-{timestamp}.pdf
  ├── answer-scripts/
  │   └── exam-{examId}-student-{studentId}-{timestamp}.pdf
  └── evaluations/
      └── exam-{examId}-evaluation-{timestamp}.pdf
```

### API Endpoints Needed

```
POST   /api/exams/:id/answer-key          // Upload answer key
GET    /api/exams/:id/answer-key          // Get answer key
POST   /api/exams/:id/auto-evaluate       // Trigger auto-evaluation
GET    /api/exams/:id/submissions         // Get all submissions (filtered)
GET    /api/exams/:id/submissions/:attemptId  // Get specific submission
GET    /api/exams/:id/submissions/:attemptId/pdf  // Download answer script PDF
POST   /api/evaluations                   // Save manual evaluation
PUT    /api/evaluations/:id                // Update evaluation
GET    /api/evaluations/exam/:examId       // Get all evaluations for exam
```

### Security Considerations

1. **Answer Key Access**: Only exam creator can upload/view
2. **Student Privacy**: Faculty can only see submissions for their exams
3. **Evaluation Lock**: Once final evaluation saved, prevent further changes (optional)
4. **PDF Storage**: Secure file paths, validate file types

### UI/UX Flow

#### Faculty Side:
1. Navigate to "Evaluations" section
2. Select exam from dropdown
3. Filter by section (Branch/Year/Section)
4. See list of students with:
   - Auto-evaluated score (if done)
   - Status badge
   - "Review" button
5. Click "Review" → Opens evaluation panel
6. Side-by-side view:
   - Left: Student answer script (PDF)
   - Right: Answer key (PDF)
   - Bottom: Mark adjustment form
7. Adjust marks, add feedback
8. Click "Save Evaluation"
9. Option to "Bulk Auto-Evaluate" all pending submissions

#### Student Side:
1. After submission, exam shows as "Submitted"
2. Cannot reopen exam
3. Can view their submitted answers (read-only)
4. Can see evaluation status (if faculty has evaluated)

---

## Implementation Priority

### Phase 1 (Critical)
1. ✅ Single attempt enforcement
2. ✅ Auto-save answers
3. ✅ Preview before submit
4. ✅ Lock exam after submission

### Phase 2 (High Priority)
1. Answer script PDF generation
2. Faculty evaluation page (basic)
3. Manual mark assignment
4. Section-wise filtering

### Phase 3 (Enhancement)
1. Answer key upload
2. Auto-evaluation engine
3. PDF comparison viewer
4. Bulk evaluation
5. Export reports

---

## Technology Stack

- **PDF Generation**: `pdfkit` (Node.js) or `puppeteer`
- **PDF Parsing**: `pdf-parse`
- **PDF Viewing (Frontend)**: `react-pdf` or `@react-pdf/renderer`
- **AI Evaluation**: Existing Groq integration
- **File Storage**: Local filesystem (can migrate to cloud later)

---

## Next Steps

1. Review and approve this approach
2. Implement Phase 1 features
3. Set up PDF generation infrastructure
4. Build faculty evaluation UI
5. Integrate AI evaluation engine
6. Testing and refinement




