const express = require('express');
const router = express.Router();
const Chapter = require('../models/Chapter');
const { generateGeneralResponse } = require('../utils/chatgpt');

router.post('/', async (req, res) => {
  try {
    const { question, chapterId, context, language } = req.body;
    let chapterContent = '';

    if (chapterId) {
      const chapter = await Chapter.findById(chapterId);
      if (chapter) chapterContent = chapter.content;
    }

    let contextToUse = '';
    if (chapterContent) {
      contextToUse = chapterContent;
    } else if (context) {
      contextToUse = context;
    }

    const answer = await generateGeneralResponse(question, contextToUse, language);
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
