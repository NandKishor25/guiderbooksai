const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');

const router = express.Router();

// Store uploaded files in memory
const upload = multer({ storage: multer.memoryStorage() });

// OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Check API key
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in environment variables.');
}

router.post('/', upload.single('image'), async (req, res) => {
  // Check image upload
  if (!req.file) {
    return res.status(400).json({
      error: 'No image uploaded',
    });
  }

  const { question } = req.body;

  try {
    // Convert image to base64
    const imageBase64 = req.file.buffer.toString('base64');

    // Prompt
    const prompt = question
      ? `Analyze this image and provide a detailed explanation or solution for the following question: "${question}".`
      : `Analyze this image and provide a detailed explanation or solution.`;

    // OpenAI Vision Request
    const response = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${req.file.mimetype};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const answer = response.choices?.[0]?.message?.content;

    if (answer) {
      res.json({
        answer,
        model: 'gpt-4.1-mini',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        error: 'No valid answer received from OpenAI.',
        details: response,
      });
    }
  } catch (err) {
    console.error('Error in /api/scan-question:', err);

    res.status(500).json({
      error: 'An internal server error occurred.',
      details:
        process.env.NODE_ENV === 'development'
          ? err.message
          : 'Please try again later.',
    });
  }
});

module.exports = router;
