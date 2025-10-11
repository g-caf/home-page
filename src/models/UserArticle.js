const { query } = require('../config/database');

class UserArticle {
  static async markAsRead(userId, articleId, isRead = true) {
    const sql = `
      INSERT INTO user_articles (user_id, article_id, is_read, read_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, article_id)
      DO UPDATE SET 
        is_read = $3,
        read_at = CASE WHEN $3 = true THEN CURRENT_TIMESTAMP ELSE user_articles.read_at END
      RETURNING *
    `;
    
    const result = await query(sql, [userId, articleId, isRead, isRead ? new Date() : null]);
    return result.rows[0];
  }

  static async markAsSaved(userId, articleId, isSaved = true) {
    const sql = `
      INSERT INTO user_articles (user_id, article_id, is_saved, saved_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, article_id)
      DO UPDATE SET 
        is_saved = $3,
        saved_at = CASE WHEN $3 = true THEN CURRENT_TIMESTAMP ELSE user_articles.saved_at END
      RETURNING *
    `;
    
    const result = await query(sql, [userId, articleId, isSaved, isSaved ? new Date() : null]);
    return result.rows[0];
  }

  static async getUserArticleStatus(userId, articleId) {
    const result = await query(
      'SELECT * FROM user_articles WHERE user_id = $1 AND article_id = $2',
      [userId, articleId]
    );
    return result.rows[0];
  }

  static async markMultipleAsRead(userId, articleIds) {
    if (articleIds.length === 0) return [];

    const placeholders = articleIds.map((_, index) => `($1, $${index + 2}, true, CURRENT_TIMESTAMP)`).join(', ');
    const params = [userId, ...articleIds];

    const sql = `
      INSERT INTO user_articles (user_id, article_id, is_read, read_at)
      VALUES ${placeholders}
      ON CONFLICT (user_id, article_id)
      DO UPDATE SET 
        is_read = true,
        read_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await query(sql, params);
    return result.rows;
  }

  static async getReadingStats(userId, days = 30) {
    const sql = `
      SELECT 
        COUNT(*) FILTER (WHERE is_read = true) as read_count,
        COUNT(*) FILTER (WHERE is_saved = true) as saved_count,
        COUNT(DISTINCT DATE(read_at)) FILTER (WHERE read_at >= CURRENT_DATE - INTERVAL '${days} days') as active_days
      FROM user_articles
      WHERE user_id = $1
    `;

    const result = await query(sql, [userId]);
    return result.rows[0];
  }

  static async getRecentActivity(userId, limit = 10) {
    const sql = `
      SELECT ua.*, a.title, a.url, p.name as publication_name
      FROM user_articles ua
      JOIN articles a ON ua.article_id = a.id
      JOIN publications p ON a.publication_id = p.id
      WHERE ua.user_id = $1
        AND (ua.read_at IS NOT NULL OR ua.saved_at IS NOT NULL)
      ORDER BY GREATEST(ua.read_at, ua.saved_at) DESC
      LIMIT $2
    `;

    const result = await query(sql, [userId, limit]);
    return result.rows;
  }
}

module.exports = UserArticle;
