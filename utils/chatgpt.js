const OpenAI = require('openai');
require('dotenv').config({ path: './env/.env' });

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
 * Generate a response using ChatGPT API
 * @param {string} systemPrompt - The system prompt to set the AI's behavior
 * @param {string} userPrompt - The user's question or input
 * @param {Object} options - Additional options for the API call
 * @returns {Promise<string>} The AI's response
 */
async function generateResponse(systemPrompt, userPrompt, options = {}) {
  const {
    model = 'gpt-3.5-turbo',
    temperature = 1,
    maxTokens = 2000,
    presencePenalty = 0.1,
    frequencyPenalty = 0.1
  } = options;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      max_tokens: maxTokens,
      presence_penalty: presencePenalty,
      frequency_penalty: frequencyPenalty
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota' || error.status === 429) {
      throw new Error('API rate limit exceeded. Please try again later.');
    }
    
    if (error.code === 'invalid_api_key') {
      throw new Error('OpenAI API configuration error. Please check your API key.');
    }
    
    if (error.code === 'context_length_exceeded') {
      throw new Error('The content is too long. Please try a shorter question or chapter.');
    }
    
    throw new Error('Failed to generate response. Please try again.');
  }
}

/**
 * Generate chapter-specific response
 * @param {string} question - User's question
 * @param {string} chapterContent - Chapter content
 * @param {string} chapterTitle - Chapter title
 * @returns {Promise<string>} The AI's response
 */
async function generateChapterResponse(question, chapterContent, chapterTitle) {
  const systemPrompt = `You are an expert teacher and educational assistant. You have access to a specific chapter's content and should answer questions based on that content.

IMPORTANT GUIDELINES:
- Base your answers ONLY on the provided chapter content
- If the question cannot be answered from the chapter content, say so clearly
- Provide detailed, educational explanations
- Use clear, structured formatting
- Include relevant examples when possible
- Be encouraging and supportive in your tone

RESPONSE FORMAT:
- Use **BOLD HEADINGS** for main sections
- Use bullet points for lists
- Include examples with ✅ emoji
- Use line breaks for readability
- If mathematical concepts are involved, use LaTeX format with \`$...\` or \`$$...$$\`

Chapter Title: ${chapterTitle}
Chapter Content: ${chapterContent}`;

  const userPrompt = `Question: ${question}

Please answer this question based on the chapter content provided above.`;

  return await generateResponse(systemPrompt, userPrompt, {
    temperature: 1,
    maxTokens: 2000
  });
}

/**
 * Generate general educational response
 * @param {string} question - User's question
 * @param {string} context - Optional context
 * @returns {Promise<string>} The AI's response
 */
async function generateGeneralResponse(question, context = '') {
  const systemPrompt = `You are an expert teacher and educational assistant. You provide clear, detailed explanations on various topics.

IMPORTANT GUIDELINES:
- Provide comprehensive, educational explanations
- Use clear, structured formatting
- Include relevant examples when possible
- Be encouraging and supportive in your tone
- If context is provided, use it to give more relevant answers

RESPONSE FORMAT:
- Use **BOLD HEADINGS** for main sections
- add questions mark for question
- Use bullet points for lists
- Include examples with ✅ emoji
- Use line breaks for readability
- If mathematical concepts are involved, use LaTeX format with \`$...\` or \`$$...$$\``;

  let userPrompt = question;
  if (context) {
    userPrompt = `Context:\n${context}\n\nQuestion:\n${question}`;
  }

  return await generateResponse(systemPrompt, userPrompt, {
    temperature: 0.7,
    maxTokens: 1500
  });
}

module.exports = {
  generateResponse,
  generateChapterResponse,
  generateGeneralResponse
}; 
