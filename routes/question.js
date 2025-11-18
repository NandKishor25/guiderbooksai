const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Chapter = require('../models/Chapter');
const { getOpenAIQuestions } = require('../utils/openai');


// GET or generate questions for a chapter
router.get('/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;

    // 1. Check DB
    let questions = await Question.find({ chapterId });
    if (questions.length > 0) {
      return res.json(questions);
    }

    // 2. Load Chapter data
    let chapter = await Chapter.findOne({ chapterId: chapterId });
    if (!chapter) {
      try {
        chapter = await Chapter.findById(chapterId);
      } catch (err) {
        // Invalid ObjectId format
      }
    }
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    // 3. Generate using OpenAI
    const generated = await getOpenAIQuestions(chapter.content, chapter.title);

    // 4. Map and insert
    const toSave = generated.slice(0, 40).map(q => ({
      ...q,
      chapter: chapter._id,     // required ObjectId ref
      chapterId: chapterId      // friendly string id
    }));

    // 5. Save to DB
    const saved = await Question.insertMany(toSave);

    // 6. Return to UI
    res.json(saved);
  } catch (err) {
    console.error('❌ Error generating questions:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { chapterContent, chapterTitle } = req.body;
// here is the best chapter example using the best example the 

//best image genration 
//
//
    // Find the chapter using friendly ID
    // const chapter = await Chapter.findOne({ chapterId });
    // if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    // // Check if questions already exist
    // const existing = await Question.find({ chapterId });
    // if (existing.length > 0) return res.json(existing);

    // Generate questions using OpenAI
    const generated = await getOpenAIQuestions(chapterContent.content, chapterTitle);

    // Map and prepare questions for saving
    // const toSave = generated.slice(0, 40).map(q => ({
    //   ...q,
    //   chapter: chapter._id,     // Mongo ObjectId for reference
    //   chapterId: chapter.chapterId
    // }));

    // console.log('Generated Questions:', toSave);

    // Save and return
    // const saved = await Question.insertMany(toSave);
    res.json(generated);
  } catch (err) {
    console.error('❌ Error in generate route:', err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
