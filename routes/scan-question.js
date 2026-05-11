const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Optimized: Store the uploaded file in memory instead of on disk.
const upload = multer({ storage: multer.memoryStorage() });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
// Check for the API key at startup for early failure.
if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set in the environment variables. The API will not function.");
  // Exit the process or handle the error gracefully in a production environment.
}

router.post('/', upload.single('image'), async (req, res) => {
  // Graceful handling for missing file
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  const { question } = req.body;

  try {
    // Optimized: Use the in-memory buffer directly.
    const imageBuffer = req.file.buffer;
    const imageBase64 = imageBuffer.toString('base64');

    const prompt = question
      ? `Analyze this image and provide a detailed explanation or solution for the following question: "${question}".`
      : `Analyze this image and provide a detailed explanation or solution.`;

    const body = {
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: req.file.mimetype || 'image/jpeg',
              data: imageBase64
            }
          }
        ]
      }]
    };

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    // Optimized: Check for a successful HTTP status code before parsing.
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API returned an error:', response.status, errorData);
      return res.status(response.status).json({
        error: 'Failed to get a response from the AI model.',
        details: errorData.error?.message || 'Unknown API error'
      });
    }

    const data = await response.json();

    // Optimized: Use optional chaining for safer access to nested properties.
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (answer) {
      res.json({
        answer: answer,
        model: 'gemini-2.0-flash',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'No valid answer received from the Gemini API.',
        details: data
      });
    }
  } catch (err) {
    console.error('Error in /api/scan-question:', err);
    res.status(500).json({
      error: 'An internal server error occurred.',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Please try again later.'
    });
  }
});

module.exports = router;
