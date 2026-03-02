const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const BookPost = require('../models/BookPost');
const WritingSubmission = require('../models/WritingSubmission');
const upload = require('../config/upload');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

const ADMIN_AUTH_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_AUTH_MAX_ATTEMPTS = 10;
const adminAuthAttempts = new Map();

function normalizeIp(ip) {
  if (!ip) return '';
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  return ip;
}

function safeEqual(a, b) {
  const aBuffer = Buffer.from(a || '', 'utf8');
  const bBuffer = Buffer.from(b || '', 'utf8');
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function parseAdminAllowlist() {
  return (process.env.ADMIN_ALLOWED_IPS || '')
    .split(',')
    .map((ip) => normalizeIp(ip.trim()))
    .filter(Boolean);
}

function registerAdminAuthFailure(requestIp) {
  const current = adminAuthAttempts.get(requestIp);
  if (!current) {
    adminAuthAttempts.set(requestIp, { attempts: 1, firstAttemptAt: Date.now() });
    return;
  }

  current.attempts += 1;
  adminAuthAttempts.set(requestIp, current);
}

function clearAdminAuthFailure(requestIp) {
  if (adminAuthAttempts.has(requestIp)) {
    adminAuthAttempts.delete(requestIp);
  }
}

function requireWritingSubmissionsAdmin(req, res, next) {
  const expectedUser = process.env.ADMIN_USERNAME || '';
  const expectedPass = process.env.ADMIN_PASSWORD || '';

  if (!expectedUser || !expectedPass) {
    return res.status(503).json({ error: 'Admin endpoint is not configured.' });
  }

  const allowedIps = parseAdminAllowlist();
  const requestIp = normalizeIp(req.ip) || 'unknown';
  if (allowedIps.length > 0 && !allowedIps.includes(requestIp)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  const now = Date.now();
  const authState = adminAuthAttempts.get(requestIp);
  if (authState) {
    const elapsed = now - authState.firstAttemptAt;
    if (elapsed > ADMIN_AUTH_WINDOW_MS) {
      adminAuthAttempts.delete(requestIp);
    } else if (authState.attempts >= ADMIN_AUTH_MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many authentication attempts. Try again later.' });
    }
  }

  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) {
    registerAdminAuthFailure(requestIp);
    res.setHeader('WWW-Authenticate', 'Basic realm="Writing Admin", charset="UTF-8"');
    return res.status(401).json({ error: 'Authentication required.' });
  }

  let username = '';
  let password = '';

  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex === -1) {
      registerAdminAuthFailure(requestIp);
      res.setHeader('WWW-Authenticate', 'Basic realm="Writing Admin", charset="UTF-8"');
      return res.status(401).json({ error: 'Invalid authentication format.' });
    }

    username = decoded.slice(0, separatorIndex);
    password = decoded.slice(separatorIndex + 1);
  } catch (error) {
    registerAdminAuthFailure(requestIp);
    res.setHeader('WWW-Authenticate', 'Basic realm="Writing Admin", charset="UTF-8"');
    return res.status(401).json({ error: 'Invalid authentication header.' });
  }

  if (!safeEqual(username, expectedUser) || !safeEqual(password, expectedPass)) {
    registerAdminAuthFailure(requestIp);
    res.setHeader('WWW-Authenticate', 'Basic realm="Writing Admin", charset="UTF-8"');
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  clearAdminAuthFailure(requestIp);
  return next();
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

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

router.get('/writing-submissions', requireWritingSubmissionsAdmin, async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 250;
    const submissions = await WritingSubmission.findRecent(limit);
    return res.status(200).json({
      total: submissions.length,
      submissions
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/writing-submissions.csv', requireWritingSubmissionsAdmin, async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 1000;
    const submissions = await WritingSubmission.findRecent(limit);
    const lines = [
      ['id', 'created_at', 'first_name', 'last_name', 'email', 'source_ip', 'user_agent']
        .map(escapeCsv)
        .join(',')
    ];

    for (const row of submissions) {
      lines.push(
        [
          row.id,
          row.created_at,
          row.first_name,
          row.last_name,
          row.email,
          row.source_ip,
          row.user_agent
        ].map(escapeCsv).join(',')
      );
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="writing-submissions-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return res.status(200).send(lines.join('\n'));
  } catch (error) {
    return next(error);
  }
});

// Create book post form
router.get('/new', (req, res) => {
  res.render('admin/book-form', { bookPost: null, error: null });
});

// Create book post
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, subtitle, published_date, content, type } = req.body;

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
      published_date,
      type: type || 'book'
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
    const { title, subtitle, published_date, content, type } = req.body;
    console.log('=== UPDATE REQUEST DEBUG ===');
    console.log('Post ID:', req.params.id);
    console.log('Title:', title);
    console.log('Subtitle:', subtitle);
    console.log('Published Date:', published_date);
    console.log('Type:', type);
    console.log('Content received:', content ? `Yes (${content.length} chars)` : 'No');
    console.log('Content preview:', content ? content.substring(0, 100) : 'null');

    const bookPost = await BookPost.findById(req.params.id);

    if (!bookPost) {
      return res.status(404).send('Book post not found');
    }

    console.log('Current content in DB:', bookPost.content ? `${bookPost.content.length} chars` : 'null');

    // Generate new slug only if title changed
    const slug = title !== bookPost.title ? BookPost.generateSlug(title) : bookPost.slug;

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

    const updateData = {
      title,
      subtitle: subtitle || null,
      slug,
      content: content || null,
      image_url,
      published_date,
      type: type || bookPost.type || 'book'
    };

    console.log('Updating with data:', {
      ...updateData,
      content: updateData.content ? `${updateData.content.length} chars` : 'null'
    });

    await BookPost.update(req.params.id, updateData);

    console.log('Update completed successfully');
    console.log('=== END UPDATE DEBUG ===');

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
