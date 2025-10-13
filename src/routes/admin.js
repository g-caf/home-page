const express = require('express');
const router = express.Router();
const BookPost = require('../models/BookPost');
const upload = require('../config/upload');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

// Admin page - list all book posts
router.get('/', async (req, res) => {
  try {
    const bookPosts = await BookPost.findAll();
    res.render('admin/books', { bookPosts });
  } catch (error) {
    console.error('Error fetching book posts:', error);
    res.status(500).send('Error loading admin page');
  }
});

// Create book post form
router.get('/new', (req, res) => {
  res.render('admin/book-form', { bookPost: null, error: null });
});

// Create book post
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, subtitle, published_date, content } = req.body;

    // Generate slug from title
    const slug = BookPost.generateSlug(title);

    // Upload image to Cloudinary if provided
    let image_url = null;
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'book-covers',
        resource_type: 'image'
      });
      image_url = result.secure_url;

      // Delete local temp file
      fs.unlinkSync(req.file.path);
    }

    await BookPost.create({
      title,
      subtitle: subtitle || null,
      slug,
      content: content || null,
      image_url,
      published_date
    });

    res.redirect('/admin');
  } catch (error) {
    console.error('Error creating book post:', error);
    res.render('admin/book-form', {
      bookPost: req.body,
      error: 'Error creating post: ' + error.message
    });
  }
});

// Edit book post form
router.get('/:id(\\d+)/edit', async (req, res) => {
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
router.post('/:id(\\d+)', upload.single('image'), async (req, res) => {
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
      // Delete old image from Cloudinary if exists
      if (bookPost.image_url && bookPost.image_url.includes('cloudinary.com')) {
        const publicId = bookPost.image_url.split('/').slice(-2).join('/').split('.')[0];
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error('Error deleting old image from Cloudinary:', err);
        }
      }

      // Upload new image to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'book-covers',
        resource_type: 'image'
      });
      image_url = result.secure_url;

      // Delete local temp file
      fs.unlinkSync(req.file.path);
    }

    await BookPost.update(req.params.id, {
      title,
      subtitle: subtitle || null,
      slug,
      content: content || null,
      image_url,
      published_date
    });

    res.redirect('/admin');
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
router.post('/:id(\\d+)/delete', async (req, res) => {
  try {
    const bookPost = await BookPost.findById(req.params.id);

    if (!bookPost) {
      return res.status(404).send('Book post not found');
    }

    // Delete associated image from Cloudinary if exists
    if (bookPost.image_url && bookPost.image_url.includes('cloudinary.com')) {
      const publicId = bookPost.image_url.split('/').slice(-2).join('/').split('.')[0];
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error('Error deleting image from Cloudinary:', err);
      }
    }

    await BookPost.delete(req.params.id);
    res.redirect('/admin');
  } catch (error) {
    console.error('Error deleting book post:', error);
    res.status(500).send('Error deleting post');
  }
});

module.exports = router;
