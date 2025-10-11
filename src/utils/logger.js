// Simple logger utility
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log('[DEBUG]', ...args);
    }
  },
  warn: (...args) => console.warn('[WARN]', ...args),
};

module.exports = logger;
