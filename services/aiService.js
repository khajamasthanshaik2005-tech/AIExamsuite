const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');

// Initialize Groq AI
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY
});

// Groq Model Configuration
// Available models:
// - llama-3.1-8b-instant: Fast and free (recommended for most use cases)
// - llama-3.1-70b-versatile: Larger and more powerful (for complex questions)
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

// Analyze topic materials and generate insights
const analyzeTopicMaterials = async (topicData) => {
  try {
    let materialContent = '';
    
    // Read reference files if they exist
    if (topicData.referenceFiles && topicData.referenceFiles.length > 0) {
      // In production, extract text from PDF/DOC/PPT files
      // For now, we'll use the topic details
      materialContent = `
        Topic Title: ${topicData.title}
        Description: ${topicData.description}
        Keywords: ${topicData.keywords ? topicData.keywords.join(', ') : 'None'}
        Depth Level: ${topicData.depthLevel}
      `;
    }

    const prompt = `Analyze the following educational topic and provide:
1. Suggested subtopics (3-5 key areas)
2. Appropriate Bloom's taxonomy level (Remember, Understand, Apply, Analyze, Evaluate, Create)
3. Estimated coverage percentage for exams

Topic Information:
${materialContent}

Provide your response in JSON format:
{
  "suggestedSubtopics": ["subtopic1", "subtopic2", ...],
  "bloomsLevel": "level name",
  "coverageEstimation": percentage
}`;
    
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7
    });
    
    const analysis = JSON.parse(completion.choices[0].message.content);
    return {
      suggestedSubtopics: analysis.suggestedSubtopics || [],
      bloomsLevel: analysis.bloomsLevel || 'Understand',
      coverageEstimation: analysis.coverageEstimation || 0,
      analyzedAt: new Date()
    };
  } catch (error) {
    console.error('AI Analysis Error:', error);
    // Return default values if AI fails
    return {
      suggestedSubtopics: [],
      bloomsLevel: 'Understand',
      coverageEstimation: 0,
      analyzedAt: new Date()
    };
  }
};

// Generate comprehensive exam questions with marks distribution and model answers
const generateQuestions = async (params) => {
  try {
    const {
      topics = [],
      examType = 'Quiz',
      subjectName = '',
      unitNumbers = [],
      totalMarks = 50,
      marksDistribution = {},
      difficultyRatio = { easy: 30, medium: 50, hard: 20 },
      topicDifficultyMap = {}, // Map of topicId -> difficulty level
      bloomsDistribution = {},
      examStructure = [],
      includeDiagrams = false,
      includeModelAnswers = true,
      units = [],
      allowedMarks = [],
      sections = []
    } = params;

    console.log('=== Starting AI Question Generation ===');
    console.log('Subject:', subjectName);
    console.log('Exam Type:', examType);
    console.log('Topics:', topics.length);
    console.log('Total Marks:', totalMarks);
    console.log('Marks Distribution:', JSON.stringify(marksDistribution));
    console.log('Difficulty Ratio:', difficultyRatio);

    if (!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY) {
      throw new Error('Groq API key not found. Please add GROQ_API_KEY to your .env file');
    }

    // Build topics list with difficulty per topic
    const topicsList = topics.map((topic, idx) => {
      const unit = units.find(u => u._id && topic.unit && u._id.toString() === topic.unit.toString());
      const topicId = topic._id?.toString() || topic;
      const difficulty = topicDifficultyMap[topicId] || 'medium';
      return `  ${idx + 1}. ${topic.title} (Unit ${unit?.title || 'N/A'}) 
         Description: ${topic.description || 'No description'}
         Difficulty Level: ${difficulty.toUpperCase()}
         Depth Level: ${topic.depthLevel || 2} (1=Basic, 2=Intermediate, 3=Advanced)`;
    }).join('\n\n');

    // Build marks distribution string with validation
    let marksDistStr = '';
    let totalQuestionsFromDist = 0;
    if (Object.keys(marksDistribution).length > 0) {
      marksDistStr = Object.entries(marksDistribution)
        .map(([marks, count]) => {
          totalQuestionsFromDist += parseInt(count);
          return `${count} question(s) × ${marks} mark(s) = ${count * parseInt(marks)} total marks`;
        })
        .join(',\n');
    } else {
      // Auto-generate distribution based on exam type
      if (examType.toLowerCase() === 'sessional' || examType.toLowerCase() === 'semester') {
        // Typical sessional: Part A (short) + Part B (long)
        const partAMarks = Math.floor(totalMarks * 0.2); // 20% for short questions
        const partBMarks = totalMarks - partAMarks; // 80% for long questions
        marksDistStr = `Part A: 5 questions × ${Math.floor(partAMarks / 5)} marks each\nPart B: 2-3 questions × ${Math.floor(partBMarks / 2)} marks each`;
      } else {
        marksDistStr = 'Auto-distributed based on exam type';
      }
    }
    
    // Build Bloom's taxonomy distribution
    const bloomsStr = Object.keys(bloomsDistribution).length > 0
      ? Object.entries(bloomsDistribution)
          .filter(([_, value]) => value > 0)
          .map(([level, value]) => `${value}% ${level.charAt(0).toUpperCase() + level.slice(1)}`)
          .join(', ')
      : 'Balanced distribution (Remember: 10%, Understand: 30%, Apply: 40%, Analyze: 15%, Evaluate: 5%)';
    
    // Build exam structure
    let structureStr = '';
    if (examStructure && examStructure.length > 0) {
      structureStr = examStructure.map(part => 
        `${part.partName}: ${part.questionCount} questions, ${part.totalMarks} marks${part.instructions ? ` (${part.instructions})` : ''}`
      ).join('\n');
    }

    // Determine question types based on exam type
    let questionTypesInstruction = '';
    if (examType.toLowerCase() === 'quiz') {
      questionTypesInstruction = 'Generate ONLY multiple-choice questions (1-2 marks each). Each question MUST have exactly 4 options with one correct answer. CRITICAL: Each option must be the FULL actual answer text (e.g. "To reduce the number of features in a dataset") - NEVER use placeholders like "Option A", "Option B", etc. Students will see these option texts directly.';
    } else if (examType.toLowerCase() === 'viva' || examType.toLowerCase() === 'practical') {
      questionTypesInstruction = 'Generate practical/applicative questions focusing on hands-on knowledge and real-world applications.';
    } else {
      // For Sessional/Semester exams: Theory-based questions
      questionTypesInstruction = `IMPORTANT: For Sessional/Semester exams, use theory-based questions:
      - 1-2 marks: Short Answer (theory/definition) - NO multiple choice
      - 3-5 marks: Short Answer (brief explanation with key points)
      - 6-10 marks: Long Answer (detailed explanation with examples)
      - 11+ marks: Comprehensive Answer (with case studies or complex analysis)
      - Multiple choice questions ONLY for Quiz exams, NOT for Sessional/Semester.`;
    }

    // Build comprehensive prompt
    const prompt = `You are an AI-powered smart exam generator for the AI Exam Suite.
Your job is to automatically create ACCURATE, CONSISTENT, and HIGH-QUALITY exam questions and model answers based on the faculty's input.

🎯 CRITICAL REQUIREMENTS:
1. ACCURACY: All questions must be factually correct and logically sound.
2. CONSISTENCY: Question difficulty must match the specified difficulty levels.
3. RELEVANCE: Questions must directly relate to the topics and their descriptions.
4. UNIQUENESS: No repetitive or similar questions.
5. ACADEMIC STANDARD: Use proper academic language suitable for university exams.

📥 EXAM SPECIFICATIONS:
- Subject: ${subjectName}
- Exam Type: ${examType}
- Total Marks: ${totalMarks}
- Units: ${unitNumbers.join(', ') || 'All selected units'}

📚 TOPICS WITH DIFFICULTY LEVELS:
${topicsList}

📊 MARKS DISTRIBUTION:
${marksDistStr || 'Auto-distributed based on exam type'}

📈 DIFFICULTY DISTRIBUTION:
- Easy: ${difficultyRatio.easy || 30}%
- Medium: ${difficultyRatio.medium || 50}%
- Hard: ${difficultyRatio.hard || 20}%

🧠 BLOOM'S TAXONOMY DISTRIBUTION:
${bloomsStr}

${structureStr ? `📋 EXAM STRUCTURE:\n${structureStr}\n` : ''}
${allowedMarks && allowedMarks.length > 0 ? `
🔒 ALLOWED MARKS ONLY:
Use ONLY these marks values for questions: [${allowedMarks.join(', ')}]
` : ''}
${sections && sections.length > 0 ? `
🗂️ SECTION RULES:
${sections.map(s => `- ${s.name}: marks allowed = [${(s.marksAllowed||[]).join(', ')}]${s.instructions ? `; instructions: ${s.instructions}` : ''}`).join('\n')}
` : ''}

⚙️ QUESTION GENERATION RULES:
1. STRICTLY follow the marks distribution - create EXACTLY the specified number of questions for each marks category. If an ALLOWED MARKS list is provided, NEVER generate any question outside that set.
2. Match difficulty levels to topics - if a topic is marked "EASY", generate easy questions for it.
3. ${questionTypesInstruction}
4. For 1-2 mark questions (Theory exams): Short answer theory questions testing definitions, basic concepts, or brief explanations. NO multiple choice for Sessional/Semester exams.
5. For 3-5 mark questions: Require brief explanations with 2-3 key points, examples, or simple problem-solving.
6. For 6-10 mark questions: Require detailed explanations with examples, step-by-step solutions, or moderate problem-solving.
7. For 11+ mark questions: Require comprehensive analysis, case studies, complex problem-solving, or situation-based scenarios with multiple parts.
8. Ensure total marks add up to EXACTLY ${totalMarks}.
9. ${includeDiagrams ? 'Include diagram/table suggestions where appropriate.' : 'Avoid diagram requirements unless necessary.'}
10. All model answers must be step-by-step and comprehensive.
11. For situation-based questions (especially 8+ marks), create realistic scenarios or case studies.
12. If you need to group questions with choices (e.g., "Answer any 3 out of 5"), you can add a "choiceGroup" field to indicate grouping.

📤 OUTPUT FORMAT:
Provide the output in structured JSON format with the following fields for each question:

{
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "Explain the working of a convolutional neural network with an example.",
      "marks": 8,
      "difficulty": "Hard",
      "type": "Long Answer",
      "unit": 3,
      "topic": "Convolutional Neural Networks",
      "bloomLevel": "Analyze",
      "suggestedDiagram": "Architecture of CNN with layers and filters",
      "modelAnswer": "A convolutional neural network (CNN) is a deep learning model used for image processing... [step-by-step explanation]",
      "keyPoints": [
        "Definition of CNN",
        "Convolution and pooling layers",
        "Activation functions",
        "Flattening and fully connected layers",
        "Real-world applications"
      ],
      "aiJustification": "This is marked 'Hard' because it requires conceptual understanding and diagrammatic representation.",
      "options": ["To reduce the number of features while preserving information", "To increase model complexity", "To add more training data", "To eliminate all categorical variables"],
      "correctAnswer": "To reduce the number of features while preserving information"
    }
  ]
}

IMPORTANT NOTES:
- For QUIZ exams ONLY: Include "options" array and "correctAnswer" field for multiple-choice questions. The "options" array must contain the FULL answer text for each choice (e.g. "Principle Component Analysis" NOT "Option A"). The "correctAnswer" must be the EXACT text of the correct option (one of the strings from the options array).
- For SESSIONAL/SEMESTER exams: DO NOT include "options" for 1-2 mark questions. They should be theory-based short answers.
- For short/long answer questions, focus on "keyPoints" and detailed "modelAnswer".
- Map each question to the appropriate topic and unit.
- Ensure total marks match the distribution EXACTLY.
- For situation-based questions (especially 8+ marks), include real-world scenarios or case studies.
- If questions should have choices (e.g., "Answer any 3 out of 5"), mark them with "choiceGroup": "A" or "B" to group them.
- Generate questions that match the difficulty level specified for each topic.

Now generate the questions:`;

    console.log('Sending request to Groq AI...');
    
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 4000
    });

    console.log('Groq AI Response received');
    const response = JSON.parse(completion.choices[0].message.content);
    
    console.log('Parsed response, questions count:', response.questions?.length || 0);

    if (!response.questions || response.questions.length === 0) {
      console.warn('No questions generated by AI');
      return [];
    }

    // Map AI response to our question format
    let mappedQuestions = response.questions.map((q, index) => {
      const topic = topics[index % topics.length];
      const unit = units.find(u => u._id && topic.unit && u._id.toString() === topic.unit.toString());
      
      // Determine question type from AI response or infer from marks
      let questionType = q.type || 'short_answer';
      
      // For Sessional/Semester exams, 1-2 mark questions should be theory-based short answers
      // Only Quiz exams should have multiple choice
      if (examType.toLowerCase() === 'quiz') {
        if (q.type && q.type.toLowerCase().includes('multiple')) {
          questionType = 'multiple_choice';
        } else if (q.marks <= 2) {
          questionType = 'multiple_choice';
        } else if (q.marks <= 5) {
          questionType = 'short_answer';
        } else {
          questionType = 'long_answer';
        }
      } else {
        // For Sessional/Semester: All questions are theory-based
        if (q.type && q.type.toLowerCase().includes('multiple')) {
          // Convert multiple choice to short answer for theory exams
          questionType = 'short_answer';
        } else if (q.marks <= 2) {
          questionType = 'short_answer';
        } else if (q.marks <= 5) {
          questionType = 'short_answer';
        } else {
          questionType = 'long_answer';
        }
      }

      // Normalize difficulty
      const difficulty = q.difficulty || 'Medium';
      const normalizedDifficulty = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();

      // Build question object
      const questionObj = {
        questionNumber: q.questionNumber || index + 1,
        text: q.questionText || q.question || 'Question text not provided',
        type: questionType,
        marks: parseInt(q.marks) || 1,
        difficulty: normalizedDifficulty === 'Easy' ? 'easy' : normalizedDifficulty === 'Hard' ? 'hard' : 'medium',
        bloomLevel: q.bloomLevel || 'Understand',
        topic: topic._id || topic,
        topicTitle: topic.title || q.topic,
        unit: unit?._id || topic.unit,
        unitTitle: unit?.title || q.unit,
        modelAnswer: q.modelAnswer || '',
        keyPoints: q.keyPoints || [],
        suggestedDiagram: includeDiagrams ? (q.suggestedDiagram || '') : '',
        aiJustification: q.aiJustification || '',
        depthLevel: topic.depthLevel || 1,
        isAI_generated: true
      };

      // Add options ONLY for Quiz exams with multiple choice questions
      if (questionType === 'multiple_choice' && examType.toLowerCase() === 'quiz' && q.options && Array.isArray(q.options)) {
        questionObj.options = q.options.map((opt, optIdx) => {
          const optText = typeof opt === 'string' ? opt : (opt && opt.text) || String(opt || '');
          return {
            text: optText,
            isCorrect: optText === (q.correctAnswer || '').trim() || (typeof opt === 'object' && opt.isCorrect) || optIdx === 0
          };
        });
        const firstOptText = questionObj.options[0]?.text || (typeof q.options[0] === 'string' ? q.options[0] : q.options[0]?.text) || '';
        questionObj.correctAnswer = (q.correctAnswer && String(q.correctAnswer).trim()) || firstOptText;
      } else {
        // For theory-based questions, use model answer
        questionObj.correctAnswer = q.modelAnswer || q.correctAnswer || 'See model answer';
        // Don't include options for theory questions
        if (questionType !== 'multiple_choice' || examType.toLowerCase() !== 'quiz') {
          questionObj.options = [];
        }
      }
      
      // Add choice group if specified (for "Answer any X out of Y" type questions)
      if (q.choiceGroup) {
        questionObj.choiceGroup = q.choiceGroup;
      }

      return questionObj;
    });

    // Enforce allowedMarks if provided
    if (allowedMarks && Array.isArray(allowedMarks) && allowedMarks.length > 0) {
      const allowedSet = new Set(allowedMarks.map(m => parseInt(m)));
      const beforeCount = mappedQuestions.length;
      mappedQuestions = mappedQuestions.filter(q => allowedSet.has(parseInt(q.marks)));
      if (mappedQuestions.length !== beforeCount) {
        console.warn(`Filtered out ${beforeCount - mappedQuestions.length} questions due to disallowed marks. Allowed: [${[...allowedSet].join(', ')}]`);
      }
    }

    // Re-number questions sequentially after filtering
    mappedQuestions = mappedQuestions.map((q, idx) => ({ ...q, questionNumber: idx + 1 }));

    console.log(`Successfully mapped ${mappedQuestions.length} questions`);
    return mappedQuestions;

  } catch (error) {
    console.error('=== Question Generation Error ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Return empty array on error
    return [];
  }
};

// Evaluate theory answers
const evaluateAnswer = async (studentAnswer, correctAnswer, questionType, maxMarks) => {
  try {
    const prompt = `Evaluate the following student answer against the expected answer.

Question Type: ${questionType}
Maximum Marks: ${maxMarks}

Expected Answer: ${correctAnswer}

Student Answer: ${studentAnswer}

Provide detailed evaluation in JSON format:
{
  "grammarScore": score out of 10,
  "contentRelevance": score out of 10,
  "completeness": score out of 10,
  "coveragePercentage": percentage,
  "bloomsLevel": "achieved bloom's taxonomy level",
  "feedback": "constructive feedback for the student",
  "suggestedScore": marks out of ${maxMarks}
}`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const evaluation = JSON.parse(completion.choices[0].message.content);
    
    return {
      grammarScore: evaluation.grammarScore || 0,
      contentRelevance: evaluation.contentRelevance || 0,
      completeness: evaluation.completeness || 0,
      coveragePercentage: evaluation.coveragePercentage || 0,
      bloomsLevel: evaluation.bloomsLevel || 'N/A',
      feedback: evaluation.feedback || 'No feedback generated',
      suggestedScore: evaluation.suggestedScore || 0,
      evaluatedAt: new Date()
    };
  } catch (error) {
    console.error('Answer Evaluation Error:', error);
    return {
      grammarScore: 5,
      contentRelevance: 5,
      completeness: 5,
      coveragePercentage: 50,
      bloomsLevel: 'N/A',
      feedback: 'Evaluation could not be completed',
      suggestedScore: Math.floor(maxMarks * 0.5),
      evaluatedAt: new Date()
    };
  }
};

module.exports = {
  analyzeTopicMaterials,
  generateQuestions,
  evaluateAnswer
};
