const express = require('express');
const Comment = require('../models/Comment');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/comments/:taskId
router.get('/:taskId', async (req, res) => {
  try {
    const comments = await Comment.find({ task: req.params.taskId })
      .populate('author', 'name email')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/comments
router.post('/', async (req, res) => {
  try {
    const { task, content } = req.body;
    if (!task || !content) return res.status(400).json({ message: 'task and content required' });
    const comment = await Comment.create({ task, content, author: req.user._id });
    await comment.populate('author', 'name email');
    res.status(201).json(comment);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/comments/:id
router.delete('/:id', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Not found' });
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Can only delete your own comments' });
    }
    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
