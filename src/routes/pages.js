const express = require('express');
const router = express.Router();
const Parser = require('rss-parser');
const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media:content', { keepArray: true }],
      ['media:thumbnail', 'media:thumbnail', { keepArray: true }],
      ['media:group', 'media:group', { keepArray: true }],
      ['content:encoded', 'content:encoded']
    ]
  }
});
const BookPost = require('../models/BookPost');

// RSS feeds - from News - Main project
const newsFeeds = [
  // Tech
  'https://techcrunch.com/feed/',
  'https://hnrss.org/frontpage',
  'https://www.theverge.com/rss/index.xml',
  'https://feeds.arstechnica.com/arstechnica/index',
  'https://www.wired.com/feed/rss',
  // News
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
  'https://www.theatlantic.com/feed/all/',
  'https://www.newyorker.com/feed/everything',
  'http://feeds.feedburner.com/nymag/intelligencer',
  'https://www.aljazeera.com/xml/rss/all.xml',
  // Culture
  'http://feeds.feedburner.com/nymag/fashion'
];

// Book blog posts are now loaded from the database

// Home page
router.get('/', async (req, res, next) => {
  try {
    // Fetch book posts from database (exclude pages)
    const bookPostsFromDb = await BookPost.findAll();
    const bookPostsOnly = bookPostsFromDb.filter(post => post.type !== 'page');

    // Transform book posts to match the article format
    const bookPosts = bookPostsOnly.map(post => ({
      title: post.title,
      subtitle: post.subtitle,
      publication_name: 'My Book Blog',
      published_date: post.published_date,
      url: `/books/${post.slug}`,
      image_url: post.image_url
    }));

    const articles = [];
    for (const url of newsFeeds) {
      try {
        const feed = await parser.parseURL(url);

        // Extract publication name from feed and clean it up
        let publicationName = feed.title || feed.link || 'Unknown';

        // Clean up feed titles like "NYT > Top Stories" to just "NYT"
        if (publicationName.includes('>')) {
          publicationName = publicationName.split('>')[0].trim();
        }
        if (publicationName.includes('-')) {
          publicationName = publicationName.split('-')[0].trim();
        }


        articles.push(...feed.items.map(item => ({
          ...item,
          feedTitle: publicationName
        })));
      } catch (error) {
        console.error(`Failed to fetch RSS feed: ${url}`, error.message);
      }
    }

    articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    res.render('home', {
      title: 'Home',
      articles: articles.map(item => {
        let imageUrl = null;

        // Try multiple image extraction methods
        // 1. Enclosure (common in RSS)
        const enclosure = item.enclosure;
        if (enclosure) {
          const enclSources = Array.isArray(enclosure) ? enclosure : [enclosure];
          const match = enclSources.find(src => src && src.url);
          if (match && match.url) {
            imageUrl = match.url;
          }
        }
        // 2. Media content (RSS extensions)
        if (!imageUrl && item['media:content']) {
          const mc = item['media:content'];
          const mediaItems = Array.isArray(mc) ? mc : [mc];
          const img = mediaItems.find(m => (m && m.$ && m.$.url) || (m && m.url));
          if (img) {
            imageUrl = (img.$ && img.$.url) || img.url || null;
          }
        }
        // 3. Media group (NYTimes and others)
        if (!imageUrl && item['media:group']) {
          const mg = item['media:group'];
          const groups = Array.isArray(mg) ? mg : [mg];
          for (const group of groups) {
            const contents = group['media:content'];
            if (contents) {
              const mediaItems = Array.isArray(contents) ? contents : [contents];
              const img = mediaItems.find(m => (m && m.$ && m.$.url) || (m && m.url));
              if (img) {
                imageUrl = (img.$ && img.$.url) || img.url || null;
                break;
              }
            }
          }
        }
        // 4. Media thumbnail
        if (!imageUrl && item['media:thumbnail']) {
          const mt = item['media:thumbnail'];
          const thumbnails = Array.isArray(mt) ? mt : [mt];
          const thumb = thumbnails.find(t => (t && t.$ && t.$.url) || (t && t.url));
          if (thumb) {
            imageUrl = (thumb.$ && thumb.$.url) || thumb.url || null;
          }
        }
        // 5. Content encoded
        if (!imageUrl && item['content:encoded']) {
          const imgMatch = item['content:encoded'].match(/<img[^>]+src=["']([^"'>]+)["']/i);
          if (imgMatch) {
            imageUrl = imgMatch[1];
          }
        }
        // 6. Extract from content/description
        if (!imageUrl && item.content) {
          const imgMatch = item.content.match(/<img[^>]+src=["']([^"'>]+)["']/i);
          if (imgMatch) {
            imageUrl = imgMatch[1];
          }
        }
        if (!imageUrl && item.description) {
          const imgMatch = item.description.match(/<img[^>]+src=["']([^"'>]+)["']/i);
          if (imgMatch) {
            imageUrl = imgMatch[1];
          }
        }

        return {
          title: item.title,
          author: item.creator || item.author,
          publication_name: item.feedTitle || 'Unknown',
          published_date: item.pubDate,
          url: item.link,
          image_url: imageUrl
        };
      }),
      bookPosts
    });
  } catch (error) {
    next(error);
  }
});

const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();

// About page
router.get('/about', async (req, res) => {
  try {
    const page = await BookPost.findBySlug('about');
    console.log('About page data:', {
      found: !!page,
      hasContent: !!(page && page.content),
      contentLength: page && page.content ? page.content.length : 0,
      content: page && page.content
    });

    if (!page) {
      return res.render('about', { title: "Who's Writing This?", page: null });
    }

    // Render markdown content to HTML
    if (page.content) {
      page.contentHtml = md.render(page.content);
      console.log('Rendered HTML length:', page.contentHtml.length);
    }

    res.render('page', { title: page.title, page });
  } catch (error) {
    console.error('Error fetching about page:', error);
    res.status(500).send('Error loading page');
  }
});

// Contact page
router.get('/contact', async (req, res) => {
  try {
    const page = await BookPost.findBySlug('contact');
    if (!page) {
      return res.render('contact', { title: 'Can I Email Her?', page: null });
    }

    // Render markdown content to HTML
    if (page.content) {
      page.contentHtml = md.render(page.content);
    }

    res.render('page', { title: page.title, page });
  } catch (error) {
    console.error('Error fetching contact page:', error);
    res.status(500).send('Error loading page');
  }
});

// Reading page
router.get('/reading', async (req, res) => {
  try {
    const page = await BookPost.findBySlug('reading');
    if (!page) {
      return res.render('reading', { title: "What Else Is She Reading?", page: null });
    }

    // Render markdown content to HTML
    if (page.content) {
      page.contentHtml = md.render(page.content);
    }

    res.render('page', { title: page.title, page });
  } catch (error) {
    console.error('Error fetching reading page:', error);
    res.status(500).send('Error loading page');
  }
});

module.exports = router;
