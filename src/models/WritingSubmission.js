const db = require('../config/database-sqlite');
const logger = require('../utils/logger');

class WritingSubmission {
  static async findRecent(limit = 250) {
    try {
      const safeLimit = Number.isFinite(Number(limit))
        ? Math.min(Math.max(parseInt(limit, 10), 1), 1000)
        : 250;

      const query = db.usePostgres
        ? `SELECT id, first_name, last_name, email, source_ip, user_agent, created_at
           FROM writing_submissions
           ORDER BY created_at DESC
           LIMIT $1`
        : `SELECT id, first_name, last_name, email, source_ip, user_agent, created_at
           FROM writing_submissions
           ORDER BY datetime(created_at) DESC
           LIMIT ?`;

      const result = await db.query(query, [safeLimit]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching writing submissions:', error);
      throw error;
    }
  }
}

module.exports = WritingSubmission;
