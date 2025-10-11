const { Pool } = require('pg');
const logger = require('../utils/logger');

const config = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(config);

pool.on('error', (err) => {
  logger.error('Database pool error:', err);
  process.exit(-1);
});

pool.on('connect', () => {
  logger.info('Database connected');
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executed', { query: text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Database query error:', { query: text, error: error.message });
    throw error;
  }
};

const getClient = async () => {
  return await pool.connect();
};

module.exports = {
  query,
  getClient,
  pool,
};
