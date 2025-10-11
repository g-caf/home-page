# Deployment Guide

This document outlines how to deploy your personal website to Render with database support.

## Database Setup

The application now supports both SQLite (local development) and PostgreSQL (production).

### Local Development
- Uses SQLite database stored in `data/database.sqlite`
- No configuration needed - database is created automatically on first run

### Production (Render)
- Uses PostgreSQL via Render's database service
- Requires `DATABASE_URL` environment variable

## Render Deployment Steps

### 1. Create a PostgreSQL Database on Render

1. Log into your Render dashboard
2. Click "New +" and select "PostgreSQL"
3. Configure your database:
   - Name: `personal-website-db` (or your choice)
   - Database: `personal_website` (or your choice)
   - User: Auto-generated
   - Region: Choose closest to your web service
   - Instance Type: Free tier is fine to start
4. Click "Create Database"
5. Copy the "Internal Database URL" (starts with `postgresql://`)

### 2. Create a Web Service on Render

1. Click "New +" and select "Web Service"
2. Connect your GitHub repository
3. Configure your service:
   - **Name**: `personal-website` (or your choice)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free tier

### 3. Set Environment Variables

In your Render web service settings, add these environment variables:

```
NODE_ENV=production
DATABASE_URL=<paste your Internal Database URL from step 1>
PORT=3000
```

### 4. Deploy

Click "Create Web Service" - Render will automatically deploy your application.

The database migrations will run automatically on startup, creating the necessary tables.

## Features

### Admin Panel
- **URL**: `https://your-app.onrender.com/admin/books`
- Create, edit, and delete book posts
- Upload cover images (stored in `/public/uploads/books/`)
- Manage publication dates

### Public Pages
- **Home**: Shows RSS news feed + your book posts
- **Book Posts**: Individual pages at `/books/post-slug`
- Clean, responsive design matching your site aesthetic

### Book Post Fields
- Title (required)
- Subtitle (optional)
- Published Date (required)
- Content (optional - for longer reviews)
- Cover Image (optional - accepts JPEG, PNG, GIF, WebP up to 5MB)

## File Structure

```
src/
├── config/
│   ├── database-sqlite.js    # Database abstraction layer
│   ├── migrations.js          # Database schema
│   └── upload.js              # File upload configuration
├── models/
│   └── BookPost.js            # Book post model
├── routes/
│   ├── admin.js               # Admin panel routes
│   ├── books.js               # Public book post routes
│   └── pages.js               # Home page route
├── utils/
│   └── logger.js              # Logging utility
└── server.js                  # Main application

views/
├── admin/
│   ├── books.ejs              # Admin book list
│   └── book-form.ejs          # Create/edit form
├── book-post.ejs              # Individual book post page
└── home.ejs                   # Main page

public/
├── css/
│   └── style.css              # All styles
└── uploads/
    └── books/                 # Uploaded book covers
```

## Database Schema

### book_posts table
```sql
- id (INTEGER/SERIAL PRIMARY KEY)
- title (TEXT/VARCHAR NOT NULL)
- subtitle (TEXT)
- slug (TEXT/VARCHAR UNIQUE NOT NULL)
- content (TEXT)
- image_url (TEXT/VARCHAR)
- published_date (TEXT/DATE NOT NULL)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## Adding Authentication (Future)

Currently, the admin panel has no authentication. To add auth after setting up your custom domain:

1. Install additional packages: `npm install bcryptjs jsonwebtoken express-session`
2. Use the existing middleware in `src/middleware/auth.js`
3. Create user management routes
4. Protect admin routes with authentication middleware
5. Consider domain-based access control

## Troubleshooting

### Database connection errors
- Verify `DATABASE_URL` is set correctly in Render
- Check that database service is running
- Ensure database and web service are in the same region

### Image uploads not working
- Check file size (must be under 5MB)
- Verify file type (JPEG, PNG, GIF, WebP only)
- Ensure `/public/uploads/books/` directory exists (auto-created)

### Migrations fail
- Check database connection
- Review logs for specific error messages
- Ensure DATABASE_URL format is correct

## Local Testing

Test locally before deploying:

```bash
# Install dependencies
npm install

# Start development server (uses SQLite)
npm run dev

# Access admin panel
open http://localhost:3000/admin/books

# Create test posts
# Then check home page: http://localhost:3000
```

## Production URL Structure

- Home: `https://your-app.onrender.com/`
- Admin: `https://your-app.onrender.com/admin/books`
- Book Posts: `https://your-app.onrender.com/books/{slug}`
- Create Post: `https://your-app.onrender.com/admin/books/new`
- Edit Post: `https://your-app.onrender.com/admin/books/{id}/edit`
