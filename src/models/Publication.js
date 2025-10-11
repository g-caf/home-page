const { query } = require('../config/database');

class Publication {
  static async findAll(isActive = true) {
    const sql = `
      SELECT p.*, 
             COUNT(a.id) as article_count,
             MAX(a.published_date) as latest_article_date
      FROM publications p
      LEFT JOIN articles a ON p.id = a.publication_id
      WHERE p.is_active = $1
      GROUP BY p.id
      ORDER BY p.name
    `;
    const result = await query(sql, [isActive]);
    return result.rows;
  }

  static async findById(id) {
    const result = await query('SELECT * FROM publications WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByUrl(rssUrl) {
    const result = await query('SELECT * FROM publications WHERE rss_url = $1', [rssUrl]);
    return result.rows[0];
  }

  static async findByName(name) {
    const result = await query(
      'SELECT * FROM publications WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))',
      [name]
    );
    return result.rows[0];
  }

  static async create(data) {
    const {
      name,
      rss_url,
      website_url,
      logo_url,
      description,
      category
    } = data;

    // Check for existing publication by name or RSS URL
    const existingByName = await this.findByName(name);
    if (existingByName) {
      throw new Error(`Publication with name "${name}" already exists`);
    }
    
    const existingByUrl = await this.findByUrl(rss_url);
    if (existingByUrl) {
      throw new Error(`Publication with RSS URL "${rss_url}" already exists`);
    }

    const sql = `
      INSERT INTO publications (name, rss_url, website_url, logo_url, description, category)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await query(sql, [name, rss_url, website_url, logo_url, description, category]);
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const sql = `
      UPDATE publications 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query('DELETE FROM publications WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  static async updateLastFetched(id, error = null) {
    const sql = `
      UPDATE publications 
      SET last_fetched_at = CURRENT_TIMESTAMP, fetch_error = $2
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sql, [id, error]);
    return result.rows[0];
  }

  static async getActiveFeeds() {
    const result = await query(
      'SELECT * FROM publications WHERE is_active = true ORDER BY last_fetched_at ASC NULLS FIRST'
    );
    return result.rows;
  }

  // Alias methods for consistency with page routes
  static async getAll() {
    const result = await query('SELECT DISTINCT * FROM publications WHERE is_active = true ORDER BY name');
    return result.rows;
  }

  static async getAllWithStats() {
    const sql = `
      SELECT p.*, 
             COUNT(a.id) as article_count,
             MAX(a.published_date) as last_updated,
             p.is_active as active
      FROM publications p
      LEFT JOIN articles a ON p.id = a.publication_id
      GROUP BY p.id
      ORDER BY p.name
    `;
    const result = await query(sql);
    return result.rows;
  }
}

module.exports = Publication;
