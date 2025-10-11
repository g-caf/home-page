# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a personal website project that serves as an RSS aggregation platform. The codebase contains infrastructure for a full-featured backend with database integration (PostgreSQL), but the current deployment is simplified to run without a database.

**Current State**: The active server (`src/server.js`) is a lightweight Express app that fetches RSS feeds directly and renders them via EJS templates without database persistence.

**Infrastructure Available**: Full backend models, services, and middleware exist for a production RSS aggregation system with user management, authentication, scheduled parsing, and PostgreSQL storage.

## Development Commands

```bash
# Development server with auto-reload
npm run dev

# Production server
npm start
# or
NODE_ENV=production node src/server.js
```

**Port**: Default 3000 (configurable via `PORT` environment variable)

## Architecture

### Active Components (Current Deployment)

- **Server**: `src/server.js` - Lightweight Express server serving EJS views
- **Routes**: `src/routes/pages.js` - Renders home page with RSS feeds fetched on-demand
- **Views**: `views/` - EJS templates with partials (head, header, footer, articles-grid, book-posts-grid)
- **Static Assets**: `public/css/` and `public/js/`

The current implementation:
- Fetches RSS feeds directly using `rss-parser` on each page load
- No database connection or persistence
- Static book blog posts hardcoded in routes
- News feeds: The Verge, Mother.ly, NerdWallet

### Available Infrastructure (Not Currently Active)

The codebase includes a complete backend architecture that is not used in the simplified deployment:

**Database Layer** (`src/config/database.js`):
- PostgreSQL connection pooling with `pg`
- Requires `DATABASE_URL` environment variable

**Models** (`src/models/`):
- `Publication.js` - RSS feed sources (CRUD, deduplication by name/URL)
- `Article.js` - Parsed articles with full-text search capability
- `UserArticle.js` - Per-user read/saved status tracking

**Services** (`src/services/`):
- `rssParser.js` - Advanced RSS parsing with:
  - Content extraction using `@extractus/article-extractor`
  - URL canonicalization (strips tracking params, normalizes AMP URLs)
  - Image extraction from multiple RSS formats
  - Word count and reading time calculation
  - Automatic summary generation
  - Duplicate prevention

**Middleware** (`src/middleware/`):
- `auth.js` - JWT authentication
- `validation.js` - Request validation with Joi
- `health.js` - Health check endpoints

**Configuration** (`src/config/`):
- `security.js` - Helmet, rate limiting
- `cors.js` - CORS configuration

## Key Design Patterns

### RSS Parsing Service
The `RSSParserService` class is designed to handle edge cases in RSS feeds:
- Prefers `feedburner:origLink` for canonical URLs
- Canonicalizes URLs by stripping 15+ tracking parameters
- Normalizes AMP URLs (removes `/amp/` variants)
- Extracts images from multiple formats (enclosure, media:content, media:thumbnail)
- Falls back gracefully when full content extraction fails

### Database Models Pattern
All models follow a consistent static method pattern:
- `findAll()`, `findById()`, `create()`, `update()`, `delete()`
- Named queries for specific lookups (e.g., `findByUrl()`)
- Business logic in model layer (e.g., duplicate checking in `Publication.create()`)

### Current vs. Infrastructure
The current `src/server.js` intentionally bypasses all models/services/middleware to run as a simple static site. When switching to full backend mode, you would:
1. Set `DATABASE_URL` environment variable
2. Run migrations (scripts referenced in README but not present in codebase)
3. Replace the routes in `server.js` with API endpoints
4. Enable authentication middleware

## Environment Variables

**Currently Required**: None (runs with defaults)

**For Full Backend Mode** (see README.md):
```
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=...
BCRYPT_ROUNDS=12
RSS_UPDATE_INTERVAL=30
LOG_LEVEL=info
```

## File Organization

```
src/
├── server.js              # Main entry point (current: lightweight)
├── routes/
│   └── pages.js          # Active: renders EJS views
├── views/                # EJS templates
├── config/               # Infrastructure: DB, security, CORS
├── middleware/           # Infrastructure: auth, validation, health
├── models/               # Infrastructure: DB models
├── services/             # Infrastructure: RSS parsing, tagging
└── utils/                # Empty currently

public/
├── css/
└── js/

views/
├── home.ejs
└── partials/
    ├── head.ejs
    ├── header.ejs
    ├── footer.ejs
    ├── articles-grid.ejs
    └── book-posts-grid.ejs
```

## Important Notes

- **README Mismatch**: The README describes the full backend infrastructure, but actual deployment is simplified
- No test suite exists (package.json includes `npm test` stub)
- No migration files present despite README references
- `src/utils/` directory is empty
- Models reference a logger utility that may not be configured in simple mode
- The `test-server.js` file in root is a separate test script

## Adding New RSS Feeds

**Current Method** (edit `src/routes/pages.js`):
```javascript
const newsFeeds = [
  'https://www.theverge.com/rss/index.xml',
  'https://www.mother.ly/feed/',
  'https://www.nerdwallet.com/rss/blog/feed.xml',
  // Add new feeds here
];
```

**Full Backend Method** (would use models):
```javascript
await Publication.create({
  name: 'Example',
  rss_url: 'https://example.com/rss',
  website_url: 'https://example.com',
  category: 'Tech'
});
```
