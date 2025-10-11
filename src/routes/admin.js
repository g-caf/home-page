const express = require('express');
const router = express.Router();
const BookPost = require('../models/BookPost');
const upload = require('../config/upload');
const fs = require('fs');
const path = require('path');

// Admin page - list all book posts
router.get('/books', async (req, res) => {
  try {
    const bookPosts = await BookPost.findAll();
    res.render('admin/books', { bookPosts });
  } catch (error) {
    console.error('Error fetching book posts:', error);
    res.status(500).send('Error loading admin page');
  }
});

// Create book post form
router.get('/books/new', (req, res) => {
  res.render('admin/book-form', { bookPost: null, error: null });
});

// Create book post
router.post('/books', upload.single('image'), async (req, res) => {
  try {
    const { title, subtitle, published_date, content } = req.body;

    // Generate slug from title
    const slug = BookPost.generateSlug(title);

    // Get image URL if uploaded
    const image_url = req.file ? `/uploads/books/${req.file.filename}` : null;

    await BookPost.create({
      title,
      subtitle: subtitle || null,
      slug,
      content: content || null,
      image_url,
      published_date
    });

    res.redirect('/admin/books');
  } catch (error) {
    console.error('Error creating book post:', error);
    res.render('admin/book-form', {
      bookPost: req.body,
      error: 'Error creating post: ' + error.message
    });
  }
});

// Edit book post form
router.get('/books/:id/edit', async (req, res) => {
  try {
    const bookPost = await BookPost.findById(req.params.id);
    if (!bookPost) {
      return res.status(404).send('Book post not found');
    }
    res.render('admin/book-form', { bookPost, error: null });
  } catch (error) {
    console.error('Error fetching book post:', error);
    res.status(500).send('Error loading edit form');
  }
});

// Update book post
router.post('/books/:id', upload.single('image'), async (req, res) => {
  try {
    const { title, subtitle, published_date, content } = req.body;
    const bookPost = await BookPost.findById(req.params.id);

    if (!bookPost) {
      return res.status(404).send('Book post not found');
    }

    // Generate new slug if title changed
    const slug = BookPost.generateSlug(title);

    // Handle image upload
    let image_url = bookPost.image_url;
    if (req.file) {
      // Delete old image if exists
      if (bookPost.image_url) {
        const oldImagePath = path.join(__dirname, '../../public', bookPost.image_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      image_url = `/uploads/books/${req.file.filename}`;
    }

    await BookPost.update(req.params.id, {
      title,
      subtitle: subtitle || null,
      slug,
      content: content || null,
      image_url,
      published_date
    });

    res.redirect('/admin/books');
  } catch (error) {
    console.error('Error updating book post:', error);
    const bookPost = await BookPost.findById(req.params.id);
    res.render('admin/book-form', {
      bookPost,
      error: 'Error updating post: ' + error.message
    });
  }
});

// Delete book post
router.post('/books/:id/delete', async (req, res) => {
  try {
    const bookPost = await BookPost.findById(req.params.id);

    if (!bookPost) {
      return res.status(404).send('Book post not found');
    }

    // Delete associated image if exists
    if (bookPost.image_url) {
      const imagePath = path.join(__dirname, '../../public', bookPost.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await BookPost.delete(req.params.id);
    res.redirect('/admin/books');
  } catch (error) {
    console.error('Error deleting book post:', error);
    res.status(500).send('Error deleting post');
  }
});

module.exports = router;
