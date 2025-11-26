const express = require('express');
const router = express.Router();
const Chapter = require('../models/Chapter');
const { generateChapterResponse } = require('../utils/chatgpt');

// POST /api/ask-chapter - Ask questions about a specific chapter
router.post('/', async (req, res) => {
  try {
    const { question, chapterId, chapterContent, language } = req.body;

    if (!question || !chapterId) {
      return res.status(400).json({
        error: 'Question and chapterId are required'
      });
    }

    // Get chapter content from database if not provided
    let content = '';
    let title = '';

    if (chapterContent && chapterContent.content) {
      content = chapterContent.content;
      title = chapterContent.title || '';
    } else {
      // Try to find by chapterId field first (for user-friendly IDs)
      let chapter = await Chapter.findOne({ chapterId: chapterId });

      // If not found by chapterId, try by ObjectId
      if (!chapter) {
        try {
          chapter = await Chapter.findById(chapterId);
        } catch (err) {
          // Invalid ObjectId format, continue with null
        }
      }

      if (!chapter) {
        return res.status(404).json({
          error: 'Chapter not found'
        });
      }
      content = chapter.content;
      title = chapter.title;
    }

    if (!content) {
      return res.status(400).json({
        error: 'No chapter content available'
      });
    }

    const answer = await generateChapterResponse(question, content, title, language);

    res.json({
      answer,
      chapterTitle: title,
      question,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error in ask-chapter route:', error);

    if (error.message.includes('rate limit')) {
      return res.status(429).json({
        error: 'API rate limit exceeded. Please try again later.'
      });
    }

    if (error.message.includes('API configuration error')) {
      return res.status(500).json({
        error: 'OpenAI API configuration error'
      });
    }

    res.status(500).json({
      error: error.message || 'Failed to process your question. Please try again.'
    });
  }
});

// GET /api/ask-chapter/:chapterId - Get chapter info for asking questions
router.get('/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;

    // Try to find by chapterId field first (for user-friendly IDs)
    let chapter = await Chapter.findOne({ chapterId: chapterId });

    // If not found by chapterId, try by ObjectId
    if (!chapter) {
      try {
        chapter = await Chapter.findById(chapterId);
      } catch (err) {
        // Invalid ObjectId format, continue with null
      }
    }

    if (!chapter) {
      return res.status(404).json({
        error: 'Chapter not found'
      });
    }

    res.json({
      chapterId: chapter._id,
      title: chapter.title,
      content: chapter.content,
      metadata: chapter.metadata
    });

  } catch (error) {
    console.error('Error fetching chapter:', error);
    res.status(500).json({
      error: 'Failed to fetch chapter information'
    });
  }
});

module.exports = router; 