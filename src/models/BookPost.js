const db = require('../config/database-sqlite');
const logger = require('../utils/logger');

class BookPost {
  // Create a new book post
  static async create({ title, subtitle, slug, content, image_url, published_date }) {
    try {
      const query = db.usePostgres
        ? `INSERT INTO book_posts (title, subtitle, slug, content, image_url, published_date)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`
        : `INSERT INTO book_posts (title, subtitle, slug, content, image_url, published_date)
           VALUES (?, ?, ?, ?, ?, ?)`;

      const result = await db.query(query, [title, subtitle, slug, content, image_url, published_date]);

      if (db.usePostgres) {
        return result.rows[0];
      } else {
        // For SQLite, fetch the newly created record
        const getQuery = 'SELECT * FROM book_posts WHERE id = ?';
        const getResult = await db.query(getQuery, [result.lastID]);
        return getResult.rows[0];
      }
    } catch (error) {
      logger.error('Error creating book post:', error);
      throw error;
    }
  }

  // Get all book posts
  static async findAll(orderBy = 'published_date DESC') {
    try {
      const query = `SELECT * FROM book_posts ORDER BY ${orderBy}`;
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching book posts:', error);
      throw error;
    }
  }

  // Get a book post by ID
  static async findById(id) {
    try {
      const query = db.usePostgres
        ? 'SELECT * FROM book_posts WHERE id = $1'
        : 'SELECT * FROM book_posts WHERE id = ?';

      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching book post by ID:', error);
      throw error;
    }
  }

  // Get a book post by slug
  static async findBySlug(slug) {
    try {
      const query = db.usePostgres
        ? 'SELECT * FROM book_posts WHERE slug = $1'
        : 'SELECT * FROM book_posts WHERE slug = ?';

      const result = await db.query(query, [slug]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching book post by slug:', error);
      throw error;
    }
  }

  // Update a book post
  static async update(id, { title, subtitle, slug, content, image_url, published_date }) {
    try {
      const query = db.usePostgres
        ? `UPDATE book_posts
           SET title = $1, subtitle = $2, slug = $3, content = $4, image_url = $5,
               published_date = $6, updated_at = CURRENT_TIMESTAMP
           WHERE id = $7
           RETURNING *`
        : `UPDATE book_posts
           SET title = ?, subtitle = ?, slug = ?, content = ?, image_url = ?,
               published_date = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`;

      const result = await db.query(query, [title, subtitle, slug, content, image_url, published_date, id]);

      if (db.usePostgres) {
        return result.rows[0];
      } else {
        // For SQLite, fetch the updated record
        const getQuery = 'SELECT * FROM book_posts WHERE id = ?';
        const getResult = await db.query(getQuery, [id]);
        return getResult.rows[0];
      }
    } catch (error) {
      logger.error('Error updating book post:', error);
      throw error;
    }
  }

  // Delete a book post
  static async delete(id) {
    try {
      const query = db.usePostgres
        ? 'DELETE FROM book_posts WHERE id = $1 RETURNING *'
        : 'DELETE FROM book_posts WHERE id = ?';

      const result = await db.query(query, [id]);

      if (db.usePostgres) {
        return result.rows[0];
      } else {
        return { success: result.rowCount > 0 };
      }
    } catch (error) {
      logger.error('Error deleting book post:', error);
      throw error;
    }
  }

  // Generate a URL-friendly slug from a title
  static generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')      // Replace spaces with hyphens
      .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
      .trim();
  }
}

module.exports = BookPost;
