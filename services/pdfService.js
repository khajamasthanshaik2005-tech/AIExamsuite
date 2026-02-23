const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF answer script for a student's exam submission
 * @param {Object} attempt - ExamAttempt document
 * @param {Object} exam - Exam document with populated questions
 * @param {Array} answers - Array of Answer documents
 * @returns {Promise<string>} - Path to generated PDF file
 */
async function generateAnswerScript(attempt, exam, answers) {
  return new Promise((resolve, reject) => {
    try {
      // Create uploads/answer-scripts directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'answer-scripts');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate filename
      const timestamp = Date.now();
      const filename = `exam-${exam._id}-student-${attempt.student}-${timestamp}.pdf`;
      const filePath = path.join(uploadsDir, filename);

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      // Pipe PDF to file
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Helper function to strip HTML tags
      const stripHtml = (html) => {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      };

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text(exam.title, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(`Subject: ${exam.subject?.name || 'N/A'}`, { align: 'center' });
      doc.moveDown(1);

      // Student Information Section
      doc.fontSize(14).font('Helvetica-Bold').text('Student Information', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica');
      
      const studentInfo = [
        `Name: ${attempt.studentName || 'N/A'}`,
        `Student ID: ${attempt.studentIdentifier || 'N/A'}`,
        `College: ${attempt.college || 'N/A'}`,
        `Branch: ${attempt.branch || 'N/A'}`,
        `Year: ${attempt.year || 'N/A'}`,
        `Section: ${attempt.section || 'N/A'}`,
        `Submitted At: ${attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : 'N/A'}`
      ];

      studentInfo.forEach(info => {
        doc.text(info);
      });

      doc.moveDown(1);
      doc.addPage();

      // Exam Information
      doc.fontSize(14).font('Helvetica-Bold').text('Exam Information', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica');
      doc.text(`Type: ${exam.type.charAt(0).toUpperCase() + exam.type.slice(1)}`);
      doc.text(`Duration: ${exam.duration} minutes`);
      doc.text(`Total Marks: ${exam.totalMarks}`);
      doc.text(`Passing Marks: ${exam.passingMarks}`);
      if (exam.instructions) {
        doc.moveDown(0.3);
        doc.text(`Instructions: ${exam.instructions}`);
      }

      doc.moveDown(1);
      doc.addPage();

      // Questions and Answers
      doc.fontSize(16).font('Helvetica-Bold').text('Questions and Answers', { align: 'center', underline: true });
      doc.moveDown(1);

      // Create a map of answers by question ID for quick lookup
      const answerMap = new Map();
      answers.forEach(answer => {
        if (answer.question) {
          const qId = answer.question._id ? String(answer.question._id) : String(answer.question);
          answerMap.set(qId, answer);
        }
      });

      // Sort questions by their order in the exam
      const questions = (exam.questions || []).slice().sort((a, b) => {
        const aIndex = exam.questions.findIndex(q => String(q._id) === String(a._id));
        const bIndex = exam.questions.findIndex(q => String(q._id) === String(b._id));
        return aIndex - bIndex;
      });

      questions.forEach((question, index) => {
        // Check if we need a new page
        if (doc.y > 700) {
          doc.addPage();
        }

        const questionNum = index + 1;
        const answer = answerMap.get(String(question._id));

        // Question
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`Question ${questionNum} (${question.marks} marks)`, { continued: false });
        doc.moveDown(0.2);
        
        doc.fontSize(11).font('Helvetica');
        const questionText = stripHtml(question.text || '');
        doc.text(questionText, { align: 'left' });
        doc.moveDown(0.3);

        // Options (for MCQ)
        if (question.type === 'multiple_choice' && question.options && question.options.length > 0) {
          question.options.forEach((option, optIndex) => {
            const marker = option.isCorrect ? '✓' : ' ';
            doc.text(`${marker} ${String.fromCharCode(65 + optIndex)}. ${option.text}`, {
              indent: 20
            });
          });
          doc.moveDown(0.3);
        }

        // Answer
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('Answer:', { continued: false });
        doc.moveDown(0.2);
        
        doc.fontSize(10).font('Helvetica');
        if (answer && answer.answerText) {
          const answerText = stripHtml(answer.answerText);
          if (answerText.trim()) {
            doc.text(answerText, { indent: 20 });
          } else {
            doc.text('No answer provided', { indent: 20, color: 'gray' });
          }
        } else {
          doc.text('No answer provided', { indent: 20, color: 'gray' });
        }

        // Show score if available
        if (answer && answer.score !== undefined) {
          doc.moveDown(0.2);
          doc.fontSize(10).font('Helvetica-Bold');
          doc.text(`Score: ${answer.score}/${answer.maxScore || question.marks}`, { indent: 20 });
        }

        doc.moveDown(0.8);
        
        // Add separator line
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
      });

      // Summary page
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('Summary', { align: 'center', underline: true });
      doc.moveDown(1);
      
      doc.fontSize(12).font('Helvetica');
      doc.text(`Total Questions: ${questions.length}`);
      doc.text(`Questions Answered: ${answers.length}`);
      doc.text(`Total Score: ${attempt.totalScore || 0}/${exam.totalMarks}`);
      doc.text(`Status: ${attempt.passed ? 'Passed' : 'Failed'}`);
      
      if (attempt.submittedAt) {
        doc.moveDown(0.5);
        doc.text(`Submitted: ${new Date(attempt.submittedAt).toLocaleString()}`);
      }

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        const relativePath = `uploads/answer-scripts/${filename}`;
        resolve(relativePath);
      });

      stream.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateAnswerScript
};




