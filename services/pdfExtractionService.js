// Support both pdf-parse v1 (function) and v2 (PDFParse class)
const pdfModule = require('pdf-parse');
const fs = require('fs');

/**
 * Extract text from PDF file
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromPDF(filePath) {
  let parser = null;
  try {
    const path = require('path');
    let absolutePath;

    if (path.isAbsolute(filePath)) {
      absolutePath = filePath;
    } else {
      const possiblePaths = [
        path.join(process.cwd(), filePath),
        path.join(__dirname, '..', filePath),
        filePath
      ];
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          absolutePath = possiblePath;
          break;
        }
      }
      if (!absolutePath) {
        throw new Error(`PDF file not found. Tried: ${possiblePaths.join(', ')}`);
      }
    }

    console.log('Attempting to read PDF from:', absolutePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`PDF file not found at: ${absolutePath}`);
    }

    const dataBuffer = fs.readFileSync(absolutePath);
    if (!dataBuffer || dataBuffer.length === 0) {
      throw new Error('PDF file is empty');
    }

    console.log('PDF file size:', dataBuffer.length, 'bytes');

    let text = '';

    // v2 API: PDFParse class
    if (pdfModule && typeof pdfModule.PDFParse === 'function') {
      parser = new pdfModule.PDFParse({ data: dataBuffer });
      const result = await parser.getText();
      text = result?.text || '';
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
      parser = null;
    }
    // v1 API: pdf(buffer) function
    else if (typeof pdfModule === 'function') {
      const result = await pdfModule(dataBuffer);
      text = result?.text || '';
    }
    // Some builds may export default function
    else if (pdfModule && typeof pdfModule.default === 'function') {
      const result = await pdfModule.default(dataBuffer);
      text = result?.text || '';
    } else {
      throw new Error('Unsupported pdf-parse version: no PDFParse class or pdf() function found.');
    }

    console.log('PDF parsed successfully. Extracted text length:', text.length);

    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from PDF. The PDF might be image-based (scanned) or contain only images. Please use a PDF with selectable text.');
    }

    return text.trim();
  } catch (error) {
    if (parser && typeof parser.destroy === 'function') {
      try { await parser.destroy(); } catch (_) {}
    }
    console.error('Error extracting PDF:', error);
    console.error('Error stack:', error.stack);
    console.error('File path:', filePath);

    if (error.message.includes('not a PDF')) {
      throw new Error('The uploaded file is not a valid PDF file.');
    } else if (error.message.includes('corrupted')) {
      throw new Error('The PDF file appears to be corrupted. Please try uploading again or use a different PDF.');
    } else if (error.message.includes('image-based') || error.message.includes('No text')) {
      throw new Error('The PDF contains only images (scanned document). Please use a PDF with selectable text, or manually enter the answer key.');
    } else {
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }
}

/**
 * Structure answer key content using AI
 * @param {string} rawText - Raw text from PDF
 * @param {Array} questions - Array of question objects from exam
 * @returns {Promise<Object>} - Structured answer key
 */
async function structureAnswerKey(rawText, questions) {
  try {
    const prompt = `You are an expert at extracting and structuring answer keys from exam papers.

Extract the answer key information from the following text and structure it according to the questions provided.

RAW TEXT FROM PDF:
${rawText}

QUESTIONS IN EXAM:
${JSON.stringify(questions.map((q, i) => ({
  number: i + 1,
  text: q.text,
  marks: q.marks,
  type: q.type
})), null, 2)}

For each question, extract:
1. Expected answer (model answer)
2. Key keywords/concepts that should be present
3. Any specific rubric or marking scheme

Provide your response in JSON format:
{
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "question text",
      "expectedAnswer": "model answer text",
      "keywords": ["keyword1", "keyword2", ...],
      "marks": 8,
      "rubric": {
        "sections": [
          {
            "section": "Definition",
            "marks": 2,
            "description": "Must include..."
          }
        ]
      }
    }
  ]
}`;

    const Groq = require('groq-sdk');
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY
    });

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const structured = JSON.parse(completion.choices[0].message.content);
    return structured;
  } catch (error) {
    console.error('Error structuring answer key:', error);
    // Fallback: create basic structure
    return {
      questions: questions.map((q, i) => ({
        questionNumber: i + 1,
        questionText: q.text,
        expectedAnswer: 'Please review and update manually',
        keywords: [],
        marks: q.marks,
        rubric: {
          sections: []
        }
      }))
    };
  }
}

module.exports = {
  extractTextFromPDF,
  structureAnswerKey
};

