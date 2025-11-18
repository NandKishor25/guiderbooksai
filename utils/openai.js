const OpenAI = require('openai');
require('dotenv').config({ path: './env/.env' }); // Match the path used in index.js

// Lazy initialization - only create client when needed
let openai = null;

function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables. Please add it to backend/env/.env');
    }
    openai = new OpenAI({
      apiKey: apiKey,
    });
  }
  return openai;
}

/**
 * Generate questions and answers for a chapter using OpenAI
 * @param {string} chapterContent
 * @param {string} chapterTitle
 * @returns {Promise<Array<{question: string, answer: string}>>}
 */
async function getOpenAIQuestions(chapterContent, chapterTitle) {
  const prompt = `Generate 10 quiz questions and answers based ONLY on the chaptercontent below.
Title: ${chapterTitle}
Content: ${chapterContent}

Respond ONLY as a JSON array like:
[
  { "question": "What is...", "answer": "..." },
  ...
]`;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates quiz questions from chapter content in JSON format.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 1,
      max_tokens: 4000,
    });

    const raw = response.choices[0].message.content;
   

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      throw new Error('Parsed output is not an array.');
    } catch {
      // Attempt to extract JSON array from within response text
      const match = raw.match(/\[\s*{[\s\S]*?}\s*]/);
      if (match) {
        const fallbackParsed = JSON.parse(match[0]);
        if (Array.isArray(fallbackParsed)) return fallbackParsed;
      }
      throw new Error('Failed to extract valid JSON array from response.');
    }

  } catch (err) {
    console.error('❌ Error generating questions from OpenAI:', err.message);
    throw err;
  }
}

/**
 * Generate a full assessment (MCQs, True/False, Fill-ups, Q&A) from chapter
 * @param {string} chapterContent
 * @param {string} chapterTitle
 * @returns {Promise<{
 *  mcqs: Array<{ question: string, options: string[], answer: string }>,
 *  trueFalse: Array<{ statement: string, answer: boolean }>,
 *  fillups: Array<{ sentence: string, answer: string }>,
 *  qa: Array<{ question: string, answer: string }>
 * }>}
 */
async function getOpenAIAssessment(chapterContent, chapterTitle) {
  const prompt = `You are a strict formatter. Create a comprehensive assessment ONLY from the given chapter.
Title: ${chapterTitle}
Content: ${chapterContent}

Return a SINGLE VALID JSON object with EXACTLY these keys and formats:
{
  "mcqs": [
    { "question": "string", "options": ["A","B","C","D"], "answer": "exact option text" }
  ],
  "trueFalse": [
    { "statement": "string", "answer": true }
  ],
  "fillups": [
    { "sentence": "Sentence with a _____ blank", "answer": "string" }
  ],
  "qa": [
    { "question": "string", "answer": "string" }
  ]
}

Rules:
- 10 MCQs, 10 True/False, 10 Fill-ups, 10 Q&A.
- Options must be plausible; only one correct answer.
- Answers must be precise and derivable from the chapter.
- Do not include any prose, Markdown, or explanation outside the JSON.`;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You return ONLY strict JSON as requested. Never include extra text.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const raw = response.choices[0].message.content;

    try {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        Array.isArray(parsed.mcqs) &&
        Array.isArray(parsed.trueFalse) &&
        Array.isArray(parsed.fillups) &&
        Array.isArray(parsed.qa)
      ) {
        return parsed;
      }
      throw new Error('Parsed output missing required keys.');
    } catch {
      // Attempt to extract JSON object
      const match = raw.match(/\{\s*"(?:mcqs|trueFalse|fillups|qa)":[\s\S]*\}\s*$/);
      if (match) {
        const fallbackParsed = JSON.parse(match[0]);
        if (
          fallbackParsed &&
          Array.isArray(fallbackParsed.mcqs) &&
          Array.isArray(fallbackParsed.trueFalse) &&
          Array.isArray(fallbackParsed.fillups) &&
          Array.isArray(fallbackParsed.qa)
        ) {
          return fallbackParsed;
        }
      }
      throw new Error('Failed to extract valid assessment JSON from response.');
    }
  } catch (err) {
    console.error('❌ Error generating assessment from OpenAI:', err.message);
    throw err;
  }
}

module.exports = { getOpenAIQuestions, getOpenAIAssessment };
