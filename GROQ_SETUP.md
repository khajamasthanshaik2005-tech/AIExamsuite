# Groq AI Setup Guide

## Overview
The AI Exam Suite now uses **Groq AI** for generating high-quality exam questions. Groq provides fast and cost-effective AI inference with multiple model options.

## Why Groq?
- **Faster**: Ultra-low latency inference
- **Cost-effective**: Free tier available with generous limits
- **Reliable**: Stable model performance for question generation
- **Multiple Models**: Choose the best model for your needs

## Available Models

### 1. llama-3.1-8b-instant (Default ✅ Recommended)
- **Speed**: Ultra-fast inference
- **Cost**: Free tier with generous limits
- **Best for**: Most exam questions, quick generation
- **Use case**: Standard question papers, quizzes, regular exams

### 2. llama-3.1-70b-versatile
- **Power**: More capable and nuanced responses
- **Best for**: Complex questions, advanced topics, detailed analysis
- **Use case**: Advanced exams, research questions, complex problem-solving

**Default**: The system uses `llama-3.1-8b-instant` by default (fast and free). You can switch to the 70B model by setting `GROQ_MODEL` in your `.env` file.

## Setup Instructions

### Step 1: Get Your Groq API Key

1. Visit [Groq Console](https://console.groq.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Create a new API key
5. Copy the API key (it starts with `gsk_...`)

### Step 2: Add to .env File

Add your Groq API key to the `.env` file in the root directory:

```env
# Groq API Key (Primary - for AI question generation)
GROQ_API_KEY=gsk_your_actual_api_key_here

# Optional: Choose your model (default: llama-3.1-8b-instant)
# GROQ_MODEL=llama-3.1-8b-instant  # Fast and free (recommended)
# GROQ_MODEL=llama-3.1-70b-versatile  # More powerful
```

**Important**: If you already have an existing `.env` file:
1. Open the `.env` file
2. Add the `GROQ_API_KEY` line above
3. (Optional) Add `GROQ_MODEL` if you want to use the 70B model
4. Save the file
5. Restart your backend server

### Model Selection

**Default Behavior**: If you don't specify `GROQ_MODEL`, the system automatically uses `llama-3.1-8b-instant` (fast and free).

**To use the more powerful model**, add this line to `.env`:
```env
GROQ_MODEL=llama-3.1-70b-versatile
```

**When to use which model:**
- **llama-3.1-8b-instant**: For most cases - fast, free, and good quality
- **llama-3.1-70b-versatile**: For advanced/complex questions requiring deeper analysis

### Step 3: Verify Setup

1. Make sure `groq-sdk` is installed:
   ```bash
   npm install
   ```

2. Start your backend server:
   ```bash
   npm run dev
   ```

3. Try generating questions from the faculty dashboard

## Features Enabled with Groq

The Groq AI integration enables:

### 1. **Comprehensive Question Generation**
   - Multiple question types (MCQ, Short Answer, Long Answer)
   - Automatic marks distribution
   - Difficulty level balancing (Easy, Medium, Hard)
   - Bloom's taxonomy classification

### 2. **Advanced Question Properties**
   - **Model Answers**: Step-by-step solutions for each question
   - **Key Points**: Important concepts tested in the question
   - **Suggested Diagrams**: For questions requiring visual representations
   - **Bloom's Level**: Cognitive skill level (Remember, Understand, Apply, Analyze, Evaluate, Create)
   - **AI Justification**: Explanation of question difficulty

### 3. **Exam Type Support**
   - **Quiz**: Multiple-choice questions only
   - **Sessional/Semester**: Mixed question types
   - **Viva/Practical**: Hands-on application questions

### 4. **Customizable Parameters**
   - Total marks distribution
   - Difficulty ratio (e.g., 30% Easy, 50% Medium, 20% Hard)
   - Include/exclude diagrams
   - Include/exclude model answers

## Example: Generate Questions

When creating an exam, you can now pass additional parameters:

```javascript
{
  "count": 10,
  "marksDistribution": {
    "1": 5,
    "2": 3,
    "8": 2
  },
  "difficultyRatio": {
    "easy": 30,
    "medium": 50,
    "hard": 20
  },
  "includeDiagrams": true,
  "includeModelAnswers": true
}
```

This will generate:
- 5 one-mark questions (MCQ)
- 3 two-mark questions (Short Answer)
- 2 eight-mark questions (Long Answer)
- Distributed according to difficulty ratios
- With model answers and suggested diagrams

## Troubleshooting

### Error: "Groq API key not found"
- Make sure you've added `GROQ_API_KEY` to your `.env` file
- Restart the backend server after adding the key
- Check for typos in the API key

### Error: "Rate limit exceeded"
- Groq free tier has rate limits
- Wait a few minutes and try again
- Consider upgrading to a paid plan for higher limits

### Questions not generating
- Check console logs for detailed error messages
- Verify the API key is valid
- Ensure topics are properly selected for the exam
- Check that units and topics are linked correctly

### Questions quality issues
- Try adjusting the difficulty ratio
- Specify more detailed marks distribution
- Ensure topics have good descriptions

## API Key Security

**⚠️ Important Security Notes:**

1. **Never commit `.env` file to Git** - It's already in `.gitignore`
2. **Keep your API key secret** - Don't share it publicly
3. **Rotate keys if exposed** - Generate a new key if compromised
4. **Use environment variables in production** - Don't hardcode keys

## Backward Compatibility

- The system still supports OpenAI API key (`OPENAI_API_KEY`) as a fallback
- If `GROQ_API_KEY` is not found, it will try to use `OPENAI_API_KEY`
- For best results, use Groq API key

## Support

For issues or questions:
1. Check the console logs for detailed error messages
2. Verify your API key is active in Groq Console
3. Ensure all dependencies are installed (`npm install`)
4. Check that the backend server is running

---

**Need Help?** Check the main `SETUP_GUIDE.md` for general setup instructions.

