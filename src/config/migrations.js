const db = require('./database-sqlite');
const logger = require('../utils/logger');

// SQL for creating book_posts table (works for both SQLite and PostgreSQL)
const createBookPostsTable = async () => {
  const createTableSQL = db.usePostgres
    ? `
      CREATE TABLE IF NOT EXISTS book_posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        subtitle TEXT,
        slug VARCHAR(500) UNIQUE NOT NULL,
        content TEXT,
        image_url VARCHAR(500),
        published_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `
    : `
      CREATE TABLE IF NOT EXISTS book_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        subtitle TEXT,
        slug TEXT UNIQUE NOT NULL,
        content TEXT,
        image_url TEXT,
        published_date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

  try {
    await db.query(createTableSQL);
    logger.info('book_posts table created or already exists');
  } catch (error) {
    logger.error('Error creating book_posts table:', error);
    throw error;
  }
};

const runMigrations = async () => {
  logger.info('Running database migrations...');
  try {
    await createBookPostsTable();
    logger.info('Migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
};

module.exports = {
  runMigrations,
};
