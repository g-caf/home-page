const express = require('express');
const router = express.Router();
const BookPost = require('../models/BookPost');

// Individual book post page
router.get('/:slug', async (req, res) => {
  try {
    const bookPost = await BookPost.findBySlug(req.params.slug);

    if (!bookPost) {
      return res.status(404).send('Book post not found');
    }

    res.render('book-post', { bookPost });
  } catch (error) {
    console.error('Error fetching book post:', error);
    res.status(500).send('Error loading book post');
  }
});

module.exports = router;
