# RSS Aggregator Backend

A full-featured Node.js backend for an RSS aggregation platform with scheduled feed parsing, user management, and comprehensive API endpoints.

## Features

- **RSS Feed Management**: Add, remove, and manage RSS feeds
- **Automated Parsing**: Scheduled parsing every 30 minutes with customizable intervals
- **Article Storage**: Deduplication and full-text search capabilities
- **User System**: Registration, authentication, and personalized reading experience
- **Read/Unread Tracking**: Per-user article status tracking
- **Article Search**: Full-text search with PostgreSQL
- **Admin Dashboard**: System statistics and management endpoints
- **Error Handling**: Comprehensive logging and error recovery
- **Production Ready**: Optimized for Render deployment

## Tech Stack

- **Backend**: Node.js with Express
- **Database**: PostgreSQL with full-text search
- **RSS Parsing**: rss-parser library
- **Authentication**: JWT tokens with bcrypt password hashing
- **Scheduling**: node-cron for automated feed updates
- **Logging**: Winston for comprehensive logging
- **Validation**: Joi for request validation
- **Security**: Helmet, CORS, rate limiting

## Installation

1. **Clone and Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your database and configuration settings
   ```

3. **Database Setup**
   ```bash
   # Run database migrations
   npm run migrate
   
   # Seed with sample data (optional)
   npm run seed
   ```

4. **Start the Server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## Environment Variables

```env
NODE_ENV=development
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/rss_aggregator
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rss_aggregator
DB_USER=username
DB_PASSWORD=password

# Security
JWT_SECRET=your-super-secret-jwt-key
BCRYPT_ROUNDS=10

# RSS Configuration
RSS_UPDATE_INTERVAL=30  # minutes
MAX_ARTICLES_PER_FEED=100

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info
- `GET /api/auth/activity` - Get user's recent activity
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password

### Articles
- `GET /api/articles` - Get articles with filtering and pagination
- `GET /api/articles/:id` - Get specific article
- `POST /api/articles/:id/read` - Mark article as read/unread
- `POST /api/articles/:id/save` - Save/unsave article
- `POST /api/articles/bulk/read` - Mark multiple articles as read

### Publications
- `GET /api/publications` - Get all publications
- `GET /api/publications/:id` - Get specific publication
- `POST /api/publications` - Create new publication (authenticated)
- `PUT /api/publications/:id` - Update publication (authenticated)
- `DELETE /api/publications/:id` - Delete publication (authenticated)
- `POST /api/publications/:id/refresh` - Manually refresh feed (authenticated)
- `POST /api/publications/refresh-all` - Refresh all active feeds (authenticated)

### Search
- `GET /api/search?q=query` - Search articles

### Admin
- `GET /api/admin/stats` - Get system statistics (authenticated)
- `GET /api/admin/publications` - Get detailed publication info (authenticated)
- `POST /api/admin/scheduler/trigger` - Manually trigger feed parsing (authenticated)
- `GET /api/admin/scheduler/status` - Get scheduler status (authenticated)
- `POST /api/admin/cleanup` - Run data cleanup (authenticated)
- `GET /api/admin/health` - Health check endpoint

## Database Schema

### Publications
- `id` - Primary key
- `name` - Publication name
- `rss_url` - RSS feed URL (unique)
- `website_url` - Publication website
- `logo_url` - Publication logo
- `description` - Description
- `category` - Category
- `is_active` - Active status
- `last_fetched_at` - Last fetch timestamp
- `fetch_error` - Last fetch error (if any)

### Articles
- `id` - Primary key
- `title` - Article title
- `content` - Full content
- `summary` - Article summary
- `url` - Article URL (unique per publication)
- `guid` - RSS GUID
- `author` - Author name
- `published_date` - Publication date
- `publication_id` - Foreign key to publications
- `image_url` - Article image
- `word_count` - Word count
- `reading_time` - Estimated reading time

### Users
- `id` - Primary key
- `email` - Email address (unique)
- `password_hash` - Hashed password
- `first_name` - First name
- `last_name` - Last name
- `is_active` - Active status

### User Articles (Tracking)
- `id` - Primary key
- `user_id` - Foreign key to users
- `article_id` - Foreign key to articles
- `is_read` - Read status
- `is_saved` - Saved status
- `read_at` - Read timestamp
- `saved_at` - Saved timestamp

## Deployment on Render

1. **Create a new Web Service** on Render
2. **Connect your repository**
3. **Configure the service:**
   - **Build Command**: `npm install && npm run migrate`
   - **Start Command**: `npm start`
   - **Environment**: Node

4. **Add Environment Variables:**
   ```env
   NODE_ENV=production
   DATABASE_URL=<your-postgresql-url>
   JWT_SECRET=<your-secret-key>
   BCRYPT_ROUNDS=12
   RSS_UPDATE_INTERVAL=30
   LOG_LEVEL=info
   ```

5. **Create a PostgreSQL database** on Render and use the internal connection URL

## Features in Detail

### RSS Parsing
- Supports various RSS/Atom feed formats
- Automatic content extraction and cleaning
- Image extraction from multiple sources
- Word count and reading time calculation
- Duplicate article prevention

### Scheduling
- Configurable update intervals
- Graceful error handling for failed feeds
- Automatic cleanup of old articles
- Manual refresh capabilities

### Search
- Full-text search using PostgreSQL's built-in capabilities
- Search across title, summary, and content
- Ranked results
- Performance optimized with indexes

### Security
- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- Input validation with Joi
- Security headers with Helmet
- CORS configuration

### Monitoring
- Comprehensive logging with Winston
- Health check endpoints
- System statistics
- Error tracking and recovery

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with sample data
- `npm run build` - Build command (for deployment)
- `npm test` - Run tests (when implemented)

## Sample Data

After running `npm run seed`, you'll have:

### Demo Users
- **Admin**: admin@example.com / admin123
- **Demo User**: demo@example.com / demo123

### Sample Publications
- TechCrunch
- Hacker News  
- BBC News
- The Verge
- Ars Technica

## Development

1. **Add new RSS feeds** through the API or directly in the database
2. **Monitor logs** in the `logs/` directory
3. **Check scheduler status** via `/api/admin/scheduler/status`
4. **View system stats** at `/api/admin/stats`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
