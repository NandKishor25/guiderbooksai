const express = require('express');
const router = express.Router();
const Chapter = require('../models/Chapter');
const { getOpenAIAssessment } = require('../utils/openai');

// POST /api/assessment - Generate assessment from provided chapterId or chapterContent
router.post('/', async (req, res) => {
  try {
    const { chapterId, chapterContent } = req.body;

    let content = '';
    let title = '';

    if (chapterContent && chapterContent.content) {
      content = chapterContent.content;
      title = chapterContent.title || '';
    } else if (chapterId) {
      // Find by friendly chapterId or by ObjectId
      let chapter = await Chapter.findOne({ chapterId });
      if (!chapter) {
        try {
          chapter = await Chapter.findById(chapterId);
        } catch (e) {
          // ignore invalid ObjectId
        }
      }
      if (!chapter) {
        return res.status(404).json({ error: 'Chapter not found' });
      }
      content = chapter.content;
      title = chapter.title;
    } else {
      return res.status(400).json({ error: 'chapterId or chapterContent is required' });
    }

    if (!content) {
      return res.status(400).json({ error: 'No chapter content available' });
    }

    const assessment = await getOpenAIAssessment(content, title);

    res.json({
      chapterTitle: title,
      assessment,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('❌ Error in assessment route:', err);
    res.status(500).json({ error: err.message || 'Failed to generate assessment' });
  }
});

module.exports = router;


